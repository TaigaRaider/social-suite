import { useState } from 'react';

const steps = [
  { icon: '🌐', title: 'Welcome to Nexus', desc: 'Your new social home. Nexus connects you with friends and lets you share moments that matter.' },
  { icon: '✍️', title: 'Share your thoughts', desc: 'Create posts to share updates, photos, and ideas with your friends. They can like and comment on your posts.' },
  { icon: '👥', title: 'Connect with friends', desc: 'Send friend requests to people you know. Accept requests and build your network on Nexus.' },
  { icon: '💬', title: 'Stay in touch', desc: 'Use messaging to have real-time conversations with your friends. Never miss a beat.' },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);

  const finish = () => {
    localStorage.setItem('nexus_onboarded', '1');
    onComplete();
  };

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else finish();
  };

  const skip = () => finish();

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: 'var(--fb-white)', borderRadius: 12, padding: 40, width: 440, maxWidth: '90vw', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{steps[step].icon}</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--fb-dark)', marginBottom: 8 }}>{steps[step].title}</h2>
        <p style={{ fontSize: 15, color: 'var(--fb-gray)', lineHeight: 1.5, marginBottom: 24 }}>{steps[step].desc}</p>

        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, background: i === step ? 'var(--fb-blue)' : 'var(--fb-light-gray)', transition: 'all 0.3s' }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className="btn btn-gray" onClick={skip}>Skip</button>
          <button className="btn btn-primary" onClick={next}>{step < steps.length - 1 ? 'Next' : 'Get Started'}</button>
        </div>
      </div>
    </div>
  );
}
