import { useState } from 'react';
import { api } from '../api';

export default function MemberList({ group, currentUserId, onClose, onMemberRemoved }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const isCurrentUserAdmin = group.role === 'admin';
  const members = group.members || [];

  const filteredMembers = members.filter(m =>
    (m.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.firstName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.lastName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemove = async (userId) => {
    try {
      await api.groups.removeMember(group.id, userId);
      onMemberRemoved();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await api.groups.addMember(group.id, userId);
      onMemberRemoved();
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  const handleSearchMembers = async (q) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await api.auth.search(q);
      const memberIds = members.map(m => m.id);
      setSearchResults(results.filter(r => !memberIds.includes(r.id)));
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const getInitials = (member) => {
    if (member.firstName && member.lastName) return (member.firstName[0] + member.lastName[0]).toUpperCase();
    if (member.firstName) return member.firstName[0].toUpperCase();
    return (member.username || '?')[0].toUpperCase();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Members ({members.length})</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {isCurrentUserAdmin && (
            <div className="add-member-search">
              <input
                type="text"
                placeholder="Search people to add..."
                value={searchQuery}
                onChange={(e) => handleSearchMembers(e.target.value)}
              />
            </div>
          )}
          {searchResults.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {searchResults.map(user => (
                <div key={user.id} className="member-item" style={{ cursor: 'pointer' }} onClick={() => handleAddMember(user.id)}>
                  <div className="user-avatar small" style={{ background: 'var(--accent-dark)' }}>
                    {user.firstName && user.lastName
                      ? (user.firstName[0] + user.lastName[0]).toUpperCase()
                      : (user.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="member-info">
                    <div className="member-name">
                      {user.firstName || user.lastName
                        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                        : user.username}
                    </div>
                  </div>
                  <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>+ Add</span>
                </div>
              ))}
            </div>
          )}
          {filteredMembers.map(member => (
            <div key={member.id} className="member-item">
              <div className="user-avatar small" style={{ background: 'var(--accent-dark)' }}>
                {getInitials(member)}
              </div>
              <div className="member-info">
                <div className="member-name">
                  {member.firstName || member.lastName
                    ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                    : member.username}
                  {member.id === currentUserId && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> (You)</span>}
                </div>
                <div className="member-role">{member.role === 'admin' ? 'Admin' : 'Member'}</div>
              </div>
              {isCurrentUserAdmin && member.id !== currentUserId && member.role !== 'admin' && (
                <button className="remove-btn" onClick={() => handleRemove(member.id)} title="Remove">
                  &#10005;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
