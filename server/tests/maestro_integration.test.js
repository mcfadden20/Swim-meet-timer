import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

import { initMaestroWatcher, maestroState } from '../utils/maestro/watcher.js';
import { writeRaceData, writeTimingSystemConfig } from '../utils/maestro/writer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../');
const MAESTRO_DIR = path.join(ROOT_DIR, 'maestro_data');

// Clean up directory before starting
if (fs.existsSync(MAESTRO_DIR)) {
    const files = fs.readdirSync(MAESTRO_DIR);
    for (const file of files) {
        fs.unlinkSync(path.join(MAESTRO_DIR, file));
    }
} else {
    fs.mkdirSync(MAESTRO_DIR, { recursive: true });
}

// Very basic test runner
const runTest = async (name, testFn) => {
    console.log(`\n▶ Running test: ${name}`);
    try {
        await testFn();
        console.log(`✔ Passed: ${name}`);
    } catch (err) {
        console.error(`✖ Failed: ${name}`);
        console.error(err);
        process.exit(1);
    }
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log("Starting Maestro Integration QA Tests...");

    // 1. Initialize Watcher
    initMaestroWatcher();

    await runTest("Test 1: Watcher detects 'meet_details.json'", async () => {
        const payload = { meetName: "QA Integration Meet", startDate: "2026-10-31" };
        const filePath = path.join(MAESTRO_DIR, 'meet_details.json');

        fs.writeFileSync(filePath, JSON.stringify(payload), 'utf8');

        // Wait for chokidar to pick it up and parse
        await delay(1000);

        assert.deepStrictEqual(maestroState.meetDetails, payload, "maestroState.meetDetails should match the written payload");
    });

    await runTest("Test 2: Watcher detects 'session_summary.csv'", async () => {
        const csvContent = "\uFEFFEvent,Heat,Description\n1,1,Boys 50 Free\n1,2,Boys 50 Free\n2,1,Girls 50 Free";
        const filePath = path.join(MAESTRO_DIR, 'session_summary.csv');

        fs.writeFileSync(filePath, csvContent, 'utf8');

        // Wait for chokidar
        await delay(1000);

        // The parser parses the 3 rows. The logic in parser.js groups by Event number 
        // Let's just verify it parsed something successfully and has length > 0
        assert.ok(maestroState.sessionSummary.length > 0, "Should parse events from session_summary.csv");
        const firstEvent = maestroState.sessionSummary[0];
        assert.ok(firstEvent.eventNumber, "Parsed event should have an eventNumber property");
    });

    await runTest("Test 3: Writer parses payload to race files properly (incrementing race num)", async () => {
        const payload1 = {
            lane: 4,
            is_no_show: false,
            time_ms: 12345
        };
        const payload2 = {
            lane: 5,
            is_no_show: false,
            time_ms: 54321
        };

        // Write first payload (session 1, event 1, heat 1, array of times)
        writeRaceData(1, 1, 1, [payload1]);
        await delay(200);

        // Write second payload
        writeRaceData(1, 1, 1, [payload2]);
        await delay(200);

        // Verify files were created
        const race1Path = path.join(MAESTRO_DIR, 'session_1_event_1_heat_1_race_1.json');
        const race2Path = path.join(MAESTRO_DIR, 'session_1_event_1_heat_1_race_2.json');

        assert.ok(fs.existsSync(race1Path), "Race 1 file should exist");
        assert.ok(fs.existsSync(race2Path), "Race 2 file should exist");

        const data1 = JSON.parse(fs.readFileSync(race1Path, 'utf8'));
        const data2 = JSON.parse(fs.readFileSync(race2Path, 'utf8'));

        assert.strictEqual(data1.lanes[0].lane, 4);
        assert.strictEqual(data1.lanes[0].timer1, "00:00:12.345");

        assert.strictEqual(data2.lanes[0].lane, 5);
        assert.strictEqual(data2.lanes[0].timer1, "00:00:54.321");
    });

    console.log("\nAll Integration Tests Passed! ✅");
    process.exit(0);
}

main().catch(console.error);
