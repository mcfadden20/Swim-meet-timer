import fs from 'fs';
import { generateSD3 } from './utils/sd3.js';

console.log("Generating sample SD3...");
const content = generateSD3({ name: 'TEST MEET', org_id: '001' }, [{ swimmer_name: 'Doe, John', event_number: 1, time_ms: 32450 }]);

console.log("Verifying content...");
const lines = content.split('\r\n');
let errors = 0;

lines.forEach((line, i) => {
    // Last line might be empty if split by CRLF at end, but usually join doesn't add trailing.
    if (line.length === 0 && i === lines.length - 1) return;

    if (line.length !== 160) {
        console.error(`Error Line ${i + 1}: Length is ${line.length}, expected 160.`);
        console.error(`'${line}'`);
        errors++;
    }
});

if (lines[0].substring(0, 2) !== 'A0') { console.error("Header A0 missing"); errors++; }
if (lines[lines.length - 1].substring(0, 2) !== 'Z0') { console.error("Terminator Z0 missing"); errors++; }

if (errors === 0) {
    console.log("SUCCESS: All lines are exactly 160 characters.");
    process.exit(0);
} else {
    console.log(`FAILED: Found ${errors} errors.`);
    process.exit(1);
}
