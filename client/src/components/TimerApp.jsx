import { useState, useEffect } from 'react';
import Stopwatch from './Stopwatch';
import JoinMeet from './JoinMeet';

export default function TimerApp() {
    const [activeMeet, setActiveMeet] = useState(() => {
        const saved = localStorage.getItem('active-meet');
        return saved ? JSON.parse(saved) : null;
    });

    // Validate Session on Mount
    useEffect(() => {
        if (!activeMeet) return;

        // Quick validation check implies we need an endpoint. 
        // For now, let's just make the "Exit" button VERY prominent if there's an error.
    }, [activeMeet]);

    const handleJoin = (meet) => {
        localStorage.setItem('active-meet', JSON.stringify(meet));
        setActiveMeet(meet);
    };

    const handleLeave = () => {
        // No confirm for quicker debugging if loop issues
        localStorage.removeItem('active-meet');
        setActiveMeet(null);
    };

    return (
        <div className="w-full h-screen bg-navy-900 text-slate-300 flex flex-col items-center justify-start p-4 font-mono overflow-hidden">
            <header className="w-full max-w-md flex flex-col items-center py-4 mb-2 border-b border-navy-800">
                <div className="w-full flex justify-between items-center mb-2">
                    <h1 className="text-xl font-bold tracking-tight text-cyan-400">
                        SWIM<span className="text-white">TIMER</span>
                    </h1>
                    <div className="flex gap-2 items-center">
                        {activeMeet && (
                            <button onClick={handleLeave} className="text-[10px] uppercase font-bold bg-red-900/50 text-red-500 border border-red-500 px-2 py-1 rounded hover:bg-red-500 hover:text-white transition-colors">
                                EXIT
                            </button>
                        )}
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                        <span className="text-xs font-bold text-cyan-400">ONLINE</span>
                    </div>
                </div>
                {activeMeet && (
                    <div className="text-center">
                        <h2 className="text-lg font-bold text-white uppercase tracking-wider">{activeMeet.name}</h2>
                        <div className="text-xs text-slate-500 font-mono">CODE: {activeMeet.access_code}</div>
                    </div>
                )}
            </header>

            {activeMeet ? (
                <Stopwatch meetId={activeMeet.id} orgName={activeMeet.name} />
            ) : (
                <JoinMeet onJoin={handleJoin} />
            )}
        </div>
    );
}
