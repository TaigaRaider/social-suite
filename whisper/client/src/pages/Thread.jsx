import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import { ThreadSkeleton } from '../components/Skeleton';

export default function Thread() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getThread(id).then(setThread).catch(() => navigate('/')).finally(() => setLoading(false));
  }, [id]);

  const handleReplyCreated = (reply) => {
    setThread(prev => ({
      ...prev,
      replyCount: (prev.replyCount || 0) + 1,
      replies: [...prev.replies, {
        ...reply,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar
      }]
    }));
  };

  const handleDelete = (postId) => {
    if (thread && parseInt(id) === postId) {
      navigate('/');
    } else {
      setThread(prev => ({
        ...prev,
        replies: prev.replies.filter(r => r.id !== postId)
      }));
    }
  };

  if (loading) return <ThreadSkeleton />;
  if (!thread) return null;

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', marginRight: '16px', fontSize: '18px' }}>
          ←
        </button>
        <h2>Thread</h2>
      </div>

      {thread.parent && (
        <PostCard post={thread.parent} onDelete={handleDelete} />
      )}

      <div className="thread-parent">
        <PostCard post={thread} onDelete={handleDelete} showThreadLine={!!thread.parent} />
      </div>

      <CreatePost
        replyToId={thread.id}
        onCreated={handleReplyCreated}
        placeholder={`Reply to @${thread.username}...`}
        compact
      />

      {thread.replies && thread.replies.length > 0 && (
        <div className="thread-reply-section">
          {thread.replies.length} {thread.replies.length === 1 ? 'reply' : 'replies'}
        </div>
      )}

      <div className="thread-container" style={{ position: 'relative' }}>
        {thread.replies?.map((reply, i) => (
          <div key={reply.id} style={{ position: 'relative' }}>
            {i < thread.replies.length - 1 && (
              <div className="thread-line" />
            )}
            <PostCard post={reply} onDelete={handleDelete} showThreadLine />
          </div>
        ))}
      </div>
    </div>
  );
}
