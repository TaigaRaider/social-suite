import { useState, useEffect } from 'react';
import { api } from '../api';
import ThreadView from './ThreadView';

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
  const [showThread, setShowThread] = useState(false);
  const [replyCount, setReplyCount] = useState(0);

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

  const playVoice = async (messageId) => {
    try {
      const data = await api.crypto.getVoiceMessage(messageId);
      const audio = new Audio(`data:audio/webm;base64,${data.audio}`);
      audio.play();
    } catch {}
  };

  const onReply = (msg) => {
    // Could trigger a reply UI in parent - for now just log
    console.log('Reply to message:', msg.id);
  };

  return (
    <div className={`message-wrapper ${isSent ? 'sent' : 'received'}`}
      onMouseEnter={() => setShowReactionPicker(true)}
      onMouseLeave={() => setShowReactionPicker(false)}
      style={{ position: 'relative' }}>
      <div className="message-bubble">
        {message.encrypted ? '🔒 ' : ''}
        {message.messageType === 'voice' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => playVoice(message.id)} style={{ background: isSent ? 'rgba(255,255,255,0.2)' : '#8b5cf6', color: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              ▶
            </button>
            <div style={{ flex: 1, height: 4, background: isSent ? 'rgba(255,255,255,0.3)' : '#ddd', borderRadius: 2, position: 'relative', minWidth: 60 }}>
              <div style={{ width: '0%', height: '100%', background: isSent ? 'white' : '#8b5cf6', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, opacity: 0.8 }}>
              {message.voiceDuration ? `${Math.floor(message.voiceDuration / 60)}:${(message.voiceDuration % 60).toString().padStart(2, '0')}` : '0:00'}
            </span>
          </div>
        ) : (
          message.content
        )}
      </div>
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
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={() => onReply(message)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#8b5cf6' }}>
          &#8617; Reply
        </button>
        {replyCount > 0 && (
          <button onClick={() => setShowThread(!showThread)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#8b5cf6' }}>
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>
      <div className="message-meta">
        <span className="message-time">{formatTime(message.createdAt)}</span>
        {getReadIcon()}
      </div>
      {showThread && (
        <div style={{ borderLeft: '3px solid #8b5cf6', marginLeft: 8, marginTop: 8, padding: 12, background: '#f8f9fa', borderRadius: '0 8px 8px 0', height: 300 }}>
          <ThreadView messageId={message.id} api={api} socket={null} user={null} onClose={() => setShowThread(false)} />
        </div>
      )}
    </div>
  );
}
