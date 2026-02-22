import { useState, useEffect } from 'react';
import { Download, RefreshCw, Plus, Timer, Edit2, Save, X } from 'lucide-react';

export default function AdminDashboard() {
    const [meets, setMeets] = useState([]);
    const [selectedMeet, setSelectedMeet] = useState(null);
    const [liveResults, setLiveResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [maestroStatus, setMaestroStatus] = useState(null);

    // Inline Editing State
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});

    // Fetch Meets on Mount
    useEffect(() => {
        fetchMeets();
    }, []);

    // Poll for Live Results if a meet is selected
    useEffect(() => {
        if (!selectedMeet) return;

        // Initial fetch
        fetchResults(selectedMeet.id);
        fetchMaestroStatus(selectedMeet.id);

        const interval = setInterval(() => {
            fetchResults(selectedMeet.id);
            fetchMaestroStatus(selectedMeet.id);
        }, 5000); // 5s poll

        return () => clearInterval(interval);
    }, [selectedMeet]);

    const fetchMeets = async () => {
        const res = await fetch('/api/admin/meets');
        const data = await res.json();
        setMeets(data);
    };

    const fetchResults = async (meetId) => {
        const res = await fetch(`/api/admin/meets/${meetId}/results`);
        const data = await res.json();
        setLiveResults(data.results);
    };

    const fetchMaestroStatus = async (meetId) => {
        if (!meetId) return;
        try {
            const res = await fetch(`/api/maestro/status?meet_id=${meetId}`);
            if (res.ok) {
                const data = await res.json();
                setMaestroStatus(data);
            }
        } catch (e) {
            console.error("Failed to fetch Maestro status", e);
        }
    };

    const formatTime = (ms) => {
        if (!ms) return '0:00.00';
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    };

    const parseTimeInput = (timeStr) => {
        // Simple parser for M:SS.ms or S.ms
        const parts = timeStr.split(':');
        let totalMs = 0;
        if (parts.length > 1) {
            totalMs += parseInt(parts[0]) * 60000;
            const secParts = parts[1].split('.');
            totalMs += parseInt(secParts[0]) * 1000;
            if (secParts[1]) totalMs += parseInt(secParts[1].padEnd(2, '0').slice(0, 2)) * 10;
        } else {
            const secParts = parts[0].split('.');
            totalMs += parseInt(secParts[0] || 0) * 1000;
            if (secParts[1]) totalMs += parseInt(secParts[1].padEnd(2, '0').slice(0, 2)) * 10;
        }
        return totalMs;
    };

    const handleEditClick = (res) => {
        setEditingId(res.id);
        setEditValues({
            heat_number: res.heat_number,
            lane: res.lane,
            timeStr: formatTime(res.time_ms)
        });
    };

    const handleEditSave = async (id) => {
        try {
            const time_ms = parseTimeInput(editValues.timeStr);
            const payload = {
                heat_number: Number(editValues.heat_number),
                lane: Number(editValues.lane),
                time_ms
            };

            const response = await fetch(`/api/times/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setEditingId(null);
                fetchResults(selectedMeet.id); // Refresh
            } else {
                alert('Failed to save correction.');
            }
        } catch (e) {
            console.error('Save error', e);
            alert('Error saving correction.');
        }
    };

    return (
        <div className="w-full h-screen bg-navy-900 text-slate-300 p-4 font-mono overflow-hidden flex flex-col">
            <header className="flex justify-between items-center pb-4 border-b border-navy-800 shrink-0">
                <h1 className="text-2xl font-bold tracking-tight text-white">ADMIN<span className="text-cyan-400">DASHBOARD</span></h1>
            </header>

            {/* Maestro Status Banner */}
            {maestroStatus && (
                <div className={`mt-4 p-3 rounded-lg border flex items-center justify-between ${maestroStatus.meetDetails ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${maestroStatus.meetDetails ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <div>
                            <div className="text-sm font-bold text-white">Meet Maestro Connection</div>
                            <div className="text-xs text-slate-400">
                                {maestroStatus.meetDetails
                                    ? `Loaded: ${maestroStatus.meetDetails.meetName} (${maestroStatus.sessionSummary.length} Events)`
                                    : 'Waiting for meet_details.json to be written by Maestro...'}
                            </div>
                        </div>
                    </div>
                    <button onClick={fetchMaestroStatus} className="p-2 hover:bg-white/10 rounded transition-colors" title="Refresh Status">
                        <RefreshCw className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            )}

            <div className="flex flex-1 gap-4 overflow-hidden mt-4">
                {/* Sidebar: Meet List */}
                <div className="w-1/3 bg-navy-800 rounded-xl p-4 overflow-y-auto border border-white/5">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Active Meets</h2>
                    <div className="flex flex-col gap-2">
                        {meets.map(meet => (
                            <button
                                key={meet.id}
                                onClick={() => setSelectedMeet(meet)}
                                className={`p-4 rounded-lg text-left transition-all ${selectedMeet?.id === meet.id ? 'bg-cyan-400/10 border border-cyan-400' : 'bg-navy-900 border border-transparent hover:bg-navy-800'}`}
                            >
                                <div className="text-lg font-bold text-white">{meet.name}</div>
                                <div className="flex flex-col gap-2 mt-3">
                                    <div className="flex justify-between items-center bg-navy-900 border border-white/5 rounded p-2">
                                        <span className="text-xs text-slate-500 uppercase font-bold">Meet Code</span>
                                        <span className="text-sm font-mono text-cyan-400 font-bold tracking-widest">{meet.access_code}</span>
                                    </div>
                                    {meet.admin_pin && (
                                        <div className="flex justify-between items-center bg-navy-900 border border-white/5 rounded p-2">
                                            <span className="text-xs text-slate-500 uppercase font-bold">Admin PIN</span>
                                            <span className="text-sm font-mono text-yellow-400 font-bold tracking-widest">{meet.admin_pin}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                                    <a href={`/admin/maestro?meet_id=${meet.id}`} onClick={(e) => e.stopPropagation()} className="text-[10px] text-cyan-400 hover:text-cyan-300 uppercase font-bold tracking-widest bg-navy-900 border border-cyan-400/20 px-2 py-1 rounded">
                                        Maestro Settings
                                    </a>
                                    <span className="text-xs text-slate-500">{new Date(meet.created_at).toLocaleDateString()}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main: Live Feed */}
                <div className="flex-1 bg-navy-800 rounded-xl p-4 flex flex-col border border-white/5">
                    {selectedMeet ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{selectedMeet.name}</h2>
                                    <span className="text-xs text-green-400 flex items-center gap-1 mt-1">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                        LIVE INCOMING DATA
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <a href="/api/export" target="_blank" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 border border-white/10 p-2 rounded">
                                        <Download className="w-4 h-4" /> CSV
                                    </a>
                                    <a href="/api/export/sd3" target="_blank" className="text-xs font-bold text-cyan-400 hover:text-white flex items-center gap-1 border border-cyan-400 p-2 rounded">
                                        <Download className="w-4 h-4" /> SD3 (SwimTopia)
                                    </a>
                                    <a href="/api/export/audit" target="_blank" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 border border-white/10 p-2 rounded">
                                        <Download className="w-4 h-4" /> AUDIT LOGS
                                    </a>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="text-xs text-slate-500 uppercase font-bold sticky top-0 bg-navy-800">
                                        <tr>
                                            <th className="pb-2">Time</th>
                                            <th className="pb-2">Event</th>
                                            <th className="pb-2">Heat</th>
                                            <th className="pb-2">Lane</th>
                                            <th className="pb-2 text-right">Result</th>
                                            <th className="pb-2 text-right w-16">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 font-mono">
                                        {liveResults.map(res => {
                                            const isEditing = editingId === res.id;
                                            return (
                                                <tr key={res.id} className={`transition-colors ${res.is_dq ? 'bg-red-900/20' : 'hover:bg-white/5'}`}>
                                                    <td className="py-2 text-slate-500">{new Date(res.created_at).toLocaleTimeString()}</td>
                                                    <td className="py-2 text-white">{res.event_number}</td>

                                                    <td className="py-2 text-white">
                                                        {isEditing ? (
                                                            <input type="number" className="w-12 bg-navy-900 border border-cyan-400 rounded px-1 text-white" value={editValues.heat_number} onChange={(e) => setEditValues({ ...editValues, heat_number: e.target.value })} />
                                                        ) : res.heat_number}
                                                    </td>

                                                    <td className="py-2 text-cyan-400 font-bold">
                                                        {isEditing ? (
                                                            <input type="number" className="w-12 bg-navy-900 border border-cyan-400 rounded px-1 text-white" value={editValues.lane} onChange={(e) => setEditValues({ ...editValues, lane: e.target.value })} />
                                                        ) : res.lane}
                                                    </td>

                                                    <td className={`py-2 text-right font-bold flex flex-col items-end ${res.is_no_show ? 'text-slate-500' : 'text-white'}`}>
                                                        {isEditing ? (
                                                            <input type="text" className="w-20 bg-navy-900 border border-cyan-400 rounded px-1 text-right text-white" value={editValues.timeStr} onChange={(e) => setEditValues({ ...editValues, timeStr: e.target.value })} />
                                                        ) : (
                                                            <>
                                                                {res.is_dq ? (
                                                                    <div className="text-red-500 bg-red-900/30 px-2 py-1 rounded">
                                                                        DQ: {res.dq_code} - {res.dq_description} ({res.official_initials})
                                                                    </div>
                                                                ) : res.is_no_show ? 'NO SHOW' : formatTime(res.time_ms)}

                                                                {/* Show Raw Time if edited */}
                                                                {res.raw_time !== null && res.raw_time !== res.time_ms && !res.is_dq && (
                                                                    <div className="text-[10px] text-yellow-500 font-bold">Orig: {formatTime(res.raw_time)}</div>
                                                                )}
                                                            </>
                                                        )}
                                                    </td>

                                                    <td className="py-2 text-right">
                                                        {isEditing ? (
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => handleEditSave(res.id)} className="text-green-500 hover:text-green-400"><Save className="w-4 h-4" /></button>
                                                                <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => handleEditClick(res)} className="text-slate-500 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Edit2 className="w-4 h-4 ml-auto" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {liveResults.length === 0 && (
                                    <div className="text-center text-slate-500 py-20 italic">
                                        No results yet. Waiting for timers...
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <Timer className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select a meet to view live results</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
