export function PostSkeleton() {
  return (
    <div className="skeleton-post">
      <div className="skeleton-avatar shimmer" />
      <div className="skeleton-body">
        <div className="skeleton-line short shimmer" />
        <div className="skeleton-line medium shimmer" />
        <div className="skeleton-line long shimmer" />
      </div>
    </div>
  );
}

export function ThreadSkeleton() {
  return (
    <div className="skeleton-thread">
      <PostSkeleton />
      <div className="skeleton-connector" />
      <div className="skeleton-reply" style={{ paddingLeft: 52 }}>
        <PostSkeleton />
      </div>
      <div className="skeleton-reply" style={{ paddingLeft: 52 }}>
        <PostSkeleton />
      </div>
    </div>
  );
}
