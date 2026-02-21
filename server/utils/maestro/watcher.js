import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseMeetDetails, parseSessionSummary } from './parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../');
const MAESTRO_DIR = path.join(ROOT_DIR, 'maestro_data');

// Global in-memory state for the active meet details pulled from Maestro.
// In a real app we might write this to the database, but keeping it in memory is 
// fast and suitable for this integration layer.
export const maestroState = {
    meetDetails: null,
    sessionSummary: []
};

/**
 * Attempts to parse a file with a retry backoff mechanism to handle files locked by Maestro.
 */
const parseWithRetry = async (filePath, parserFunc, retries = 5, delayMs = 100) => {
    for (let i = 0; i < retries; i++) {
        try {
            // Simple check if we can read it without EBUSY/EPERM throwing
            fs.accessSync(filePath, fs.constants.R_OK);
            const data = await parserFunc(filePath);
            return data;
        } catch (err) {
            if (err.code === 'EBUSY' || err.code === 'EPERM') {
                console.warn(`[Maestro Watcher] File locked (${filePath}). Retrying in ${delayMs}ms... (Attempt ${i + 1}/${retries})`);
                await new Promise(res => setTimeout(res, delayMs));
            } else {
                console.error(`[Maestro Watcher] Unexpected error reading file (${filePath}):`, err.message);
                break; // Break on non-lock errors
            }
        }
    }
    console.error(`[Maestro Watcher] Failed to read ${filePath} after ${retries} attempts.`);
    return null;
};

/**
 * Initializes the chokidar watcher on the maestro_data directory.
 */
export const initMaestroWatcher = () => {
    if (!fs.existsSync(MAESTRO_DIR)) {
        fs.mkdirSync(MAESTRO_DIR, { recursive: true });
    }

    const watcher = chokidar.watch(MAESTRO_DIR, {
        persistent: true,
        ignoreInitial: false, // Process existing files on startup
        awaitWriteFinish: {
            stabilityThreshold: 500, // Wait 500ms after file size stops changing before triggering
            pollInterval: 100
        }
    });

    watcher.on('add', handleFileChange).on('change', handleFileChange);

    console.log(`[Maestro Watcher] Monitoring ${MAESTRO_DIR} for changes...`);
};

const handleFileChange = async (filePath) => {
    const fileName = path.basename(filePath);

    if (fileName === 'meet_details.json') {
        console.log('[Maestro Watcher] Detected update to meet_details.json');
        const data = await parseWithRetry(filePath, parseMeetDetails);
        if (data) {
            maestroState.meetDetails = data;
            console.log('[Maestro Watcher] Successfully parsed meet_details.json');
        }
    } else if (fileName === 'session_summary.csv') {
        console.log('[Maestro Watcher] Detected update to session_summary.csv');
        const data = await parseWithRetry(filePath, parseSessionSummary);
        if (data) {
            maestroState.sessionSummary = data;
            console.log(`[Maestro Watcher] Successfully parsed session_summary.csv (${data.length} events)`);
        }
    }
};
