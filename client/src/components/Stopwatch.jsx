import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Save, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Audit Log Helper
const logAudit = (meetId, action, payload) => {
    try {
        const body = {
            meet_id: meetId,
            action,
            payload,
            client_timestamp: Date.now()
        };
        // Use sendBeacon if available for guaranteed sending on unload, else fetch
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
            navigator.sendBeacon('/api/audit', blob);
        } else {
            fetch('/api/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }).catch(e => console.error("Audit log failed", e));
        }
    } catch (e) {
        console.error("Audit error", e);
    }
};

// Offline Queue Helper
const saveOffline = (payload) => {
    try {
        const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
        queue.push({ ...payload, offline_created_at: Date.now() });
        localStorage.setItem('offline_queue', JSON.stringify(queue));
        alert('Offline: Result saved locally. Will sync when online.');
    } catch (e) {
        alert('Critical: Could not save offline result!');
    }
};

export default function Stopwatch({ meetId, orgName }) {
    // State
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [reviewMode, setReviewMode] = useState(false); // New: Review state after stop

    // Metadata State
    const [eventNum, setEventNum] = useState(1);
    const [heatNum, setHeatNum] = useState(1);
    const [laneNum, setLaneNum] = useState(() => {
        const saved = localStorage.getItem('swim-lane');
        return saved ? Number(saved) : 1;
    });
    const [isNoShow, setIsNoShow] = useState(false);

    // Maestro State
    const [maestroEvents, setMaestroEvents] = useState([]);
    const [useMaestro, setUseMaestro] = useState(false);

    // Fetch Maestro Status on Mount
    useEffect(() => {
        const fetchMaestro = async () => {
            try {
                const res = await fetch(`/api/maestro/status?meet_id=${meetId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.sessionSummary && data.sessionSummary.length > 0) {
                        setMaestroEvents(data.sessionSummary);
                        setUseMaestro(true);

                        // If eventNum is currently just "1" and we have Maestro data, try to sync it.
                        // In a real app we'd map it cleanly, but for now just take the first event if current is not in list
                        const evExists = data.sessionSummary.find(e => e.eventNumber == eventNum);
                        if (!evExists) {
                            setEventNum(data.sessionSummary[0].eventNumber);
                        }
                    }
                }
            } catch (e) {
                console.error("No maestro data found");
            }
        };
        fetchMaestro();
    }, []);

    // Placeholder Swimmer Data
    const [swimmer, setSwimmer] = useState({ name: "Swimmer Name", entry: "00:00.00" });

    const startTimeRef = useRef(0);
    const rafRef = useRef(null);

    // Persist Lane
    useEffect(() => {
        localStorage.setItem('swim-lane', laneNum);
        // Mock fetch swimmer data when details change
        setSwimmer({
            name: `Swimmer (Ln ${laneNum})`,
            entry: `${(eventNum * 10) + heatNum}:00.00`
        });
    }, [laneNum, eventNum, heatNum]);

    // Wake Lock & Haptics Util
    const enableWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                await navigator.wakeLock.request('screen');
            }
        } catch (err) { console.error('WakeLock Error', err); }
    };

    const triggerHaptic = (pattern = 50) => {
        if (navigator.vibrate) navigator.vibrate(pattern);
    };

    // Sync Offline Queue
    useEffect(() => {
        const syncQueue = async () => {
            if (!navigator.onLine) return;
            const queue = JSON.parse(localStorage.getItem('offline_queue') || '[]');
            if (queue.length === 0) return;

            console.log(`Syncing ${queue.length} offline records...`);
            const remaining = [];

            for (const item of queue) {
                try {
                    const res = await fetch('/api/times', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(item)
                    });
                    if (!res.ok) throw new Error('Sync failed');
                } catch (e) {
                    remaining.push(item);
                }
            }

            localStorage.setItem('offline_queue', JSON.stringify(remaining));
            if (remaining.length === 0) {
                console.log("Sync Complete");
            }
        };

        window.addEventListener('online', syncQueue);
        const interval = setInterval(syncQueue, 30000); // Try every 30s
        syncQueue(); // Try on mount

        return () => {
            window.removeEventListener('online', syncQueue);
            clearInterval(interval);
        };
    }, []);

    // Persistent Wake Lock on Mount
    useEffect(() => {
        enableWakeLock();
        // Re-request wake lock if visibility changes (e.g. user tabs out and back)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') enableWakeLock();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Start Interaction
    const handleStart = () => {
        setIsRunning(true);
        setReviewMode(false);
        triggerHaptic(50);
        logAudit(meetId, 'START', { eventNum, heatNum, laneNum });
        startTimeRef.current = performance.now() - elapsedTime;

        // Animation Loop
        const loop = () => {
            const now = performance.now();
            setElapsedTime(now - startTimeRef.current);
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
    };

    // Stop Interaction (Just Stop, don't save yet)
    const handleStop = () => {
        setIsRunning(false);
        setReviewMode(true); // Enter Review Mode
        triggerHaptic(50);
        logAudit(meetId, 'STOP', { eventNum, heatNum, laneNum, time_ms: elapsedTime });
        cancelAnimationFrame(rafRef.current);
    };

    // Save & Advance Interaction
    const handleSaveAndNext = async () => {
        triggerHaptic([50, 50, 100]); // Distinct double-buzz on Save
        const payload = {
            meet_id: meetId,
            event_number: Number(eventNum),
            heat_number: Number(heatNum),
            lane: Number(laneNum),
            swimmer_name: swimmer?.name || "",
            time_ms: Math.floor(elapsedTime), // Ensure integer
            is_no_show: false
        };

        logAudit(meetId, 'SAVE', payload);

        try {
            console.log("Saving Payload:", payload); // Debugging

            const response = await fetch('/api/times', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('Server Error');
            }
        } catch (error) {
            console.error('Error saving:', error);
            saveOffline(payload);
        }

        // Intelligent Auto-Advance based on Maestro Data
        // User requested: Auto-advance heats too
        if (useMaestro && maestroEvents.length > 0) {
            const currentEventIdx = maestroEvents.findIndex(ev => Number(ev.eventNumber) === Number(eventNum));
            if (currentEventIdx !== -1) {
                const currentEvent = maestroEvents[currentEventIdx];
                if (Number(heatNum) >= Number(currentEvent.heatCount)) {
                    // Advance Event to next, reset Heat to 1
                    if (currentEventIdx + 1 < maestroEvents.length) {
                        setEventNum(Number(maestroEvents[currentEventIdx + 1].eventNumber));
                        setHeatNum(1);
                    }
                } else {
                    // Advance Heat
                    setHeatNum(h => Number(h) + 1);
                }
            } else {
                setHeatNum(h => Number(h) + 1); // Fallback if event missing
            }
        } else {
            if (heatNum >= 1) setHeatNum(h => Number(h) + 1);
        }

        setElapsedTime(0);
        setIsRunning(false);
        setReviewMode(false);
        setIsNoShow(false);
    };

    // Reset current race
    const handleReset = () => {
        if (confirm('Reset timer? This will discard the current time.')) {
            logAudit(meetId, 'RESET', { eventNum, heatNum, laneNum, timeDiscarded: elapsedTime });
            setIsRunning(false);
            setReviewMode(false);
            setElapsedTime(0);
            cancelAnimationFrame(rafRef.current);
        }
    };

    // Manual No Show Save
    const handleNoShowSave = async () => {
        const payload = {
            meet_id: meetId,
            event_number: Number(eventNum),
            heat_number: Number(heatNum),
            lane: Number(laneNum),
            time_ms: 0,
            is_no_show: true
        };

        logAudit(meetId, 'NO_SHOW', payload);

        try {
            const response = await fetch('/api/times', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Server Error');
        } catch (error) {
            console.error('Error saving No Show:', error);
            saveOffline(payload);
        }

        if (useMaestro && maestroEvents.length > 0) {
            const currentEventIdx = maestroEvents.findIndex(ev => Number(ev.eventNumber) === Number(eventNum));
            if (currentEventIdx !== -1) {
                const currentEvent = maestroEvents[currentEventIdx];
                if (Number(heatNum) >= Number(currentEvent.heatCount)) {
                    if (currentEventIdx + 1 < maestroEvents.length) {
                        setEventNum(Number(maestroEvents[currentEventIdx + 1].eventNumber));
                        setHeatNum(1);
                    }
                } else {
                    setHeatNum(h => Number(h) + 1);
                }
            } else {
                setHeatNum(h => Number(h) + 1);
            }
        } else {
            if (heatNum >= 1) setHeatNum(h => Number(h) + 1);
        }
        setIsNoShow(false);
        setElapsedTime(0);
        setReviewMode(false);
    };

    const formatTime = (ms) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-4 w-full max-w-md h-[calc(100vh-80px)] pb-32">

            {/* Status Bar */}
            <div className={cn(
                "w-full py-2 text-center text-xs font-bold tracking-widest uppercase border-b-2 transition-colors",
                isRunning ? "border-red-500 text-red-500 animate-pulse" :
                    (reviewMode ? "border-yellow-400 text-yellow-400" : "border-cyan-400 text-cyan-400")
            )}>
                {isRunning ? "RACE IN PROGRESS" : (reviewMode ? "REVIEW & SAVE" : (isNoShow ? "CONFIRM NO SHOW" : "PRESS TO START"))}
            </div>

            {/* Inputs - Compact Row */}
            <div className="flex justify-between gap-2 bg-navy-800 py-6 px-2 rounded-xl border border-navy-800">
                {/* Event Selector (Dynamic if Maestro exists) */}
                <div className="flex flex-col items-center w-1/3">
                    <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider mb-2">Event</span>
                    {useMaestro ? (
                        <select
                            value={eventNum}
                            onChange={(e) => setEventNum(e.target.value)}
                            className="w-full bg-navy-900 border border-white/10 rounded-lg p-2 text-left text-sm font-bold text-white outline-none"
                        >
                            {maestroEvents.map(ev => (
                                <option key={ev.eventNumber} value={ev.eventNumber}>
                                    {ev.eventNumber} - {ev.eventDescription || `Event ${ev.eventNumber}`}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <div className="flex items-center w-full bg-navy-900 rounded-lg border border-white/5">
                            <button className="px-3 py-4 text-slate-500 hover:text-white hover:bg-white/5 rounded-l-lg transition-colors" onClick={() => setEventNum(v => Math.max(1, Number(v) - 1))}>-</button>
                            <input
                                type="number"
                                value={eventNum}
                                onChange={(e) => setEventNum(Number(e.target.value))}
                                className="no-spinners w-full bg-transparent text-center text-2xl font-black text-white outline-none"
                            />
                            <button className="px-3 py-4 text-slate-500 hover:text-white hover:bg-white/5 rounded-r-lg transition-colors" onClick={() => setEventNum(v => Number(v) + 1)}>+</button>
                        </div>
                    )}
                </div>

                {/* Heat & Lane remain standard inputs */}
                {['Heat', 'Lane'].map((label, idx) => {
                    const val = idx === 0 ? heatNum : laneNum;
                    const setVal = idx === 0 ? setHeatNum : setLaneNum;
                    return (
                        <div key={label} className="flex flex-col items-center w-1/3">
                            <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider mb-2">{label}</span>
                            <div className="flex items-center w-full bg-navy-900 rounded-lg border border-white/5">
                                <button className="px-3 py-4 text-slate-500 hover:text-white hover:bg-white/5 rounded-l-lg transition-colors" onClick={() => setVal(v => Math.max(1, Number(v) - 1))}>-</button>
                                <input
                                    type="number"
                                    value={val}
                                    onChange={(e) => setVal(Number(e.target.value))}
                                    className="no-spinners w-full bg-transparent text-center text-2xl font-black text-white outline-none"
                                />
                                <button className="px-3 py-4 text-slate-500 hover:text-white hover:bg-white/5 rounded-r-lg transition-colors" onClick={() => setVal(v => Number(v) + 1)}>+</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Swimmer Info Placeholder */}
            {swimmer && (
                <div className="bg-navy-800/50 rounded-lg p-2 text-center border border-white/5">
                    <div className="text-white font-bold">{swimmer.name}</div>
                    <div className="text-xs text-slate-500">Seed: {swimmer.entry}</div>
                </div>
            )}

            {/* Main Timer Display */}
            <div className="text-center py-10 flexitems-center justify-center">
                <span className={cn(
                    "text-[5.5rem] leading-none font-mono font-black tracking-tighter tabular-nums text-white",
                    isNoShow && "line-through text-red-500 opacity-50"
                )}>
                    {formatTime(elapsedTime)}
                </span>
            </div>

            {/* MEGA BUTTON - DYNAMIC STATES */}
            {!isNoShow && (
                <button
                    onClick={isRunning ? handleStop : (reviewMode ? handleSaveAndNext : handleStart)}
                    className={cn(
                        "w-full flex-1 min-h-[160px] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 touch-manipulation",
                        isRunning
                            ? "bg-red-500 border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
                            : (reviewMode
                                ? "bg-yellow-400 text-navy-900 shadow-lg shadow-yellow-400/20"
                                : "bg-cyan-400 text-navy-900 shadow-lg shadow-cyan-400/20")
                    )}
                >
                    {isRunning
                        ? (<><Pause className="w-12 h-12 text-white" /><span className="text-3xl font-black tracking-widest text-white">STOP</span></>)
                        : (reviewMode
                            ? (<><Save className="w-10 h-10" /><span className="text-2xl font-black tracking-widest">SAVE & NEXT</span></>)
                            : (<><Play className="w-12 h-12" /><span className="text-3xl font-black tracking-widest">START</span></>)
                        )
                    }
                </button>
            )}

            {/* No Show Handling */}
            {isNoShow && (
                <button
                    onClick={handleNoShowSave}
                    className="w-full flex-1 min-h-[160px] rounded-2xl flex flex-col items-center justify-center gap-2 bg-red-900/50 border-2 border-red-500 text-red-500"
                >
                    <span className="text-2xl font-black tracking-widest">CONFIRM NO SHOW</span>
                    <span className="text-xs">SAVES AS 0:00 & ADVANCES HEAT</span>
                </button>
            )}

            {/* Secondary Utils */}
            <div className="grid grid-cols-2 gap-3 shrink-0 mt-4">
                <button
                    onClick={() => setIsNoShow(!isNoShow)}
                    disabled={isRunning}
                    className={cn(
                        "rounded-xl font-bold text-sm tracking-wider uppercase border text-slate-400 hover:text-white py-4 transition-all",
                        isNoShow ? "bg-slate-800 text-white border-white/20" : "border-white/10 bg-navy-800 hover:bg-navy-700",
                        isRunning && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {isNoShow ? "Cancel No Show" : "Mark No Show"}
                </button>

                <button
                    onClick={handleReset}
                    disabled={elapsedTime === 0 && !isRunning}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 text-slate-400 hover:text-white py-2 bg-navy-800 hover:bg-red-900/40 hover:text-red-400 hover:border-red-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RotateCcw className="w-5 h-5 mb-0.5" />
                    <span className="text-xs font-bold uppercase tracking-wider">Reset Race</span>
                </button>
            </div>

            {/* Strict Physical Padding Zone to prevent iOS Swipe Up intercept */}
            <div className="w-full h-40 shrink-0"></div>

        </div>
    );
}
