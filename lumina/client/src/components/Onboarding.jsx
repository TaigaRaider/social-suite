import { useState } from 'react';

const steps = [
  {
    title: 'Welcome to Lumina',
    desc: 'Share photos and connect with people who inspire you.',
    icon: '&#127752;',
  },
  {
    title: 'Share moments',
    desc: 'Create posts with your favorite images and captions.',
    icon: '&#128247;',
  },
  {
    title: 'Follow creators',
    desc: 'Discover and follow people whose content you love.',
    icon: '&#128101;',
  },
  {
    title: 'Stories',
    desc: 'Share temporary moments that disappear after 24 hours.',
    icon: '&#128250;',
  },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const current = steps[step];

  const finish = () => {
    localStorage.setItem('lumina_onboarded', '1');
    onComplete();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 300 }}>
      <div className="onboarding-card" onClick={(e) => e.stopPropagation()}>
        <div className="onboarding-icon" dangerouslySetInnerHTML={{ __html: current.icon }} />
        <h2 className="onboarding-title">{current.title}</h2>
        <p className="onboarding-desc">{current.desc}</p>

        <div className="onboarding-dots">
          {steps.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>

        <div className="onboarding-actions">
          <button className="onboarding-skip" onClick={finish}>
            Skip
          </button>
          {step < steps.length - 1 ? (
            <button className="onboarding-next" onClick={() => setStep(step + 1)}>
              Next
            </button>
          ) : (
            <button className="onboarding-next" onClick={finish}>
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
