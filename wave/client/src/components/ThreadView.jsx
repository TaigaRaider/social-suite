import { useState, useEffect, useRef } from 'react';

export default function ThreadView({ messageId, api, socket, user, onClose }) {
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [parentMessage, setParentMessage] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadThread();
  }, [messageId]);

  const loadThread = async () => {
    try {
      const details = await api.crypto.getMessageDetails(messageId);
      setParentMessage(details.message);

      const data = await api.crypto.getThread(messageId);
      setMessages(data.messages || []);
    } catch {}
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReply = () => {
    if (!replyText.trim()) return;

    socket.emit('message:send', {
      content: replyText,
      receiverId: parentMessage?.receiverId,
      threadId: messageId,
      replyToId: messageId
    });

    setMessages(prev => [...prev, {
      id: Date.now(),
      content: replyText,
      senderId: user?.id,
      username: user?.username,
      firstName: user?.firstName,
      createdAt: new Date().toISOString()
    }]);

    setReplyText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Thread</div>
          <div style={{ fontSize: 12, color: '#65676b' }}>{messages.length} replies</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>&times;</button>
      </div>

      {parentMessage && (
        <div style={{ padding: '12px 16px', background: '#f0f2f5', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1e21' }}>{parentMessage.firstName} {parentMessage.lastName}</div>
          <div style={{ fontSize: 14, color: '#1c1e21', marginTop: 4 }}>{parentMessage.content}</div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: msg.senderId === user?.id ? 'flex-end' : 'flex-start' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#65676b', marginBottom: 2 }}>
              {msg.senderId === user?.id ? 'You' : `${msg.firstName || ''} ${msg.lastName || ''}`}
            </div>
            <div style={{
              background: msg.senderId === user?.id ? '#059669' : '#e4e6eb',
              color: msg.senderId === user?.id ? 'white' : '#1c1e21',
              padding: '8px 12px',
              borderRadius: 12,
              maxWidth: '80%',
              fontSize: 14
            }}>
              {msg.content}
            </div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
              {new Date(msg.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8 }}>
        <input
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendReply()}
          placeholder="Reply in thread..."
          style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 20, fontSize: 14, outline: 'none' }}
        />
        <button onClick={sendReply} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 20, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Reply
        </button>
      </div>
    </div>
  );
}
