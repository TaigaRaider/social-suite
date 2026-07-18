import { useState } from 'react';

const steps = [
  {
    title: 'Welcome to Pulse',
    description: 'Pulse is a modern messaging platform that lets you connect with friends and colleagues in real time.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48, color: 'var(--blue-primary)' }}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    title: 'Start Chatting',
    description: 'Click the + button to find users and start a conversation. Your messages appear instantly with real-time delivery.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48, color: 'var(--blue-primary)' }}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    ),
  },
  {
    title: 'Online Status',
    description: 'See who is online with the green dot indicator. You can also update your own status from your profile.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48, color: 'var(--online-green)' }}>
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
      </svg>
    ),
  },
  {
    title: 'Find Friends',
    description: 'Use the search bar to find people by name or username. Add them to start chatting right away.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48, color: 'var(--blue-secondary)' }}>
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);

  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('pulse_onboarded', '1');
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('pulse_onboarded', '1');
    onComplete();
  };

  return (
    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="modal" style={{ maxWidth: 440, padding: '40px 36px', textAlign: 'center' }}>
        <div style={{ marginBottom: 28 }}>{steps[step].icon}</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>{steps[step].title}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>{steps[step].description}</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i === step ? 'var(--blue-primary)' : 'var(--bg-tertiary)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {!isLast && (
            <button
              onClick={handleSkip}
              style={{
                flex: 1,
                padding: '12px',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: 10,
                color: 'var(--text-secondary)',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
          )}
          <button
            onClick={handleNext}
            className="btn-primary"
            style={{ flex: 1, margin: 0 }}
          >
            {isLast ? "Let's Go" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
