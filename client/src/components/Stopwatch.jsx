import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default function Stopwatch({ meetId }) {
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [reviewMode, setReviewMode] = useState(false);
    const [eventNum, setEventNum] = useState(1);
    const [heatNum, setHeatNum] = useState(1);
    const [laneNum, setLaneNum] = useState(() => Number(localStorage.getItem('swim-lane')) || 1);
    const [isNoShow, setIsNoShow] = useState(false);
    const [maestroEvents, setMaestroEvents] = useState([]);
    const [useMaestro, setUseMaestro] = useState(false);

    const startTimeRef = useRef(0);
    const rafRef = useRef(null);

    // UI Styles
    const outerShadow = "shadow-[8px_12px_20px_#0e0f11,-12px_-12px_20px_#363940]";
    const buttonShadow = "shadow-[6px_6px_12px_#0e0f11,-6px_-6px_12px_#363940]";
    const pushedInner = "shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940]";
    const accentGradient = "bg-[linear-gradient(135deg,#f25b2a_0%,#e83323_100%)]";

    useEffect(() => {
        const fetchMaestro = async () => {
            try {
                const res = await fetch(`/api/maestro/status?meet_id=${meetId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.sessionSummary?.length > 0) {
                        setMaestroEvents(data.sessionSummary);
                        setUseMaestro(true);
                    }
                }
            } catch { console.error("Maestro sync unavailable"); }
        };
        fetchMaestro();
    }, [meetId]);

    const triggerHaptic = (pattern = 50) => { if (navigator.vibrate) navigator.vibrate(pattern); };

    const handleStart = () => {
        setIsRunning(true);
        setReviewMode(false);
        triggerHaptic(50);
        startTimeRef.current = performance.now() - elapsedTime;
        const loop = () => {
            setElapsedTime(performance.now() - startTimeRef.current);
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
    };

    const handleStop = () => {
        setIsRunning(false);
        setReviewMode(true);
        triggerHaptic(50);
        cancelAnimationFrame(rafRef.current);
    };

    // Logic Fix: Robust Auto-Increment
    const advanceNextRace = () => {
        const currentEvent = maestroEvents.find(e => Number(e.eventNumber) === Number(eventNum));

        if (useMaestro && currentEvent) {
            if (Number(heatNum) >= Number(currentEvent.heatCount)) {
                const nextEventIdx = maestroEvents.findIndex(e => Number(e.eventNumber) === Number(eventNum)) + 1;
                if (nextEventIdx < maestroEvents.length) {
                    setEventNum(Number(maestroEvents[nextEventIdx].eventNumber));
                    setHeatNum(1);
                }
            } else {
                setHeatNum(prev => prev + 1);
            }
        } else {
            // Standard generic auto increment (Assumes 5 heats per event for demo without Maestro, to test event roll-overs, or user can override)
            if (Number(heatNum) >= 5) {
                setEventNum(prev => prev + 1);
                setHeatNum(1);
            } else {
                setHeatNum(prev => prev + 1);
            }
        }
    };

    const handleSaveAndNext = async () => {
        triggerHaptic([50, 50, 100]);
        const payload = {
            meet_id: meetId,
            event_number: Number(eventNum),
            heat_number: Number(heatNum),
            lane: Number(laneNum),
            time_ms: Math.floor(elapsedTime),
            is_no_show: false
        };

        try {
            const response = await fetch('/api/times', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Failed to save time entry: ${response.status}`);
            }

            advanceNextRace();
            setElapsedTime(0);
            setReviewMode(false);
        } catch {
            alert("Save failed. Please retry.");
        }
    };

    const handleNoShowSave = async () => {
        triggerHaptic(100);
        const payload = {
            meet_id: meetId,
            event_number: Number(eventNum),
            heat_number: Number(heatNum),
            lane: Number(laneNum),
            time_ms: 0,
            is_no_show: true // Dashboard will display "No Show" based on this flag
        };

        try {
            const response = await fetch('/api/times', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Failed to save no show: ${response.status}`);
            }

            advanceNextRace();
            setIsNoShow(false);
            setElapsedTime(0);
            setReviewMode(false);
        } catch {
            alert("No-show save failed. Please retry.");
        }
    };

    const formatTime = (ms) => {
        const min = Math.floor(ms / 60000);
        const sec = Math.floor((ms % 60000) / 1000);
        const cs = Math.floor((ms % 1000) / 10);
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-md h-screen bg-[#1b1d21] p-6 font-sans text-white overflow-hidden box-border">

            {/* 6. READY TO START (Twice as big) */}
            <div className={cn(
                "w-full py-8 rounded-full text-[30px] font-black tracking-[0.2em] uppercase transition-all duration-500",
                pushedInner,
                isRunning ? "text-[#f25b2a] shadow-[inset_0_0_20px_#f25b2a66]" : "text-[#8F92A1]"
            )}>
                <div className="flex items-center justify-center gap-4">
                    {isRunning && <span className="animate-ping h-3 w-3 rounded-full bg-[#f25b2a]" />}
                    {isRunning ? "RACE ACTIVE" : (reviewMode ? "REVIEW" : (isNoShow ? "CONFIRM" : "READY TO START"))}
                </div>
            </div>

            {/* 4 & 5. SELECTORS (Twice as big) */}
            <div className={cn("grid grid-cols-3 gap-6 p-8 rounded-[40px] bg-[#282a2f]", outerShadow)}>
                {[{ label: 'Event', val: eventNum, set: setEventNum, max: 200 },
                { label: 'Heat', val: heatNum, set: setHeatNum, max: 50 },
                { label: 'Lane', val: laneNum, set: setLaneNum, max: 10, isLane: true }].map((item) => (
                    <div key={item.label} className="flex flex-col items-center gap-4">
                        <span className="text-[16px] text-[#8F92A1] font-black uppercase tracking-widest italic">{item.label}</span>
                        {/* 4. Double height of number boxes */}
                        <div className={cn("w-full py-10 rounded-[24px] bg-[#282a2f] flex items-center justify-center relative", pushedInner)}>
                            <select
                                value={item.val}
                                onChange={(e) => {
                                    item.set(Number(e.target.value));
                                    if (item.isLane) localStorage.setItem('swim-lane', e.target.value);
                                }}
                                className="bg-transparent text-4xl font-black text-[#f25b2a] outline-none w-full text-center appearance-none cursor-pointer z-10"
                            >
                                {[...Array(item.max)].map((_, i) => <option key={i + 1} value={i + 1} className="bg-[#282a2f]">{i + 1}</option>)}
                            </select>
                        </div>
                    </div>
                ))}
            </div>

            {/* TIMER DISPLAY */}
            <div className="flex flex-col items-center justify-center py-2">
                <span className={cn(
                    "text-[6rem] font-mono font-black tracking-tighter tabular-nums leading-none",
                    isNoShow ? "text-red-500/30 line-through" : "text-white"
                )}>
                    {formatTime(elapsedTime)}
                </span>
            </div>

            {/* 3. MEGA START BUTTON (Increased height to match timer box) */}
            <div className="flex-1 min-h-[300px] mb-4">
                {!isNoShow ? (
                    <button
                        onClick={isRunning ? handleStop : (reviewMode ? handleSaveAndNext : handleStart)}
                        className={cn(
                            "w-full h-full rounded-[50px] flex flex-col items-center justify-center gap-4 transition-all active:scale-95 touch-manipulation",
                            isRunning ? "bg-[#1b1d21] border-4 border-[#f25b2a]" :
                                (reviewMode ? accentGradient + " shadow-2xl" : `bg-[#282a2f] ${outerShadow}`)
                        )}
                    >
                        {isRunning ? (
                            <><Pause className="w-20 h-20 text-[#f25b2a]" /><span className="text-4xl font-black uppercase italic tracking-widest text-[#f25b2a]">STOP</span></>
                        ) : (reviewMode ? (
                            <><Save className="w-20 h-20 text-white" /><span className="text-4xl font-black uppercase italic tracking-widest text-white">SAVE</span></>
                        ) : (
                            <><Play className="w-24 h-24 text-[#f25b2a]" /><span className="text-5xl font-black uppercase italic tracking-widest text-[#f25b2a]">START</span></>
                        ))}
                    </button>
                ) : (
                    <button onClick={handleNoShowSave} className="w-full h-full rounded-[50px] border-4 border-red-500 bg-red-500/10 text-red-500">
                        <span className="text-4xl font-black uppercase italic tracking-widest">CONFIRM NO SHOW</span>
                    </button>
                )}
            </div>

            {/* 2. DOUBLE HEIGHT UTILS */}
            <div className="grid grid-cols-2 gap-6 pb-8">
                <button
                    onClick={() => setIsNoShow(!isNoShow)}
                    disabled={isRunning}
                    className={cn(
                        "py-16 rounded-[24px] text-lg font-black uppercase tracking-widest transition-all",
                        isNoShow ? accentGradient + " text-white" : `bg-[#282a2f] ${buttonShadow} text-[#8F92A1] active:${pushedInner}`,
                        isRunning && "opacity-20"
                    )}
                >
                    {isNoShow ? "Cancel" : "Mark No Show"}
                </button>

                <button
                    onClick={() => { if (confirm('Reset?')) { setElapsedTime(0); setIsRunning(false); setReviewMode(false); setIsNoShow(false); cancelAnimationFrame(rafRef.current); } }}
                    disabled={elapsedTime === 0 && !isRunning}
                    className={cn(
                        "py-16 rounded-[24px] text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all",
                        `bg-[#282a2f] ${buttonShadow} text-[#8F92A1] active:${pushedInner}`,
                        (elapsedTime === 0 && !isRunning) && "opacity-20"
                    )}
                >
                    <RotateCcw className="w-8 h-8" /> Reset
                </button>
            </div>
        </div>
    );
}