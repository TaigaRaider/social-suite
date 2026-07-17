import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr + 'Z');
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [submitting, setSubmitting] = useState(false);

  const handleLike = async () => {
    try {
      const result = await api.toggleLike(post.id);
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await api.deletePost(post.id);
      onDelete(post.id);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    try {
      const data = await api.getComments(post.id);
      setComments(data);
      setShowComments(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const comment = await api.addComment(post.id, { content: commentText });
      setComments((prev) => [...prev, comment]);
      setCommentCount((prev) => prev + 1);
      setCommentText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = post.username;

  return (
    <div className="post-card">
      <div className="post-header">
        <img
          src={post.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=833ab4&color=fff&size=68`}
          alt=""
          onClick={() => navigate(`/profile/${post.userId}`)}
          style={{ cursor: 'pointer' }}
        />
        <Link to={`/profile/${post.userId}`} className="post-user">{displayName}</Link>
        {post.userId === user?.id && (
          <button className="post-delete" onClick={handleDelete}>&#10005;</button>
        )}
      </div>
      <img className="post-image" src={post.image} alt="" />
      <div className="post-actions">
        <button className={`post-action-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
          {liked ? '♥' : '♡'}
        </button>
        <button className="post-action-btn" onClick={toggleComments}>
          &#128172;
        </button>
      </div>
      {likeCount > 0 && <div className="post-likes">{likeCount} {likeCount === 1 ? 'like' : 'likes'}</div>}
      {post.caption && (
        <div className="post-caption">
          <Link to={`/profile/${post.userId}`}><strong>{displayName}</strong></Link>
          {post.caption}
        </div>
      )}
      {commentCount > 0 && !showComments && (
        <div style={{ padding: '0 14px 4px', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={toggleComments}>
          View all {commentCount} comments
        </div>
      )}
      {showComments && (
        <div style={{ padding: '0 14px 8px', maxHeight: 200, overflowY: 'auto' }}>
          {comments.map((c) => (
            <div key={c.id} style={{ fontSize: 13, marginBottom: 4, lineHeight: 1.4 }}>
              <strong style={{ marginRight: 6 }}>{c.username}</strong>
              {c.content}
            </div>
          ))}
          <form onSubmit={handleComment} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              style={{
                flex: 1,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 10px',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submitting}
              style={{
                background: 'none',
                color: commentText.trim() ? '#833ab4' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Post
            </button>
          </form>
        </div>
      )}
      <div className="post-time">{timeAgo(post.createdAt)}</div>
    </div>
  );
}
