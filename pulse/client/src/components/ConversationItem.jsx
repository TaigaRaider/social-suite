function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const dayMs = 86400000;

  if (diff < dayMs && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 2 * dayMs) return 'Yesterday';
  if (diff < 7 * dayMs) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationItem({ conversation, active, onClick, currentUserId }) {
  const { otherFirstName, otherLastName, otherUsername, otherAvatar, otherStatus, lastMessage, lastMessageTime, unreadCount, lastMessageSenderId } = conversation;
  const displayName = (otherFirstName || otherLastName)
    ? `${otherFirstName || ''} ${otherLastName || ''}`.trim()
    : otherUsername;

  const initials = (otherFirstName?.[0] || otherLastName?.[0] || otherUsername?.[0] || '?').toUpperCase();

  const isOnline = otherStatus === 'online';

  let preview = lastMessage || 'Start a conversation';
  if (lastMessageSenderId === currentUserId && lastMessage) {
    preview = `You: ${lastMessage}`;
  }

  return (
    <div className={`conversation-item ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="conv-avatar-wrap">
        <div className="conv-avatar">
          {otherAvatar ? <img src={otherAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : initials}
        </div>
        {isOnline && <div className="online-dot"></div>}
      </div>
      <div className="conv-info">
        <div className="conv-top-row">
          <span className="conv-name">{displayName}</span>
          <span className="conv-time">{formatTime(lastMessageTime)}</span>
        </div>
        <div className="conv-bottom-row">
          <span className="conv-last-message">{preview}</span>
          {unreadCount > 0 && <span className="conv-unread">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </div>
      </div>
    </div>
  );
}
