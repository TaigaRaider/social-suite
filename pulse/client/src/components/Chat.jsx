import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { io as socketIO } from 'socket.io-client';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { init as initCrypto, getLocalIdentity, generateLocalIdentity, uploadKeyBundle, sendMessage, receiveMessage, isE2EEEnabled } from '../crypto/signalProtocol.js';

const reactionEmojis = ['\u2764\uFE0F', '\uD83D\uDC4D', '\uD83D\uDE02', '\uD83D\uDE2E', '\uD83D\uDE22', '\uD83D\uDE21'];

function formatDateSeparator(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function Chat({ conversation, onBack, onConversationUpdated }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [messageReactions, setMessageReactions] = useState({});
  const [showDisappearing, setShowDisappearing] = useState(false);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const pollRef = useRef(null);
  const typingPollRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const displayName = (conversation.otherFirstName || conversation.otherLastName)
    ? `${conversation.otherFirstName || ''} ${conversation.otherLastName || ''}`.trim()
    : conversation.otherUsername;
  const initials = (conversation.otherFirstName?.[0] || conversation.otherLastName?.[0] || conversation.otherUsername?.[0] || '?').toUpperCase();
  const isOnline = conversation.otherStatus === 'online';

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 50);
  }, []);

  const decryptMessages = async (messages) => {
    const token = localStorage.getItem('pulse_token');
    const decrypted = [];
    for (const msg of messages) {
      if (msg.encrypted && msg.ciphertext) {
        try {
          const plaintext = await receiveMessage(msg.senderId, {
            ciphertext: msg.ciphertext,
            nonce: msg.nonce,
            ratchetHeader: typeof msg.ratchetHeader === 'string' ? JSON.parse(msg.ratchetHeader) : msg.ratchetHeader
          }, token);
          decrypted.push({ ...msg, content: plaintext });
        } catch {
          decrypted.push({ ...msg, content: '[encrypted message]' });
        }
      } else {
        decrypted.push(msg);
      }
    }
    return decrypted;
  };

  const sendEncryptedMessage = async (conversationId, content) => {
    try {
      const token = localStorage.getItem('pulse_token');
      const encrypted = await sendMessage(conversation.peerId || conversationId, content, token);
      await api.crypto.relayMessage({
        conversationId,
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        ratchetHeader: encrypted.ratchetHeader
      });
      return { content: '[encrypted]', encrypted: 1, ciphertext: encrypted.ciphertext, nonce: encrypted.nonce, ratchetHeader: encrypted.ratchetHeader };
    } catch {
      return api.sendMessage(conversationId, content);
    }
  };

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.getMessages(conversation.id);
      const decrypted = await decryptMessages(data);
      setMessages(decrypted);
      return decrypted;
    } catch {
      return [];
    }
  }, [conversation.id]);

  const loadTyping = useCallback(async () => {
    try {
      const data = await api.getTyping(conversation.id);
      setTypingUsers(data);
    } catch {
      setTypingUsers([]);
    }
  }, [conversation.id]);

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('pulse_token');
    const socket = socketIO('http://localhost:3003', { auth: { token } });
    socketRef.current = socket;

    socket.on('typing:start', ({ userId }) => {
      if (userId === conversation.otherUserId) setIsPeerTyping(true);
    });
    socket.on('typing:stop', ({ userId }) => {
      if (userId === conversation.otherUserId) setIsPeerTyping(false);
    });
    socket.on('user:online', ({ userId }) => {
      if (userId === conversation.otherUserId) setPeerOnline(true);
    });
    socket.on('user:offline', ({ userId }) => {
      if (userId === conversation.otherUserId) setPeerOnline(false);
    });
    socket.on('reaction:added', ({ messageId, userId, emoji }) => {
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: [...(prev[messageId] || []).filter(r => r.userId !== userId), { userId, emoji }]
      }));
    });
    socket.on('reaction:removed', ({ messageId, userId, emoji }) => {
      setMessageReactions(prev => ({
        ...prev,
        [messageId]: (prev[messageId] || []).filter(r => !(r.userId === userId && r.emoji === emoji))
      }));
    });

    socket.emit('users:online', { userIds: [conversation.otherUserId] }, (status) => {
      if (status[conversation.otherUserId]) setPeerOnline(status[conversation.otherUserId].isOnline);
    });

    const init = async () => {
      setLoading(true);
      const data = await loadMessages();
      if (mounted) setLoading(false);
      if (data.length > 0) scrollToBottom('auto');
    };
    init();
    pollRef.current = setInterval(async () => {
      const prevScrollHeight = containerRef.current?.scrollHeight || 0;
      const data = await loadMessages();
      if (data.length > 0) {
        const newScrollHeight = containerRef.current?.scrollHeight || 0;
        if (newScrollHeight > prevScrollHeight) {
          scrollToBottom();
        }
      }
      onConversationUpdated?.();
    }, 3000);

    typingPollRef.current = setInterval(loadTyping, 2000);

    return () => {
      mounted = false;
      clearInterval(pollRef.current);
      clearInterval(typingPollRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.disconnect();
    };
  }, [conversation.id]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom('auto');
  }, [conversation.id]);

  const handleTyping = () => {
    if (!socketRef.current || !conversation.otherUserId) return;
    socketRef.current.emit('typing:start', { peerId: conversation.otherUserId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop', { peerId: conversation.otherUserId });
    }, 2000);
  };

  const handleSend = async (content) => {
    try {
      const tempId = `temp-${Date.now()}`;
      const optimistic = { id: tempId, content, senderId: user.id, createdAt: new Date().toISOString(), read: 0, pending: true };
      setMessages(prev => [...prev, optimistic]);
      scrollToBottom();
      const msg = await sendEncryptedMessage(conversation.id, content);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...msg, delivered: true } : m));
      onConversationUpdated?.();
    } catch {}
  };

  const groupedMessages = [];
  let lastDate = '';
  messages.forEach(msg => {
    const msgDate = new Date(msg.createdAt).toDateString();
    if (msgDate !== lastDate) {
      groupedMessages.push({ type: 'date', date: msg.createdAt });
      lastDate = msgDate;
    }
    groupedMessages.push({ type: 'message', data: msg });
  });

  const statusText = isOnline ? 'Online' : conversation.otherLastSeen
    ? `Last seen ${new Date(conversation.otherLastSeen).toLocaleString()}`
    : 'Offline';

  return (
    <>
      <div className="chat-header">
        <button className="chat-header-back" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="chat-header-avatar">
          {initials}
          {(isOnline || peerOnline) && <div className="online-dot" style={{ bottom: 0, right: 0 }}></div>}
        </div>
        <div className="chat-header-info">
          <h3>{displayName}</h3>
          {typingUsers.length > 0 || isPeerTyping ? (
            <p style={{ color: 'var(--online-green)' }}>typing...</p>
          ) : (
            <p style={{ color: peerOnline ? 'var(--online-green)' : undefined }}>
              {peerOnline ? '\u25CF Online' : statusText}
            </p>
          )}
        </div>
        <button 
          onClick={() => setShowDisappearing(!showDisappearing)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
          title="Disappearing messages"
        >
          ⏱️
        </button>
      </div>

      <div style={{ padding: '4px 12px', fontSize: '11px', color: '#65676b', background: '#f0f2f5', textAlign: 'center' }}>
        🔒 Messages are end-to-end encrypted. No one outside this chat can read them.
      </div>

      <div className="messages-container" ref={containerRef}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner"></div></div>
        ) : (
          groupedMessages.map((item, idx) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${idx}`} className="date-separator">
                  <span>{formatDateSeparator(item.date)}</span>
                </div>
              );
            }
            const msg = item.data;
            const isSent = msg.senderId === user.id;
            return (
              <div key={msg.id} style={{ position: 'relative' }}>
                <MessageBubble message={msg} isSent={isSent} />
                <button onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                  style={{ position: 'absolute', top: 4, [isSent ? 'left' : 'right']: -28, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '14px' }}>
                  {String.fromCodePoint(0x1F60A)}
                </button>
                {showReactionPicker === msg.id && (
                  <div style={{ position: 'absolute', bottom: '100%', [isSent ? 'left' : 'right']: 0, background: 'white', borderRadius: '20px', padding: '4px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', gap: '4px', zIndex: 10 }}>
                    {reactionEmojis.map(emoji => (
                      <button key={emoji} onClick={() => { socketRef.current?.emit('reaction:add', { messageId: msg.id, emoji }); setShowReactionPicker(null); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                {messageReactions[msg.id]?.length > 0 && (
                  <div style={{ display: 'flex', gap: '2px', marginTop: '2px', paddingLeft: isSent ? 0 : '12px', paddingRight: isSent ? '12px' : 0 }}>
                    {[...new Set(messageReactions[msg.id].map(r => r.emoji))].map(emoji => (
                      <span key={emoji} style={{ background: '#f0f2f5', borderRadius: '10px', padding: '2px 6px', fontSize: '12px', cursor: 'pointer' }}
                        onClick={() => socketRef.current?.emit('reaction:remove', { messageId: msg.id, emoji })}>
                        {emoji} {messageReactions[msg.id].filter(r => r.emoji === emoji).length}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        {typingUsers.length > 0 && (
          <div className="typing-indicator-wrapper">
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={handleSend} conversationId={conversation.id} onTyping={handleTyping} />
    </>
  );
}
