import { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default function OfficialsMode() {
    const [activeMeet, setActiveMeet] = useState(() => {
        const saved = localStorage.getItem('active-meet');
        return saved ? JSON.parse(saved) : null;
    });

    const [eventNum, setEventNum] = useState(1);
    const [heatNum, setHeatNum] = useState(1);
    const [laneNum, setLaneNum] = useState(1);
    const [initials, setInitials] = useState('');

    const [dqCodes, setDqCodes] = useState({});
    const [selectedStroke, setSelectedStroke] = useState('');
    const [selectedCode, setSelectedCode] = useState('');

    const [maestroEvents, setMaestroEvents] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        // Fetch DQ Codes
        fetch('/api/dq-codes')
            .then(res => res.json())
            .then(data => {
                setDqCodes(data);
                if (Object.keys(data).length > 0) {
                    setSelectedStroke(Object.keys(data)[0]);
                }
            })
            .catch(e => console.error(e));

        // Fetch Maestro Events
        if (activeMeet) {
            fetch(`/api/maestro/status?meet_id=${activeMeet.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.sessionSummary && data.sessionSummary.length > 0) {
                        setMaestroEvents(data.sessionSummary);
                        setEventNum(data.sessionSummary[0].eventNumber);
                    }
                })
                .catch(e => console.error(e));
        }
    }, [activeMeet]);

    // Reset code when stroke changes
    useEffect(() => {
        if (selectedStroke && dqCodes[selectedStroke]) {
            setSelectedCode(dqCodes[selectedStroke][0]);
        }
    }, [selectedStroke, dqCodes]);

    const handleSubmit = async () => {
        if (!initials) {
            alert('Please enter your Official Initials.');
            return;
        }

        setIsSubmitting(true);
        const payload = {
            meet_id: activeMeet.id,
            event_number: Number(eventNum),
            heat_number: Number(heatNum),
            lane: Number(laneNum),
            time_ms: 0,
            is_no_show: false,
            swimmer_name: '',
            is_dq: true,
            dq_code: selectedCode.split(' - ')[0],
            dq_description: selectedCode.split(' - ')[1],
            official_initials: initials.toUpperCase()
        };

        try {
            const res = await fetch('/api/times', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSuccessMsg('DQ Submitted Successfully');
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                setTimeout(() => setSuccessMsg(''), 3000);
            } else {
                alert('Failed to submit DQ.');
            }
        } catch (e) {
            console.error(e);
            alert('Network error submitting DQ.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!activeMeet) {
        return (
            <div className="w-full h-screen bg-navy-900 text-white flex flex-col items-center justify-center p-4">
                <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-xl font-bold mb-2">No Active Meet</h1>
                <p className="text-slate-400 text-center mb-6">You must join a meet from the main Timer screen first before acting as an Official.</p>
                <Link to="/" className="bg-cyan-400 text-navy-900 px-6 py-3 rounded-xl font-bold text-lg">
                    Return to Timer
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-navy-900 text-slate-300 flex flex-col items-center justify-start p-4 font-mono overflow-auto pb-8">
            <header className="w-full max-w-md flex items-center justify-between py-2 mb-4 border-b border-navy-800">
                <Link to="/" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <ArrowLeft className="w-6 h-6 text-slate-400" />
                </Link>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-bold tracking-tight text-red-500 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5" /> OFFICIALS MODE
                    </h1>
                    <span className="text-xs font-bold text-slate-500">{activeMeet.name}</span>
                </div>
                <div className="w-10"></div> {/* Spacer for centering */}
            </header>

            <div className="w-full max-w-md flex flex-col gap-4">

                {/* Inputs - Event, Heat, Lane */}
                <div className="flex justify-between gap-2 bg-navy-800 py-4 px-2 rounded-xl border border-navy-800">
                    <div className="flex flex-col items-center w-1/3">
                        <span className="text-[10px] text-red-400 uppercase font-bold tracking-wider mb-2">Event</span>
                        {maestroEvents.length > 0 ? (
                            <select
                                value={eventNum}
                                onChange={(e) => setEventNum(e.target.value)}
                                className="w-full bg-navy-900 border border-white/10 rounded-lg py-3 px-1 text-center text-sm font-bold text-white outline-none"
                            >
                                {maestroEvents.map(ev => (
                                    <option key={ev.eventNumber} value={ev.eventNumber}>{ev.eventNumber}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="number"
                                value={eventNum}
                                onChange={(e) => setEventNum(Number(e.target.value))}
                                className="w-full bg-navy-900 border border-white/10 rounded-lg py-2 text-center text-xl font-black text-white outline-none"
                            />
                        )}
                    </div>
                    {['Heat', 'Lane'].map((label, idx) => {
                        const val = idx === 0 ? heatNum : laneNum;
                        const setVal = idx === 0 ? setHeatNum : setLaneNum;
                        return (
                            <div key={label} className="flex flex-col items-center w-1/3">
                                <span className="text-[10px] text-red-400 uppercase font-bold tracking-wider mb-2">{label}</span>
                                <div className="flex items-center w-full bg-navy-900 rounded-lg border border-white/5">
                                    <button className="px-2 py-3 text-slate-500 hover:text-white" onClick={() => setVal(v => Math.max(1, Number(v) - 1))}>-</button>
                                    <input type="number" value={val} onChange={(e) => setVal(Number(e.target.value))} className="no-spinners w-full bg-transparent text-center text-xl font-black text-white outline-none" />
                                    <button className="px-2 py-3 text-slate-500 hover:text-white" onClick={() => setVal(v => Number(v) + 1)}>+</button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* DQ Selection */}
                <div className="bg-navy-800 p-4 rounded-xl border border-red-500/30 flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Stroke Category</label>
                        <select
                            value={selectedStroke}
                            onChange={(e) => setSelectedStroke(e.target.value)}
                            className="w-full bg-navy-900 text-white p-3 rounded-lg border border-white/10 font-bold outline-none focus:border-red-500"
                        >
                            {Object.keys(dqCodes).map(stroke => (
                                <option key={stroke} value={stroke}>{stroke}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Infraction Code</label>
                        <select
                            value={selectedCode}
                            onChange={(e) => setSelectedCode(e.target.value)}
                            className="w-full bg-navy-900 text-white p-3 rounded-lg border border-white/10 font-bold outline-none focus:border-red-500 text-sm"
                        >
                            {selectedStroke && dqCodes[selectedStroke]?.map(code => (
                                <option key={code} value={code}>{code}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Official Authorization */}
                <div className="bg-navy-800 p-4 rounded-xl border border-white/5 flex flex-col items-center">
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Official Initials</label>
                    <input
                        type="text"
                        value={initials}
                        onChange={(e) => setInitials(e.target.value)}
                        placeholder="e.g. MM"
                        maxLength={4}
                        className="w-24 text-center bg-navy-900 text-white p-3 rounded-lg border border-white/10 font-black text-xl uppercase outline-none focus:border-red-500"
                    />
                </div>

                {/* Submit Action */}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !initials}
                    className="w-full py-6 mt-2 rounded-2xl flex flex-col items-center justify-center gap-2 bg-red-600 text-white shadow-lg shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50"
                >
                    {successMsg ? (
                        <><CheckCircle className="w-8 h-8" /><span className="text-xl font-black tracking-widest uppercase">{successMsg}</span></>
                    ) : (
                        <><ShieldAlert className="w-10 h-10" /><span className="text-2xl font-black tracking-widest uppercase">SUBMIT DQ</span></>
                    )}
                </button>

            </div>
        </div>
    );
}
