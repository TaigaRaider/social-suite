import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
import ShortcutsModal from './ShortcutsModal';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnread();
    loadNotifications();
    const interval = setInterval(() => {
      loadUnread();
      loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnread = async () => {
    try {
      const data = await api.getUnreadCount();
      setUnread(data.count);
    } catch {}
  };

  const loadNotifications = async () => {
    try {
      const data = await api.crypto.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
  };

  const handleLogout = () => {
    api.updateStatus('offline').catch(() => {});
    logout();
  };

  const handleExport = async () => {
    setExporting(true);
    setShowDropdown(false);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pulse-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.updateStatus(newStatus);
      setShowStatusMenu(false);
      setShowDropdown(false);
    } catch {}
  };

  const initials = user ? `${(user.firstName?.[0] || '')}${(user.lastName?.[0] || '')}`.toUpperCase() || user.username[0].toUpperCase() : '?';

  return (
    <nav className="navbar">
      <div className="navbar-logo">Pulse</div>
      <div className="navbar-actions">
        <div style={{ position: 'relative' }}>
          <div className="navbar-btn" title="Notifications" onClick={() => setShowNotifications(!showNotifications)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </div>
          {showNotifications && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowNotifications(false)} />
              <div style={{ position: 'absolute', top: '100%', right: 0, width: 360, maxHeight: 480, background: 'var(--bg-primary)', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.15)', overflow: 'hidden', zIndex: 200 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={async () => { await api.crypto.markAllNotificationsRead(); loadNotifications(); }}
                      style={{ background: 'none', border: 'none', color: '#0a66c2', cursor: 'pointer', fontSize: 13 }}>
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ overflowY: 'auto', maxHeight: 400 }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#65676b', fontSize: 14 }}>No notifications</div>
                  ) : (
                    notifications.slice(0, 20).map(n => (
                      <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: n.read ? 'transparent' : '#e7f3ff', cursor: 'pointer' }}
                        onClick={async () => { if (!n.read) { await api.crypto.markNotificationRead(n.id); loadNotifications(); } }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#1c1e21' }}>{n.title}</div>
                        <div style={{ fontSize: 13, color: '#65676b', marginTop: 2 }}>{n.body}</div>
                        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{new Date(n.createdAt).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <button className="theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
        <div style={{ position: 'relative' }}>
          <div className="user-avatar" onClick={() => setShowDropdown(!showDropdown)} title={user?.username} style={{ position: 'relative' }}>
            {initials}
            <span style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--bg-primary)', background: user?.status === 'online' ? '#4caf50' : user?.status === 'away' ? '#ff9800' : user?.status === 'dnd' ? '#f44336' : '#9e9e9e' }} />
          </div>
          {showDropdown && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowDropdown(false)} />
              <div className="dropdown">
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{user?.firstName} {user?.lastName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>@{user?.username}</div>
                </div>
                <button className="dropdown-item" onClick={() => { setShowDropdown(false); setShowShortcuts(true); }}>
                  <span style={{ fontSize: 14, fontWeight: 700, marginRight: 8 }}>?</span>
                  Keyboard Shortcuts
                </button>
                <button className="dropdown-item" onClick={() => setShowStatusMenu(!showStatusMenu)}>
                  Set Status
                </button>
                {showStatusMenu && (
                  <div style={{ padding: '4px 16px 8px' }}>
                    {['online', 'away', 'dnd', 'offline'].map(s => (
                      <div key={s} onClick={() => handleStatusChange(s)} style={{ padding: '6px 8px', cursor: 'pointer', borderRadius: 4, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{s === 'online' ? '🟢' : s === 'away' ? '🟡' : s === 'dnd' ? '🔴' : '⚫'}</span>
                        <span>{s === 'dnd' ? 'Do Not Disturb' : s === 'offline' ? 'Invisible' : s.charAt(0).toUpperCase() + s.slice(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button className="dropdown-item" onClick={handleExport} disabled={exporting}>
                  {exporting ? 'Exporting...' : 'Download My Data'}
                </button>
                <button className="dropdown-item" onClick={() => { setShowDropdown(false); navigate('/devices'); }}>
                  <span style={{ fontSize: 14, marginRight: 8 }}>🔐</span>
                  Linked Devices
                </button>
                <button className="dropdown-item danger" onClick={handleLogout}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </nav>
  );
}
