import { useState, useEffect } from 'react';
import { ShieldAlert, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OfficialsMode() {
    const [activeMeet] = useState(() => {
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

    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        if (!activeMeet?.id) return false;
        return sessionStorage.getItem(`official-auth-${activeMeet.id}`) === 'true';
    });
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState(false);
    const [pinLoading, setPinLoading] = useState(false);

    const handlePinSubmit = async () => {
        if (!activeMeet?.id || !pinInput.trim()) {
            setPinError(true);
            setTimeout(() => setPinError(false), 2000);
            return;
        }

        setPinLoading(true);
        try {
            const res = await fetch('/api/official/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    meet_id: activeMeet.id,
                    admin_pin: pinInput.trim()
                })
            });

            if (res.ok) {
                setIsAuthenticated(true);
                setPinError(false);
                sessionStorage.setItem(`official-auth-${activeMeet.id}`, 'true');
                sessionStorage.setItem(`official-pin-${activeMeet.id}`, pinInput.trim());
                if (navigator.vibrate) navigator.vibrate(50);
            } else {
                setPinError(true);
                setTimeout(() => setPinError(false), 2000);
                if (navigator.vibrate) navigator.vibrate(200);
            }
        } catch {
            setPinError(true);
            setTimeout(() => setPinError(false), 2000);
            if (navigator.vibrate) navigator.vibrate(200);
        } finally {
            setPinLoading(false);
        }
    };

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
        const adminPin = sessionStorage.getItem(`official-pin-${activeMeet.id}`) || '';
        const [dqCodePart, ...descriptionParts] = (selectedCode || '').split(' - ');
        const dqCode = dqCodePart || null;
        const dqDescription = descriptionParts.join(' - ') || null;

        const payload = {
            meet_id: activeMeet.id,
            admin_pin: adminPin,
            event_number: Number(eventNum),
            heat_number: Number(heatNum),
            lane: Number(laneNum),
            time_ms: 0,
            is_no_show: false,
            swimmer_name: '',
            is_dq: true,
            dq_code: dqCode,
            dq_description: dqDescription,
            official_initials: initials.toUpperCase()
        };

        try {
            const res = await fetch('/api/official/submit-dq', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSuccessMsg('DQ Submitted Successfully');
                if (navigator.vibrate) navigator.vibrate(90);
                setInitials('');
                setLaneNum(1);
                setHeatNum(1);
                if (maestroEvents.length > 0) {
                    setEventNum(Number(maestroEvents[0].eventNumber));
                } else {
                    setEventNum(1);
                }
                const firstStroke = Object.keys(dqCodes)[0] || '';
                setSelectedStroke(firstStroke);
                if (firstStroke && dqCodes[firstStroke]?.length > 0) {
                    setSelectedCode(dqCodes[firstStroke][0]);
                } else {
                    setSelectedCode('');
                }
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
            <div className="w-screen h-screen bg-[#1b1d21] text-white flex flex-col items-center justify-center p-4 overflow-hidden">
                <ShieldAlert className="w-16 h-16 text-[#f25b2a] mb-4" />
                <h1 className="text-xl font-bold mb-2 italic uppercase">No Active Meet</h1>
                <p className="text-[#8F92A1] text-center mb-6">You must join a meet from the main Timer screen first before acting as an Official.</p>
                <Link to="/" className="bg-[linear-gradient(135deg,#f25b2a_0%,#e83323_100%)] text-white px-6 py-3 rounded-full font-bold text-lg">
                    Return to Timer
                </Link>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="w-screen h-screen bg-[#1b1d21] text-white flex flex-col items-center justify-center p-4 font-mono overflow-hidden">
                <div className="bg-[#282a2f] p-10 rounded-[40px] shadow-[12px_12px_25px_#0e0f11,-12px_-12px_25px_#363940] flex flex-col items-center gap-8">
                    <ShieldAlert className="w-16 h-16 text-[#f25b2a]" />
                    <h1 className="text-2xl font-black mb-2 italic uppercase tracking-widest">Staff Authorization</h1>
                    <p className="text-[#8F92A1] text-center max-w-xs">Enter the Meet PIN to access Officials Mode.</p>
                    <div className="flex flex-col items-center gap-4">
                        <input
                            type="tel"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            placeholder="PIN"
                            className={`w-40 text-center text-4xl font-black py-4 rounded-[24px] font-mono outline-none transition-colors shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940] bg-[#282a2f] ${
                                pinError ? 'text-[#EF4444]' : 'text-[#f25b2a]'
                            }`}
                        />
                        <button
                            onClick={handlePinSubmit}
                            disabled={pinLoading}
                            className="bg-[linear-gradient(135deg,#f25b2a_0%,#e83323_100%)] text-white px-8 py-3 rounded-full font-black text-lg w-40 disabled:opacity-60 shadow-[6px_6px_12px_#0e0f11,-6px_-6px_12px_#363940]"
                        >
                            {pinLoading ? '...' : 'GO'}
                        </button>
                        <Link to="/" className="text-[#8F92A1] mt-4 text-sm underline hover:text-white transition-colors">Cancel</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen bg-[#1b1d21] text-[#8F92A1] flex flex-col items-center justify-start p-6 font-mono overflow-hidden pb-8" style={{ overflowY: 'auto' }}>
            <header className="w-full max-w-2xl flex items-center justify-between py-4 mb-6 px-8 bg-[#282a2f] rounded-[40px] shadow-[12px_12px_25px_#0e0f11,-12px_-12px_25px_#363940]">
                <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-[#8F92A1]" />
                </Link>
                <div className="flex flex-col items-center flex-1">
                    <h1 className="text-xl font-black tracking-widest text-[#f25b2a] flex items-center gap-2 italic uppercase">
                        <ShieldAlert className="w-5 h-5" /> Officials Mode
                    </h1>
                    <span className="text-xs font-bold text-[#8F92A1] mt-1">{activeMeet.name}</span>
                </div>
                <div className="w-10"></div>
            </header>

            <div className="w-full max-w-2xl flex flex-col gap-6">

                {/* Inputs - Event, Heat, Lane */}
                <div className="flex justify-between gap-4 bg-[#282a2f] py-6 px-6 rounded-[40px] shadow-[12px_12px_25px_#0e0f11,-12px_-12px_25px_#363940]">
                    <div className="flex flex-col items-center w-1/3">
                        <span className="text-[10px] text-[#f25b2a] uppercase font-bold tracking-widest mb-3">Event</span>
                        {maestroEvents.length > 0 ? (
                            <select
                                value={eventNum}
                                onChange={(e) => setEventNum(e.target.value)}
                                className="w-full bg-[#1b1d21] rounded-[24px] py-3 px-3 text-center text-lg font-mono font-bold text-[#f25b2a] outline-none shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940]"
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
                                className="w-full bg-[#1b1d21] rounded-[24px] py-3 px-3 text-center text-xl font-mono font-bold text-[#f25b2a] outline-none shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940]"
                            />
                        )}
                    </div>
                    {['Heat', 'Lane'].map((label, idx) => {
                        const val = idx === 0 ? heatNum : laneNum;
                        const setVal = idx === 0 ? setHeatNum : setLaneNum;
                        return (
                            <div key={label} className="flex flex-col items-center w-1/3">
                                <span className="text-[10px] text-[#f25b2a] uppercase font-bold tracking-widest mb-3">{label}</span>
                                <div className="flex items-center w-full bg-[#1b1d21] rounded-[24px] shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940]">
                                    <button className="px-3 py-3 text-[#8F92A1] hover:text-[#f25b2a] font-bold text-lg" onClick={() => setVal(v => Math.max(1, Number(v) - 1))}>−</button>
                                    <input type="number" value={val} onChange={(e) => setVal(Number(e.target.value))} className="no-spinners w-full bg-transparent text-center text-xl font-mono font-bold text-[#f25b2a] outline-none" />
                                    <button className="px-3 py-3 text-[#8F92A1] hover:text-[#f25b2a] font-bold text-lg" onClick={() => setVal(v => Number(v) + 1)}>+</button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* DQ Selection */}
                <div className="bg-[#282a2f] p-6 rounded-[40px] shadow-[12px_12px_25px_#0e0f11,-12px_-12px_25px_#363940] flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-bold text-[#f25b2a] uppercase tracking-widest mb-3">Stroke Category</label>
                        <select
                            value={selectedStroke}
                            onChange={(e) => setSelectedStroke(e.target.value)}
                            className="w-full bg-[#1b1d21] text-[#f25b2a] p-3 rounded-[24px] font-bold outline-none shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940]"
                        >
                            {Object.keys(dqCodes).map(stroke => (
                                <option key={stroke} value={stroke}>{stroke}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#f25b2a] uppercase tracking-widest mb-3">Infraction Code</label>
                        <select
                            value={selectedCode}
                            onChange={(e) => setSelectedCode(e.target.value)}
                            className="w-full bg-[#1b1d21] text-[#f25b2a] p-3 rounded-[24px] font-mono font-bold outline-none shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940] text-sm"
                        >
                            {selectedStroke && dqCodes[selectedStroke]?.map(code => (
                                <option key={code} value={code}>{code}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Official Authorization */}
                <div className="bg-[#282a2f] p-6 rounded-[40px] shadow-[12px_12px_25px_#0e0f11,-12px_-12px_25px_#363940] flex flex-col items-center">
                    <label className="block text-xs font-bold text-[#f25b2a] uppercase tracking-widest mb-4">Official Initials</label>
                    <input
                        type="text"
                        value={initials}
                        onChange={(e) => setInitials(e.target.value)}
                        placeholder="e.g. AB"
                        maxLength={4}
                        className="w-28 text-center bg-[#1b1d21] text-[#f25b2a] p-3 rounded-[24px] font-black text-xl uppercase outline-none shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940]"
                    />
                </div>

                {/* Submit Action */}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !initials}
                    className="w-full py-6 rounded-[40px] flex flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#f25b2a_0%,#e83323_100%)] text-white shadow-[12px_12px_25px_#0e0f11,-12px_-12px_25px_#363940] active:scale-95 transition-all disabled:opacity-50"
                >
                    {successMsg ? (
                        <><CheckCircle className="w-8 h-8" /><span className="text-lg font-black tracking-widest italic uppercase">{successMsg}</span></>
                    ) : (
                        <><ShieldAlert className="w-10 h-10" /><span className="text-xl font-black tracking-widest italic uppercase">Submit DQ</span></>
                    )}
                </button>

            </div>
        </div>
    );
}
