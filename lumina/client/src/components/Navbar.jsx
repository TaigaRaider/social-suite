import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Navbar({ onCreateClick }) {
  const { user } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

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
      </div>
      <nav className="navbar">
        {icon('/', '⌂')}
        {icon('/explore', '⊞')}
        <button className="nav-icon" onClick={onCreateClick}>+</button>
        <Link to="/notifications" className={`nav-icon ${location.pathname === '/notifications' ? 'active' : ''}`}>
          &#9825;
          {unread > 0 && <span className="nav-badge">{unread > 99 ? '99+' : unread}</span>}
        </Link>
        {icon(`/profile/${user?.id}`, '●')}
      </nav>
    </>
  );
}
