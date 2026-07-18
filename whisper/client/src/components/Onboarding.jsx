import { useState } from 'react';

const steps = [
  {
    title: 'Welcome to Whisper',
    description: 'A space for your thoughts, ideas, and conversations. Whisper is a microblogging platform where your voice matters.',
    icon: '💬',
  },
  {
    title: 'Share thoughts',
    description: 'Post short messages up to 500 characters. Share what\'s on your mind, from quick updates to deeper reflections.',
    icon: '✍️',
  },
  {
    title: 'Start threads',
    description: 'Reply to posts and build threaded conversations. Every whisper can spark a meaningful discussion.',
    icon: '🧵',
  },
  {
    title: 'Build following',
    description: 'Follow people whose thoughts inspire you. Curate your feed and grow your audience.',
    icon: '👥',
  },
];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem('whisper_onboarded', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('whisper_onboarded', 'true');
    onComplete();
  };

  return (
    <div className="modal-overlay">
      <div className="modal onboarding-modal">
        <div className="onboarding-icon">{steps[step].icon}</div>
        <h3 className="onboarding-title">{steps[step].title}</h3>
        <p className="onboarding-desc">{steps[step].description}</p>
        <div className="onboarding-dots">
          {steps.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>
        <div className="onboarding-actions">
          <button className="onboarding-btn secondary" onClick={handleSkip}>Skip</button>
          <button className="onboarding-btn primary" onClick={handleNext}>
            {step === steps.length - 1 ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
