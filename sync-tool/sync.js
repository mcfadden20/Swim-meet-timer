const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const https = require('https');
const http = require('http');

const POLLING_INTERVAL = 120000; // 120 seconds

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

process.on('uncaughtException', (err) => {
    console.error('\n[FATAL ERROR] An unexpected error occurred:');
    console.error(err.message);
    console.error(err.stack);
    console.log('\nThe application has crashed. Press ENTER to close this window.');
    rl.question('', () => {
        process.exit(1);
    });
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function selectFolder() {
    return new Promise((resolve) => {
        try {
            const os = require('os');
            const vbsPath = path.join(os.tmpdir(), 'folder_picker_maestro.vbs');
            const vbsCode = `
Set objShell = CreateObject("Shell.Application")
Set objFolder = objShell.BrowseForFolder(0, "Select the Meet Maestro Data Directory", 0, 0)
If Not objFolder Is Nothing Then
    WScript.Echo objFolder.Self.Path
End If
            `.trim();
            fs.writeFileSync(vbsPath, vbsCode);

            console.log("Opening Windows folder selection dialog...");
            exec(`cscript //nologo "${vbsPath}"`, (error, stdout) => {
                try {
                    if (fs.existsSync(vbsPath)) fs.unlinkSync(vbsPath);
                } catch (e) { }

                if (error || !stdout.trim()) {
                    console.log("Failed to open native dialog. You will need to enter the path manually.");
                    resolve(null);
                    return;
                }
                resolve(stdout.trim() || null);
            });
        } catch (err) {
            console.error("Error invoking VBScript dialog:", err.message);
            resolve(null);
        }
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

async function startSyncLoop(apiUrl, accessCode, adminPin, targetDir) {
    console.log(`\n===========================================`);
    console.log(`[SYNCHRONIZER ACTIVE]`);
    console.log(`Target Directory: ${targetDir}`);
    console.log(`Server URL:       ${apiUrl}`);
    console.log(`Polling Interval: ${POLLING_INTERVAL / 1000} seconds`);
    console.log(`Press Ctrl+C to exit.`);
    console.log(`===========================================\n`);

    const poll = async () => {
        process.stdout.write(`[${new Date().toLocaleTimeString()}] Checking for new times... `);
        try {
            const url = `${apiUrl}/api/sync/pending-files?access_code=${accessCode}&admin_pin=${adminPin}`;
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
                const receiptRes = await request(`${apiUrl}/api/sync/receipt`, {
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

    let apiUrl = 'http://localhost:3000';
    try {
        const configPath = path.join(path.dirname(process.execPath), 'config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.apiUrl) {
                apiUrl = config.apiUrl;
                console.log(`Loaded Server URL from config.json: ${apiUrl}`);
            }
        } else {
            let promptUrl = await question("Enter the DO App URL (or leave blank for http://localhost:3000):\n> ");
            apiUrl = promptUrl.trim() || 'http://localhost:3000';
        }
    } catch (e) {
        let promptUrl = await question("Enter the DO App URL (or leave blank for http://localhost:3000):\n> ");
        apiUrl = promptUrl.trim() || 'http://localhost:3000';
    }
    apiUrl = apiUrl.replace(/\/+$/, '');

    let accessCode, adminPin;
    while (true) {
        accessCode = await question("Enter the 6-character Meet Code: ");
        adminPin = await question("Enter the Admin PIN: ");

        if (!accessCode || !adminPin) {
            console.log("Error: Both Meet Code and Admin PIN are required.");
            continue;
        }

        process.stdout.write("Verifying credentials... ");
        try {
            const url = `${apiUrl}/api/sync/verify-auth?access_code=${accessCode.trim()}&admin_pin=${adminPin.trim()}`;
            const res = await request(url);
            if (res.ok) {
                console.log("SUCCESS");
                break;
            } else {
                console.log(`FAILED (${res.status}). Check your Meet Code and PIN.`);
            }
        } catch (err) {
            console.log(`CONNECTION FAILED. Could not reach server (${apiUrl}).`);
            console.log("Press Ctrl+C to exit.");
            // We wait forever if unreachable so it doesn't just crash out
            await new Promise(() => { });
        }
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
    startSyncLoop(apiUrl, accessCode.trim(), adminPin.trim(), targetDir.trim());
}

main();
