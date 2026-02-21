import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('swim-meet.db', sqlite3.OPEN_READONLY, (err) => {
    if (err) console.error(err);
});

db.all('SELECT * FROM time_entries ORDER BY id DESC LIMIT 5', (err, rows) => {
    if (err) console.error(err);
    console.log('Recent time_entries:', rows);
});

db.all('SELECT * FROM meets ORDER BY id DESC LIMIT 5', (err, rows) => {
    if (err) console.error(err);
    console.log('Recent meets:', rows);
});

db.close();
