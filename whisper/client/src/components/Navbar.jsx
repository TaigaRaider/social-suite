import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.getUnreadCount().then(d => setUnreadCount(d.count)).catch(() => {});
    const interval = setInterval(() => {
      api.getUnreadCount().then(d => setUnreadCount(d.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path) => location.pathname === path;

  const NavIcon = ({ d, active }) => (
    <svg viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="nav-logo">Whisper</Link>
        <div className="nav-items">
          <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
            <NavIcon active={isActive('/')} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            Home
          </Link>
          <Link to="/explore" className={`nav-item ${isActive('/explore') ? 'active' : ''}`}>
            <NavIcon active={isActive('/explore')} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            Explore
          </Link>
          <Link to="/bookmarks" className={`nav-item ${isActive('/bookmarks') ? 'active' : ''}`}>
            <NavIcon active={isActive('/bookmarks')} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            Bookmarks
          </Link>
          <Link to="/notifications" className={`nav-item ${isActive('/notifications') ? 'active' : ''}`}>
            <NavIcon active={isActive('/notifications')} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            Notifications
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </Link>
          <Link to={`/profile/${user?.id}`} className={`nav-item ${location.pathname.startsWith('/profile') ? 'active' : ''}`}>
            <NavIcon active={location.pathname.startsWith('/profile')} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            Profile
          </Link>
        </div>
        <button className="nav-post-btn" onClick={() => navigate('/', { state: { openComposer: true } })}>
          Whisper
        </button>
      </nav>

      <div className="mobile-nav">
        <div className="mobile-nav-items">
          <Link to="/" className="mobile-nav-item">
            <NavIcon active={isActive('/')} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </Link>
          <Link to="/explore" className="mobile-nav-item">
            <NavIcon active={isActive('/explore')} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </Link>
          <button className="mobile-nav-item" onClick={() => navigate('/', { state: { openComposer: true } })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:24,height:24}}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <Link to="/bookmarks" className="mobile-nav-item">
            <NavIcon active={isActive('/bookmarks')} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </Link>
          <Link to="/notifications" className="mobile-nav-item">
            <NavIcon active={isActive('/notifications')} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </Link>
          <Link to={`/profile/${user?.id}`} className="mobile-nav-item">
            <NavIcon active={location.pathname.startsWith('/profile')} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </Link>
        </div>
      </div>
    </>
  );
}
