import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import StoriesBar from '../components/StoriesBar';
import CreatePost from '../components/CreatePost';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const { user } = useAuth();

  const loadPosts = useCallback(async () => {
    try {
      const data = await api.getFeed();
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handlePostCreated = (post) => {
    setPosts((prev) => [post, ...prev]);
    setShowCreate(false);
  };

  const handlePostDeleted = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="page-container">
      <div className="feed-page">
        <StoriesBar />
        {loading ? (
          <div className="loading-screen" style={{ minHeight: 200 }}>
            <div className="loader" />
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">&#128247;</div>
            <h3>No posts yet</h3>
            <p>Follow people or create a post to get started!</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onDelete={handlePostDeleted} />
          ))
        )}
      </div>
      <Navbar onCreateClick={() => setShowCreate(true)} />
      {showCreate && <CreatePost onClose={() => setShowCreate(false)} onCreated={handlePostCreated} />}
    </div>
  );
}
