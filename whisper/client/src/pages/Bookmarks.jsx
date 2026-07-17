import { useState, useEffect } from 'react';
import api from '../api';
import PostCard from '../components/PostCard';

export default function Bookmarks() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBookmarks().then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
  }, []);

  const handleDelete = (id) => {
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div>
      <div className="page-header">
        <h2>Bookmarks</h2>
      </div>
      {loading ? (
        <div className="loading" style={{ height: '200px' }}>Loading...</div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <h3>No bookmarks yet</h3>
          <p>Save posts to read them later.</p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard key={post.id} post={post} onDelete={handleDelete} />
        ))
      )}
    </div>
  );
}
