import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('swim-meet.db', (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
    db.exec('PRAGMA journal_mode = WAL;');
  }
});

db.serialize(() => {
  // 1. Organizations
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Meets
  db.run(`
    CREATE TABLE IF NOT EXISTS meets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      org_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      access_code TEXT UNIQUE NOT NULL, -- The 6-char code (e.g. 'DOL-26')
      admin_pin TEXT, -- Used for 2-Tier Auth in Sync Tool
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(org_id) REFERENCES organizations(id)
    )
  `);

  // Add admin_pin to existing DBs safely
  db.run("ALTER TABLE meets ADD COLUMN admin_pin TEXT", () => { });

  // 3. Time Entries (Scoped to Meet)
  db.run(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meet_id INTEGER NOT NULL,
      event_number INTEGER NOT NULL,
      heat_number INTEGER NOT NULL,
      lane INTEGER NOT NULL,
      time_ms INTEGER NOT NULL,
      is_no_show BOOLEAN DEFAULT 0,
      swimmer_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(meet_id) REFERENCES meets(id)
    )
  `, (err) => {
    // Seed Demo Data if empty
    if (!err) {
      db.get("SELECT count(*) as count FROM organizations", [], (err, row) => {
        if (row && row.count === 0) {
          console.log("Seeding Demo Data...");
          db.run("INSERT INTO organizations (name) VALUES ('Demo Swim Team')");
          db.run("INSERT INTO meets (org_id, name, access_code) VALUES (1, 'Summer Regionals', 'DEMO12')");
        }
      });
    }
  });

  // Add DQ columns to time_entries safely
  db.run("ALTER TABLE time_entries ADD COLUMN is_dq BOOLEAN DEFAULT 0", () => { });
  db.run("ALTER TABLE time_entries ADD COLUMN dq_code TEXT", () => { });
  db.run("ALTER TABLE time_entries ADD COLUMN dq_description TEXT", () => { });
  db.run("ALTER TABLE time_entries ADD COLUMN official_initials TEXT", () => { });
  db.run("ALTER TABLE time_entries ADD COLUMN raw_time INTEGER", () => { });

  // 4. Audit Logs
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meet_id INTEGER,
      action TEXT NOT NULL,
      payload TEXT,
      client_timestamp INTEGER,
      server_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Maestro Sync Receipts
  db.run(`
    CREATE TABLE IF NOT EXISTS maestro_sync_receipts (
      filename TEXT PRIMARY KEY,
      meet_id INTEGER,
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

export default db;
