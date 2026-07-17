import { useNavigate } from 'react-router-dom';

export default function Navbar({ user, onLogout, unreadCount = 0 }) {
  const navigate = useNavigate();
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
          style={{ cursor: 'pointer', background: 'var(--accent-dark)' }}
          title={user?.username}
        >
          {initials}
        </div>
        <button className="header-btn" onClick={onLogout} title="Logout">
          &#8594;
        </button>
      </div>
    </div>
  );
}
