import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Navbar from '../components/Navbar';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getUser(id),
      api.getUserPosts(id)
    ]).then(([p, ps]) => { setProfile(p); setPosts(ps); }).finally(() => setLoading(false));
  }, [id]);

  const isOwn = currentUser?.id === parseInt(id);
  const initials = (profile?.firstName?.[0] || '') + (profile?.lastName?.[0] || '') || profile?.username?.[0] || '?';

  const handleFriend = async () => {
    try {
      if (profile.friendshipStatus === 'none') {
        await api.sendFriendRequest(id);
        setProfile({ ...profile, friendshipStatus: 'pending' });
      } else if (profile.friendshipStatus === 'accepted') {
        if (confirm('Unfriend this person?')) {
          await api.removeFriend(id);
          setProfile({ ...profile, friendshipStatus: 'none', friendCount: profile.friendCount - 1 });
        }
      }
    } catch {}
  };

  const addPost = (post) => setPosts([post, ...posts]);
  const deletePost = (pid) => setPosts(posts.filter(p => p.id !== pid));

  if (loading) return <><Navbar /><div className="main"><div className="loading">Loading profile...</div></div></>;
  if (!profile) return <><Navbar /><div className="main"><div className="empty-state">User not found</div></div></>;

  return (
    <>
      <Navbar />
      <div className="main">
        <div className="container">
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="profile-cover" />
            <div className="profile-info">
              <div className="avatar avatar-xl">{initials}</div>
              <div className="profile-details">
                <div className="profile-name">{profile.firstName} {profile.lastName}</div>
                <div className="profile-stats">
                  {profile.friendCount} friends · {profile.postCount} posts
                </div>
              </div>
              <div className="profile-actions">
                {isOwn ? (
                  <EditProfileButton user={profile} onSaved={setProfile} />
                ) : (
                  <>
                    <button className={`btn ${profile.friendshipStatus === 'accepted' ? 'btn-gray' : 'btn-primary'}`} onClick={handleFriend}>
                      {profile.friendshipStatus === 'none' && 'Add Friend'}
                      {profile.friendshipStatus === 'pending' && 'Request Sent'}
                      {profile.friendshipStatus === 'accepted' && 'Friends ✓'}
                    </button>
                    <button className="btn btn-gray" onClick={() => window.location.href = `/messages/${id}`}>Message</button>
                  </>
                )}
              </div>
            </div>
            {profile.bio && <div style={{ padding: '0 32px 16px', color: 'var(--fb-gray)', fontSize: 14 }}>{profile.bio}</div>}
          </div>

          {isOwn && <CreatePost onPost={addPost} />}
          {posts.map(p => <PostCard key={p.id} post={p} onDelete={deletePost} />)}
          {posts.length === 0 && <div className="card empty-state">No posts yet</div>}
        </div>
      </div>
    </>
  );
}

function EditProfileButton({ user, onSaved }) {
  const [show, setShow] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [bio, setBio] = useState(user.bio || '');

  const save = async () => {
    const updated = await api.updateMe({ firstName, lastName, bio });
    onSaved(updated);
    setShow(false);
  };

  return (
    <>
      <button className="btn btn-gray" onClick={() => setShow(true)}>Edit Profile</button>
      {show && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 400 }}>
            <h3 style={{ marginBottom: 16 }}>Edit Profile</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} />
              <input placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />
              <textarea placeholder="Bio" value={bio} onChange={e => setBio(e.target.value)} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-gray" onClick={() => setShow(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
