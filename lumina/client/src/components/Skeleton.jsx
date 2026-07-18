export function PostSkeleton() {
  return (
    <div className="post-card skeleton-post">
      <div className="post-header">
        <div className="skeleton skeleton-circle" />
        <div className="skeleton skeleton-text skeleton-text-sm" />
      </div>
      <div className="skeleton skeleton-square" />
      <div className="skeleton-actions-placeholder">
        <div className="skeleton skeleton-circle-sm" />
        <div className="skeleton skeleton-circle-sm" />
      </div>
      <div className="skeleton skeleton-text" style={{ width: '35%' }} />
      <div className="skeleton skeleton-text" style={{ width: '80%' }} />
      <div className="skeleton skeleton-text skeleton-text-sm" style={{ width: '25%' }} />
    </div>
  );
}

export function StorySkeleton() {
  return (
    <div className="story-item">
      <div className="skeleton skeleton-story-ring" />
      <div className="skeleton skeleton-text skeleton-text-xs" style={{ width: 40 }} />
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="post-grid">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="skeleton skeleton-grid-item" />
      ))}
    </div>
  );
}
