import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
import ShortcutsModal from './ShortcutsModal';

export default function Navbar({ user, onLogout, unreadCount = 0 }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wave-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };
  const initials = user
    ? (user.firstName && user.lastName
        ? (user.firstName[0] + user.lastName[0]).toUpperCase()
        : user.firstName
        ? user.firstName[0].toUpperCase()
        : user.username[0].toUpperCase())
    : '?';

  return (
    <div className="sidebar-header">
      <span className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Wave</span>
      <div className="header-actions">
        <button className="header-btn" onClick={() => navigate('/new-group')} title="New Group">
          +
        </button>
        <div style={{ position: 'relative' }}>
          <button className="header-btn" title="Notifications">
            &#128276;
          </button>
          {unreadCount > 0 && (
            <span className="unread-badge" style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, fontSize: 10, padding: '0 4px' }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div
          className="user-avatar small"
          style={{ cursor: 'pointer', background: 'var(--accent-dark)', position: 'relative' }}
          title={user?.username}
        >
          {initials}
          <span style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--bg-primary)', background: user?.status === 'online' ? '#4caf50' : user?.status === 'away' ? '#ff9800' : user?.status === 'dnd' ? '#f44336' : '#9e9e9e' }} />
        </div>
        <button className="header-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? '&#9788;' : '&#9790;'}
        </button>
        <button className="header-btn" onClick={onLogout} title="Logout">
          &#8594;
        </button>
        <button className="header-btn" onClick={handleExport} disabled={exporting} title="Download My Data" style={{ fontSize: 12 }}>
          {exporting ? '...' : '↓'}
        </button>
        <button className="header-btn" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts" style={{ fontSize: 14, fontWeight: 700 }}>?</button>
      </div>
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
