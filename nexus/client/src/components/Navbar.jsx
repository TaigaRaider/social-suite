import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const searchRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      api.getUnreadCount().then(d => setUnreadMsgs(d.count)).catch(() => {});
      api.getUnreadNotifications().then(d => setUnreadNotifs(d.count)).catch(() => {});
    }, 10000);
    api.getUnreadCount().then(d => setUnreadMsgs(d.count)).catch(() => {});
    api.getUnreadNotifications().then(d => setUnreadNotifs(d.count)).catch(() => {});
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!search) { setResults([]); return; }
    const t = setTimeout(() => api.searchUsers(search).then(setResults).catch(() => setResults([])), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setResults([]);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const openNotifs = async () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs) {
      const n = await api.getNotifications();
      setNotifications(n);
      await api.markNotificationsRead();
      setUnreadNotifs(0);
    }
  };

  const initials = user ? (user.firstName?.[0] || '') + (user.lastName?.[0] || '') || user.username[0] : '';

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}>nexus</div>

      <div className="navbar-search" ref={searchRef}>
        <span className="search-icon">&#128269;</span>
        <input placeholder="Search Nexus" value={search} onChange={e => setSearch(e.target.value)} />
        {results.length > 0 && (
          <div className="search-dropdown">
            {results.map(u => (
              <div key={u.id} className="search-item" onClick={() => { setSearch(''); setResults([]); navigate(`/profile/${u.id}`); }}>
                <div className="avatar avatar-sm">{u.firstName?.[0] || u.username[0]}</div>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{u.firstName} {u.lastName || u.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="navbar-nav">
        <div className="nav-icon" title="Home" onClick={() => navigate('/')}>⌂</div>
        <div className="nav-icon" title="Messages" onClick={() => navigate('/messages')}>
          💬
          {unreadMsgs > 0 && <span className="nav-badge">{unreadMsgs}</span>}
        </div>
        <div className="nav-icon" ref={notifRef} title="Notifications" onClick={openNotifs}>
          🔔
          {unreadNotifs > 0 && <span className="nav-badge">{unreadNotifs}</span>}
          {showNotifs && (
            <div className="notif-dropdown" onClick={e => e.stopPropagation()}>
              <div className="notif-header">Notifications</div>
              {notifications.length === 0 && <div className="empty-state">No notifications</div>}
              {notifications.map(n => (
                <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`} onClick={() => {
                  setShowNotifs(false);
                  if (n.type === 'message') navigate('/messages');
                  else if (n.type === 'friend_request') navigate('/friends');
                  else navigate(`/profile/${n.fromUserId}`);
                }}>
                  <div className="avatar avatar-sm">{n.fromFirstName?.[0] || '?'}</div>
                  <div>
                    <div>{n.fromFirstName} {n.fromLastName} {
                      n.type === 'like' && 'liked your post' ||
                      n.type === 'comment' && 'commented on your post' ||
                      n.type === 'friend_request' && 'sent you a friend request' ||
                      n.type === 'message' && 'sent you a message'
                    }</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="nav-profile" onClick={() => navigate(`/profile/${user?.id}`)}>
          <div className="avatar avatar-sm">{initials}</div>
          <span className="nav-profile-name">{user?.firstName || user?.username}</span>
        </div>
        <div className="nav-icon" title="Logout" onClick={() => { logout(); navigate('/login'); }}>⏻</div>
      </div>
    </nav>
  );
}
