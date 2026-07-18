import { useState, useEffect } from 'react';
import { api } from '../api';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👎'];

export default function MessageBubble({ message, isSent, showSender }) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [userReactions, setUserReactions] = useState([]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  useEffect(() => {
    api.reactions.get(message.id, 'message').then(data => {
      setReactions(data.reactions || []);
      setUserReactions(data.userReactions || []);
    }).catch(() => {});
  }, [message.id]);

  const handleReaction = async (emoji) => {
    try {
      await api.reactions.toggle(message.id, 'message', emoji);
      const data = await api.reactions.get(message.id, 'message');
      setReactions(data.reactions || []);
      setUserReactions(data.userReactions || []);
    } catch {}
    setShowReactionPicker(false);
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

  const getReadIcon = () => {
    if (!isSent) return null;
    if (message.read) {
      return <span style={{ marginLeft: 4, color: '#53bdeb' }}>✓✓</span>;
    }
    return <span style={{ marginLeft: 4, color: 'rgba(255,255,255,0.5)' }}>✓✓</span>;
  };

  return (
    <div
      className={`message-bubble ${isSent ? 'sent' : 'received'}`}
      onMouseEnter={() => setShowReactionPicker(true)}
      onMouseLeave={() => setShowReactionPicker(false)}
      style={{ position: 'relative' }}
    >
      {showReactionPicker && (
        <div style={{ position: 'absolute', bottom: '100%', display: 'flex', gap: 2, background: 'var(--bg-secondary, #1f2c34)', border: '1px solid var(--border, #2a3942)', borderRadius: 20, padding: '4px 6px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 10, ...(isSent ? { right: 0 } : { left: 0 }) }}>
          {REACTION_EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => handleReaction(emoji)}
              style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 6, transition: 'transform 0.15s', lineHeight: 1 }}
              onMouseOver={(e) => e.target.style.transform = 'scale(1.3)'}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}>
              {emoji}
            </button>
          ))}
        </div>
      )}
      {showSender && !isSent && (
        <div className="message-sender" style={{ color: senderColor }}>
          {displayName}
        </div>
      )}
      <div className="message-text">{message.content}</div>
      {reactions.length > 0 && (
        <div style={{ display: 'flex', gap: 3, marginTop: 2, flexWrap: 'wrap' }}>
          {reactions.map((r, i) => (
            <span key={i} onClick={() => handleReaction(r.emoji)}
              style={{ fontSize: 12, background: userReactions.includes(r.emoji) ? 'rgba(0,168,132,0.2)' : 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 10, cursor: 'pointer', border: userReactions.includes(r.emoji) ? '1px solid rgba(0,168,132,0.4)' : '1px solid rgba(255,255,255,0.1)' }}>
              {r.emoji} {r.count}
            </span>
          ))}
        </div>
      )}
      <div className="message-time">
        {formatTime(message.createdAt)}
        {getReadIcon()}
      </div>
    </div>
  );
}
