import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Stopwatch from './Stopwatch';
import JoinMeet from './JoinMeet';
import { LogOut, ShieldCheck } from 'lucide-react';

export default function TimerApp() {
    const [activeMeet, setActiveMeet] = useState(() => {
        const saved = localStorage.getItem('active-meet');
        return saved ? JSON.parse(saved) : null;
    });

    const handleJoin = (meet) => {
        localStorage.setItem('active-meet', JSON.stringify(meet));
        setActiveMeet(meet);
    };

    const handleLeave = () => {
        localStorage.removeItem('active-meet');
        setActiveMeet(null);
    };

    // Unified UI Style Tokens
    const buttonBase = "flex items-center gap-2 px-3 py-2 rounded-full bg-[#282a2f] transition-all text-[10px] font-black uppercase tracking-widest border border-white/5";
    const buttonShadow = "shadow-[6px_6px_12px_#0e0f11,-6px_-6px_12px_#363940]";
    const pushedInner = "shadow-[inset_4px_4px_8px_#101214,inset_-4px_-4px_8px_#363940]";

    return (
        /* The root container is fixed to screen height to prevent scrolling */
        <div className="w-full h-screen bg-[#1b1d21] text-white flex flex-col p-6 overflow-hidden box-border">
            
            {/* HEADER: Fixed size, will not be pushed off screen */}
            <header className="w-full max-w-md mx-auto flex flex-col gap-4 mb-4 shrink-0">
                <div className="w-full flex justify-between items-center">
                    <h1 className="text-lg font-black tracking-tighter text-[#8F92A1] uppercase italic leading-none">
                        SWIM<span className="text-white"> TIMER</span>
                    </h1>
                    
                    <div className="flex gap-3 items-center">
                        {/* ONLINE STATUS: Restored as requested */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#282a2f] border border-white/5 shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_#10B981]" />
                            <span className="text-[9px] font-black text-[#10B981] tracking-widest uppercase">Online</span>
                        </div>
                    </div>
                </div>

                {activeMeet && (
                    <div className="mt-[-18px] flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black text-white italic uppercase tracking-tight leading-none">
                                {activeMeet.name}
                            </h2>
                            <div className="flex gap-2">
                                {/* OFFICIAL & EXIT: Now with matching Dashboard borders */}
                                <Link 
                                    to="/official" 
                                    className={`${buttonBase} ${buttonShadow} active:${pushedInner} text-[#8F92A1] hover:text-white`}
                                >
                                    <ShieldCheck className="w-3 h-3 text-[#f25b2a]" />
                                    OFFICIAL
                                </Link>
                                <button 
                                    onClick={handleLeave} 
                                    className={`${buttonBase} ${buttonShadow} active:${pushedInner} text-[#8F92A1] hover:text-[#EF4444]`}
                                >
                                    <LogOut className="w-3 h-3 text-[#EF4444]" />
                                    EXIT
                                </button>
                            </div>
                        </div>

                        {/* MEET CODE READOUT: Sunken Well style */}
                        <div className={`mt-[-8px] w-full py-1.5 rounded-full bg-[#282a2f] ${pushedInner} border border-white/5 flex justify-center items-center`}>
                            <span className="text-[9px] font-black tracking-[0.4em] text-[#8F92A1]">
                                MEET CODE: <span className="text-[#f25b2a] ml-1">{activeMeet.access_code}</span>
                            </span>
                        </div>
                    </div>
                )}
            </header>

            {/* MAIN CONTENT AREA: flex-1 allows the timer to grow/shrink so buttons stay visible */}
            <main className="w-full max-w-md mx-auto flex-1 flex flex-col min-h-0">
                {activeMeet ? (
                    <Stopwatch meetId={activeMeet.id} orgName={activeMeet.name} />
                ) : (
                    <JoinMeet onJoin={handleJoin} />
                )}
            </main>

            {/* FOOTER: Anchored to the very bottom */}
            <footer className="w-full max-w-md mx-auto text-center pt-2 pb-2 shrink-0 border-t border-white/5 mt-auto">
                <p className="text-[9px] text-[#8F92A1]/40 uppercase tracking-[0.5em] font-black">
                    Official Precision Timing System
                </p>
            </footer>
        </div>
    );
}