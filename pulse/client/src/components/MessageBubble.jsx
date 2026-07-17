function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isSent }) {
  return (
    <div className={`message-wrapper ${isSent ? 'sent' : 'received'}`}>
      <div className="message-bubble">{message.content}</div>
      <div className="message-meta">
        <span className="message-time">{formatTime(message.createdAt)}</span>
        {isSent && (
          <span className="message-read">{message.read ? '✓✓' : '✓'}</span>
        )}
      </div>
    </div>
  );
}
