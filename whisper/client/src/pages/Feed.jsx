import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import ProfileCompletion from '../components/ProfileCompletion';
import { PostSkeleton } from '../components/Skeleton';

export default function Feed() {
  const { user } = useAuth();
  const location = useLocation();
  const [tab, setTab] = useState('following');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const composerRef = useRef(null);

  useEffect(() => {
    if (location.state?.openComposer && composerRef.current) {
      composerRef.current.focus();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    setLoading(true);
    if (tab === 'following') {
      api.getFeed().then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
    } else {
      api.getTrending().then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
    }
  }, [tab]);

  const handlePostCreated = (post) => {
    setPosts(prev => [{ ...post, username: user.username, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar }, ...prev]);
  };

  const handleDelete = (id) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div>
      <div className="page-header">
        <h2>Home</h2>
      </div>
      <div className="tabs">
        <button className={`tab ${tab === 'following' ? 'active' : ''}`} onClick={() => setTab('following')}>Following</button>
        <button className={`tab ${tab === 'trending' ? 'active' : ''}`} onClick={() => setTab('trending')}>For You</button>
      </div>
      <CreatePost ref={composerRef} onCreated={handlePostCreated} placeholder="What's happening?" />
      {user && <ProfileCompletion profile={user} />}
      {loading ? (
        <div>
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
          <PostSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <h3>No posts yet</h3>
          <p>{tab === 'following' ? 'Follow some people to see their posts here!' : 'Check back later for trending posts.'}</p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard key={post.id} post={post} onDelete={handleDelete} />
        ))
      )}
    </div>
  );
}
