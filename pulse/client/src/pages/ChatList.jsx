import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Navbar from '../components/Navbar';
import ConversationItem from '../components/ConversationItem';
import Chat from '../components/Chat';
import UserSearchModal from '../components/UserSearchModal';

export default function ChatList() {
  const { user } = useAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeConv, setActiveConv] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(!!conversationId);
  const pollRef = useRef(null);

  useEffect(() => {
    loadConversations();
    pollRef.current = setInterval(loadConversations, 5000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === parseInt(conversationId));
      if (conv) setActiveConv(conv);
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    setMobileShowChat(!!conversationId);
  }, [conversationId]);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
      if (conversationId) {
        const conv = data.find(c => c.id === parseInt(conversationId));
        if (conv) setActiveConv(conv);
      }
    } catch {}
  };

  const handleSelectConversation = async (userId) => {
    try {
      const conv = await api.createConversation(userId);
      await loadConversations();
      navigate(`/chat/${conv.id}`);
      setShowModal(false);
    } catch {}
  };

  const handleConversationClick = (conv) => {
    navigate(`/chat/${conv.id}`);
    setMobileShowChat(true);
  };

  const handleBack = () => {
    navigate('/');
    setMobileShowChat(false);
    setActiveConv(null);
  };

  const filtered = conversations.filter(c => {
    if (!search) return true;
    const name = (c.otherFirstName || c.otherLastName)
      ? `${c.otherFirstName || ''} ${c.otherLastName || ''}`.trim().toLowerCase()
      : c.otherUsername.toLowerCase();
    return name.includes(search.toLowerCase()) || c.lastMessage?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <Navbar />
      <div className="main-layout">
        <div className={`sidebar ${mobileShowChat ? 'hidden-mobile' : ''}`}>
          <div className="sidebar-header">
            <h2>Chats</h2>
            <button className="sidebar-header-btn" onClick={() => setShowModal(true)} title="New conversation">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          <div className="sidebar-search">
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="conversation-list">
            {filtered.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                {conversations.length === 0 ? 'No conversations yet. Click + to start one.' : 'No results found.'}
              </div>
            )}
            {filtered.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                active={parseInt(conversationId) === conv.id}
                onClick={() => handleConversationClick(conv)}
                currentUserId={user.id}
              />
            ))}
          </div>
        </div>
        <div className={`chat-area ${mobileShowChat ? 'mobile-open' : ''}`}>
          {activeConv ? (
            <Chat conversation={activeConv} onBack={handleBack} onConversationUpdated={loadConversations} />
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3>Welcome to Pulse</h3>
              <p>Select a conversation or start a new one</p>
            </div>
          )}
        </div>
      </div>
      {showModal && <UserSearchModal onClose={() => setShowModal(false)} onSelect={handleSelectConversation} />}
    </>
  );
}
