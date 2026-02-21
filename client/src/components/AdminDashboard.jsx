import { useState, useEffect } from 'react';
import { Download, RefreshCw, Plus, Timer } from 'lucide-react';

export default function AdminDashboard() {
    const [meets, setMeets] = useState([]);
    const [selectedMeet, setSelectedMeet] = useState(null);
    const [liveResults, setLiveResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [maestroStatus, setMaestroStatus] = useState(null);

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

    return (
        <div className="w-full h-screen bg-navy-900 text-slate-300 p-4 font-mono overflow-hidden flex flex-col">
            <header className="flex justify-between items-center pb-4 border-b border-navy-800 shrink-0">
                <h1 className="text-2xl font-bold tracking-tight text-white">ADMIN<span className="text-cyan-400">DASHBOARD</span></h1>
                <div className="flex gap-2">
                    <a href="/admin/maestro" className="flex items-center gap-2 bg-cyan-400 text-navy-900 px-4 py-2 rounded-lg font-bold hover:bg-cyan-300">
                        <Plus className="w-4 h-4" /> CREATE NEW MEET (MAESTRO)
                    </a>
                </div>
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
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 font-mono">
                                        {liveResults.map(res => (
                                            <tr key={res.id} className="hover:bg-white/5 transition-colors">
                                                <td className="py-2 text-slate-500">{new Date(res.created_at).toLocaleTimeString()}</td>
                                                <td className="py-2 text-white">{res.event_number}</td>
                                                <td className="py-2 text-white">{res.heat_number}</td>
                                                <td className="py-2 text-cyan-400 font-bold">{res.lane}</td>
                                                <td className={`py-2 text-right font-bold ${res.is_no_show ? 'text-red-500' : 'text-white'}`}>
                                                    {res.is_no_show ? 'NO SHOW' : formatTime(res.time_ms)}
                                                </td>
                                            </tr>
                                        ))}
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
