import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
        <div className="w-full h-screen bg-[#1b1d21] text-white flex flex-col items-center justify-start p-4 overflow-hidden box-border">
            <header className="w-full max-w-md flex flex-col items-center py-2 mb-4 border-b border-[#282a2f]">
                <div className="w-full flex justify-between items-center mb-2">
                    <h1 className="text-xl font-bold tracking-tight text-cyan-400">
                        SWIM<span className="text-white"> TIMER</span>
                    </h1>
                    <div className="flex gap-2 items-center">
                        {activeMeet && (
                            <>
                                <Link to="/official" className="text-[10px] uppercase font-bold bg-[#f25b2a]/20 text-[#f25b2a] border border-[#f25b2a]/50 px-2 py-1 rounded hover:bg-[#f25b2a] hover:text-white transition-colors">
                                    Official Mode
                                </Link>
                                <button onClick={handleLeave} className="text-[10px] uppercase font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/50 px-2 py-1 rounded hover:bg-[#EF4444] hover:text-white transition-colors">
                                    EXIT
                                </button>
                            </>
                        )}
                        <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                        <span className="text-xs font-bold text-[#10B981] tracking-widest">ONLINE</span>
                    </div>
                </div>
                {activeMeet && (
                    <div className="mt-2 text-center flex flex-col items-center gap-3">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider">{activeMeet.name}</h2>
                        <div className="px-6 py-2 rounded-full bg-[#1b1d21] border border-[#f25b2a]/30">
                            <span className="text-xs font-black tracking-[0.3em] text-[#8F92A1]">MEET CODE: <span className="text-[#f25b2a]">{activeMeet.access_code}</span></span>
                        </div>
                    </div>
                )}
            </header>

            {activeMeet ? (
                <Stopwatch meetId={activeMeet.id} orgName={activeMeet.name} />
            ) : (
                <JoinMeet onJoin={handleJoin} />
            )}

            {/* Application Footer Placeholder */}
            {/* Note: Edit this block to add custom sponsor links, app versioning, or organization policies */}
            <footer className="w-full text-center py-4 mt-auto border-t border-[#282a2f]">
                <p className="text-xs text-[#8F92A1] uppercase tracking-widest font-bold">
                    Official Swim Timer
                </p>
            </footer>
        </div>
    );
}
