export default function MessageBubble({ message, isSent, showSender }) {
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const displayName = message.senderFirstName || message.senderLastName
    ? `${message.senderFirstName || ''} ${message.senderLastName || ''}`.trim()
    : message.senderName;

  const senderColor = (() => {
    const colors = ['#00a884', '#53bdeb', '#e5a0ff', '#ffb347', '#ff6b6b', '#6bff9e', '#ffd700'];
    let hash = 0;
    const name = message.senderName || '';
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  })();

  return (
    <div className={`message-bubble ${isSent ? 'sent' : 'received'}`}>
      {showSender && !isSent && (
        <div className="message-sender" style={{ color: senderColor }}>
          {displayName}
        </div>
      )}
      <div className="message-text">{message.content}</div>
      <div className="message-time">
        {formatTime(message.createdAt)}
        {isSent && (
          <span style={{ marginLeft: 4 }}>{message.read ? '✓✓' : '✓'}</span>
        )}
      </div>
    </div>
  );
}
