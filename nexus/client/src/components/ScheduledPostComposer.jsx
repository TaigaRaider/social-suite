import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function ScheduledPostComposer({ onPost, onCancel }) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const initials = (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') || user?.username?.[0] || '?';

  const handleSubmit = async (isNow) => {
    if (!content.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const body = { content };
      if (!isNow && scheduledAt) {
        body.scheduledAt = new Date(scheduledAt).toISOString();
      }
      const post = await api.createPost(body);
      setContent('');
      setScheduledAt('');
      setMessage({ type: 'success', text: isNow ? 'Post published!' : 'Post scheduled!' });
      onPost?.(post);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create post' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="create-post">
        <div className="avatar">{initials}</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            placeholder={`What's on your mind, ${user?.firstName || 'friend'}?`}
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ minHeight: 80, borderRadius: 8 }}
          />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', border: '1px solid var(--fb-border)', borderRadius: 8, padding: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--fb-gray)' }}>Publish at:</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              style={{ flex: 1, fontSize: 13, padding: '6px 8px' }}
            />
          </div>

          {message && (
            <div style={{
              padding: '8px 12px', borderRadius: 6, fontSize: 13,
              background: message.type === 'success' ? 'rgba(66,183,42,0.1)' : 'rgba(250,62,62,0.1)',
              color: message.type === 'success' ? 'var(--fb-green)' : 'var(--fb-red)'
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--fb-border)', paddingTop: 8 }}>
            {onCancel && (
              <button className="btn btn-gray" type="button" onClick={onCancel}>Cancel</button>
            )}
            <button
              className="btn btn-primary"
              disabled={loading || !content.trim()}
              onClick={() => handleSubmit(true)}
            >
              {loading ? 'Posting...' : 'Post Now'}
            </button>
            <button
              className="btn btn-success"
              disabled={loading || !content.trim() || !scheduledAt}
              onClick={() => handleSubmit(false)}
            >
              {loading ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
