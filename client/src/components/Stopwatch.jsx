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

    const getEventOptionNumbers = () => {
        if (!useMaestro || maestroEvents.length === 0) return [];
        return maestroEvents.map(event => Number(event.eventNumber)).filter(Number.isFinite);
    };

    const getCurrentEvent = (targetEvent = eventNum) => {
        return maestroEvents.find(event => Number(event.eventNumber) === Number(targetEvent));
    };

    const getHeatOptionsForEvent = (targetEvent = eventNum) => {
        const event = getCurrentEvent(targetEvent);
        if (!event) return [];

        if (Array.isArray(event.heats) && event.heats.length > 0) {
            return event.heats.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
        }

        const heatCount = Number(event.heatCount) || 0;
        return Array.from({ length: heatCount }, (_, index) => index + 1);
    };

    useEffect(() => {
        if (!useMaestro || maestroEvents.length === 0) return;

        const eventOptions = getEventOptionNumbers();
        if (eventOptions.length === 0) return;

        const nextEvent = eventOptions.includes(Number(eventNum)) ? Number(eventNum) : eventOptions[0];
        if (nextEvent !== Number(eventNum)) {
            setEventNum(nextEvent);
            return;
        }

        const heatOptions = getHeatOptionsForEvent(nextEvent);
        if (heatOptions.length === 0) return;
        if (!heatOptions.includes(Number(heatNum))) {
            setHeatNum(heatOptions[0]);
        }
    }, [useMaestro, maestroEvents, eventNum, heatNum]);

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

    const advanceNextRace = () => {
        if (useMaestro && maestroEvents.length > 0) {
            const eventOptions = getEventOptionNumbers();
            const currentEventIndex = eventOptions.findIndex(e => e === Number(eventNum));
            if (currentEventIndex === -1) return;

            const heatOptions = getHeatOptionsForEvent(Number(eventNum));
            const currentHeatIndex = heatOptions.findIndex(h => h === Number(heatNum));
            const isFinalHeat = currentHeatIndex !== -1 && currentHeatIndex === heatOptions.length - 1;

            if (isFinalHeat) {
                const nextEvent = eventOptions[currentEventIndex + 1];
                if (Number.isFinite(nextEvent)) {
                    setEventNum(nextEvent);
                    setHeatNum(1);
                }
            } else if (currentHeatIndex !== -1) {
                setHeatNum(heatOptions[currentHeatIndex + 1]);
            } else if (heatOptions.length > 0) {
                setHeatNum(heatOptions[0]);
            }
        } else {
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

    const eventOptions = useMaestro && maestroEvents.length > 0
        ? getEventOptionNumbers()
        : Array.from({ length: 200 }, (_, index) => index + 1);

    const heatOptions = useMaestro && maestroEvents.length > 0
        ? getHeatOptionsForEvent(eventNum)
        : Array.from({ length: 50 }, (_, index) => index + 1);

    return (
        <div className="w-full h-full bg-[#1b1d21] flex flex-col justify-between text-white font-sans overflow-hidden box-border">

            {/* Header: Status Badge */}
<div className="shrink-0 px-6 pt-4">
  <div
    className={cn(
      "w-full min-h-[40px] rounded-full flex items-center justify-center text-3xl font-black tracking-[0.15em] uppercase transition-all duration-500",
      pushedInner,
      isRunning
        ? "text-[#f25b2a] shadow-[inset_0_0_15px_#f25b2a66]"
        : "text-[#8F92A1]"
    )}
  >
    <div className="flex items-center justify-center gap-2">
      {isRunning && (
        <span className="animate-ping h-2 w-2 rounded-full bg-[#f25b2a]" />
      )}
      {isRunning
        ? "RACE ACTIVE"
        : reviewMode
        ? "REVIEW"
        : isNoShow
        ? "CONFIRM"
        : "READY TO START"}
    </div>
  </div>
</div>



            {/* Selectors: Event/Heat/Lane (Compressed Top) */}
            <div className={cn(
            "shrink-0 grid grid-cols-3 gap-3 px-6 py-5 rounded-[32px] bg-[#282a2f] mx-6 mt-3",
            outerShadow
            )}>
            {[{ label: 'Event', val: eventNum, set: setEventNum, options: eventOptions },
                { label: 'Heat', val: heatNum, set: setHeatNum, options: heatOptions },
                { label: 'Lane', val: laneNum, set: setLaneNum, options: Array.from({ length: 10 }, (_, index) => index + 1), isLane: true }
            ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2">
                <span className="text-[20px] text-[#8F92A1] font-black uppercase tracking-widest italic">
                    {item.label}
                </span>

                <div className={cn(
                    "w-full py-6 rounded-[20px] bg-[#282a2f] flex items-center justify-center relative",
                    pushedInner
                )}>
                    <select
                    value={item.val}
                    onChange={(e) => {
                        item.set(Number(e.target.value));
                        if (item.isLane) localStorage.setItem('swim-lane', e.target.value);
                    }}
                    className="bg-transparent text-3xl font-black text-[#f25b2a] outline-none w-full text-center appearance-none cursor-pointer z-10"
                    >
                    {item.options.map((option) => (
                        <option key={option} value={option} className="bg-[#282a2f]">
                        {option}
                        </option>
                    ))}
                    </select>
                </div>
                </div>
            ))}
            </div>


            {/* Timer Display (Center, Flex-1) */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
                <span className={cn(
                    "text-[5.5rem] font-mono font-black tracking-tighter tabular-nums leading-none",
                    isNoShow ? "text-red-500/30 line-through" : "text-white"
                )}>
                    {formatTime(elapsedTime)}
                </span>
            </div>

            {/* Action Zone: Start/Stop & No Show (Dynamic Height) */}
            <div className="shrink-0 px-6">
                {!isNoShow ? (
                    <button
                        onClick={isRunning ? handleStop : (reviewMode ? handleSaveAndNext : handleStart)}
                        className={cn(
                            "w-full min-h-[140px] py-6 rounded-[40px] flex flex-col items-center justify-center gap-2 transition-all active:scale-95 touch-manipulation shadow-[8px_8px_16px_#0e0f11,-8px_-8px_16px_#363940]",
                            isRunning ? "bg-[#1b1d21] border-4 border-[#f25b2a]" :
                                (reviewMode ? accentGradient : `bg-[#282a2f]`)
                        )}

                    >
                        {isRunning ? (
                            <><Pause className="w-12 h-12 text-[#f25b2a]" /><span className="text-xl font-black uppercase italic tracking-widest text-[#f25b2a]">STOP</span></>
                        ) : (reviewMode ? (
                            <><Save className="w-12 h-12 text-white" /><span className="text-xl font-black uppercase italic tracking-widest text-white">SAVE</span></>
                        ) : (
                            <><Play className="w-14 h-14 text-[#f25b2a]" /><span className="text-2xl font-black uppercase italic tracking-widest text-[#f25b2a]">START</span></>
                        ))}
                    </button>
                ) : (
                    <button onClick={handleNoShowSave} className="w-full py-5 rounded-[40px] border-3 border-red-500 bg-red-500/10 text-red-500 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[8px_8px_16px_#0e0f11,-8px_-8px_16px_#363940]">
                        <span className="text-lg font-black uppercase italic tracking-widest">CONFIRM NO SHOW</span>
                    </button>
                )}
            </div>

            {/* Utility Buttons: No Show Toggle & Reset (Bottom Locked, Safe Area) */}
            <div className="min-h-[72px] py-4 shrink-0 grid grid-cols-2 gap-2 px-6 pb-10">                
                <button
                    onClick={() => setIsNoShow(!isNoShow)}
                    disabled={isRunning}
                    className={cn(
                        "flex-[3] py-3 rounded-[24px] text-sm font-black uppercase tracking-widest transition-all",
                        isNoShow ? accentGradient + " text-white" : `bg-[#282a2f] ${buttonShadow} text-[#8F92A1] active:${pushedInner}`,
                        isRunning && "opacity-40"
                    )}
                >
                    {isNoShow ? "Cancel" : "No Show"}
                </button>

                <button
                    onClick={() => { if (confirm('Reset?')) { setElapsedTime(0); setIsRunning(false); setReviewMode(false); setIsNoShow(false); cancelAnimationFrame(rafRef.current); } }}
                    disabled={elapsedTime === 0 && !isRunning}
                    className={cn(
                        "flex-1 py-3 rounded-[24px] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-1 transition-all",
                        `bg-[#282a2f] ${buttonShadow} text-[#8F92A1] active:${pushedInner}`,
                        (elapsedTime === 0 && !isRunning) && "opacity-40"
                    )}
                >
                    <RotateCcw className="w-4 h-4" /> Reset
                </button>
            </div>
        </div>
    );
}