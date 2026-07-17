import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function NewGroup() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const data = await api.friends.list();
      setFriends(data);
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setCreating(true);
    try {
      const group = await api.groups.create({
        name: name.trim(),
        description: description.trim(),
        memberIds: selectedIds,
      });
      navigate(`/group/${group.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const getInitials = (user) => {
    if (user.firstName && user.lastName) return (user.firstName[0] + user.lastName[0]).toUpperCase();
    if (user.firstName) return user.firstName[0].toUpperCase();
    return user.username[0].toUpperCase();
  };

  return (
    <div className="new-group-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>&#8592;</button>
        <h2>New Group</h2>
      </div>
      <form className="new-group-form" onSubmit={handleCreate}>
        {error && <div className="auth-error">{error}</div>}
        <div className="form-group">
          <label>Group Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter group name"
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group about?"
          />
        </div>
        <div className="form-group">
          <label>Add Members ({selectedIds.length} selected)</label>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}><div className="spinner" /></div>
          ) : friends.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Add friends first to create groups with them
            </div>
          ) : (
            <div className="friend-select-list">
              {friends.map(friend => (
                <div
                  key={friend.id}
                  className={`friend-select-item ${selectedIds.includes(friend.id) ? 'selected' : ''}`}
                  onClick={() => toggleFriend(friend.id)}
                >
                  <div className="check-mark">
                    {selectedIds.includes(friend.id) ? '✓' : ''}
                  </div>
                  <div className="user-avatar small" style={{ background: 'var(--accent-dark)' }}>
                    {getInitials(friend)}
                  </div>
                  <div className="friend-name">
                    {friend.firstName || friend.lastName
                      ? `${friend.firstName} ${friend.lastName}`.trim()
                      : friend.username}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="create-group-btn" disabled={creating || !name.trim()}>
          {creating ? 'Creating...' : 'Create Group'}
        </button>
      </form>
    </div>
  );
}
