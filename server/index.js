import express from 'express';
import cors from 'cors';
import db from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';

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
        res.json({ id: this.lastID, success: true });
    });
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

    db.run('INSERT INTO meets (org_id, name, access_code) VALUES (?, ?, ?)', [org_id || 1, name, access_code], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, access_code, name });
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// SPA Catch-All (Must be last)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
