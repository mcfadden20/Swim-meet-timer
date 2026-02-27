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
            const lines = buffer.split(/\r?\n/).filter(line => line.trim() !== '');

            // The CSV format is actually: Event,Heat,Description
            // So we parse each row and then group by Event to find the max Heat (heatCount)
            const rawData = lines.slice(1).map(line => {
                const cols = line.split(',');
                return {
                    eventNumber: cols[0]?.trim(),
                    heatNumber: parseInt(cols[1]?.trim()) || 0,
                    eventDescription: cols.slice(2).join(',').trim()
                };
            }).filter(row => row.eventNumber);

            const grouped = {};
            rawData.forEach(row => {
                if (!grouped[row.eventNumber]) {
                    grouped[row.eventNumber] = {
                        eventNumber: row.eventNumber,
                        eventDescription: row.eventDescription,
                        heatCount: 0,
                        heats: []
                    };
                }
                if (row.heatNumber > grouped[row.eventNumber].heatCount) {
                    grouped[row.eventNumber].heatCount = row.heatNumber;
                }
                if (row.heatNumber > 0 && !grouped[row.eventNumber].heats.includes(row.heatNumber)) {
                    grouped[row.eventNumber].heats.push(row.heatNumber);
                }
            });

            Object.values(grouped).forEach((event) => {
                event.heats.sort((a, b) => a - b);
            });

            // Convert map to array and maintain numeric sorting
            const data = Object.values(grouped).sort((a, b) => parseInt(a.eventNumber) - parseInt(b.eventNumber));

            resolve(data);
        });

        stream.on('error', (err) => {
            console.error(`[Maestro Parser] Error reading CSV:`, err.message);
            reject(err);
        });
    });
};
