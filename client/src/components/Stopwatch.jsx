import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Save } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default function Stopwatch() {
    const [isRunning, setIsRunning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const startTimeRef = useRef(0);
    const rafRef = useRef(null);

    useEffect(() => {
        if (isRunning) {
            startTimeRef.current = performance.now() - elapsedTime;
            const loop = () => {
                const now = performance.now();
                setElapsedTime(now - startTimeRef.current);
                rafRef.current = requestAnimationFrame(loop);
            };
            rafRef.current = requestAnimationFrame(loop);
        } else {
            cancelAnimationFrame(rafRef.current);
        }

        return () => cancelAnimationFrame(rafRef.current);
    }, [isRunning]);

    const handleStartStop = () => {
        setIsRunning(!isRunning);
    };

    const handleReset = () => {
        setIsRunning(false);
        setElapsedTime(0);
    };

    const formatTime = (ms) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            {/* Time Display */}
            <div className="bg-slate-800 rounded-2xl p-8 w-full flex justify-center shadow-xl border border-slate-700">
                <span className="text-6xl font-mono font-bold tracking-wider text-slate-100 tabular-nums">
                    {formatTime(elapsedTime)}
                </span>
            </div>

            {/* Controls */}
            <div className="flex gap-4 w-full">
                <button
                    onClick={handleStartStop}
                    className={cn(
                        "flex-1 h-16 rounded-xl flex items-center justify-center text-xl font-bold transition-all active:scale-95",
                        isRunning
                            ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                    )}
                >
                    {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 pl-1" />}
                </button>

                <button
                    onClick={handleReset}
                    className="h-16 w-16 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center transition-all active:scale-95"
                >
                    <RotateCcw className="w-6 h-6" />
                </button>
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all opacity-50 cursor-not-allowed">
                <Save className="w-5 h-5" />
                Save Result
            </button>
        </div>
    );
}
