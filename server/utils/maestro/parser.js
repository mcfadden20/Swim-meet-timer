import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Strips UTF-8 BOM characters from a string
 */
function stripBOM(content) {
    if (content.charCodeAt(0) === 0xFEFF) {
        return content.slice(1);
    }
    return content;
}

/**
 * Safely parses the JSON meet details file.
 * @param {string} filePath 
 */
export const parseMeetDetails = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) return null;
        let rawContent = fs.readFileSync(filePath, 'utf-8');
        rawContent = stripBOM(rawContent);
        return JSON.parse(rawContent);
    } catch (err) {
        console.error(`[Maestro Parser] Error parsing meet details:`, err.message);
        return null;
    }
};

/**
 * Parses the CSV session summary file.
 * @param {string} filePath 
 */
export const parseSessionSummary = (filePath) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            return resolve([]);
        }

        const results = [];

        // We manually strip BOM from the stream if it exists
        const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });

        let isFirstData = true;
        let buffer = '';

        stream.on('data', (chunk) => {
            if (isFirstData) {
                chunk = stripBOM(chunk);
                isFirstData = false;
            }
            buffer += chunk;
        });

        stream.on('end', () => {
            // Very simple CSV parser, assuming 5 columns as per protocol
            const lines = buffer.split(/\r?\n/).filter(line => line.trim() !== '');

            // Skip header if it exists (Protocol says "Example Contents" but doesn't explicitly guarantee headers. Usually it does.)
            // We'll read raw rows for now based on index.
            const data = lines.map(line => {
                // simple split by comma, ignoring quotes for simplistic implementation based on protocol spec
                const cols = line.split(',');
                return {
                    eventNumber: cols[0]?.trim(),
                    eventDescription: cols[1]?.trim(),
                    heatCount: parseInt(cols[2]?.trim()) || 0,
                    unused: cols[3]?.trim(),
                    roundCode: cols[4]?.trim()
                };
            }).filter(row => row.eventNumber && row.eventNumber.toLowerCase() !== 'event number'); // filter out possible header

            resolve(data);
        });

        stream.on('error', (err) => {
            console.error(`[Maestro Parser] Error reading CSV:`, err.message);
            reject(err);
        });
    });
};
