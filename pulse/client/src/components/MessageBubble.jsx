import { useState, useEffect } from 'react';
import { api } from '../api';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👎'];

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isSent }) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [userReactions, setUserReactions] = useState([]);

  useEffect(() => {
    api.getReactions(message.id, 'message').then(data => {
      setReactions(data.reactions || []);
      setUserReactions(data.userReactions || []);
    }).catch(() => {});
  }, [message.id]);

  const handleReaction = async (emoji) => {
    try {
      await api.toggleReaction(message.id, 'message', emoji);
      const data = await api.getReactions(message.id, 'message');
      setReactions(data.reactions || []);
      setUserReactions(data.userReactions || []);
    } catch {}
    setShowReactionPicker(false);
  };

  const getReadIcon = () => {
    if (!isSent) return null;
    if (message.pending) {
      return <span className="message-check single">✓</span>;
    }
    if (message.read) {
      return <span className="message-check read">✓✓</span>;
    }
    if (message.delivered) {
      return <span className="message-check delivered">✓✓</span>;
    }
    return <span className="message-check single">✓</span>;
  };

  return (
    <div className={`message-wrapper ${isSent ? 'sent' : 'received'}`}
      onMouseEnter={() => setShowReactionPicker(true)}
      onMouseLeave={() => setShowReactionPicker(false)}
      style={{ position: 'relative' }}>
      <div className="message-bubble">{message.content}</div>
      {showReactionPicker && (
        <div style={{ position: 'absolute', bottom: '100%', display: 'flex', gap: 2, background: 'var(--card-bg, #fff)', border: '1px solid var(--border, #e0e0e0)', borderRadius: 20, padding: '4px 6px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', zIndex: 10, ...(isSent ? { right: 0 } : { left: 0 }) }}>
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
      {(reactions.length > 0 || userReactions.length > 0) && (
        <div style={{ display: 'flex', gap: 3, marginTop: 2, flexWrap: 'wrap' }}>
          {reactions.map((r, i) => (
            <span key={i} onClick={() => handleReaction(r.emoji)}
              style={{ fontSize: 13, background: userReactions.includes(r.emoji) ? 'rgba(24,119,242,0.15)' : 'var(--bg-tertiary, #f0f0f0)', padding: '1px 5px', borderRadius: 10, cursor: 'pointer', border: userReactions.includes(r.emoji) ? '1px solid rgba(24,119,242,0.3)' : '1px solid var(--border, #e0e0e0)' }}>
              {r.emoji} {r.count}
            </span>
          ))}
        </div>
      )}
      <div className="message-meta">
        <span className="message-time">{formatTime(message.createdAt)}</span>
        {getReadIcon()}
      </div>
    </div>
  );
}
