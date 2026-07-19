import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { io as socketIO } from 'socket.io-client';
import { init as initCrypto, generateLocalIdentity, uploadKeyBundle, sendMessage, receiveMessage, isE2EEEnabled } from '../crypto/signalProtocol.js';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import MemberList from '../components/MemberList';

const reactionEmojis = ['\u2764\uFE0F', '\uD83D\uDC4D', '\uD83D\uDE02', '\uD83D\uDE2E', '\uD83D\uDE22', '\uD83D\uDE21'];

export default function GroupChat({ groupId, onBack }) {
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [sendError, setSendError] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [showDisappearing, setShowDisappearing] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [messageReactions, setMessageReactions] = useState({});
  const [onlineCount, setOnlineCount] = useState(0);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    loadGroup();
    loadMessages();
    api.messages.markRead(groupId).catch(() => {});
    const interval = setInterval(loadMessages, 3000);
    const typingInterval = setInterval(loadTyping, 2000);

    const token = localStorage.getItem('wave_token');
    if (token) {
      initCrypto('http://localhost:3004/api');
      if (!isE2EEEnabled()) {
        generateLocalIdentity();
        uploadKeyBundle(token).catch(() => {});
      }

      const socket = socketIO('http://localhost:3004', { auth: { token } });
      socketRef.current = socket;
      socket.emit('group:join', groupId);

      socket.on('typing:update', ({ userId: uid, username: uname, isTyping }) => {
        setTypingUsers(prev => {
          if (isTyping) {
            if (prev.some(u => u.userId === uid)) return prev;
            return [...prev, { userId: uid, username: uname, firstName: uname }];
          }
          return prev.filter(u => u.userId !== uid);
        });
      });

      socket.on('reaction:added', ({ messageId, userId: uid, emoji }) => {
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: [...(prev[messageId] || []).filter(r => r.userId !== uid), { userId: uid, emoji }]
        }));
      });
      socket.on('reaction:removed', ({ messageId, userId: uid, emoji }) => {
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: (prev[messageId] || []).filter(r => !(r.userId === uid && r.emoji === emoji))
        }));
      });

      socket.on('user:online', () => {
        if (group?.members) {
          const memberIds = group.members.map(m => m.userId || m.id);
          socket.emit('users:online', { userIds: memberIds }, (status) => {
            const count = Object.values(status).filter(s => s.isOnline).length;
            setOnlineCount(count);
          });
        }
      });
    }

    return () => {
      clearInterval(interval);
      clearInterval(typingInterval);
      socketRef.current?.disconnect();
    };
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadGroup = async () => {
    try {
      const data = await api.groups.get(groupId);
      setGroup(data);
    } catch (err) {
      console.error('Failed to load group:', err);
    }
  };

  const loadMessages = async () => {
    try {
      const data = await api.messages.list(groupId);
      const token = localStorage.getItem('wave_token');
      const decrypted = await Promise.all(data.map(async (msg) => {
        if (msg.encrypted && msg.ciphertext) {
          try {
            const plaintext = await receiveMessage(`group_${groupId}`, {
              ciphertext: msg.ciphertext,
              nonce: msg.nonce,
              ratchetHeader: msg.ratchetHeader
            }, token);
            return { ...msg, content: plaintext };
          } catch {
            return { ...msg, content: '[decryption failed]' };
          }
        }
        return msg;
      }));
      setMessages(decrypted);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTyping = async () => {
    try {
      const data = await api.messages.getTyping(groupId);
      setTypingUsers(data);
    } catch {
      setTypingUsers([]);
    }
  };

  const handleSend = async (content) => {
    setSendError('');
    try {
      const token = localStorage.getItem('wave_token');
      let msg;
      try {
        const encrypted = await sendMessage(`group_${groupId}`, content, token);
        await api.crypto.relayMessage({
          groupId,
          ciphertext: encrypted.ciphertext,
          nonce: encrypted.nonce,
          ratchetHeader: encrypted.ratchetHeader
        });
        msg = { id: Date.now(), content: '[encrypted]', encrypted: 1, ciphertext: encrypted.ciphertext, senderId: user.id, createdAt: new Date().toISOString() };
      } catch {
        msg = await api.messages.send(groupId, content);
      }
      setMessages(prev => [...prev, msg]);
    } catch (err) {
      setSendError(err.message);
    }
  };

  const handleTyping = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('typing:start', groupId);
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading && !group) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="empty-chat">
        <h3>Group not found</h3>
      </div>
    );
  }

  const memberCount = group.members ? group.members.length : 0;

  const typingText = typingUsers.length > 0
    ? typingUsers.length === 1
      ? `${typingUsers[0].firstName || typingUsers[0].username} is typing...`
      : `${typingUsers.length} people are typing...`
    : null;

  return (
    <div className="chat-area">
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>&#8592;</button>
        <div className="group-avatar" style={{ cursor: 'pointer' }} onClick={() => setShowMembers(true)}>
          {group.name.charAt(0).toUpperCase()}
        </div>
        <div className="chat-header-info">
          <h2>{group.name}</h2>
          {typingText ? (
            <p style={{ color: 'var(--accent)' }}>{typingText}</p>
          ) : (
            <p>{memberCount} member{memberCount !== 1 ? 's' : ''}{onlineCount > 0 ? ` \u00B7 ${onlineCount} online` : ''}</p>
          )}
        </div>
        <div className="chat-header-actions">
          <button onClick={() => setShowMembers(true)} title="Members">&#9776;</button>
          <button 
            onClick={() => setShowDisappearing(!showDisappearing)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
            title="Disappearing messages"
          >
            ⏱️
          </button>
        </div>
      </div>

      <div style={{ padding: '4px 12px', fontSize: '11px', color: '#65676b', background: '#f0f2f5', textAlign: 'center' }}>
        🔒 Messages are end-to-end encrypted. No one outside this chat can read them.
      </div>

      <div className="messages-container" ref={containerRef}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <p>No messages yet. Say hello!</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isSent = msg.senderId === user.id;
              const showSender = !isSent && (i === 0 || messages[i - 1].senderId !== msg.senderId);
              return (
                <div key={msg.id} style={{ position: 'relative' }}>
                  <MessageBubble
                    message={msg}
                    isSent={isSent}
                    showSender={showSender}
                  />
                  <button onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                    style={{ position: 'absolute', top: 4, [isSent ? 'left' : 'right']: -28, background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '14px' }}>
                    {String.fromCodePoint(0x1F60A)}
                  </button>
                  {showReactionPicker === msg.id && (
                    <div style={{ position: 'absolute', bottom: '100%', [isSent ? 'left' : 'right']: 0, background: 'white', borderRadius: '20px', padding: '4px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex', gap: '4px', zIndex: 10 }}>
                      {reactionEmojis.map(emoji => (
                        <button key={emoji} onClick={() => { socketRef.current?.emit('reaction:add', { messageId: msg.id, emoji, groupId }); setShowReactionPicker(null); }}
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
                          onClick={() => socketRef.current?.emit('reaction:remove', { messageId: msg.id, emoji, groupId })}>
                          {emoji} {messageReactions[msg.id].filter(r => r.emoji === emoji).length}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {typingUsers.length > 0 && (
              <div className="wave-typing-indicator">
                <div className="wave-typing-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {sendError && (
        <div style={{ padding: '4px 16px', background: 'rgba(234,67,53,0.15)', color: '#ff6b6b', fontSize: 13 }}>
          {sendError}
        </div>
      )}
      <ChatInput onSend={handleSend} groupId={groupId} onTyping={handleTyping} />

      {showMembers && (
        <MemberList
          group={group}
          currentUserId={user.id}
          onClose={() => setShowMembers(false)}
          onMemberRemoved={loadGroup}
        />
      )}
    </div>
  );
}
