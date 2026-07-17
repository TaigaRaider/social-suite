import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import PostCard from '../components/PostCard';

export default function Explore() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api.getTrending().then(setTrending).catch(() => setTrending([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      api.searchUsers(searchQuery).then(setSearchResults).catch(() => setSearchResults([])).finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleDelete = (id) => {
    setTrending(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div>
      <div className="page-header">
        <h2>Explore</h2>
      </div>
      <div className="search-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {searchQuery ? (
        <div>
          {searching ? (
            <div className="loading" style={{ height: '100px' }}>Searching...</div>
          ) : searchResults.length === 0 ? (
            <div className="empty-state">
              <p>No users found</p>
            </div>
          ) : (
            searchResults.map(u => (
              <div key={u.id} className="user-list-item" onClick={() => navigate(`/profile/${u.id}`)}>
                <div className="post-avatar">
                  {u.avatar ? <img src={u.avatar} alt="" /> : (u.username?.[0]?.toUpperCase() || '?')}
                </div>
                <div className="user-list-info">
                  <div className="user-list-name">{u.firstName || u.lastName ? `${u.firstName} ${u.lastName}`.trim() : u.username}</div>
                  <div className="user-list-username">@{u.username}</div>
                  {u.bio && <div className="user-list-bio">{u.bio}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div>
          <div style={{ padding: '16px 20px 8px', fontWeight: '600', fontSize: '18px' }}>Trending</div>
          {loading ? (
            <div className="loading" style={{ height: '200px' }}>Loading...</div>
          ) : trending.length === 0 ? (
            <div className="empty-state">
              <h3>Nothing trending yet</h3>
              <p>Posts with the most likes today will appear here.</p>
            </div>
          ) : (
            trending.map(post => (
              <PostCard key={post.id} post={post} onDelete={handleDelete} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
