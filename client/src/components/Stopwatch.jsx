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

    const triggerHaptic = () => {
        if (navigator.vibrate) navigator.vibrate(50);
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
        triggerHaptic();
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
        triggerHaptic();
        logAudit(meetId, 'STOP', { eventNum, heatNum, laneNum, time_ms: elapsedTime });
        cancelAnimationFrame(rafRef.current);
    };

    // Save & Advance Interaction
    const handleSaveAndNext = async () => {
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

            if (response.ok) {
                // Success
            } else {
                throw new Error('Server Error');
            }
        } catch (error) {
            console.error('Error saving:', error);
            saveOffline(payload);
        }

        // Always Advance (Optimistic)
        if (heatNum >= 1) setHeatNum(h => Number(h) + 1); // Force Number
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

        if (heatNum >= 1) setHeatNum(h => Number(h) + 1);
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
        <div className="flex flex-col gap-4 w-full max-w-md h-[calc(100vh-80px)]">

            {/* Status Bar */}
            <div className={cn(
                "w-full py-2 text-center text-xs font-bold tracking-widest uppercase border-b-2 transition-colors",
                isRunning ? "border-red-500 text-red-500 animate-pulse" :
                    (reviewMode ? "border-yellow-400 text-yellow-400" : "border-cyan-400 text-cyan-400")
            )}>
                {isRunning ? "RACE IN PROGRESS" : (reviewMode ? "REVIEW & SAVE" : (isNoShow ? "CONFIRM NO SHOW" : "PRESS TO START"))}
            </div>

            {/* Inputs - Compact Row - FIXED ARROWS AND TYPES */}
            <div className="flex justify-between gap-2 bg-navy-800 p-2 rounded-lg border border-navy-800">
                {['Event', 'Heat', 'Lane'].map((label, idx) => {
                    const val = idx === 0 ? eventNum : idx === 1 ? heatNum : laneNum;
                    const setVal = idx === 0 ? setEventNum : idx === 1 ? setHeatNum : setLaneNum;
                    return (
                        <div key={label} className="flex flex-col items-center w-1/3">
                            <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider mb-1">{label}</span>
                            <div className="flex items-center w-full">
                                <button className="p-2 text-slate-500 hover:text-white" onClick={() => setVal(v => Math.max(1, Number(v) - 1))}>-</button>
                                <input
                                    type="number"
                                    value={val}
                                    onChange={(e) => setVal(Number(e.target.value))}
                                    className="no-spinners w-full bg-transparent text-center text-xl font-bold text-white outline-none"
                                />
                                <button className="p-2 text-slate-500 hover:text-white" onClick={() => setVal(v => Number(v) + 1)}>+</button>
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
            <div className="text-center py-2">
                <span className={cn(
                    "text-7xl font-mono font-bold tracking-tighter tabular-nums text-white",
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
                {reviewMode ? (
                    <button onClick={handleReset} className="rounded-xl font-bold text-sm tracking-wider uppercase border border-white/10 text-slate-400 hover:text-white py-4">
                        RESET (NO SAVE)
                    </button>
                ) : (
                    <button
                        onClick={() => setIsNoShow(!isNoShow)}
                        className={cn(
                            "rounded-xl font-bold text-sm tracking-wider uppercase border text-slate-400 hover:text-white py-4 transition-all",
                            isNoShow ? "bg-slate-800 text-white border-white/20" : "border-white/10"
                        )}
                    >
                        {isNoShow ? "Cancel No Show" : "Mark No Show"}
                    </button>
                )}

                <a href="/api/export" target="_blank" className="flex items-center justify-center gap-2 rounded-xl border border-white/10 text-slate-400 hover:text-cyan-400 text-sm font-bold uppercase tracking-wider">
                    <Download className="w-4 h-4" /> Export CSV
                </a>
            </div>

        </div>
    );
}
