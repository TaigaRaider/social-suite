import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DISMISS_KEY = 'pulse_profile_completion_dismissed';

export default function ProfileCompletion() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true');

  if (dismissed || !user) return null;

  const items = [
    { label: 'Profile photo', done: !!user.avatar },
    { label: 'Bio', done: !!(user.bio && user.bio.trim()) },
    { label: 'First name + last name', done: !!(user.firstName && user.lastName && user.firstName.trim() && user.lastName.trim()) },
    { label: 'Sent a message', done: true },
    { label: 'Joined a group', done: true },
  ];

  const completed = items.filter(i => i.done).length;
  const pct = Math.round((completed / items.length) * 100);

  if (pct >= 100) return null;

  return (
    <div style={{ background: 'var(--card-bg, #1a1a2e)', border: '1px solid var(--border, #2a2a3e)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Complete your profile</div>
        <button onClick={() => { localStorage.setItem(DISMISS_KEY, 'true'); setDismissed(true); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #888)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>&#10005;</button>
      </div>
      <div style={{ height: 6, background: 'var(--border, #2a2a3e)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--blue-primary, #3b82f6)', borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted, #888)', marginBottom: 10 }}>{pct}% complete</div>
      {items.map((item, i) => (
        <div key={i}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: item.done ? 'default' : 'pointer', fontSize: 13, color: item.done ? 'var(--text-muted, #888)' : 'var(--text-primary, #fff)' }}>
          <span style={{ color: item.done ? '#4caf50' : '#f44336', fontSize: 15 }}>{item.done ? '✓' : '✗'}</span>
          {item.label}
        </div>
      ))}
    </div>
  );
}
