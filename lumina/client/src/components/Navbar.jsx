import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
import ShortcutsModal from './ShortcutsModal';

export default function Navbar({ onCreateClick }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const data = await api.getUnreadCount();
        if (mounted) setUnread(data.count);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const icon = (path, symbol) => (
    <Link to={path} className={`nav-icon ${location.pathname === path ? 'active' : ''}`}>
      {symbol}
    </Link>
  );

  return (
    <>
      <div className="navbar-logo">
        <h1>Lumina</h1>
        <div style={{ flex: 1 }} />
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? '&#9728;' : '&#9790;'}
        </button>
        <button className="theme-toggle" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts" style={{ fontSize: 14, fontWeight: 700 }}>?</button>
      </div>
      <nav className="navbar">
        {icon('/', '⌂')}
        {icon('/explore', '⊞')}
        <button className="nav-icon" onClick={onCreateClick}>+</button>
        <Link to="/notifications" className={`nav-icon ${location.pathname === '/notifications' ? 'active' : ''}`}>
          &#9825;
          {unread > 0 && <span className="nav-badge">{unread > 99 ? '99+' : unread}</span>}
        </Link>
        {icon(`/profile/${user?.id}`, <span style={{ position: 'relative' }}>●<span style={{ position: 'absolute', bottom: -2, right: -4, width: 8, height: 8, borderRadius: '50%', border: '1.5px solid var(--bg-primary)', background: user?.status === 'online' ? '#4caf50' : user?.status === 'away' ? '#ff9800' : user?.status === 'dnd' ? '#f44336' : '#9e9e9e' }} /></span>)}
      </nav>
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  );
}
