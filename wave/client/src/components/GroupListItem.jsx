export default function GroupListItem({ group, isActive, onClick }) {
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    const dayDiff = Math.floor(diff / 86400000);
    if (dayDiff === 1) return 'Yesterday';
    if (dayDiff < 7) return date.toLocaleDateString('en', { weekday: 'short' });
    return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name) => {
    const words = name.split(' ');
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const lastMsg = group.lastMessage
    ? `${group.lastMessageSender ? group.lastMessageSender + ': ' : ''}${group.lastMessage}`
    : 'No messages yet';

  return (
    <div className={`group-list-item ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div className="group-avatar">
        {getInitials(group.name)}
      </div>
      <div className="group-info">
        <div className="group-name">{group.name}</div>
        <div className="group-meta">
          <span className="last-message">{lastMsg}</span>
          {group.lastMessageTime && (
            <span className="last-message-time">{formatTime(group.lastMessageTime)}</span>
          )}
        </div>
      </div>
      <div className="group-right">
        {group.unreadCount > 0 && (
          <span className="unread-badge">{group.unreadCount}</span>
        )}
        {group.memberCount && (
          <span className="member-count">{group.memberCount}</span>
        )}
      </div>
    </div>
  );
}
