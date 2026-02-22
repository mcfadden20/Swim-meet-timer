import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export default function AdminMaestro() {
    const [searchParams, setSearchParams] = useSearchParams();
    const meetId = searchParams.get('meet_id');

    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        if (!meetId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/maestro/status?meet_id=${meetId}`);
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
    }, [meetId]);

    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const handleFileUpload = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        if (!formData.get('session_summary').size && !formData.get('meet_details').size) {
            alert('Please select at least one file to upload.');
            return;
        }

        setUploading(true);
        setUploadSuccess(false);
        try {
            const res = await fetch('/api/maestro/upload', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                setSearchParams({ meet_id: data.meet_id });
                setUploadSuccess(true);
                // fetchStatus handles the change via useEffect dependency
                setTimeout(() => setUploadSuccess(false), 5000);
            } else {
                alert('Upload failed. Please try again.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="w-full h-screen bg-navy-900 text-slate-300 p-8 font-mono overflow-auto">
            <header className="flex justify-between items-center pb-6 border-b border-navy-800 mb-8 max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                    <Link to="/admin" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-white">MAESTRO <span className="text-cyan-400">INTEGRATION</span></h1>
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

                {/* Cloud Sync Initial Setup */}
                <div className="bg-navy-800 rounded-xl p-6 border border-cyan-400/30">
                    <h2 className="text-sm font-bold text-cyan-400 uppercase tracking-widest mb-4">Initial Setup: Cloud Sync</h2>
                    <p className="text-sm text-slate-400 mb-4">
                        Upload the Meet Maestro configuration files generated on your local laptop to initialize the meet result automation.
                    </p>

                    {uploadSuccess && status?.sessionSummary && (
                        <div className="bg-green-900/40 border border-green-500/50 rounded-lg p-4 mb-4 flex items-center gap-3">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                            <div>
                                <div className="text-sm font-bold text-green-400">Upload Successful!</div>
                                <div className="text-xs text-slate-300 mt-1">
                                    Loaded meet <strong>"{status.meetDetails?.meetName || "Meet"}"</strong> with <strong>{status.sessionSummary.length}</strong> events successfully configured.
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleFileUpload} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-navy-900 p-4 border border-white/5 rounded-lg">
                                <label className="block text-xs font-bold text-slate-500 mb-2">Upload session_summary.csv</label>
                                <input type="file" name="session_summary" accept=".csv" className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-navy-800 file:text-cyan-400 hover:file:bg-navy-700" />
                            </div>
                            <div className="bg-navy-900 p-4 border border-white/5 rounded-lg">
                                <label className="block text-xs font-bold text-slate-500 mb-2">Upload meet_details.json</label>
                                <input type="file" name="meet_details" accept=".json" className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-navy-800 file:text-cyan-400 hover:file:bg-navy-700" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <button type="submit" disabled={uploading} className="bg-cyan-400 text-navy-900 px-6 py-2 rounded font-bold hover:bg-cyan-300 disabled:opacity-50">
                                {uploading ? 'UPLOADING...' : 'UPLOAD FILES'}
                            </button>
                            {uploadSuccess && <span className="text-green-400 font-bold flex items-center gap-2"><CheckCircle className="w-4 h-4" /> SUCCESS</span>}
                        </div>
                    </form>

                    <div className="border-t border-white/10 mt-6 pt-6 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold text-white mb-1">Live Sync Utility</h3>
                            <p className="text-xs text-slate-400">Download the Meet Maestro Sync tool to keep the sync running automatically on your PC.</p>
                        </div>
                        <a href="/api/sync/download-tool" download className="bg-navy-700 text-white border border-white/20 px-4 py-2 flex items-center gap-2 rounded text-sm font-bold hover:bg-navy-600 transition-colors">
                            Download Sync Bundle (.zip)
                        </a>
                    </div>
                </div>

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

                {/* Local Network Instructions Card */}
                <div className="bg-navy-800 rounded-xl p-6 border border-white/5">
                    <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Local Network Operation</h2>
                    <ul className="list-disc list-inside space-y-2 text-sm text-slate-400">
                        <li>The backend is actively monitoring the <code className="bg-navy-900 border border-white/10 px-1 py-0.5 rounded text-cyan-400">maestro_data/</code> directory.</li>
                        <li>If running on your local laptop, point the Meet Maestro <strong>Data Directory</strong> to the absolute path of <code className="bg-navy-900 border border-white/10 px-1 py-0.5 rounded text-cyan-400">swim-meet-timer/maestro_data</code>.</li>
                        <li>Click <strong>Write Configuration File</strong> in Maestro to generate the JSON files automatically.</li>
                    </ul>
                </div>

            </div>
        </div>
    );
}
