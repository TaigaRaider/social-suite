import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Explore() {
  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.getExplore().then((data) => {
      setPosts(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await api.searchUsers(q);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  return (
    <div className="page-container">
      <div className="explore-page">
        <div className="explore-search" style={{ position: 'relative' }}>
          <span className="search-icon">&#128269;</span>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  className="search-result-item"
                  onClick={() => { setSearchResults([]); setSearchQuery(''); navigate(`/profile/${u.id}`); }}
                >
                  <img
                    src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=833ab4&color=fff&size=72`}
                    alt=""
                  />
                  <span>{u.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: 200 }}>
            <div className="loader" />
          </div>
        ) : (
          <div className="explore-grid">
            {posts.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <div className="empty-icon">&#128269;</div>
                <h3>Nothing to explore yet</h3>
                <p>When there are posts, they'll show up here.</p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="post-grid-item">
                  <img src={post.image} alt="" />
                  <div className="post-grid-overlay">
                    <span className="post-grid-stat">&#10084; {post.likeCount}</span>
                    <span className="post-grid-stat">&#128172; {post.commentCount}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <Navbar />
    </div>
  );
}
