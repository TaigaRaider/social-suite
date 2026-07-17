import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function timeAgo(dateStr) {
  const date = new Date(dateStr + 'Z');
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getNotificationText(type) {
  switch (type) {
    case 'like': return 'liked your post';
    case 'repost': return 'reposted your post';
    case 'reply': return 'replied to your post';
    case 'follow': return 'followed you';
    default: return 'interacted with your post';
  }
}

function getNotificationLink(notification) {
  if (notification.type === 'follow') return `/profile/${notification.fromUserId}`;
  if (notification.referenceId) return `/thread/${notification.referenceId}`;
  return `/profile/${notification.fromUserId}`;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getNotifications()
      .then(data => {
        setNotifications(data);
        return api.markNotificationsRead();
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h2>Notifications</h2>
      </div>
      {loading ? (
        <div className="loading" style={{ height: '200px' }}>Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <h3>No notifications yet</h3>
          <p>When someone interacts with your posts, you'll see it here.</p>
        </div>
      ) : (
        notifications.map(n => {
          const initials = (n.firstName?.[0] || '') + (n.lastName?.[0] || '') || n.username?.[0]?.toUpperCase() || '?';
          return (
            <div
              key={n.id}
              className="user-list-item"
              onClick={() => navigate(getNotificationLink(n))}
            >
              <div className="post-avatar">
                {n.avatar ? <img src={n.avatar} alt="" /> : initials}
              </div>
              <div className="user-list-info">
                <div className="user-list-name">
                  @{n.username} {getNotificationText(n.type)}
                </div>
                <div className="user-list-username">{timeAgo(n.createdAt)}</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
