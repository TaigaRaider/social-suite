import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Navbar from '../components/Navbar';
import GroupListItem from '../components/GroupListItem';
import ProfileCompletion from '../components/ProfileCompletion';
import { GroupListSkeleton } from '../components/Skeleton';
import GroupChat from './GroupChat';

export default function Home() {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { groupId: selectedGroupId } = useParams();

  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [messageSearchResults, setMessageSearchResults] = useState([]);
  const [messageSearchLoading, setMessageSearchLoading] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const messageSearchTimerRef = useRef(null);

  useEffect(() => {
    loadGroups();
    loadUnreadCount();
    const interval = setInterval(() => {
      loadGroups();
      loadUnreadCount();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadGroups = async () => {
    try {
      const data = await api.groups.list();
      setGroups(data);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const data = await api.notifications.unreadCount();
      setUnreadCount(data.count);
    } catch (err) {
      // silent
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleGroupClick = (groupId) => {
    navigate(`/group/${groupId}`);
  };

  const handleMessageSearch = (value) => {
    setMessageSearchQuery(value);
    if (messageSearchTimerRef.current) clearTimeout(messageSearchTimerRef.current);
    if (!value.trim()) {
      setMessageSearchResults([]);
      setMessageSearchLoading(false);
      return;
    }
    setMessageSearchLoading(true);
    messageSearchTimerRef.current = setTimeout(async () => {
      try {
        const results = await api.messages.search(value.trim());
        setMessageSearchResults(results);
      } catch {
        setMessageSearchResults([]);
      } finally {
        setMessageSearchLoading(false);
      }
    }, 500);
  };

  const handleSearchResultClick = (result) => {
    navigate(`/group/${result.groupId}`);
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
    <div className="app-layout">
      <div className="sidebar">
        <Navbar user={user} onLogout={logout} unreadCount={unreadCount} />

        <div style={{ display: 'flex', padding: '8px 12px 0', gap: 4 }}>
          <button
            style={{
              flex: 1,
              background: showMessageSearch ? 'var(--accent)' : 'var(--bg-input)',
              color: showMessageSearch ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 12px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              fontFamily: 'inherit',
              transition: 'all 0.2s'
            }}
            onClick={() => { setShowMessageSearch(true); }}
          >
            Search Messages
          </button>
          <button
            style={{
              flex: 1,
              background: !showMessageSearch ? 'var(--accent)' : 'var(--bg-input)',
              color: !showMessageSearch ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 12px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              fontFamily: 'inherit',
              transition: 'all 0.2s'
            }}
            onClick={() => { setShowMessageSearch(false); setMessageSearchQuery(''); setMessageSearchResults([]); }}
          >
            Groups
          </button>
        </div>

        {showMessageSearch ? (
          <>
            <div className="search-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">&#128269;</span>
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={messageSearchQuery}
                  onChange={(e) => handleMessageSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="group-list">
              {messageSearchQuery.trim() && (
                messageSearchLoading ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Searching...</div>
                ) : messageSearchResults.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No messages found</div>
                ) : (
                  messageSearchResults.map(result => {
                    const name = result.senderFirstName || result.senderLastName
                      ? `${result.senderFirstName || ''} ${result.senderLastName || ''}`.trim()
                      : result.senderName;
                    return (
                      <div key={result.id} className="group-list-item" onClick={() => handleSearchResultClick(result)} style={{ cursor: 'pointer' }}>
                        <div className="group-avatar" style={{ background: 'var(--accent-dark)' }}>
                          {result.groupName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="group-info">
                          <div className="group-name">{result.groupName}</div>
                          <div className="group-meta">
                            <span className="last-message" style={{ fontSize: 12 }}>
                              <strong>{name}:</strong> {result.content}
                            </span>
                          </div>
                        </div>
                        <div className="group-right">
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatResultTime(result.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </>
        ) : (
          <>
            <div className="search-bar">
              <div className="search-input-wrapper">
                <span className="search-icon">&#128269;</span>
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="group-list">
              {!showMessageSearch && !loading && <ProfileCompletion />}
              {loading ? (
                <GroupListSkeleton />
              ) : filteredGroups.length === 0 ? (
                <div className="no-groups">
                  <div className="no-groups-icon">&#128172;</div>
                  <h3>No groups yet</h3>
                  <p>Create a group to start chatting</p>
                  <button className="btn-accent" onClick={() => navigate('/new-group')}>
                    + New Group
                  </button>
                </div>
              ) : (
                filteredGroups.map(group => (
                  <GroupListItem
                    key={group.id}
                    group={group}
                    isActive={String(group.id) === selectedGroupId}
                    onClick={() => handleGroupClick(group.id)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
      <div className="chat-area">
        {selectedGroupId ? (
          <GroupChat key={selectedGroupId} groupId={selectedGroupId} onBack={() => navigate('/')} />
        ) : (
          <div className="empty-chat">
            <div className="empty-icon">&#128172;</div>
            <h3>Welcome to Wave</h3>
            <p>Select a group to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
