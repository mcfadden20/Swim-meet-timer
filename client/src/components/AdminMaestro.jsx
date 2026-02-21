import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminMaestro() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/maestro/status');
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-screen bg-navy-900 text-slate-300 p-8 font-mono overflow-auto">
            <header className="flex justify-between items-center pb-6 border-b border-navy-800 mb-8 max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                    <Link to="/admin" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-white">MAESTRO<span className="text-cyan-400">INTEGRATION</span></h1>
                </div>
                <button
                    onClick={fetchStatus}
                    disabled={loading}
                    className="flex items-center gap-2 bg-navy-800 border border-white/10 text-white px-4 py-2 rounded-lg font-bold hover:bg-navy-700 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> REFRESH
                </button>
            </header>

            <div className="max-w-4xl mx-auto space-y-6">

                {/* System Status Card */}
                <div className="bg-navy-800 rounded-xl p-6 border border-white/5">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Connection Status</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-navy-900 border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                {status?.meetDetails ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                                <span className="font-bold text-white">Meet Details</span>
                            </div>
                            <div className="text-sm text-slate-400">
                                {status?.meetDetails ? `Loaded: ${status.meetDetails.meetName}` : 'Waiting for meet_details.json'}
                            </div>
                        </div>

                        <div className="p-4 rounded-lg bg-navy-900 border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                {status?.sessionSummary?.length > 0 ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                                <span className="font-bold text-white">Session Summary</span>
                            </div>
                            <div className="text-sm text-slate-400">
                                {status?.sessionSummary?.length > 0 ? `Loaded: ${status.sessionSummary.length} Events Synced` : 'Waiting for session_summary.csv'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Instructions Card */}
                <div className="bg-navy-800 rounded-xl p-6 border border-white/5">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">How it works</h2>
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-400">
                        <li>The backend is actively monitoring the <code className="bg-navy-900 border border-white/10 px-1 py-0.5 rounded text-cyan-400">maestro_data/</code> directory.</li>
                        <li>In <strong>Meet Maestro</strong>, go to Timing Setup.</li>
                        <li>Select "Swim Meet Timer" or "File Integration" as the timing vendor.</li>
                        <li>Point the default data directory in Maestro to the absolute path of <code className="bg-navy-900 border border-white/10 px-1 py-0.5 rounded text-cyan-400">swim-meet-timer/maestro_data</code>.</li>
                        <li>Click <strong>Write Configuration File</strong> in Maestro to generate the JSON files.</li>
                    </ul>
                </div>

            </div>
        </div>
    );
}
