import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Navbar from '../components/Navbar';
import { ConvoListSkeleton, ChatSkeleton } from '../components/Skeleton';

export default function Messages() {
  const { user: currentUser } = useAuth();
  const { userId: selectedUserId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [convoLoading, setConvoLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [text, setText] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const messagesEnd = useRef(null);

  useEffect(() => {
    api.getConversations().then(setConversations).catch(() => {}).finally(() => setConvoLoading(false));
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadChat(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChat = async (uid) => {
    setMsgLoading(true);
    const [msgs, user] = await Promise.all([
      api.getMessages(uid),
      api.getUser(uid)
    ]);
    setMessages(msgs);
    setSelectedUser(user);
    setMsgLoading(false);
    if (!conversations.find(c => c.id === parseInt(uid))) {
      setConversations([{ id: user.id, username: user.username, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar, lastMessage: '', lastMessageAt: new Date().toISOString(), unreadCount: 0 }, ...conversations]);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selectedUserId) return;
    const msg = await api.sendMessage(selectedUserId, { content: text });
    setMessages([...messages, msg]);
    setText('');
  };

  useEffect(() => {
    if (!selectedUserId) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await api.getMessages(selectedUserId);
        if (msgs.length > messages.length) setMessages(msgs);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedUserId, messages.length]);

  useEffect(() => {
    if (!searchTerm) { setSearchResults([]); return; }
    const t = setTimeout(() => api.searchUsers(searchTerm).then(setSearchResults).catch(() => setSearchResults([])), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const startChat = (uid) => {
    navigate(`/messages/${uid}`);
    setSearchTerm('');
    setSearchResults([]);
  };

  const initials = (u) => (u.firstName?.[0] || '') + (u.lastName?.[0] || '') || u.username?.[0] || '?';

  return (
    <>
      <Navbar />
      <div className="main" style={{ paddingTop: 56 }}>
        <div className="messages-layout">
          <div className="convo-list">
            <div className="convo-header">
              Chats
              <input
                placeholder="Search people..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ marginTop: 8, fontSize: 13 }}
              />
              {searchResults.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {searchResults.slice(0, 5).map(u => (
                    <div key={u.id} className="convo-item" onClick={() => startChat(u.id)}>
                      <div className="avatar avatar-sm">{initials(u)}</div>
                      <div className="convo-info">
                        <div className="convo-name">{u.firstName} {u.lastName || u.username}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {convoLoading ? (
              <ConvoListSkeleton />
            ) : conversations.length === 0 && !searchTerm ? (
              <div className="empty-state" style={{ padding: 40 }}>
                No conversations yet.<br/>Search for someone to start chatting.
              </div>
            ) : (
              conversations.map(c => (
                <div
                  key={c.id}
                  className={`convo-item ${selectedUserId == c.id ? 'active' : ''}`}
                  onClick={() => navigate(`/messages/${c.id}`)}
                >
                  <div className="avatar">{initials(c)}</div>
                  <div className="convo-info">
                    <div className="convo-name">{c.firstName} {c.lastName}</div>
                    <div className="convo-preview">{c.lastMessage}</div>
                  </div>
                  {c.unreadCount > 0 && <span className="convo-unread">{c.unreadCount}</span>}
                </div>
              ))
            )}
          </div>

          <div className="chat-area">
            {selectedUser ? (
              <>
                <div className="chat-header">
                  <div className="avatar avatar-sm">{initials(selectedUser)}</div>
                  <span className="chat-header-name">{selectedUser.firstName} {selectedUser.lastName}</span>
                </div>
                {msgLoading ? (
                  <ChatSkeleton />
                ) : (
                <div className="chat-messages">
                  {messages.map(m => (
                    <div key={m.id} className={`msg ${m.senderId === currentUser.id ? 'msg-sent' : 'msg-received'}`}>
                      {m.content}
                    </div>
                  ))}
                  <div ref={messagesEnd} />
                </div>
                )}
                <form className="chat-input" onSubmit={handleSend}>
                  <input placeholder="Aa" value={text} onChange={e => setText(e.target.value)} autoFocus />
                  <button className="btn btn-primary" type="submit" disabled={!text.trim()}>Send</button>
                </form>
              </>
            ) : (
              <div className="chat-empty">Select a conversation or start a new one</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
