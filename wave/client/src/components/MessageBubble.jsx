import { useState, useEffect } from 'react';
import { api } from '../api';
import ThreadView from './ThreadView';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👎'];

export default function MessageBubble({ message, isSent, showSender }) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [userReactions, setUserReactions] = useState([]);
  const [showThread, setShowThread] = useState(false);
  const [replyCount, setReplyCount] = useState(0);

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
    const colors = ['#059669', '#53bdeb', '#e5a0ff', '#ffb347', '#ff6b6b', '#6bff9e', '#ffd700'];
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

  const playVoice = async (messageId) => {
    try {
      const data = await api.crypto.getVoiceMessage(messageId);
      const audio = new Audio(`data:audio/webm;base64,${data.audio}`);
      audio.play();
    } catch {}
  };

  const onReply = (msg) => {
    console.log('Reply to message:', msg.id);
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
      <div className="message-text">
        {message.encrypted ? '🔒 ' : ''}
        {message.messageType === 'voice' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => playVoice(message.id)} style={{ background: isSent ? 'rgba(255,255,255,0.2)' : '#059669', color: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              ▶
            </button>
            <div style={{ flex: 1, height: 4, background: isSent ? 'rgba(255,255,255,0.3)' : '#2a3942', borderRadius: 2, position: 'relative', minWidth: 60 }}>
              <div style={{ width: '0%', height: '100%', background: isSent ? 'white' : '#059669', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, opacity: 0.8 }}>
              {message.voiceDuration ? `${Math.floor(message.voiceDuration / 60)}:${(message.voiceDuration % 60).toString().padStart(2, '0')}` : '0:00'}
            </span>
          </div>
        ) : (
          message.content
        )}
      </div>
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
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={() => onReply(message)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#059669' }}>
          &#8617; Reply
        </button>
        {replyCount > 0 && (
          <button onClick={() => setShowThread(!showThread)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#059669' }}>
            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>
      <div className="message-time">
        {formatTime(message.createdAt)}
        {getReadIcon()}
      </div>
      {showThread && (
        <div style={{ borderLeft: '3px solid #059669', marginLeft: 8, marginTop: 8, padding: 12, background: '#1f2c34', borderRadius: '0 8px 8px 0', height: 300 }}>
          <ThreadView messageId={message.id} api={api} socket={null} user={null} onClose={() => setShowThread(false)} />
        </div>
      )}
    </div>
  );
}
