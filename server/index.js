import express from 'express';
import cors from 'cors';
import db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { generateSD3 } from './utils/sd3.js';
import { parseMeetDetails, parseSessionSummary } from './utils/maestro/parser.js';
import { writeRaceData, writeTimingSystemConfig } from './utils/maestro/writer.js';

// Preload DQ Codes
const dqCodesPath = path.join(__dirname, 'utils/maestro/dq_codes.json');
let dqCodes = {};
try {
    dqCodes = JSON.parse(fs.readFileSync(dqCodesPath, 'utf8'));
} catch (e) {
    console.warn("Failed to load dq_codes.json", e);
}

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json());

// Serve Static Frontend (Production)
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('/', (req, res) => {
    res.json({ message: 'Swim Meet Timer API Ready' });
});

app.get('/api/dq-codes', (req, res) => {
    res.json(dqCodes);
});

app.get('/api/times', (req, res) => {
    db.all('SELECT * FROM time_entries ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/join-meet', (req, res) => {
    const { access_code } = req.body;
    db.get('SELECT id, name, org_id FROM meets WHERE access_code = ? AND is_active = 1', [access_code], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Invalid or inactive meet code' });
        res.json({ success: true, meet: row });
    });
});

app.post('/api/times', (req, res) => {
    console.log('[POST /api/times] Received payload:', req.body);
    const { meet_id, event_number, heat_number, lane, time_ms, is_no_show, swimmer_name, is_dq, dq_code, dq_description, official_initials } = req.body;

    if (!meet_id || !event_number || !heat_number || !lane) {
        console.error('[POST /api/times] Missing fields');
        return res.status(400).json({ error: 'Missing required fields (Meet ID, Event, Heat, Lane)' });
    }

    const sql = `
        INSERT INTO time_entries (
            meet_id, event_number, heat_number, lane, time_ms, is_no_show, swimmer_name, is_dq, dq_code, dq_description, official_initials
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
        meet_id, event_number, heat_number, lane, time_ms || 0, is_no_show ? 1 : 0, swimmer_name || '',
        is_dq ? 1 : 0, dq_code || null, dq_description || null, official_initials || null
    ];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('[POST /api/times] DB Error:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('[POST /api/times] Success, ID:', this.lastID);

        // Fetch all times for this specific heat to write the comprehensive race file
        db.all('SELECT * FROM time_entries WHERE meet_id = ? AND event_number = ? AND heat_number = ?', [meet_id, event_number, heat_number], (err, rows) => {
            if (!err && rows) {
                // Write the immutable race payload
                writeRaceData(meet_id, 1, event_number, heat_number, rows);

                // Also update the timing system configuration to heartbeat Maestro
                writeTimingSystemConfig(meet_id, event_number, heat_number);
            }
        });

        res.json({ id: this.lastID, success: true });
    });
});

app.put('/api/times/:id', (req, res) => {
    const timeId = req.params.id;
    const { time_ms, lane, heat_number } = req.body; // Allow admins to fix the time, lane, or heat

    db.get('SELECT * FROM time_entries WHERE id = ?', [timeId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Time entry not found' });

        // If this is the FIRST time it's being edited, stash the original time into raw_time
        const rawTime = row.raw_time !== null ? row.raw_time : row.time_ms;

        db.run(
            'UPDATE time_entries SET time_ms = ?, lane = ?, heat_number = ?, raw_time = ? WHERE id = ?',
            [time_ms, lane, heat_number, rawTime, timeId],
            function (updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });

                // Rewrite the Maestro race file indicating a revision
                db.all('SELECT * FROM time_entries WHERE meet_id = ? AND event_number = ? AND heat_number = ?', [row.meet_id, row.event_number, heat_number], (fetchErr, allRows) => {
                    if (!fetchErr && allRows) {
                        writeRaceData(row.meet_id, 1, row.event_number, heat_number, allRows, true); // true = isRevision
                    }
                });

                res.json({ success: true, updated_id: timeId, raw_time_saved: rawTime });
            }
        );
    });
});

app.post('/api/audit', (req, res) => {
    const { meet_id, action, payload, client_timestamp } = req.body;
    db.run(
        'INSERT INTO audit_logs (meet_id, action, payload, client_timestamp) VALUES (?, ?, ?, ?)',
        [meet_id, action, JSON.stringify(payload), client_timestamp],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// --- Admin API ---

// List Meets
app.get('/api/admin/meets', (req, res) => {
    db.all('SELECT * FROM meets ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create Meet
app.post('/api/admin/meets', (req, res) => {
    const { name, org_id } = req.body;
    // Generate simple 6-char code
    const access_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const admin_pin = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit PIN

    db.run('INSERT INTO meets (org_id, name, access_code, admin_pin) VALUES (?, ?, ?, ?)', [org_id || 1, name, access_code, admin_pin], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, access_code, admin_pin, name });
    });
});

// Get Live Results for a Meet
app.get('/api/admin/meets/:id/results', (req, res) => {
    const meetId = req.params.id;
    const since = req.query.since || 0; // Optimistic polling support

    db.all(`
        SELECT * FROM time_entries 
        WHERE meet_id = ? AND id > ? 
        ORDER BY created_at DESC
    `, [meetId, since], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ results: rows });
    });
});

// --- Public API ---
app.get('/api/export', (req, res) => {
    db.all('SELECT * FROM time_entries ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).send('Error generating export');
            return;
        }

        const headers = ['Meet ID', 'Event', 'Heat', 'Lane', 'Swimmer', 'Time', 'Status', 'Timestamp'];
        const csvRows = rows.map(row => {
            const minutes = Math.floor(row.time_ms / 60000);
            const seconds = Math.floor((row.time_ms % 60000) / 1000);
            const centiseconds = Math.floor((row.time_ms % 1000) / 10);
            const formattedTime = row.is_no_show ? 'NS' : `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;

            return [
                row.meet_id,
                row.event_number,
                row.heat_number,
                row.lane,
                `"${row.swimmer_name || ''}"`, // Quote name for CSV safety
                formattedTime,
                row.is_no_show ? 'NO SHOW' : 'OK',
                row.created_at
            ].join(',');
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');

        res.header('Content-Type', 'text/csv');
        res.attachment('swim-meet-results.csv');
        res.send(csvContent);
    });
});

app.get('/api/export/sd3', (req, res) => {
    // 1. Get Meet Info (Just picking the first active one or similar for now, usually needs meet_id context)
    // For demo/simplicity, we'll grab the most recent meet and its times.
    db.get('SELECT * FROM meets ORDER BY created_at DESC LIMIT 1', [], (err, meet) => {
        if (err || !meet) return res.status(404).send('No meet found');

        db.all('SELECT * FROM time_entries WHERE meet_id = ? ORDER BY event_number, heat_number, lane', [meet.id], (err, rows) => {
            if (err) return res.status(500).send('Error fetching entries');

            const sd3Content = generateSD3(meet, rows);
            res.header('Content-Type', 'text/plain');
            res.attachment(`${meet.name.replace(/\s+/g, '_')}.sd3`);
            res.send(sd3Content);
        });
    });
});

app.get('/api/export/audit', (req, res) => {
    db.all('SELECT * FROM audit_logs ORDER BY server_timestamp DESC', [], (err, rows) => {
        if (err) return res.status(500).send('Error fetching logs');

        const headers = ['ID', 'Meet ID', 'Action', 'Client Time', 'Server Time', 'Payload'];
        const csvRows = rows.map(row => [
            row.id,
            row.meet_id,
            row.action,
            new Date(row.client_timestamp).toISOString(),
            row.server_timestamp,
            `"${(row.payload || '').replace(/"/g, '""')}"`
        ].join(','));

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        res.header('Content-Type', 'text/csv');
        res.attachment('audit_logs.csv');
        res.send(csvContent);
    });
});

app.get('/api/maestro/status', async (req, res) => {
    const meetId = req.query.meet_id;
    if (!meetId) return res.status(400).json({ error: 'Missing meet_id' });

    const meetDir = path.join(__dirname, `../maestro_data/${meetId}`);
    const detailsPath = path.join(meetDir, 'meet_details.json');
    const summaryPath = path.join(meetDir, 'session_summary.csv');

    try {
        const meetDetails = parseMeetDetails(detailsPath);
        const sessionSummary = await parseSessionSummary(summaryPath);
        res.json({ meetDetails, sessionSummary });
    } catch (e) {
        res.json({}); // Return empty if not found
    }
});

// --- Phase 16 & 16.1: Maestro Cloud-to-Local Sync Bridge APIs ---

// 1. Initial Setup Upload (Auto-Meet Creation)
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/maestro/upload', upload.fields([
    { name: 'session_summary', maxCount: 1 },
    { name: 'meet_details', maxCount: 1 }
]), (req, res) => {
    try {
        const meetDetailsFile = req.files['meet_details']?.[0];
        const sessionSummaryFile = req.files['session_summary']?.[0];

        if (!meetDetailsFile || !sessionSummaryFile) {
            return res.status(400).json({ error: 'Missing required maestro files.' });
        }

        // Parse Meet Name from buffer
        let meetName = "Imported Maestro Meet";
        try {
            const parsed = JSON.parse(meetDetailsFile.buffer.toString('utf8').replace(/^\uFEFF/, ''));
            if (parsed && parsed.meetName) {
                meetName = parsed.meetName;
            }
        } catch (e) {
            console.error("Failed to parse meet_details for name, using default.");
        }

        const access_code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const admin_pin = Math.floor(100000 + Math.random() * 900000).toString();

        db.run('INSERT INTO meets (org_id, name, access_code, admin_pin) VALUES (?, ?, ?, ?)', [1, meetName, access_code, admin_pin], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            const meetId = this.lastID;
            const meetDir = path.join(__dirname, `../maestro_data/${meetId}`);

            if (!fs.existsSync(meetDir)) fs.mkdirSync(meetDir, { recursive: true });

            fs.writeFileSync(path.join(meetDir, 'meet_details.json'), meetDetailsFile.buffer);
            fs.writeFileSync(path.join(meetDir, 'session_summary.csv'), sessionSummaryFile.buffer);

            res.json({ success: true, meet_id: meetId, name: meetName, access_code, admin_pin });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error during processing.' });
    }
});

// 2. Sync Pending Files (Retrieves generated JSON files not yet downloaded)
app.get('/api/sync/pending-files', (req, res) => {
    const { access_code, admin_pin } = req.query;
    if (!access_code || !admin_pin) {
        return res.status(400).json({ error: 'Missing access_code or admin_pin' });
    }

    db.get('SELECT id FROM meets WHERE access_code = ? AND admin_pin = ?', [access_code, admin_pin], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Unauthorized: Invalid Meet Code or Admin PIN.' });

        // Use Isolated Directory
        const meetDir = path.join(__dirname, `../maestro_data/${row.id}`);
        if (!fs.existsSync(meetDir)) {
            return res.json({ pending: [] });
        }

        const files = fs.readdirSync(meetDir).filter(f => f.startsWith('session_') && f.endsWith('.json'));

        db.all('SELECT filename FROM maestro_sync_receipts WHERE meet_id = ?', [row.id], (err, syncedRows) => {
            if (err) return res.status(500).json({ error: err.message });

            const syncedFiles = new Set(syncedRows.map(r => r.filename));
            const pendingFilenames = files.filter(f => !syncedFiles.has(f));

            const payloads = pendingFilenames.map(filename => ({
                filename,
                content: JSON.parse(fs.readFileSync(path.join(meetDir, filename), 'utf8'))
            }));

            res.json({ pending: payloads });
        });
    });
});

// 3. Sync Receipt (Marks files as downloaded by the local Windows Sync Tool)
app.post('/api/sync/receipt', (req, res) => {
    const { access_code, admin_pin, filenames } = req.body;
    if (!access_code || !admin_pin || !filenames || !Array.isArray(filenames)) {
        return res.status(400).json({ error: 'Invalid payload' });
    }

    db.get('SELECT id FROM meets WHERE access_code = ? AND admin_pin = ?', [access_code, admin_pin], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Unauthorized: Invalid Meet Code or Admin PIN.' });

        const stmt = db.prepare('INSERT OR IGNORE INTO maestro_sync_receipts (filename, meet_id) VALUES (?, ?)');
        db.serialize(() => {
            filenames.forEach(filename => {
                stmt.run([filename, row.id]);
            });
            stmt.finalize((err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, marked: filenames.length });
            });
        });
    });
});

// 4. Download Custom Sync Tool Bundle
app.get('/api/sync/download-tool', (req, res) => {
    // Determine the external facing URL for the DO app to burn into config
    const hostUrl = req.protocol + '://' + req.get('host');
    const exePath = path.join(__dirname, '../client/public/downloads/maestro-sync.exe');

    if (!fs.existsSync(exePath)) {
        return res.status(404).send('Sync tool executable not found on server.');
    }

    try {
        const zip = new AdmZip();
        // Pack the executable
        zip.addLocalFile(exePath);
        // Pack a dynamic config.json holding the DO specific deployment URL
        zip.addFile('config.json', Buffer.from(JSON.stringify({ apiUrl: hostUrl }, null, 2)));

        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', 'attachment; filename=maestro-sync.zip');
        res.send(zip.toBuffer());
    } catch (err) {
        console.error('ZIP Error:', err);
        res.status(500).send('Failed to generate Sync Tool bundle.');
    }
});

// 5. Verify Auth (Used by Sync Tool on startup)
app.get('/api/sync/verify-auth', (req, res) => {
    const { access_code, admin_pin } = req.query;
    if (!access_code || !admin_pin) {
        return res.status(400).json({ error: 'Missing credentials' });
    }
    db.get('SELECT id FROM meets WHERE access_code = ? AND admin_pin = ?', [access_code, admin_pin], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Unauthorized: Invalid Meet Code or Admin PIN.' });
        res.json({ success: true, meet_id: row.id });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// SPA Catch-All (Must be last)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
