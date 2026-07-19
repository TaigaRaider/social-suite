import { useState, useRef, useCallback } from 'react';

export default function VirtualList({ items, renderItem, itemHeight = 60, containerHeight = 600, onLoadMore, hasMore, loading, endMessage }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
  const endIndex = Math.min(startIndex + visibleCount, items.length);
  const visibleItems = items.slice(startIndex, endIndex);

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setScrollTop(scrollTop);

    if (onLoadMore && hasMore && !loading && scrollHeight - scrollTop - clientHeight < itemHeight * 3) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, loading, itemHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ height: containerHeight, overflow: 'auto', position: 'relative' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={item.id || item._id || startIndex + i} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
      {loading && (
        <div style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>Loading...</div>
      )}
      {!hasMore && endMessage && (
        <div style={{ textAlign: 'center', padding: 16, color: '#94a3b8' }}>{endMessage}</div>
      )}
    </div>
  );
}
