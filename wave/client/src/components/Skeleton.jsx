export function GroupListSkeleton({ count = 6 }) {
  return (
    <div className="skeleton-group-list">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-group-item" key={i}>
          <div className="skeleton-avatar shimmer" />
          <div className="skeleton-group-info">
            <div className="skeleton-line shimmer" style={{ width: '60%' }} />
            <div className="skeleton-line shimmer" style={{ width: '85%' }} />
          </div>
          <div className="skeleton-group-right">
            <div className="skeleton-line shimmer" style={{ width: 40 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton({ count = 8 }) {
  return (
    <div className="skeleton-chat">
      {Array.from({ length: count }).map((_, i) => {
        const isSent = i % 3 === 0;
        return (
          <div key={i} className={`skeleton-bubble ${isSent ? 'sent' : 'received'}`}>
            <div className="skeleton-line shimmer" style={{ width: '40%' }} />
            <div className="skeleton-line shimmer" style={{ width: `${50 + (i % 4) * 15}%` }} />
            <div className="skeleton-line shimmer" style={{ width: '30%' }} />
          </div>
        );
      })}
    </div>
  );
}
