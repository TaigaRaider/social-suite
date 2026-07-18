import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DISMISS_KEY = 'nexus_profile_completion_dismissed';

export default function ProfileCompletion({ profile }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true');

  if (dismissed || !profile) return null;

  const items = [
    { label: 'Profile photo', done: !!profile.avatar, path: '/profile/' + profile.id },
    { label: 'Bio', done: !!(profile.bio && profile.bio.trim()), path: '/profile/' + profile.id },
    { label: 'First name + last name', done: !!(profile.firstName && profile.lastName && profile.firstName.trim() && profile.lastName.trim()), path: '/profile/' + profile.id },
    { label: 'First post', done: (profile.postCount || 0) > 0, path: '/' },
    { label: 'Added friends', done: (profile.friendCount || 0) > 0, path: '/friends' },
  ];

  const completed = items.filter(i => i.done).length;
  const pct = Math.round((completed / items.length) * 100);

  if (pct >= 100) return null;

  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Complete your profile</div>
        <button onClick={() => { localStorage.setItem(DISMISS_KEY, 'true'); setDismissed(true); }} style={{ background: 'none', border: 'none', color: 'var(--fb-gray)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>&#10005;</button>
      </div>
      <div style={{ height: 6, background: 'var(--fb-border)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--fb-blue)', borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--fb-gray)', marginBottom: 10 }}>{pct}% complete</div>
      {items.map((item, i) => (
        <div key={i} onClick={() => { if (!item.done) navigate(item.path); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: item.done ? 'default' : 'pointer', fontSize: 13, color: item.done ? 'var(--fb-gray)' : 'var(--fb-text)' }}>
          <span style={{ color: item.done ? '#4caf50' : '#f44336', fontSize: 15 }}>{item.done ? '✓' : '✗'}</span>
          {item.label}
        </div>
      ))}
    </div>
  );
}
