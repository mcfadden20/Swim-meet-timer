
const BASE_URL = 'http://localhost:3000/api';

// Config
const NUM_SWIMMERS = 100;
const EVENTS = 3;
const LANES = 8;
const TIMERS_PER_LANE = 3;

// Name Generators
const FIRST_NAMES = ["Liam", "Olivia", "Noah", "Emma", "Oliver", "Charlotte", "Elijah", "Amelia", "James", "Ava", "William", "Sophia", "Benjamin", "Isabella", "Lucas", "Mia", "Henry", "Evelyn", "Theodore", "Harper"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];

function getRandomName() {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    return `${last}, ${first}`;
}

async function runSimulation() {
    console.log('Starting Simulation V3 (Realistic)...');

    // 1. ALWAYS Create New Meet
    const meetName = `Summer Splash Invitational ${new Date().getFullYear()}`;
    let meetId;

    try {
        console.log(`Creating new meet: ${meetName}...`);
        const createRes = await fetch(`${BASE_URL}/admin/meets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: meetName })
        });
        const newMeet = await createRes.json();
        meetId = newMeet.id;
        console.log(`Created meet: ${newMeet.name} (ID: ${meetId}, Code: ${newMeet.access_code})`);

    } catch (e) {
        console.error("Error creating meet:", e);
        return;
    }

    // 2. Generate Data
    let totalRequests = 0;

    // Generate Swimmers List first so they stay consistent across events
    const swimmers = [];
    for (let i = 0; i < NUM_SWIMMERS; i++) {
        swimmers.push({
            id: i + 1,
            name: getRandomName()
        });
    }

    for (let event = 1; event <= EVENTS; event++) {
        console.log(`\nSimulating Event ${event}...`);

        for (let i = 0; i < NUM_SWIMMERS; i++) {
            const swimmer = swimmers[i];
            const swimmerIdx = i + 1;

            const heat = Math.ceil(swimmerIdx / LANES);
            const lane = (swimmerIdx - 1) % LANES + 1;

            // Base time 25s - 45s
            const trueTime = 25000 + Math.random() * 20000;

            for (let timer = 1; timer <= TIMERS_PER_LANE; timer++) {
                // Timer error +/- 200ms
                const timerError = (Math.random() * 400) - 200;
                const recordedTime = Math.max(0, Math.floor(trueTime + timerError));

                const payload = {
                    meet_id: meetId,
                    event_number: event,
                    heat_number: heat,
                    lane: lane,
                    swimmer_name: swimmer.name,
                    time_ms: recordedTime,
                    is_no_show: false
                };

                await fetch(`${BASE_URL}/times`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).catch(e => console.error("Req Failed"));

                totalRequests++;
                if (totalRequests % 50 === 0) process.stdout.write('.');
            }
        }
    }

    console.log(`\n\nSimulation Complete.`);
    console.log(`Meet: ${meetName}`);
    console.log(`Total API Calls: ${totalRequests}`);
}

runSimulation();
