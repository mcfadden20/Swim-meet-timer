import { spawn } from 'child_process';
import sqlite3 from 'sqlite3';

const API_BASE = 'http://127.0.0.1:3000';
const DB_PATH = 'swim-meet.db';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerUp() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerUp()) return true;
    await wait(250);
  }
  return false;
}

function openDb() {
  const db = new sqlite3.Database(DB_PATH);
  const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function onRun(err) {
        if (err) return reject(err);
        resolve(this);
      });
    });
  const get = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  const close = () =>
    new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

  return { run, get, close };
}

function randomPin() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

async function ensureMeetOneAndPin(db) {
  await db.run("INSERT OR IGNORE INTO organizations (id, name) VALUES (1, 'Demo Swim Team')");
  await db.run("INSERT OR IGNORE INTO meets (id, org_id, name, access_code, is_active) VALUES (1, 1, 'Security Test Meet', 'SEC001', 1)");

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pin = randomPin();
    try {
      await db.run('UPDATE meets SET admin_pin = ? WHERE id = 1', [pin]);
      return pin;
    } catch (err) {
      if (!String(err.message || '').includes('UNIQUE constraint failed: meets.admin_pin')) {
        throw err;
      }
    }
  }

  throw new Error('Failed to assign unique PIN to meet 1');
}

async function main() {
  let serverProc = null;
  const serverWasRunning = await isServerUp();

  if (!serverWasRunning) {
    serverProc = spawn('node', ['server/index.js'], { stdio: 'ignore' });
    const ready = await waitForServer();
    if (!ready) {
      throw new Error('Server did not start within timeout');
    }
  }

  const db = openDb();

  try {
    const adminPin = await ensureMeetOneAndPin(db);

    await db.run(
      'DELETE FROM time_entries WHERE meet_id = ? AND event_number = ? AND heat_number = ? AND lane = ? AND is_dq = 1',
      [1, 1, 1, 1]
    );

    const noPinResponse = await fetch(`${API_BASE}/api/official/submit-dq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meet_id: 1,
        event_number: 1,
        heat_number: 1,
        lane: 1,
        dq_code: 'S101',
        dq_description: 'First infraction',
        official_initials: 'AB'
      })
    });

    if (noPinResponse.status !== 401) {
      throw new Error(`Test Case A failed: expected 401, got ${noPinResponse.status}`);
    }

    const firstSubmit = await fetch(`${API_BASE}/api/official/submit-dq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meet_id: 1,
        admin_pin: adminPin,
        event_number: 1,
        heat_number: 1,
        lane: 1,
        dq_code: 'S101',
        dq_description: 'First infraction',
        official_initials: 'AB'
      })
    });

    if (!firstSubmit.ok) {
      throw new Error(`Test Case B setup failed: first submit returned ${firstSubmit.status}`);
    }

    const secondReason = 'Second infraction overwrite reason';
    const secondSubmit = await fetch(`${API_BASE}/api/official/submit-dq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meet_id: 1,
        admin_pin: adminPin,
        event_number: 1,
        heat_number: 1,
        lane: 1,
        dq_code: 'S102',
        dq_description: secondReason,
        official_initials: 'CD'
      })
    });

    if (!secondSubmit.ok) {
      throw new Error(`Test Case B failed: second submit returned ${secondSubmit.status}`);
    }

    const countRow = await db.get(
      'SELECT COUNT(*) AS count FROM time_entries WHERE meet_id = ? AND event_number = ? AND heat_number = ? AND lane = ? AND is_dq = 1',
      [1, 1, 1, 1]
    );

    if ((countRow?.count || 0) !== 1) {
      throw new Error(`Test Case B failed: expected 1 DQ row, found ${countRow?.count || 0}`);
    }

    const dqRow = await db.get(
      'SELECT dq_description FROM time_entries WHERE meet_id = ? AND event_number = ? AND heat_number = ? AND lane = ? AND is_dq = 1 LIMIT 1',
      [1, 1, 1, 1]
    );

    if (dqRow?.dq_description !== secondReason) {
      throw new Error(`Test Case B failed: expected latest reason "${secondReason}", got "${dqRow?.dq_description}"`);
    }

    console.log('PASS: Test Case A (PIN bypass returns 401)');
    console.log('PASS: Test Case B (DQ idempotent overwrite keeps one row with second reason)');
  } finally {
    await db.run(
      'DELETE FROM time_entries WHERE meet_id = ? AND event_number = ? AND heat_number = ? AND lane = ? AND is_dq = 1',
      [1, 1, 1, 1]
    ).catch(() => {});
    await db.close().catch(() => {});

    if (serverProc) {
      serverProc.kill('SIGTERM');
    }
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
