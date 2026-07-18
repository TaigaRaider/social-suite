import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import MemberList from '../components/MemberList';

export default function GroupChat({ groupId, onBack }) {
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [sendError, setSendError] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    loadGroup();
    loadMessages();
    api.messages.markRead(groupId).catch(() => {});
    const interval = setInterval(loadMessages, 3000);
    const typingInterval = setInterval(loadTyping, 2000);
    return () => {
      clearInterval(interval);
      clearInterval(typingInterval);
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
      setMessages(data);
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
      const msg = await api.messages.send(groupId, content);
      setMessages(prev => [...prev, msg]);
    } catch (err) {
      setSendError(err.message);
    }
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
            <p>{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="chat-header-actions">
          <button onClick={() => setShowMembers(true)} title="Members">&#9776;</button>
        </div>
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
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isSent={isSent}
                  showSender={showSender}
                />
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
      <ChatInput onSend={handleSend} groupId={groupId} />

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
