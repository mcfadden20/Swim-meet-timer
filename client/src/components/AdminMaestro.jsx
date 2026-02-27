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
        <div className="w-screen h-screen bg-[#1b1d21] text-[#8F92A1] p-8 font-mono overflow-hidden" style={{ overflowY: 'auto' }}>
            <header className="flex justify-between items-center pb-6 mb-8 max-w-6xl mx-auto px-8 bg-[#282a2f] rounded-[40px] py-6 shadow-[12px_12px_25px_#0e0f11,-12px_-12px_25px_#363940]">
                <div className="flex items-center gap-4">
                    <Link to="/admin" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-[#8F92A1]" />
                    </Link>
                    <h1 className="text-2xl font-black tracking-widest text-white italic uppercase">Maestro <span className="text-[#f25b2a]">Integration</span></h1>
                </div>
                <button
                    onClick={fetchStatus}
                    disabled={loading}
                    className="flex items-center gap-2 bg-[#1b1d21] text-white px-4 py-2 rounded-full font-bold hover:bg-white/10 disabled:opacity-50 shadow-[6px_6px_12px_#0e0f11,-6px_-6px_12px_#363940] transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </header>

            <div className="max-w-6xl mx-auto space-y-6">

                {/* Cloud Sync Initial Setup */}
                <div className="bg-[#282a2f] rounded-[40px] p-8 shadow-[12px_12px_25px_#0e0f11,-12px_-12px_25px_#363940]">
                    <h2 className="text-sm font-black text-[#f25b2a] uppercase tracking-[0.2em] mb-6 italic">Initial Setup: Cloud Sync</h2>
                    <p className="text-sm text-[#8F92A1] mb-6">
                        Upload the Meet Maestro configuration files generated on your local laptop to initialize the meet result automation.
                    </p>

                    {uploadSuccess && status?.sessionSummary && (
                        <div className="bg-[#1b1d21]/50 border border-[#10B981]/50 rounded-[24px] p-4 mb-6 flex items-center gap-3 shadow-[inset_2px_2px_4px_#101214,inset_-2px_-2px_4px_#363940]">
                            <CheckCircle className="w-6 h-6 text-[#10B981]" />
                            <div>
                                <div className="text-sm font-bold text-[#10B981]">Upload Successful!</div>
                                <div className="text-xs text-[#8F92A1] mt-1 font-mono">
                                    Loaded meet <strong>"{status.meetDetails?.meetName || "Meet"}"</strong> with <strong>{status.sessionSummary.length}</strong> events successfully configured.
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleFileUpload} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#1b1d21] p-6 rounded-[24px] shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940]">
                                <label className="block text-xs font-bold text-[#f25b2a] uppercase tracking-widest mb-3">Session Summary</label>
                                <input type="file" name="session_summary" accept=".csv" className="w-full text-sm text-[#8F92A1] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#282a2f] file:text-[#f25b2a] hover:file:bg-white/10" />
                            </div>
                            <div className="bg-[#1b1d21] p-6 rounded-[24px] shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940]">
                                <label className="block text-xs font-bold text-[#f25b2a] uppercase tracking-widest mb-3">Meet Details</label>
                                <input type="file" name="meet_details" accept=".json" className="w-full text-sm text-[#8F92A1] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#282a2f] file:text-[#f25b2a] hover:file:bg-white/10" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-6">
                            <button type="submit" disabled={uploading} className="bg-[linear-gradient(135deg,#f25b2a_0%,#e83323_100%)] text-white px-8 py-3 rounded-full font-black hover:shadow-[0_0_20px_#f25b2a66] disabled:opacity-50 transition-all shadow-[6px_6px_12px_#0e0f11,-6px_-6px_12px_#363940] italic uppercase tracking-widest">
                                {uploading ? 'Uploading...' : 'Upload Files'}
                            </button>
                            {uploadSuccess && <span className="text-[#10B981] font-bold flex items-center gap-2 font-mono"><CheckCircle className="w-4 h-4" /> SUCCESS</span>}
                        </div>
                    </form>

                    <div className="border-t border-[#363940] mt-8 pt-8 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold text-white mb-2 italic uppercase tracking-widest">Live Sync Utility</h3>
                            <p className="text-xs text-[#8F92A1] font-mono">Download the Meet Maestro Sync tool to keep the sync running automatically on your PC.</p>
                        </div>
                        <a href="/api/sync/download-tool" download className="bg-[linear-gradient(135deg,#f25b2a_0%,#e83323_100%)] text-white px-6 py-3 flex items-center gap-2 rounded-full text-sm font-black hover:shadow-[0_0_20px_#f25b2a66] transition-all italic uppercase tracking-widest shadow-[6px_6px_12px_#0e0f11,-6px_-6px_12px_#363940]">
                            Download Sync
                        </a>
                    </div>
                </div>

                {/* System Status Card */}
                <div className="bg-[#282a2f] rounded-[40px] p-8 shadow-[12px_12px_25px_#0e0f11,-12px_-12px_25px_#363940]">
                    <h2 className="text-sm font-black text-[#f25b2a] uppercase tracking-[0.2em] mb-6 italic">Connection Status</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 rounded-[24px] bg-[#1b1d21] shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940]">
                            <div className="flex items-center gap-3 mb-3">
                                {status?.meetDetails ? <CheckCircle className="w-5 h-5 text-[#10B981]" /> : <XCircle className="w-5 h-5 text-[#EF4444]" />}
                                <span className="font-bold text-white italic uppercase tracking-widest">Meet Details</span>
                            </div>
                            <div className="text-sm text-[#8F92A1] font-mono">
                                {status?.meetDetails ? `Loaded: ${status.meetDetails.meetName}` : 'Waiting for meet_details.json'}
                            </div>
                        </div>

                        <div className="p-6 rounded-[24px] bg-[#1b1d21] shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940]">
                            <div className="flex items-center gap-3 mb-3">
                                {status?.sessionSummary?.length > 0 ? <CheckCircle className="w-5 h-5 text-[#10B981]" /> : <XCircle className="w-5 h-5 text-[#EF4444]" />}
                                <span className="font-bold text-white italic uppercase tracking-widest">Session Summary</span>
                            </div>
                            <div className="text-sm text-[#8F92A1] font-mono">
                                {status?.sessionSummary?.length > 0 ? `Loaded: ${status.sessionSummary.length} events synced` : 'Waiting for session_summary.csv'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Local Network Instructions Card */}
                <div className="bg-[#282a2f] rounded-[40px] p-8 shadow-[12px_12px_25px_#0e0f11,-12px_-12px_25px_#363940]">
                    <h2 className="text-sm font-black text-[#f25b2a] uppercase tracking-[0.2em] mb-6 italic">Local Network Operation</h2>
                    <ul className="list-disc list-inside space-y-3 text-sm text-[#8F92A1] font-mono">
                        <li>The backend is actively monitoring the <code className="bg-[#1b1d21] border border-[#363940] px-2 py-1 rounded-full text-[#f25b2a] font-mono">maestro_data/</code> directory.</li>
                        <li>If running on your local laptop, point the Meet Maestro <strong>Data Directory</strong> to the absolute path of <code className="bg-[#1b1d21] border border-[#363940] px-2 py-1 rounded-full text-[#f25b2a] font-mono">swim-meet-timer/maestro_data</code>.</li>
                        <li>Click <strong>Write Configuration File</strong> in Maestro to generate the JSON files automatically.</li>
                    </ul>
                </div>

            </div>
        </div>
    );
}
