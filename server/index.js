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

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function generateUniqueAdminPin(callback, attempts = 0) {
    if (attempts >= 100) {
        callback(new Error('Unable to generate unique 4-digit admin PIN after multiple attempts.'));
        return;
    }

    const pin = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    db.get('SELECT id FROM meets WHERE admin_pin = ? LIMIT 1', [pin], (err, row) => {
        if (err) return callback(err);
        if (!row) return callback(null, pin);
        generateUniqueAdminPin(callback, attempts + 1);
    });
}

function createMeetWithUniquePin({ orgId, name, accessCode }, callback, attempts = 0) {
    if (attempts >= 20) {
        callback(new Error('Unable to create meet with a unique admin PIN.'));
        return;
    }

    generateUniqueAdminPin((pinErr, admin_pin) => {
        if (pinErr) return callback(pinErr);

        db.run('INSERT INTO meets (org_id, name, access_code, admin_pin) VALUES (?, ?, ?, ?)', [orgId, name, accessCode, admin_pin], function (err) {
            if (err && String(err.message || '').includes('UNIQUE constraint failed: meets.admin_pin')) {
                createMeetWithUniquePin({ orgId, name, accessCode }, callback, attempts + 1);
                return;
            }
            if (err) return callback(err);
            callback(null, { id: this.lastID, admin_pin });
        });
    });
}

function saveTimeEntry(payload, callback) {
    const {
        meet_id,
        event_number,
        heat_number,
        lane,
        time_ms,
        is_no_show,
        swimmer_name,
        is_dq,
        dq_code,
        dq_description,
        official_initials
    } = payload;

    const finish = (entryId) => {
        db.all('SELECT * FROM time_entries WHERE meet_id = ? AND event_number = ? AND heat_number = ?', [meet_id, event_number, heat_number], (fetchErr, rows) => {
            if (!fetchErr && rows) {
                writeRaceData(meet_id, 1, event_number, heat_number, rows);
                writeTimingSystemConfig(meet_id, event_number, heat_number);
            }
        });
        callback(null, entryId);
    };

    if (is_dq) {
        db.get(
            `SELECT id, raw_time, time_ms
             FROM time_entries
             WHERE meet_id = ? AND event_number = ? AND heat_number = ? AND lane = ? AND is_dq = 1
             ORDER BY id DESC
             LIMIT 1`,
            [meet_id, event_number, heat_number, lane],
            (findErr, existingDq) => {
                if (findErr) return callback(findErr);

                if (existingDq) {
                    const rawTime = existingDq.raw_time !== null ? existingDq.raw_time : existingDq.time_ms;
                    db.run(
                        `UPDATE time_entries
                         SET time_ms = ?, is_no_show = 0, swimmer_name = ?, is_dq = 1,
                             dq_code = ?, dq_description = ?, official_initials = ?, raw_time = ?
                         WHERE id = ?`,
                        [
                            time_ms || 0,
                            swimmer_name || '',
                            dq_code || null,
                            dq_description || null,
                            official_initials || null,
                            rawTime,
                            existingDq.id
                        ],
                        function (updateErr) {
                            if (updateErr) return callback(updateErr);
                            finish(existingDq.id);
                        }
                    );
                    return;
                }

                db.run(
                    `INSERT INTO time_entries (
                        meet_id, event_number, heat_number, lane, time_ms, is_no_show, swimmer_name, is_dq, dq_code, dq_description, official_initials
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        meet_id,
                        event_number,
                        heat_number,
                        lane,
                        time_ms || 0,
                        0,
                        swimmer_name || '',
                        1,
                        dq_code || null,
                        dq_description || null,
                        official_initials || null
                    ],
                    function (insertErr) {
                        if (insertErr) return callback(insertErr);
                        finish(this.lastID);
                    }
                );
            }
        );
        return;
    }

    db.run(
        `INSERT INTO time_entries (
            meet_id, event_number, heat_number, lane, time_ms, is_no_show, swimmer_name, is_dq, dq_code, dq_description, official_initials
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            meet_id,
            event_number,
            heat_number,
            lane,
            time_ms || 0,
            is_no_show ? 1 : 0,
            swimmer_name || '',
            0,
            null,
            null,
            null
        ],
        function (err) {
            if (err) return callback(err);
            finish(this.lastID);
        }
    );
}

// Preload DQ Codes
const dqCodesPath = path.join(__dirname, 'utils/maestro/dq_codes.json');
let dqCodes = {};
try {
    dqCodes = JSON.parse(fs.readFileSync(dqCodesPath, 'utf8'));
} catch (e) {
    console.warn("Failed to load dq_codes.json", e);
}

app.use(cors());
app.use(express.json());

// QR Code Redirect Route (MUST be before static files)
app.get('/qr', (req, res) => {
    const redirectUrl = process.env.QR_REDIRECT_URL || 'http://localhost:5173/landing';
    console.log(`[QR Redirect] QR_REDIRECT_URL env var: ${process.env.QR_REDIRECT_URL}`);
    console.log(`[QR Redirect] Using URL: ${redirectUrl}`);
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.redirect(302, redirectUrl);
});

// Serve Static Frontend (Production)
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('/', (req, res) => {
    res.json({ message: 'Swim Meet Timer API Ready' });
});

app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'swim-meet-timer-api' });
});

app.get('/api/dq-codes', (req, res) => {
    res.json(dqCodes);
});

app.get('/api/times', (req, res) => {
    const meetId = req.query.meet_id;
    if (!meetId) {
        return res.status(400).json({ error: 'Missing meet_id' });
    }

    db.all('SELECT * FROM time_entries WHERE meet_id = ? ORDER BY created_at DESC', [meetId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/join-meet', (req, res) => {
    const { access_code } = req.body;
    db.get('SELECT id, name, org_id, access_code FROM meets WHERE access_code = ? AND is_active = 1', [access_code], (err, row) => {
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

    saveTimeEntry({
        meet_id,
        event_number,
        heat_number,
        lane,
        time_ms,
        is_no_show,
        swimmer_name,
        is_dq,
        dq_code,
        dq_description,
        official_initials
    }, (err, entryId) => {
        if (err) {
            console.error('[POST /api/times] DB Error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('[POST /api/times] Success, ID:', entryId);
        res.json({ id: entryId, success: true });
    });
});

app.post('/api/official/submit-dq', (req, res) => {
    const { meet_id, admin_pin, event_number, heat_number, lane, dq_code, dq_description, official_initials } = req.body;

    if (!meet_id || !event_number || !heat_number || !lane || !dq_code || !dq_description || !official_initials) {
        return res.status(400).json({ error: 'Missing required fields for DQ submission' });
    }

    if (admin_pin === undefined || admin_pin === null || String(admin_pin).trim() === '') {
        return res.status(401).json({ error: 'PIN required' });
    }

    db.get('SELECT id FROM meets WHERE id = ? AND admin_pin = ? LIMIT 1', [meet_id, String(admin_pin).trim()], (verifyErr, row) => {
        if (verifyErr) return res.status(500).json({ error: verifyErr.message });
        if (!row) return res.status(401).json({ error: 'Invalid PIN' });

        saveTimeEntry({
            meet_id,
            event_number,
            heat_number,
            lane,
            time_ms: 0,
            is_no_show: false,
            swimmer_name: '',
            is_dq: true,
            dq_code,
            dq_description,
            official_initials: String(official_initials).toUpperCase()
        }, (saveErr, entryId) => {
            if (saveErr) return res.status(500).json({ error: saveErr.message });
            res.json({ success: true, id: entryId });
        });
    });
});

app.post('/api/official/verify-pin', (req, res) => {
    const { meet_id, admin_pin } = req.body;
    if (!meet_id || admin_pin === undefined || admin_pin === null) {
        return res.status(400).json({ error: 'Missing meet_id or admin_pin' });
    }

    db.get('SELECT id FROM meets WHERE id = ? AND admin_pin = ? LIMIT 1', [meet_id, String(admin_pin).trim()], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(401).json({ error: 'Invalid PIN' });
        res.json({ success: true });
    });
});

app.put('/api/times/:id', (req, res) => {
    const timeId = req.params.id;
    const {
        event_number,
        heat_number,
        lane,
        time_ms,
        is_no_show,
        is_dq,
        dq_code,
        dq_description,
        official_initials
    } = req.body;

    db.get('SELECT * FROM time_entries WHERE id = ?', [timeId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Time entry not found' });

        const nextEventNumber = Number.isFinite(Number(event_number)) ? Number(event_number) : row.event_number;
        const nextHeatNumber = Number.isFinite(Number(heat_number)) ? Number(heat_number) : row.heat_number;
        const nextLane = Number.isFinite(Number(lane)) ? Number(lane) : row.lane;
        const nextTimeMs = Number.isFinite(Number(time_ms)) ? Number(time_ms) : row.time_ms;
        const nextIsNoShow = typeof is_no_show === 'boolean' ? (is_no_show ? 1 : 0) : (row.is_no_show ? 1 : 0);
        const nextIsDq = typeof is_dq === 'boolean' ? (is_dq ? 1 : 0) : (row.is_dq ? 1 : 0);
        const nextDqCode = nextIsDq ? (dq_code || null) : null;
        const nextDqDescription = nextIsDq ? (dq_description || null) : null;
        const nextOfficialInitials = nextIsDq ? (official_initials || null) : null;

        // If this is the FIRST time it's being edited, stash the original time into raw_time
        const rawTime = row.raw_time !== null ? row.raw_time : row.time_ms;

        db.run(
            `UPDATE time_entries
             SET event_number = ?, heat_number = ?, lane = ?, time_ms = ?, is_no_show = ?,
                 is_dq = ?, dq_code = ?, dq_description = ?, official_initials = ?, raw_time = ?
             WHERE id = ?`,
            [
                nextEventNumber,
                nextHeatNumber,
                nextLane,
                nextTimeMs,
                nextIsNoShow,
                nextIsDq,
                nextDqCode,
                nextDqDescription,
                nextOfficialInitials,
                rawTime,
                timeId
            ],
            function (updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });

                // Rewrite the Maestro race file indicating a revision
                db.all('SELECT * FROM time_entries WHERE meet_id = ? AND event_number = ? AND heat_number = ?', [row.meet_id, nextEventNumber, nextHeatNumber], (fetchErr, allRows) => {
                    if (!fetchErr && allRows) {
                        writeRaceData(row.meet_id, 1, nextEventNumber, nextHeatNumber, allRows, undefined, true);
                        writeTimingSystemConfig(row.meet_id, nextEventNumber, nextHeatNumber);
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
    createMeetWithUniquePin({ orgId: org_id || 1, name, accessCode: access_code }, (err, created) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: created.id, access_code, admin_pin: created.admin_pin, name });
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
    const meetId = req.query.meet_id;
    if (!meetId) return res.status(400).send('Missing meet_id');

    db.all('SELECT * FROM time_entries WHERE meet_id = ? ORDER BY created_at DESC', [meetId], (err, rows) => {
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
    const meetId = req.query.meet_id;
    if (!meetId) return res.status(400).send('Missing meet_id');

    db.get('SELECT * FROM meets WHERE id = ?', [meetId], (err, meet) => {
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

        createMeetWithUniquePin({ orgId: 1, name: meetName, accessCode: access_code }, (createErr, created) => {
            if (createErr) return res.status(500).json({ error: createErr.message });

            const meetId = created.id;
            const meetDir = path.join(__dirname, `../maestro_data/${meetId}`);

            if (!fs.existsSync(meetDir)) fs.mkdirSync(meetDir, { recursive: true });

            fs.writeFileSync(path.join(meetDir, 'meet_details.json'), meetDetailsFile.buffer);
            fs.writeFileSync(path.join(meetDir, 'session_summary.csv'), sessionSummaryFile.buffer);

            res.json({ success: true, meet_id: meetId, name: meetName, access_code, admin_pin: created.admin_pin });
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

        db.all('SELECT filename FROM maestro_sync_receipts_scoped WHERE meet_id = ?', [row.id], (err, syncedRows) => {
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

        const stmt = db.prepare('INSERT OR IGNORE INTO maestro_sync_receipts_scoped (filename, meet_id) VALUES (?, ?)');
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
