import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DISMISS_KEY = 'whisper_profile_completion_dismissed';

export default function ProfileCompletion({ profile }) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true');

  if (dismissed || !profile) return null;

  const items = [
    { label: 'Profile photo', done: !!profile.avatar },
    { label: 'Bio', done: !!(profile.bio && profile.bio.trim()) },
    { label: 'First name + last name', done: !!(profile.firstName && profile.lastName && profile.firstName.trim() && profile.lastName.trim()) },
    { label: 'First post', done: (profile.postCount || 0) > 0 },
    { label: 'Followed someone', done: (profile.followingCount || 0) > 0 },
  ];

  const completed = items.filter(i => i.done).length;
  const pct = Math.round((completed / items.length) * 100);

  if (pct >= 100) return null;

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Complete your profile</div>
        <button onClick={() => { localStorage.setItem(DISMISS_KEY, 'true'); setDismissed(true); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>&#10005;</button>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--reply-color, #1d9bf0)', borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>{pct}% complete</div>
      {items.map((item, i) => (
        <div key={i}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: item.done ? 'default' : 'pointer', fontSize: 13, color: item.done ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
          <span style={{ color: item.done ? '#4caf50' : '#f44336', fontSize: 15 }}>{item.done ? '✓' : '✗'}</span>
          {item.label}
        </div>
      ))}
    </div>
  );
}
