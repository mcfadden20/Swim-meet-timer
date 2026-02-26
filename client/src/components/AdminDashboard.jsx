import { useState, useEffect } from 'react';
import { Download, Plus, Timer, Activity, Save, X, Edit2, Info } from 'lucide-react';

export default function AdminDashboard() {
    const [meets, setMeets] = useState([]);
    const [selectedMeet, setSelectedMeet] = useState(null);
    const [liveResults, setLiveResults] = useState([]);

    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});

    async function fetchMeets() {
        try {
            const res = await fetch('/api/admin/meets');
            if (res.ok) {
                const data = await res.json();
                setMeets(data);
            }
        } catch (e) { console.error('Failed to fetch meets', e); }
    }

    async function fetchResults(meetId) {
        try {
            const res = await fetch(`/api/admin/meets/${meetId}/results`);
            if (res.ok) {
                const data = await res.json();
                setLiveResults(data.results || []);
            } else { setLiveResults([]); }
        } catch (e) { console.error('Error fetching results:', e); setLiveResults([]); }
    }

    useEffect(() => {
        const kickoff = setTimeout(() => {
            fetchMeets();
        }, 0);

        return () => clearTimeout(kickoff);
    }, []);

    useEffect(() => {
        if (!selectedMeet) return;
        const kickoff = setTimeout(() => {
            fetchResults(selectedMeet.id);
        }, 0);

        const interval = setInterval(() => {
            fetchResults(selectedMeet.id);
        }, 5000);

        return () => {
            clearTimeout(kickoff);
            clearInterval(interval);
        };
    }, [selectedMeet]);

    const formatTime = (ms) => {
        if (!ms) return '0:00.00';
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    };

    const parseTimeInput = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return 0;
        const parts = timeStr.split(':');
        let totalMs = 0;
        if (parts.length > 1) {
            totalMs += (parseInt(parts[0], 10) || 0) * 60000;
            const secParts = parts[1].split('.');
            totalMs += (parseInt(secParts[0], 10) || 0) * 1000;
            if (secParts[1]) totalMs += (parseInt(secParts[1].padEnd(2, '0').slice(0, 2), 10) || 0) * 10;
        } else {
            const secParts = parts[0].split('.');
            totalMs += (parseInt(secParts[0] || 0, 10) || 0) * 1000;
            if (secParts[1]) totalMs += (parseInt(secParts[1].padEnd(2, '0').slice(0, 2), 10) || 0) * 10;
        }
        return totalMs;
    };

    const handleEditClick = (res) => {
        setEditingId(res.id);
        setEditValues({
            event_number: res.event_number,
            heat_number: res.heat_number,
            lane: res.lane,
            timeStr: formatTime(res.time_ms),
            is_dq: !!res.is_dq,
            dq_code: res.dq_code || '',
            dq_description: res.dq_description || '',
            official_initials: res.official_initials || '',
            is_no_show: !!res.is_no_show,
        });
    };

    const handleEditSave = async (id) => {
        try {
            const time_ms = parseTimeInput(editValues.timeStr);
            const isDQ = !!editValues.is_dq;
            const payload = {
                event_number: Number(editValues.event_number),
                heat_number: Number(editValues.heat_number),
                lane: Number(editValues.lane),
                time_ms,
                is_dq: isDQ,
                dq_code: isDQ ? (editValues.dq_code || null) : null,
                dq_description: isDQ ? (editValues.dq_description || null) : null,
                official_initials: isDQ ? (editValues.official_initials || null) : null,
                is_no_show: !!editValues.is_no_show,
            };
            const response = await fetch(`/api/times/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (response.ok) {
                setEditingId(null);
                fetchResults(selectedMeet.id);
            }
        } catch (e) { console.error('Save error', e); }
    };

    // UI Constants
    const scrollbarClasses = "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#f25b2a] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent";
    const outerShadow = "shadow-[8px_12px_20px_#0e0f11,-12px_-12px_20px_#363940]";
    const cardShadow = "shadow-[8px_8px_16px_#0e0f11,-8px_-8px_16px_#363940]";
    const buttonShadow = "shadow-[6px_6px_12px_#0e0f11,-6px_-6px_12px_#363940]";
    const pushedInner = "shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940]";

    return (
        <div className="h-screen w-screen bg-[#1b1d21] flex flex-col overflow-hidden p-10 font-sans text-white box-border selection:bg-[#f25b2a]">

            <header className="mb-10 px-4 shrink-0">
                <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic opacity-90 ml-[4px]">
                    Admin <span className="text-[#f25b2a]">Dashboard</span>
                </h1>
            </header>

            {/* REMOVED gutterShadow here for a cleaner, unified background */}
            <div className="flex flex-1 gap-8 overflow-hidden min-h-0 relative">

                {/* LEFT SIDEBAR */}
                <div className={`relative z-20 w-[30%] bg-[#282a2f] rounded-[40px] p-10 flex flex-col gap-10 shrink-0 ${outerShadow}`}>
                    <div className="px-2 shrink-0 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-white ml-[4px]">Active Meets</h2>
                        </div>

                        {/* PLUS BUTTON WITH TOOLTIP: Aligned with text */}
                        <div className="relative group">
                            <a
                                href="/admin/maestro"
                                className={`w-12 h-12 mr-[20px] rounded-full bg-[#282a2f] ${buttonShadow} active:${pushedInner} flex items-center justify-center text-[#f25b2a] hover:scale-110 transition-transform`}
                            >
                                <Plus className="w-5 h-5" />
                            </a>
                            {/* TOOLTIP */}
                            <div className="absolute top-full mt-4 right-0 w-256 p-4 bg-[#222429] rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-[#363940]">
                                <div className="flex gap-3 items-start">
                                    <Info className="w-4 h-4 text-[#f25b2a] shrink-0 mt-0.5" />
                                    <p className="text-[10px] leading-relaxed text-[#8F92A1] font-bold uppercase tracking-tight">
                                        Maestro Integration: Upload sessions and heat information, and download Windows utility.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`flex-1 overflow-y-auto ${scrollbarClasses} flex flex-col gap-8 pb-4 px-2`}>
                        {meets.map((meet) => {
                            const isActive = selectedMeet?.id === meet.id;
                            return (
                                <div
                                    key={meet.id}
                                    onClick={() => setSelectedMeet(meet)}
                                    className={`flex-shrink-0 p-8 rounded-[28px] cursor-pointer transition-all duration-300 ${isActive
                                        ? `bg-[#222429] border-l-8 border-[#f25b2a] ${pushedInner} mx-4 scale-[0.98]`
                                        : `bg-[#282a2f] ${cardShadow} active:${pushedInner} hover:translate-x-1 mx-0`
                                        }`}
                                >
                                    <h3 className="font-black text-xl text-white truncate mb-4 ml-[4px]">{meet.name}</h3>
                                    <div className="rounded-2xl p-4 flex justify-between items-center mb-[8px] mt-[-16px]">
                                        <span className="text-[10px] text-[#8F92A1] uppercase font-bold ml-[4px]">Entry Code</span>
                                        <span className="font-mono text-sm font-bold text-[#f25b2a] mr-[20px]">{meet.access_code}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT CONTENT AREA */}
                <div className={`relative z-10 flex-1 bg-[#282a2f] rounded-[40px] p-12 flex flex-col min-w-0 overflow-hidden ml-[12px] ${outerShadow}`}>
                    {selectedMeet ? (
                        <>
                            <div className="flex items-start justify-between mb-10 shrink-0 ml-[12px]">
                                <div>
                                    <h2 className="text-4xl font-black text-white tracking-tight leading-none mb-3 italic uppercase">
                                        {selectedMeet.name}
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f25b2a] opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#f25b2a]"></span>
                                        </span>
                                        <span className="text-xs font-bold text-[#8F92A1] uppercase tracking-widest">Live Integration Active</span>
                                    </div>
                                </div>

                                <div className="flex gap-6 shrink-0 pt-2 mr-[40px] mt-[18px]">
                                    <a href={`/api/export?meet_id=${selectedMeet.id}`} target="_blank" className={`flex items-center gap-3 px-8 py-4 mr-[8px] rounded-full bg-[#282a2f] ${buttonShadow} active:${pushedInner} text-sm font-bold text-[#8F92A1] hover:text-white transition-all`}>
                                        <Download className="w-5 h-5 text-[#f25b2a]" /> CSV
                                    </a>
                                    <a href={`/api/export/sd3?meet_id=${selectedMeet.id}`} target="_blank" className={`flex items-center gap-3 px-8 py-4 rounded-full bg-[#282a2f] ${buttonShadow} active:${pushedInner} text-sm font-bold text-[#8F92A1] hover:text-white transition-all`}>
                                        <Download className="w-5 h-5 text-[#f25b2a]" /> SD3
                                    </a>
                                </div>
                            </div>

                            <div className={`ml-[8px] flex-1 overflow-y-auto ${scrollbarClasses} pr-[4px] rounded-[32px] bg-[#282a2f] ${pushedInner} p-6`}>
                                <table className="w-full text-left border-collapse ml-[12px] mt-[16px]">
                                    <thead className="sticky top-0 bg-[#282a2f] z-10">
                                        <tr>
                                            <th className="px-8 py-6 text-[11px] font-black text-[#8F92A1] uppercase tracking-[0.2em]">Timestamp</th>
                                            <th className="px-8 py-6 text-[11px] font-black text-[#8F92A1] uppercase tracking-[0.2em]">Event</th>
                                            <th className="px-8 py-6 text-[11px] font-black text-[#8F92A1] uppercase tracking-[0.2em]">Heat</th>
                                            <th className="px-8 py-6 text-[11px] font-black text-[#8F92A1] uppercase tracking-[0.2em]">Lane</th>
                                            <th className="px-8 py-6 text-right text-[11px] font-black text-[#8F92A1] uppercase tracking-[0.2em]">Official Result</th>
                                            <th className="px-8 py-6 text-center text-[11px] font-black text-[#8F92A1] uppercase tracking-[0.2em]">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {liveResults.map((res, idx) => {
                                            const isEditing = editingId === res.id;
                                            return (
                                                <tr key={res.id} className={`transition-all ${idx % 2 === 0 ? 'bg-[#1b1d21]/20' : ''} hover:bg-[#1b1d21]/40`}>
                                                    <td className="px-8 py-6 first:rounded-l-[20px] font-mono text-xs text-[#8F92A1]">
                                                        {new Date(res.created_at).toLocaleTimeString()}
                                                    </td>
                                                    <td className="px-8 py-6 font-bold text-lg">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                className={`w-16 bg-[#282a2f] ${pushedInner} rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#f25b2a]`}
                                                                value={editValues.event_number}
                                                                onChange={(e) => setEditValues({ ...editValues, event_number: e.target.value })}
                                                            />
                                                        ) : (
                                                            res.event_number
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 font-mono text-sm text-[#8F92A1]">
                                                        {isEditing ? (
                                                            <input type="number" className={`w-16 bg-[#282a2f] ${pushedInner} rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#f25b2a]`} value={editValues.heat_number} onChange={(e) => setEditValues({ ...editValues, heat_number: e.target.value })} />
                                                        ) : (
                                                            `H${res.heat_number}`
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        {isEditing ? (
                                                            <input type="number" className={`w-16 bg-[#282a2f] ${pushedInner} rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#f25b2a]`} value={editValues.lane} onChange={(e) => setEditValues({ ...editValues, lane: e.target.value })} />
                                                        ) : (
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-2 h-2 rounded-full bg-[#f25b2a] shadow-[0_0_10px_#f25b2a]" />
                                                                <span className="font-mono font-black text-base">L{res.lane}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        {isEditing ? (
                                                            <div className="flex flex-col items-end gap-2">
                                                                <input
                                                                    type="text"
                                                                    className={`w-32 bg-[#282a2f] ${pushedInner} rounded-xl px-4 py-2 text-right text-[#f25b2a] font-mono text-base font-bold focus:outline-none focus:ring-1 focus:ring-[#f25b2a]`}
                                                                    value={editValues.timeStr}
                                                                    onChange={(e) => setEditValues({ ...editValues, timeStr: e.target.value })}
                                                                    disabled={!!editValues.is_dq || !!editValues.is_no_show}
                                                                />
                                                                <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#8F92A1] font-bold">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={!!editValues.is_dq}
                                                                        onChange={(e) => setEditValues({ ...editValues, is_dq: e.target.checked, is_no_show: e.target.checked ? false : !!editValues.is_no_show })}
                                                                    />
                                                                    DQ
                                                                </label>
                                                                {editValues.is_dq ? (
                                                                    <div className="flex gap-2">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Code"
                                                                            className={`w-20 bg-[#282a2f] ${pushedInner} rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#f25b2a]`}
                                                                            value={editValues.dq_code}
                                                                            onChange={(e) => setEditValues({ ...editValues, dq_code: e.target.value })}
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Init"
                                                                            className={`w-20 bg-[#282a2f] ${pushedInner} rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#f25b2a]`}
                                                                            value={editValues.official_initials}
                                                                            onChange={(e) => setEditValues({ ...editValues, official_initials: e.target.value })}
                                                                        />
                                                                    </div>
                                                                ) : (
                                                                    <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#8F92A1] font-bold">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={!!editValues.is_no_show}
                                                                            onChange={(e) => setEditValues({ ...editValues, is_no_show: e.target.checked, is_dq: e.target.checked ? false : !!editValues.is_dq })}
                                                                        />
                                                                        No Show
                                                                    </label>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-end">
                                                                {res.is_dq ? (
                                                                    <span className="text-[#EF4444] font-bold text-[10px] uppercase tracking-widest bg-[#EF4444]/10 px-3 py-1.5 rounded-full">
                                                                        DQ: {res.dq_code}
                                                                    </span>
                                                                ) : res.is_no_show ? (
                                                                    <span className="text-[#8F92A1] font-bold text-[10px] uppercase tracking-widest bg-[#1b1d21]/50 px-3 py-1.5 rounded-full">
                                                                        No Show
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-2xl font-black font-mono tracking-tighter">{formatTime(res.time_ms)}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 last:rounded-r-[20px]">
                                                        {isEditing ? (
                                                            <div className="flex justify-center gap-3">
                                                                <button onClick={() => handleEditSave(res.id)} className={`w-12 h-12 rounded-full bg-[#282a2f] ${buttonShadow} active:${pushedInner} flex items-center justify-center text-[#10B981] hover:text-[#10B981] transition-all`}>
                                                                    <Save className="w-5 h-5" />
                                                                </button>
                                                                <button onClick={() => setEditingId(null)} className={`w-12 h-12 rounded-full bg-[#282a2f] ${buttonShadow} active:${pushedInner} flex items-center justify-center text-[#EF4444] hover:text-[#EF4444] transition-all`}>
                                                                    <X className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-center">
                                                                <button onClick={() => handleEditClick(res)} className={`w-12 h-12 rounded-full bg-[#282a2f] ${buttonShadow} active:${pushedInner} flex items-center justify-center text-[#8F92A1] hover:text-[#f25b2a] transition-all`}>
                                                                    <Edit2 className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-40">
                            <Activity className="w-20 h-20 text-[#f25b2a] mb-6 animate-pulse" />
                            <h3 className="text-3xl font-black uppercase italic tracking-tighter">System Idle</h3>
                            <p className="text-xs font-bold text-[#8F92A1] uppercase tracking-[0.3em]">Awaiting Meet Connection</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}