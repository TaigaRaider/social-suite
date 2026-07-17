import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', bio: '' });
  const [saving, setSaving] = useState(false);

  const isOwn = currentUser?.id === parseInt(id);

  const loadProfile = useCallback(async () => {
    try {
      const [userData, postsData] = await Promise.all([
        api.getUser(id),
        api.getUserPosts(id),
      ]);
      setProfile(userData);
      setPosts(postsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  const openEdit = () => {
    setEditForm({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      bio: profile.bio || '',
    });
    setShowEdit(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateMe(editForm);
      setProfile((prev) => ({ ...prev, ...updated }));
      setShowEdit(false);
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-screen" style={{ minHeight: 300 }}>
          <div className="loader" />
        </div>
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
                <button type="submit" className="btn-post" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
