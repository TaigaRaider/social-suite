import { useState } from 'react';
import { api } from '../api';

export default function CreatePost({ onClose, onCreated }) {
  const [image, setImage] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!image.trim()) return;
    setLoading(true);
    setError('');
    try {
      const post = await api.createPost({ image, caption });
      onCreated(post);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create new post</h3>
          <button className="modal-close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="modal-body">
          {error && <div className="error-msg">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Image URL</label>
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                required
              />
            </div>
            <div className="form-group">
              <label>Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                rows={3}
              />
            </div>
            <button type="submit" className="btn-post" disabled={loading || !image.trim()}>
              {loading ? 'Posting...' : 'Share'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
