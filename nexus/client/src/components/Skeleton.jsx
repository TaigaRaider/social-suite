const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`;

if (!document.getElementById('skeleton-styles')) {
  const style = document.createElement('style');
  style.id = 'skeleton-styles';
  style.textContent = shimmerKeyframes;
  document.head.appendChild(style);
}

const base = {
  borderRadius: 8,
  background: 'linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-shine) 50%, var(--skeleton-base) 75%)',
  backgroundSize: '800px 100%',
  animation: 'shimmer 1.5s infinite linear',
};

export function PostSkeleton() {
  return (
    <div className="card post">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ ...base, width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ ...base, height: 14, width: '40%', marginBottom: 6 }} />
          <div style={{ ...base, height: 10, width: '25%' }} />
        </div>
      </div>
      <div style={{ ...base, height: 14, width: '100%', marginBottom: 8 }} />
      <div style={{ ...base, height: 14, width: '70%', marginBottom: 12 }} />
      <div style={{ ...base, height: 200, width: '100%', borderRadius: 8 }} />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ ...base, height: 350, borderRadius: 0 }} />
      <div style={{ padding: '0 32px', marginTop: -84, position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ ...base, width: 168, height: 168, borderRadius: '50%', border: '4px solid var(--fb-white)', flexShrink: 0 }} />
        <div style={{ padding: '16px 0', flex: 1 }}>
          <div style={{ ...base, height: 28, width: '50%', marginBottom: 8 }} />
          <div style={{ ...base, height: 16, width: '35%' }} />
        </div>
        <div style={{ padding: '16px 0', display: 'flex', gap: 8 }}>
          <div style={{ ...base, height: 36, width: 120, borderRadius: 6 }} />
          <div style={{ ...base, height: 36, width: 120, borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
          <div style={{
            ...base,
            height: 36,
            width: 120 + Math.random() * 120,
            borderRadius: 18,
          }} />
        </div>
      ))}
    </div>
  );
}

export function ConvoListSkeleton() {
  return (
    <div>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <div style={{ ...base, width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...base, height: 14, width: '60%', marginBottom: 6 }} />
            <div style={{ ...base, height: 10, width: '80%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
