import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import PostCard from '../components/PostCard';
import ProfileCompletion from '../components/ProfileCompletion';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', bio: '' });
  const [tab, setTab] = useState('posts');
  const [exporting, setExporting] = useState(false);

  const isOwn = currentUser && parseInt(id) === currentUser.id;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getUser(id).then(p => { setProfile(p); setEditForm({ firstName: p.firstName, lastName: p.lastName, bio: p.bio }); }),
      api.getUserPosts(id).then(setPosts),
      ...(isOwn ? [api.getScheduledPosts().then(setScheduledPosts)] : [])
    ]).catch(() => navigate('/')).finally(() => setLoading(false));
  }, [id]);

  const handleFollow = async () => {
    try {
      const res = await api.toggleFollow(profile.id);
      setProfile(prev => ({
        ...prev,
        isFollowing: res.following,
        followerCount: res.following ? prev.followerCount + 1 : prev.followerCount - 1
      }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const updated = await api.updateMe(editForm);
      setProfile(prev => ({ ...prev, ...editForm }));
      updateUser({ ...currentUser, ...editForm });
      setShowEdit(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const cancelScheduled = async (pid) => {
    if (!confirm('Cancel this scheduled post?')) return;
    try {
      await api.cancelScheduled(pid);
      setScheduledPosts(prev => prev.filter(p => p.id !== pid));
    } catch {}
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'whisper-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setExporting(false);
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!profile) return null;

  const initials = (profile.firstName?.[0] || '') + (profile.lastName?.[0] || '') || profile.username?.[0]?.toUpperCase() || '?';

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', marginRight: '16px', fontSize: '18px' }}>
          ←
        </button>
        <h2>{profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : profile.username}</h2>
      </div>

      <div className="profile-header">
        <div className="profile-top">
          <div className="profile-avatar-large">
            {profile.avatar ? <img src={profile.avatar} alt="" /> : initials}
          </div>
          <div className="profile-actions">
            {isOwn ? (
              <>
                <button className="btn-edit" onClick={() => setShowEdit(true)}>Edit profile</button>
              </>
            ) : (
              <button
                className={`btn-follow ${profile.isFollowing ? 'following' : 'follow'}`}
                onClick={handleFollow}
              >
                {profile.isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>
        <div className="profile-name">{profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : profile.username}</div>
        <div className="profile-username">@{profile.username}</div>
        {profile.bio && <div className="profile-bio">{profile.bio}</div>}
        <div className="profile-stats">
          <span><strong>{profile.followingCount}</strong> following</span>
          <span><strong>{profile.followerCount}</strong> followers</span>
        </div>
      </div>

      {isOwn && scheduledPosts.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              &#128197; Scheduled Posts ({scheduledPosts.length})
            </div>
            {scheduledPosts.map(post => (
              <PostCard key={post.id} post={post} onDelete={(pid) => setScheduledPosts(prev => prev.filter(p => p.id !== pid))} scheduled onCancelScheduled={cancelScheduled} />
            ))}
          </div>
        </div>
      )}

      {isOwn && <div style={{ padding: '0 16px 16px' }}><ProfileCompletion profile={profile} /></div>}

      <div className="tabs">
        <button className={`tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>Posts</button>
      </div>

      {posts.map(post => (
        <PostCard key={post.id} post={post} onDelete={handleDelete} />
      ))}

      {!loading && posts.length === 0 && (
        <div className="empty-state">
          <p>No posts yet</p>
        </div>
      )}

      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit profile</h3>
              <button className="modal-close" onClick={() => setShowEdit(false)}>×</button>
            </div>
            <div className="form-group">
              <label>First Name</label>
              <input className="form-input" value={editForm.firstName} onChange={e => setEditForm(p => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input className="form-input" value={editForm.lastName} onChange={e => setEditForm(p => ({ ...p, lastName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea value={editForm.bio} onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))} maxLength={160} />
            </div>
            <button className="btn-primary" onClick={handleSaveProfile}>Save</button>
            <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0 12px', paddingTop: 12 }}>
              <button className="btn-primary" onClick={handleExport} disabled={exporting} style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                {exporting ? 'Exporting...' : 'Download My Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
