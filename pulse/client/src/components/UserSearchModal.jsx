import { useState, useEffect } from 'react';
import { api } from '../api';

export default function UserSearchModal({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const search = async () => {
    setLoading(true);
    try {
      const data = await api.searchUsers(query);
      setResults(data);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>New Conversation</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="modal-body">
          <input
            type="text"
            placeholder="Search by name or username..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          {loading && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Searching...</div>}
          {!loading && results.length === 0 && query && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No users found</div>
          )}
          {results.map(u => (
            <div key={u.id} className="user-search-item" onClick={() => onSelect(u.id)}>
              <div className="conv-avatar">
                {(u.firstName?.[0] || u.lastName?.[0] || u.username[0]).toUpperCase()}
              </div>
              <div className="user-search-info">
                <h4>{u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.username}</h4>
                <p>@{u.username} {u.status === 'online' ? '• Online' : ''}</p>
              </div>
              <button className="user-search-action">Message</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
