import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Navbar from '../components/Navbar';
import CreatePost from '../components/CreatePost';
import PostCard from '../components/PostCard';
import ProfileCompletion from '../components/ProfileCompletion';
import { PostSkeleton } from '../components/Skeleton';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    api.getFeed().then(setPosts).finally(() => setLoading(false));
    api.getSuggestions().then(setSuggestions).catch(() => {});
  }, []);

  const addPost = (post) => setPosts([post, ...posts]);
  const deletePost = (id) => setPosts(posts.filter(p => p.id !== id));

  const sendRequest = async (userId) => {
    try {
      await api.sendFriendRequest(userId);
      setSuggestions(suggestions.filter(s => s.id !== userId));
    } catch {}
  };

  return (
    <>
      <Navbar />
      <div className="main">
        <div className="container layout-2col">
          <div>
            <div className="card" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="avatar">{(user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') || user?.username?.[0]}</div>
                <span style={{ color: 'var(--fb-gray)', fontSize: 14 }}>{user?.firstName} {user?.lastName}</span>
              </div>
            </div>
            <ProfileCompletion profile={user} />
            {suggestions.length > 0 && (
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 17 }}>People you may know</div>
                {suggestions.map(s => (
                  <div key={s.id} className="friend-card">
                    <div className="avatar">{(s.firstName?.[0] || '') + (s.lastName?.[0] || '') || s.username[0]}</div>
                    <div className="friend-card-info">
                      <div className="friend-card-name">{s.firstName} {s.lastName}</div>
                      <div className="friend-card-status">@{s.username}</div>
                    </div>
                    <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => sendRequest(s.id)}>Add Friend</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <CreatePost onPost={addPost} />
            {loading ? (
              <>
                <PostSkeleton />
                <PostSkeleton />
                <PostSkeleton />
              </>
            ) : posts.length === 0 ? (
              <div className="card empty-state">
                <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No posts yet</p>
                <p>Add friends and create posts to see activity in your feed.</p>
              </div>
            ) : (
              posts.map(p => <PostCard key={p.id} post={p} onDelete={deletePost} />)
            )}
          </div>
        </div>
      </div>
    </>
  );
}
