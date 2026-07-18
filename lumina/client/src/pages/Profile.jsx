import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import ProfileCompletion from '../components/ProfileCompletion';
import { GridSkeleton } from '../components/Skeleton';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', bio: '' });
  const [editStatus, setEditStatus] = useState('online');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isOwn = currentUser?.id === parseInt(id);

  const loadProfile = useCallback(async () => {
    try {
      const results = await Promise.all([
        api.getUser(id),
        api.getUserPosts(id),
        ...(isOwn ? [api.getScheduledPosts()] : [])
      ]);
      setProfile(results[0]);
      setPosts(results[1]);
      if (results[2]) setScheduledPosts(results[2]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, isOwn]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleFollow = async () => {
    try {
      const result = await api.toggleFollow(id);
      setProfile((prev) => ({
        ...prev,
        isFollowing: result.following,
        followerCount: prev.followerCount + (result.following ? 1 : -1),
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setProfile((prev) => ({ ...prev, postCount: prev.postCount - 1 }));
  };

  const cancelScheduled = async (pid) => {
    if (!window.confirm('Cancel this scheduled post?')) return;
    try {
      await api.cancelScheduled(pid);
      setScheduledPosts(prev => prev.filter(p => p.id !== pid));
    } catch {}
  };

  const openEdit = () => {
    setEditForm({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      bio: profile.bio || '',
    });
    setEditStatus(profile.status || 'online');
    setShowEdit(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateMe(editForm);
      api.updateStatus(editStatus).catch(() => {});
      setProfile((prev) => ({ ...prev, ...updated, status: editStatus }));
      setShowEdit(false);
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lumina-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="profile-header">
          <div className="profile-top">
            <div className="skeleton skeleton-circle" style={{ width: 86, height: 86 }} />
            <div className="profile-info">
              <div className="skeleton skeleton-text" style={{ width: 120, height: 20 }} />
              <div className="skeleton skeleton-text" style={{ width: 200, marginTop: 12 }} />
            </div>
          </div>
        </div>
        <GridSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h3>User not found</h3>
        </div>
      </div>
    );
  }

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username;

  return (
    <div className="page-container">
      <div className="profile-header">
        <div className="profile-top">
          <img
            className="profile-avatar"
            src={profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=833ab4&color=fff&size=172`}
            alt={profile.username}
          />
          <div className="profile-info">
            <div className="profile-username">{profile.username}</div>
            <div className="profile-stats">
              <span className="profile-stat"><strong>{profile.postCount}</strong> posts</span>
              <span className="profile-stat"><strong>{profile.followerCount}</strong> followers</span>
              <span className="profile-stat"><strong>{profile.followingCount}</strong> following</span>
            </div>
            <div className="profile-name">{displayName}</div>
            {profile.bio && <div className="profile-bio">{profile.bio}</div>}
            <div className="profile-actions">
              {isOwn ? (
                <button className="btn-edit-profile" onClick={openEdit}>Edit Profile</button>
              ) : (
                <button
                  className={`btn-follow ${profile.isFollowing ? 'following' : 'not-following'}`}
                  onClick={handleFollow}
                >
                  {profile.isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isOwn && scheduledPosts.length > 0 && (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px 16px' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              &#128197; Scheduled Posts ({scheduledPosts.length})
            </div>
            {scheduledPosts.map(post => (
              <PostCard key={post.id} post={post} onDelete={(pid) => setScheduledPosts(prev => prev.filter(p => p.id !== pid))} scheduled onCancelScheduled={cancelScheduled} />
            ))}
          </div>
        </div>
      )}

      {isOwn && (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 16px 16px' }}>
          <ProfileCompletion profile={profile} />
        </div>
      )}

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#128247;</div>
          <h3>No posts yet</h3>
        </div>
      ) : (
        <div className="post-grid">
          {posts.map((post) => (
            <div key={post.id} className="post-grid-item">
              <img src={post.image} alt="" />
              <div className="post-grid-overlay">
                <span className="post-grid-stat">&#10084; {post.likeCount}</span>
                <span className="post-grid-stat">&#128172; {post.commentCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <Navbar />
      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Profile</h3>
              <button className="modal-close" onClick={() => setShowEdit(false)}>&#10005;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditSubmit}>
                <div className="form-group">
                  <label>First Name</label>
                  <input value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Bio</label>
                  <textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} rows={3} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', width: '100%' }}>
                    <option value="online">🟢 Online</option>
                    <option value="away">🟡 Away</option>
                    <option value="dnd">🔴 Do Not Disturb</option>
                    <option value="offline">⚫ Invisible</option>
                  </select>
                </div>
                <button type="submit" className="btn-post" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0 12px', paddingTop: 12 }}>
                  <button type="button" className="btn-post" onClick={handleExport} disabled={exporting} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', width: '100%' }}>
                    {exporting ? 'Exporting...' : 'Download My Data'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
