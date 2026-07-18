import { useState } from 'react';

const steps = [
  {
    title: 'Welcome to Wave',
    desc: 'Wave is a group messaging app that keeps you connected with the people who matter most.',
    icon: '&#128075;',
  },
  {
    title: 'Create groups',
    desc: 'Start a group for your team, friends, or family. Name it, add a description, and invite members.',
    icon: '&#128101;',
  },
  {
    title: 'Manage members',
    desc: 'Add or remove members at any time. Everyone in the group can see messages and participate.',
    icon: '&#9881;',
  },
  {
    title: 'Stay connected',
    desc: 'Get notified when new messages arrive so you never miss what matters.',
    icon: '&#128276;',
  },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('wave_onboarded', '1');
      onComplete();
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('wave_onboarded', '1');
    onComplete();
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-icon" dangerouslySetInnerHTML={{ __html: steps[step].icon }} />
        <h2>{steps[step].title}</h2>
        <p>{steps[step].desc}</p>
        <div className="onboarding-dots">
          {steps.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>
        <div className="onboarding-actions">
          {!isLast && (
            <button className="onboarding-btn secondary" onClick={handleSkip}>
              Skip
            </button>
          )}
          <button className="onboarding-btn primary" onClick={handleNext}>
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
