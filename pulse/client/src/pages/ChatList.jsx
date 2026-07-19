import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Navbar from '../components/Navbar';
import ConversationItem from '../components/ConversationItem';
import Chat from '../components/Chat';
import UserSearchModal from '../components/UserSearchModal';
import ProfileCompletion from '../components/ProfileCompletion';
import { ConversationSkeleton } from '../components/Skeleton';

export default function ChatList() {
  const { user } = useAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeConv, setActiveConv] = useState(null);
  const [mobileShowChat, setMobileShowChat] = useState(!!conversationId);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const pollRef = useRef(null);

  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [messageSearchResults, setMessageSearchResults] = useState([]);
  const [messageSearchLoading, setMessageSearchLoading] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [searchMode, setSearchMode] = useState('conversations');
  const [searchResults, setSearchResults] = useState([]);
  const messageSearchTimerRef = useRef(null);

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
      setLoadingConversations(false);
      if (conversationId) {
        const conv = data.find(c => c.id === parseInt(conversationId));
        if (conv) setActiveConv(conv);
      }
    } catch {
      setLoadingConversations(false);
    }
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
    const matchesSearch = !search || (() => {
      const name = (c.otherFirstName || c.otherLastName)
        ? `${c.otherFirstName || ''} ${c.otherLastName || ''}`.trim().toLowerCase()
        : c.otherUsername.toLowerCase();
      return name.includes(search.toLowerCase()) || c.lastMessage?.toLowerCase().includes(search.toLowerCase());
    })();
    const matchesEncryptedSearch = !searchQuery || (() => {
      const name = `${c.otherFirstName || ''} ${c.otherLastName || ''} ${c.otherUsername || ''}`.toLowerCase();
      return name.includes(searchQuery.toLowerCase());
    })();
    return matchesSearch && matchesEncryptedSearch;
  });

  const handleMessageSearch = (value) => {
    setMessageSearchQuery(value);
    if (messageSearchTimerRef.current) clearTimeout(messageSearchTimerRef.current);
    if (!value.trim()) {
      setMessageSearchResults([]);
      setSearchResults([]);
      setMessageSearchLoading(false);
      return;
    }
    setMessageSearchLoading(true);
    messageSearchTimerRef.current = setTimeout(async () => {
      try {
        if (searchMode === 'messages') {
          const data = await api.crypto.searchMessages(value.trim());
          setMessageSearchResults(data.messages || []);
          setSearchResults(data.messages || []);
        } else if (searchMode === 'users') {
          const data = await api.crypto.searchUsers(value.trim());
          setMessageSearchResults(data.users || []);
          setSearchResults(data.users || []);
        } else if (searchMode === 'conversations') {
          const data = await api.crypto.searchConversations(value.trim());
          setMessageSearchResults(data.conversations || []);
          setSearchResults(data.conversations || []);
        } else {
          const results = await api.searchMessages(value.trim());
          setMessageSearchResults(results);
          setSearchResults(results);
        }
      } catch {
        setMessageSearchResults([]);
        setSearchResults([]);
      } finally {
        setMessageSearchLoading(false);
      }
    }, 500);
  };

  const handleSearchResultClick = (result) => {
    navigate(`/chat/${result.conversationId}`);
    setMobileShowChat(true);
    setShowMessageSearch(false);
    setMessageSearchQuery('');
    setMessageSearchResults([]);
  };

  const formatResultTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <Navbar />
      <div className="main-layout">
        <div className={`sidebar ${mobileShowChat ? 'hidden-mobile' : ''}`}>
          <div className="sidebar-header">
            <h2>Chats</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="sidebar-header-btn"
                onClick={() => setShowMessageSearch(!showMessageSearch)}
                title="Search messages"
                style={showMessageSearch ? { background: 'var(--blue-primary)', color: 'white', borderColor: 'var(--blue-primary)' } : {}}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <button className="sidebar-header-btn" onClick={() => setShowModal(true)} title="New conversation">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
          </div>

          {showMessageSearch && (
            <div className="message-search-overlay">
              <div style={{ display: 'flex', gap: 4, padding: '8px 12px 0' }}>
                {['conversations', 'messages', 'users'].map(mode => (
                  <button key={mode} onClick={() => { setSearchMode(mode); if (messageSearchQuery) handleMessageSearch(messageSearchQuery); }}
                    style={{ padding: '6px 12px', background: searchMode === mode ? '#8b5cf6' : '#e2e8f0', color: searchMode === mode ? 'white' : '#475569', border: 'none', borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>
                    {mode}
                  </button>
                ))}
              </div>
              <div className="search-input-wrapper">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={messageSearchQuery}
                  onChange={e => handleMessageSearch(e.target.value)}
                  autoFocus
                />
                {messageSearchQuery && (
                  <button className="clear-btn" onClick={() => { setMessageSearchQuery(''); setMessageSearchResults([]); }}>×</button>
                )}
              </div>
              {messageSearchQuery.trim() && (
                <div className="message-search-results">
                  {messageSearchLoading ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No results found</div>
                  ) : (
                    searchMode === 'users' ? (
                      searchResults.map(r => (
                        <div key={r.id} className="message-search-result" onClick={() => { handleSelectConversation(r.id); setShowMessageSearch(false); }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                            {(r.firstName?.[0] || r.username?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="result-info">
                            <div className="result-name">{r.firstName} {r.lastName}</div>
                            <div className="result-preview">@{r.username}</div>
                          </div>
                        </div>
                      ))
                    ) : searchMode === 'messages' ? (
                      searchResults.map(r => (
                        <div key={r.id} className="message-search-result" onClick={() => { if (r.conversationId) { navigate(`/chat/${r.conversationId}`); setMobileShowChat(true); } setShowMessageSearch(false); }}>
                          <div className="result-info">
                            <div className="result-name">{r.firstName} {r.lastName}</div>
                            <div className="result-preview">{r.content}</div>
                          </div>
                          <span className="result-time">{formatResultTime(r.createdAt)}</span>
                        </div>
                      ))
                    ) : (
                      searchResults.map(r => {
                        const name = r.firstName || r.lastName
                          ? `${r.firstName || ''} ${r.lastName || ''}`.trim()
                          : r.username;
                        return (
                          <div key={r.id} className="message-search-result" onClick={() => { handleSelectConversation(r.id); setShowMessageSearch(false); }}>
                            <div className="result-info">
                              <div className="result-name">{name}</div>
                              <div className="result-preview">@{r.username}</div>
                            </div>
                          </div>
                        );
                      })
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {!showMessageSearch && (
            <div className="sidebar-search">
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}

          {!showMessageSearch && (
            <div style={{ padding: '0 8px' }}>
              <input
                type="text"
                placeholder="Search encrypted messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', margin: '8px 0',
                  border: '1px solid #ddd', borderRadius: '20px', fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          )}

          <div className="conversation-list">
            {!showMessageSearch && <ProfileCompletion />}
            {loadingConversations ? (
              <ConversationSkeleton />
            ) : !showMessageSearch && filtered.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                {conversations.length === 0 ? 'No conversations yet. Click + to start one.' : 'No results found.'}
              </div>
            ) : !showMessageSearch ? (
              filtered.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  active={parseInt(conversationId) === conv.id}
                  onClick={() => handleConversationClick(conv)}
                  currentUserId={user.id}
                />
              ))
            ) : null}
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
