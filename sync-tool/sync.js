import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { exec } from 'child_process';
import https from 'https';
import http from 'http';

const POLLING_INTERVAL = 120000; // 120 seconds
// For testing locally, allow overriding via command line or default to localhost
const API_BASE_URL = process.argv.includes('--local') ? 'http://localhost:3000' : 'https://swim-meet-timer.com'; // User would change this to their actual DO App URL

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function selectFolder() {
    return new Promise((resolve) => {
        const psCommand = `
            Add-Type -AssemblyName System.windows.forms;
            $dialog = New-Object System.Windows.Forms.FolderBrowserDialog;
            $dialog.Description = 'Select the Meet Maestro Data Directory';
            $dialog.ShowNewFolderButton = $true;
            if ($dialog.ShowDialog() -eq 'OK') { Write-Output $dialog.SelectedPath }
        `;

        console.log("Opening Windows folder selection dialog...");
        exec(`powershell -NoProfile -Command "${psCommand}"`, (error, stdout) => {
            if (error) {
                console.log("Failed to open native dialog.");
                resolve(null);
                return;
            }
            resolve(stdout.trim() || null);
        });
    });
}

// Minimal fetch polyfill for node < 18 or robust pkg support
function request(url, options = {}) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({
                ok: res.statusCode >= 200 && res.statusCode < 300,
                status: res.statusCode,
                json: () => JSON.parse(data),
                text: () => data
            }));
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

async function startSyncLoop(accessCode, adminPin, targetDir) {
    console.log(`\n===========================================`);
    console.log(`[SYNCHRONIZER ACTIVE]`);
    console.log(`Target Directory: ${targetDir}`);
    console.log(`Polling Interval: ${POLLING_INTERVAL / 1000} seconds`);
    console.log(`Press Ctrl+C to exit.`);
    console.log(`===========================================\n`);

    const poll = async () => {
        process.stdout.write(`[${new Date().toLocaleTimeString()}] Checking for new times... `);
        try {
            const url = `${API_BASE_URL}/api/sync/pending-files?access_code=${accessCode}&admin_pin=${adminPin}`;
            const res = await request(url);

            if (!res.ok) {
                console.log(`API Error: ${res.status}`);
                return;
            }

            const data = await res.json();
            const pendingFiles = data.pending || [];

            if (pendingFiles.length === 0) {
                console.log(`0 files pending.`);
                return;
            }

            console.log(`\n -> Found ${pendingFiles.length} new files to download.`);

            const successfulWrites = [];

            for (const file of pendingFiles) {
                const filePath = path.join(targetDir, file.filename);
                try {
                    // Maestro watches this directory. Writing must be atomic or fast.
                    fs.writeFileSync(filePath, JSON.stringify(file.content, null, 2), 'utf8');
                    successfulWrites.push(file.filename);
                    console.log(`    + Wrote: ${file.filename}`);
                } catch (err) {
                    // EBUSY might happen if Maestro is actively reading it, though rare for new files
                    console.error(`    - Failed to write ${file.filename}: ${err.message}`);
                }
            }

            // Send receipt
            if (successfulWrites.length > 0) {
                const receiptRes = await request(`${API_BASE_URL}/api/sync/receipt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_code: accessCode,
                        admin_pin: adminPin,
                        filenames: successfulWrites
                    })
                });

                if (receiptRes.ok) {
                    console.log(` -> Acknowledged ${successfulWrites.length} files with DO Cloud.`);
                } else {
                    console.log(` -> Failed to send receipt (Status ${receiptRes.status}). Will retry next cycle.`);
                }
            }

        } catch (error) {
            console.log(`Connection failed: ${error.message}`);
        }
    };

    // Run immediately, then loop
    poll();
    setInterval(poll, POLLING_INTERVAL);
}

async function main() {
    console.log("===========================================");
    console.log("   Maestro Cloud-to-Local Sync Bridge      ");
    console.log("===========================================\n");

    const accessCode = await question("Enter the 6-character Meet Code: ");
    const adminPin = await question("Enter the Admin PIN: ");

    if (!accessCode || !adminPin) {
        console.log("Error: Both Meet Code and Admin PIN are required.");
        process.exit(1);
    }

    let targetDir = await selectFolder();

    if (!targetDir) {
        console.log("No directory selected using GUI.");
        targetDir = await question("Please paste the absolute path to the Maestro Data directory:\n> ");
    }

    if (!targetDir || !fs.existsSync(targetDir)) {
        console.log(`Error: Directory '${targetDir}' does not exist.`);
        process.exit(1);
    }

    rl.close();
    startSyncLoop(accessCode.trim(), adminPin.trim(), targetDir.trim());
}

main();
