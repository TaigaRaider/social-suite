import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadUnread = async () => {
    try {
      const data = await api.getUnreadCount();
      setUnread(data.count);
    } catch {}
  };

  const handleLogout = () => {
    api.updateStatus('offline').catch(() => {});
    logout();
  };

  const initials = user ? `${(user.firstName?.[0] || '')}${(user.lastName?.[0] || '')}`.toUpperCase() || user.username[0].toUpperCase() : '?';

  return (
    <nav className="navbar">
      <div className="navbar-logo">Pulse</div>
      <div className="navbar-actions">
        {unread > 0 && (
          <div className="navbar-btn" title="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span className="badge">{unread > 9 ? '9+' : unread}</span>
          </div>
        )}
        <div style={{ position: 'relative' }}>
          <div className="user-avatar" onClick={() => setShowDropdown(!showDropdown)} title={user?.username}>
            {initials}
          </div>
          {showDropdown && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowDropdown(false)} />
              <div className="dropdown">
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.firstName} {user?.lastName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>@{user?.username}</div>
                </div>
                <button className="dropdown-item danger" onClick={handleLogout}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
