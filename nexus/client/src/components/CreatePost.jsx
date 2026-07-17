import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function CreatePost({ onPost }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const initials = (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') || user?.username?.[0] || '?';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      const post = await api.createPost({ content });
      setContent('');
      onPost?.(post);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="create-post">
        <div className="avatar">{initials}</div>
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea placeholder={`What's on your mind, ${user?.firstName || 'friend'}?`} value={content} onChange={e => setContent(e.target.value)} style={{ minHeight: 40, borderRadius: 20 }} />
          {content.trim() && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" disabled={loading} type="submit">Post</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
