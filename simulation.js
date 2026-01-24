// Native fetch used in Node 18+

// Config
const EVENTS = 4;
const HEATS_PER_EVENT = 3;
const LANES = 8;
const TIMERS_PER_LANE = 2; // "2 timers per lane"

const BASE_URL = 'http://127.0.0.1:3000/api/times';

async function runSimulation() {
    console.log('Starting Simulation...');

    let totalSaved = 0;

    for (let event = 1; event <= EVENTS; event++) {
        for (let heat = 1; heat <= HEATS_PER_EVENT; heat++) {
            for (let lane = 1; lane <= LANES; lane++) {
                for (let timer = 1; timer <= TIMERS_PER_LANE; timer++) {

                    // Randomize time slightly (approx 30s)
                    const baseTime = 30000;
                    const randomVar = Math.floor(Math.random() * 2000) - 1000;
                    const finalTime = baseTime + randomVar;

                    // 5% chance of No Show
                    const isNoShow = Math.random() < 0.05;

                    const payload = {
                        event_number: event,
                        heat_number: heat,
                        lane: lane,
                        time_ms: isNoShow ? 0 : finalTime,
                        is_no_show: isNoShow
                    };

                    try {
                        const res = await fetch(BASE_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });

                        if (res.ok) {
                            totalSaved++;
                            process.stdout.write('.');
                        } else {
                            console.error('Failed');
                        }
                    } catch (e) {
                        console.error('Error', e);
                    }
                }
            }
        }
    }

    console.log(`\nSimulation Complete. Total records: ${totalSaved}`);
}

runSimulation();
