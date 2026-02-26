import { useState } from 'react';

export default function JoinMeet({ onJoin }) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!code) return;
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/join-meet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ access_code: code.toUpperCase() })
            });

            const data = await res.json();

            if (res.ok) {
                onJoin({ ...data.meet });
            } else {
                setError(data.error || 'Failed to join');
            }
        } catch {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm flex flex-col items-center justify-center gap-6 mt-10">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">JOIN MEET</h2>
                <p className="text-slate-400">Enter the 6-character code provided by the meet organizer.</p>
            </div>

            <div className="w-full space-y-4">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="MEET CODE (e.g. DOL-26)"
                    className="w-full bg-navy-800 border-2 border-cyan-400/50 rounded-xl p-4 text-center text-3xl font-mono font-bold text-white outline-none focus:border-cyan-400 uppercase tracking-widest placeholder:text-slate-600"
                />
            </div>

            {error && <div className="text-red-400 font-bold bg-red-900/20 px-4 py-2 rounded-lg">{error}</div>}

            <button
                onClick={handleJoin}
                disabled={loading || !code}
                className="w-full h-16 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-navy-900 text-xl font-black rounded-xl tracking-widest shadow-lg shadow-cyan-400/20 active:scale-95 transition-all"
            >
                {loading ? 'CONNECTING...' : 'START TIMER'}
            </button>

            <div className="mt-8 p-4 bg-navy-800/50 rounded-lg text-xs text-slate-500 text-center border border-white/5">
                <p className="font-bold text-slate-400 mb-1">DEMO CODE AVAILABLE</p>
                <p>Try code: <span className="text-cyan-400 font-mono text-sm">DEMO12</span></p>
            </div>
        </div>
    );
}
