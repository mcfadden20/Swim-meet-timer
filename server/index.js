import express from 'express';
import cors from 'cors';
import db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';
import { generateSD3 } from './utils/sd3.js';
import { initMaestroWatcher } from './utils/maestro/watcher.js';

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
    const { meet_id, event_number, heat_number, lane, time_ms, is_no_show, swimmer_name } = req.body;

    if (!meet_id || !event_number || !heat_number || !lane) {
        console.error('[POST /api/times] Missing fields');
        return res.status(400).json({ error: 'Missing required fields (Meet ID, Event, Heat, Lane)' });
    }

    const sql = 'INSERT INTO time_entries (meet_id, event_number, heat_number, lane, time_ms, is_no_show, swimmer_name) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const params = [meet_id, event_number, heat_number, lane, time_ms || 0, is_no_show ? 1 : 0, swimmer_name || ''];

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
                writeRaceData(1, event_number, heat_number, rows);
            }
        });

        res.json({ id: this.lastID, success: true });
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

import { maestroState } from './utils/maestro/watcher.js';

app.get('/api/maestro/status', (req, res) => {
    res.json(maestroState);
});

// --- Phase 16: Maestro Cloud-to-Local Sync Bridge APIs ---

// 1. Initial Setup Upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../maestro_data');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

app.post('/api/maestro/upload', upload.fields([
    { name: 'session_summary', maxCount: 1 },
    { name: 'meet_details', maxCount: 1 }
]), (req, res) => {
    res.json({ success: true, message: 'Files uploaded successfully.' });
});

// 2. Sync Pending Files (Retrieves generated JSON files not yet downloaded)
app.get('/api/sync/pending-files', (req, res) => {
    const { access_code, admin_pin } = req.query;
    if (!access_code || !admin_pin) {
        return res.status(400).json({ error: 'Missing access_code or admin_pin' });
    }

    db.get('SELECT id FROM meets WHERE access_code = ? AND admin_pin = ?', [access_code, admin_pin], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        // 2-Tier Authentication Check
        if (!row) return res.status(401).json({ error: 'Unauthorized: Invalid Meet Code or Admin PIN.' });

        const maestroDir = path.join(__dirname, '../maestro_data');
        if (!fs.existsSync(maestroDir)) {
            return res.json({ pending: [] });
        }

        const files = fs.readdirSync(maestroDir).filter(f => f.startsWith('session_') && f.endsWith('.json'));

        db.all('SELECT filename FROM maestro_sync_receipts WHERE meet_id = ?', [row.id], (err, syncedRows) => {
            if (err) return res.status(500).json({ error: err.message });

            const syncedFiles = new Set(syncedRows.map(r => r.filename));
            const pendingFilenames = files.filter(f => !syncedFiles.has(f));

            const payloads = pendingFilenames.map(filename => ({
                filename,
                content: JSON.parse(fs.readFileSync(path.join(maestroDir, filename), 'utf8'))
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initMaestroWatcher(); // Initialize file integration
});

// SPA Catch-All (Must be last)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
