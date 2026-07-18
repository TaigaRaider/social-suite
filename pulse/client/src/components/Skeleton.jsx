import '../App.css';

const shimmerStyle = {
  background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: 8,
};

const avatarStyle = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  flexShrink: 0,
};

const lineStyle = (width) => ({
  height: 12,
  borderRadius: 6,
  ...shimmerStyle,
  width,
});

export function ConversationSkeleton({ count = 6 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', gap: 12 }}>
          <div style={{ ...shimmerStyle, ...avatarStyle }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {lineStyle(`${60 - i * 5}%`)}
              <div style={{ width: 36, height: 10, borderRadius: 5, ...shimmerStyle }} />
            </div>
            {lineStyle(`${80 - i * 8}%`)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  const bubbles = [
    { align: 'flex-start', width: '55%' },
    { align: 'flex-end', width: '45%' },
    { align: 'flex-start', width: '70%' },
    { align: 'flex-end', width: '35%' },
    { align: 'flex-start', width: '50%' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
      {bubbles.map((b, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: b.align }}>
          <div
            style={{
              ...shimmerStyle,
              width: b.width,
              height: 40,
              borderRadius: 18,
            }}
          />
        </div>
      ))}
    </div>
  );
}
