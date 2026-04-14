import React, { useEffect, useState } from 'react';

const IntroAnimation: React.FC = () => {
  const [visible, setVisible] = useState(true);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    // Start exit animation after 2.5 seconds
    const timer1 = setTimeout(() => {
      setAnimateOut(true);
    }, 2200);

    // Remove from DOM after animation completes
    const timer2 = setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div 
      className={`
        fixed inset-0 z-[100] bg-nafra-bg flex items-center justify-center
        transition-opacity duration-700 ease-in-out
        ${animateOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}
      `}
    >
      <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(55,157,255,0.16),transparent_38%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(255,166,77,0.10),transparent_42%)]" />
      <div className="relative flex flex-col items-center">
        <div className="relative">
            {/* Main Text */}
            <h1 
                className={`
                    text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-nafra-accent via-cyan-300 to-nafra-accent
                    transform transition-all duration-1000 ease-out
                    ${animateOut ? 'scale-110 blur-sm' : 'scale-100 blur-0'}
                `}
            >
                ALQUID
            </h1>
            
            {/* Subtext appearing */}
            <div className="overflow-hidden h-8 mt-2 flex justify-center">
              <p className="text-nafra-text-muted font-mono text-sm tracking-[0.3em] animate-[slideUp_0.8s_ease-out_0.5s_both]">
                    DATA SUITE
                </p>
            </div>
        </div>

        {/* Loading bar */}
          <div className="mt-12 w-48 h-1 bg-nafra-surface border border-nafra-border rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-nafra-accent to-cyan-300 animate-[loading_2s_ease-in-out_both] w-full origin-left"></div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes loading {
            0% { transform: scaleX(0); }
            100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
};

export default IntroAnimation;