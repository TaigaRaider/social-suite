import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const STORY_REACTION_EMOJIS = ['❤️', '😮', '👍', '😂'];

export default function StoriesBar() {
  const [stories, setStories] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [storyImage, setStoryImage] = useState('');
  const [creating, setCreating] = useState(false);
  const [viewingStory, setViewingStory] = useState(null);
  const [storyReactions, setStoryReactions] = useState({});
  const [userStoryReactions, setUserStoryReactions] = useState({});
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadStories = () => {
    api.getStories().then((data) => setStories(data)).catch(() => {});
  };

  useEffect(() => { loadStories(); }, []);

  useEffect(() => {
    if (viewingStory) {
      const storyId = viewingStory.id;
      api.getStoryReactions(storyId).then(data => {
        setStoryReactions(prev => ({ ...prev, [storyId]: data.reactions || [] }));
        setUserStoryReactions(prev => ({ ...prev, [storyId]: data.userReactions || [] }));
      }).catch(() => {});
    }
  }, [viewingStory]);

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

  const handleStoryReaction = async (emoji) => {
    if (!viewingStory) return;
    try {
      await api.reactStory(viewingStory.id, emoji);
      const data = await api.getStoryReactions(viewingStory.id);
      setStoryReactions(prev => ({ ...prev, [viewingStory.id]: data.reactions || [] }));
      setUserStoryReactions(prev => ({ ...prev, [viewingStory.id]: data.userReactions || [] }));
    } catch {}
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
          <div key={s.userId} className="story-item" onClick={() => setViewingStory(s.items[0])}>
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

      {viewingStory && (
        <div className="modal-overlay" onClick={() => setViewingStory(null)}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: 400, width: '100%' }}>
            <button onClick={() => setViewingStory(null)} style={{ position: 'absolute', top: -10, right: -10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20, fontSize: 16, color: 'var(--text-primary)' }}>&#10005;</button>
            <img src={viewingStory.image} alt="" style={{ width: '100%', borderRadius: 12, display: 'block' }} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, background: 'var(--bg-secondary)', borderRadius: 24, padding: '8px 12px' }}>
              {STORY_REACTION_EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => handleStoryReaction(emoji)}
                  style={{
                    fontSize: 24, background: userStoryReactions[viewingStory.id]?.includes(emoji) ? 'rgba(131,58,180,0.2)' : 'none',
                    border: userStoryReactions[viewingStory.id]?.includes(emoji) ? '1px solid rgba(131,58,180,0.4)' : '1px solid transparent',
                    cursor: 'pointer', padding: '6px 10px', borderRadius: 12, transition: 'transform 0.15s', lineHeight: 1
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}>
                  {emoji}
                </button>
              ))}
            </div>
            {storyReactions[viewingStory.id]?.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                {storyReactions[viewingStory.id].map((r, i) => (
                  <span key={i}>{r.emoji} {r.count}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
