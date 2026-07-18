import { useState, forwardRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const CreatePost = forwardRef(function CreatePost({ replyToId, onCreated, placeholder = "What's on your mind?", compact = false }, ref) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const maxChars = 500;

  const initials = (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '') || user?.username?.[0]?.toUpperCase() || '?';

  const handleSubmit = async () => {
    if (!content.trim() || loading) return;
    setLoading(true);
    try {
      const poll = showPoll && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2
        ? { question: pollQuestion.trim(), options: pollOptions.filter(o => o.trim()) }
        : undefined;
      const body = { content: content.trim(), replyToId, scheduledAt: scheduledAt || undefined, poll };
      const post = await api.createPost(body);
      setContent('');
      setScheduledAt('');
      setShowSchedule(false);
      setShowPoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
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
  const hasPoll = showPoll && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2;

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

        {showPoll && !replyToId && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Create Poll</div>
            <input
              className="form-input"
              placeholder="Ask a question..."
              value={pollQuestion}
              onChange={e => setPollQuestion(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            {pollOptions.map((opt, i) => (
              <input
                key={i}
                className="form-input"
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={e => { const next = [...pollOptions]; next[i] = e.target.value; setPollOptions(next); }}
                style={{ marginBottom: 6, fontSize: 14, padding: '8px 12px' }}
              />
            ))}
            {pollOptions.length < 4 && (
              <button type="button" onClick={() => setPollOptions([...pollOptions, ''])} style={{ background: 'none', color: 'var(--reply-color)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: '4px 0' }}>+ Add option</button>
            )}
            <button type="button" onClick={() => { setShowPoll(false); setPollQuestion(''); setPollOptions(['', '']); }} style={{ background: 'none', color: 'var(--text-tertiary)', border: 'none', cursor: 'pointer', fontSize: 12, marginTop: 4 }}>Remove poll</button>
          </div>
        )}

        {showSchedule && !replyToId && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Schedule:</span>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} style={{ flex: 1, fontSize: 13, padding: '6px 8px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
            <button type="button" onClick={() => { setShowSchedule(false); setScheduledAt(''); }} style={{ background: 'none', color: 'var(--text-tertiary)', border: 'none', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
          </div>
        )}

        <div className="composer-actions">
          <div style={{ display: 'flex', gap: 4 }}>
            {!replyToId && (
              <>
                <button type="button" onClick={() => setShowPoll(!showPoll)} title="Add poll" style={{ background: showPoll ? 'rgba(29,155,240,0.1)' : 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8, color: showPoll ? 'var(--reply-color)' : 'var(--text-tertiary)', fontSize: 16 }}>&#128202;</button>
                <button type="button" onClick={() => setShowSchedule(!showSchedule)} title="Schedule" style={{ background: showSchedule ? 'rgba(29,155,240,0.1)' : 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8, color: showSchedule ? 'var(--reply-color)' : 'var(--text-tertiary)', fontSize: 16 }}>&#128197;</button>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`char-count ${remaining < 0 ? 'danger' : remaining < 50 ? 'warning' : ''}`}>
              {remaining}
            </span>
            <button
              className="composer-submit"
              onClick={handleSubmit}
              disabled={!content.trim() || content.length > maxChars || loading}
            >
              {loading ? '...' : scheduledAt ? 'Schedule' : replyToId ? 'Reply' : 'Whisper'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CreatePost;
