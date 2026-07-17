import { useState } from 'react';

export default function CreateGroupModal({ friends, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleFriend = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), memberIds: selectedIds });
  };

  const getInitials = (user) => {
    if (user.firstName && user.lastName) return (user.firstName[0] + user.lastName[0]).toUpperCase();
    if (user.firstName) return user.firstName[0].toUpperCase();
    return (user.username || '?')[0].toUpperCase();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Group</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div style={{ padding: '12px' }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'var(--bg-input)',
                border: 'none',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: 15,
                outline: 'none',
                marginBottom: 12,
              }}
              autoFocus
            />
          </div>
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
                    ? `${friend.firstName || ''} ${friend.lastName || ''}`.trim()
                    : friend.username}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
          <button className="create-group-btn" onClick={handleCreate} disabled={!name.trim()}>
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
