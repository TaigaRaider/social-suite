import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';

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
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const pollRef = useRef(null);

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

  const loadMessages = useCallback(async () => {
    try {
      const data = await api.getMessages(conversation.id);
      setMessages(data);
      return data;
    } catch {
      return [];
    }
  }, [conversation.id]);

  useEffect(() => {
    let mounted = true;
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

    return () => {
      mounted = false;
      clearInterval(pollRef.current);
    };
  }, [conversation.id]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom('auto');
  }, [conversation.id]);

  const handleSend = async (content) => {
    try {
      const msg = await api.sendMessage(conversation.id, content);
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
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
          {isOnline && <div className="online-dot" style={{ bottom: 0, right: 0 }}></div>}
        </div>
        <div className="chat-header-info">
          <h3>{displayName}</h3>
          <p style={{ color: isOnline ? 'var(--online-green)' : undefined }}>{statusText}</p>
        </div>
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
            return <MessageBubble key={msg.id} message={msg} isSent={isSent} />;
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={handleSend} />
    </>
  );
}
