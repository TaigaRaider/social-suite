import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function StoriesBar() {
  const [stories, setStories] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [storyImage, setStoryImage] = useState('');
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadStories = () => {
    api.getStories().then((data) => setStories(data)).catch(() => {});
  };

  useEffect(() => { loadStories(); }, []);

  const grouped = {};
  stories.forEach((s) => {
    if (!grouped[s.userId]) {
      grouped[s.userId] = { username: s.username, avatar: s.avatar, userId: s.userId, items: [] };
    }
    grouped[s.userId].items.push(s);
  });

  const storyUsers = Object.values(grouped);

  const handleCreateStory = async (e) => {
    e.preventDefault();
    if (!storyImage.trim()) return;
    setCreating(true);
    try {
      await api.createStory({ image: storyImage });
      setStoryImage('');
      setShowCreate(false);
      loadStories();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="stories-bar">
        <div className="story-item" onClick={() => setShowCreate(true)}>
          <div className="story-ring no-story" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-tertiary)', fontSize: 24, color: 'var(--text-muted)' }}>
            +
          </div>
          <span className="story-username">Your story</span>
        </div>
        {storyUsers.map((s) => (
          <div key={s.userId} className="story-item" onClick={() => navigate(`/profile/${s.userId}`)}>
            <div className="story-ring">
              <img
                className="story-avatar"
                src={s.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.username)}&background=833ab4&color=fff&size=124`}
                alt=""
              />
            </div>
            <span className="story-username">{s.username}</span>
          </div>
        ))}
      </div>
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add to your story</h3>
              <button className="modal-close" onClick={() => setShowCreate(false)}>&#10005;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateStory}>
                <div className="form-group">
                  <label>Image URL</label>
                  <input
                    type="url"
                    value={storyImage}
                    onChange={(e) => setStoryImage(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    required
                  />
                </div>
                <button type="submit" className="btn-post" disabled={creating || !storyImage.trim()}>
                  {creating ? 'Sharing...' : 'Share'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
