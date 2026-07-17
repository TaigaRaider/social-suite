import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Navbar from '../components/Navbar';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr + 'Z');
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function getNotificationText(type) {
  switch (type) {
    case 'like': return 'liked your post';
    case 'comment': return 'commented on your post';
    case 'follow': return 'started following you';
    default: return 'interacted with you';
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case 'like': return '❤️';
    case 'comment': return '💬';
    case 'follow': return '👤';
    default: return '🔔';
  }
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
      await api.markRead();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleNotificationClick = (notif) => {
    if (notif.type === 'follow') {
      navigate(`/profile/${notif.fromUserId}`);
    } else if (notif.referenceId) {
      navigate('/');
    }
  };

  return (
    <div className="page-container">
      <div className="notifications-page">
        <div className="notifications-header">Notifications</div>
        {loading ? (
          <div className="loading-screen" style={{ minHeight: 200 }}>
            <div className="loader" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">&#128276;</div>
            <h3>No notifications yet</h3>
            <p>When someone interacts with you, you'll see it here.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`notification-item ${notif.read ? '' : 'unread'}`}
              onClick={() => handleNotificationClick(notif)}
            >
              <img
                src={notif.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.username)}&background=833ab4&color=fff&size=80`}
                alt=""
              />
              <div className="notification-text">
                <strong>{notif.username}</strong> {getNotificationText(notif.type)}
              </div>
              <div className="notification-time">{timeAgo(notif.createdAt)}</div>
              <div className="notification-icon">{getNotificationIcon(notif.type)}</div>
            </div>
          ))
        )}
      </div>
      <Navbar />
    </div>
  );
}
