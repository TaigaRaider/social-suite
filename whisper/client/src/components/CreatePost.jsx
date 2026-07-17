import { useState, forwardRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const CreatePost = forwardRef(function CreatePost({ replyToId, onCreated, placeholder = "What's on your mind?", compact = false }, ref) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const maxChars = 500;

  const initials = (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') || user?.username?.[0]?.toUpperCase() || '?';

  const handleSubmit = async () => {
    if (!content.trim() || loading) return;
    setLoading(true);
    try {
      const post = await api.createPost(content.trim(), replyToId);
      setContent('');
      onCreated?.(post);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const charCount = content.length;
  const remaining = maxChars - charCount;

  return (
    <div className="composer">
      <div className="composer-avatar">
        {user?.avatar ? <img src={user.avatar} alt="" /> : initials}
      </div>
      <div className="composer-body">
        <textarea
          ref={ref}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, maxChars))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={compact ? 2 : 3}
          autoFocus={!!replyToId}
        />
        <div className="composer-actions">
          <span className={`char-count ${remaining < 0 ? 'danger' : remaining < 50 ? 'warning' : ''}`}>
            {remaining}
          </span>
          <button
            className="composer-submit"
            onClick={handleSubmit}
            disabled={!content.trim() || content.length > maxChars || loading}
          >
            {loading ? '...' : replyToId ? 'Reply' : 'Whisper'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default CreatePost;
