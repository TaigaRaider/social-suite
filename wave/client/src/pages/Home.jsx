import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Navbar from '../components/Navbar';
import GroupListItem from '../components/GroupListItem';
import GroupChat from './GroupChat';

export default function Home() {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { groupId: selectedGroupId } = useParams();

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

  return (
    <div className="app-layout">
      <div className="sidebar">
        <Navbar user={user} onLogout={logout} unreadCount={unreadCount} />
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
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div className="spinner" />
            </div>
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
