import { useState, useEffect } from 'react';

export default function Splash({ onComplete }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500);
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="splash-screen" style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #2d1040 100%)',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease-out',
      pointerEvents: visible ? 'all' : 'none'
    }}>
      <div style={{
        animation: 'splashPulse 1.5s ease-in-out infinite',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px'
      }}>
        <img src="/favicon.svg" alt="Lumina" style={{ width: 96, height: 96, filter: 'drop-shadow(0 0 30px rgba(197,53,132,0.5))' }} />
        <div>
          <h1 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 700, margin: 0, fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '-0.02em' }}>Lumina</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', margin: '8px 0 0', fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.05em' }}>ILLUMINATE YOUR WORLD</p>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: `linear-gradient(135deg, #e11d48, #be123c, #9f1239)`,
              animation: `splashDot 1.2s ease-in-out ${i * 0.2}s infinite`
            }} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes splashPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        @keyframes splashDot { 0%,80%,100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.2); } }
      `}</style>
    </div>
  );
}
