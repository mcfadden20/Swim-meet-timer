import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../../../');
const MAESTRO_DIR = path.join(ROOT_DIR, 'maestro_data');

/**
 * Writes the configuration JSON for the timing system.
 */
export const writeTimingSystemConfig = (meetId, currentEvent, currentHeat, currentSessionNumber = 1, protocolVersion = "1.2.3") => {
    const meetDir = path.join(MAESTRO_DIR, String(meetId));
    if (!fs.existsSync(meetDir)) {
        fs.mkdirSync(meetDir, { recursive: true });
    }
    const filePath = path.join(meetDir, 'timing_system_configuration.json');

    // We increment a static global currentRaceNumber simply for the config file heartbeat.
    // Maestro documentation says currentRaceNumber is a "1 indexed, auto incrementing race number"
    if (!global.configRaceNumber) global.configRaceNumber = 1;

    const data = {
        currentEvent: String(currentEvent),
        currentHeat: parseInt(currentHeat),
        currentSessionNumber: parseInt(currentSessionNumber),
        currentRaceNumber: global.configRaceNumber++,
        protocolVersion: protocolVersion,
        timingSystemType: "Swim Meet Timer",
        timingSystemVersion: "1.0.0",
        updatedAt: new Date().toISOString(),
        timersPerLaneCount: 1 // Default
    };

    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('[Maestro Writer] Error writing config:', err.message);
    }
};

/**
 * Scans directory to find the next available race increment for a given heat
 */
const getNextRaceNumber = (meetId, sessionStr, eventStr, heatStr) => {
    const meetDir = path.join(MAESTRO_DIR, String(meetId));
    const prefix = `session_${sessionStr}_event_${eventStr}_heat_${heatStr}_race_`;
    let maxRace = 0;

    if (fs.existsSync(meetDir)) {
        const files = fs.readdirSync(meetDir);
        for (const file of files) {
            if (file.startsWith(prefix) && file.endsWith('.json')) {
                // Extract the X from _race_X.json
                const match = file.match(/_race_(\d+)\.json$/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxRace) {
                        maxRace = num;
                    }
                }
            }
        }
    }
    return maxRace + 1;
};

/**
 * Generates an immutable race data file.
 * We package multiple time entries for the same heat into a single payload array here.
 */
export const writeRaceData = (meetId, sessionNumber = 1, eventNumber, heatNumber, timesArray, protocolVersion = "1.2.3", isRevision = false) => {
    const meetDir = path.join(MAESTRO_DIR, String(meetId));
    if (!fs.existsSync(meetDir)) {
        fs.mkdirSync(meetDir, { recursive: true });
    }

    const raceNum = getNextRaceNumber(meetId, sessionNumber, eventNumber, heatNumber);
    const suffix = isRevision ? '-revised' : '';
    const fileName = `session_${sessionNumber}_event_${eventNumber}_heat_${heatNumber}_race_${raceNum}${suffix}.json`;
    const filePath = path.join(meetDir, fileName);

    const formatTime = (time_ms) => {
        if (!time_ms) return null;
        const hours = Math.floor(time_ms / 3600000);
        const minutes = Math.floor((time_ms % 3600000) / 60000);
        const seconds = Math.floor((time_ms % 60000) / 1000);
        const thousandths = time_ms % 1000;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${thousandths.toString().padStart(3, '0')}`;
    };

    const lanes = timesArray.map(t => ({
        lane: parseInt(t.lane),
        timer1: t.is_no_show ? null : formatTime(t.time_ms),
        isEmpty: !!t.is_no_show,
        isDq: !!t.is_dq,
        dqCode: t.dq_code || null,
        dqDescription: t.dq_description || null,
        dqOfficial: t.official_initials || null
    }));

    const data = {
        createdAt: new Date().toISOString(),
        protocolVersion: protocolVersion,
        lanes: lanes
    };

    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`[Maestro Writer] Written race file: ${fileName}`);
    } catch (err) {
        console.error('[Maestro Writer] Error writing race data:', err.message);
    }
};
