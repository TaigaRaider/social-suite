import { useState, useEffect } from 'react';
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

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👎'];

export default function PostCard({ post, onDelete, scheduled, onCancelScheduled }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [submitting, setSubmitting] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [userReactions, setUserReactions] = useState([]);

  useEffect(() => {
    api.getReactions(post.id, 'post').then(data => {
      setReactions(data.reactions || []);
      setUserReactions(data.userReactions || []);
    }).catch(() => {});
  }, [post.id]);

  const handleReaction = async (emoji) => {
    try {
      await api.toggleReaction(post.id, 'post', emoji);
      const data = await api.getReactions(post.id, 'post');
      setReactions(data.reactions || []);
      setUserReactions(data.userReactions || []);
    } catch {}
    setShowReactionPicker(false);
  };

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
        {scheduled && (
          <span style={{ fontSize: 12, color: '#e11d48', marginLeft: 'auto', marginRight: 8 }}>&#128197; Scheduled: {new Date(post.scheduledAt).toLocaleString()}</span>
        )}
        {post.userId === user?.id && (
          scheduled ? (
            <button className="post-delete" onClick={() => onCancelScheduled?.(post.id)} style={{ color: 'var(--danger)' }} title="Cancel scheduled post">&#10005;</button>
          ) : (
            <button className="post-delete" onClick={handleDelete}>&#10005;</button>
          )
        )}
      </div>
      <img className="post-image" src={post.image} alt="" />
      <div className="post-actions">
        <div
          onMouseEnter={() => setShowReactionPicker(true)}
          onMouseLeave={() => setShowReactionPicker(false)}
          style={{ position: 'relative' }}
        >
          <button className={`post-action-btn ${userReactions.length > 0 ? 'liked' : ''}`} onClick={() => handleReaction(userReactions.length > 0 ? userReactions[0] : '👍')}>
            {userReactions.length > 0 ? userReactions[0] : '♡'}
          </button>
          {showReactionPicker && (
            <div style={{ position: 'absolute', bottom: '100%', left: 0, display: 'flex', gap: 2, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 24, padding: '6px 8px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', zIndex: 10 }}>
              {REACTION_EMOJIS.map(emoji => (
                <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
                  style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, transition: 'transform 0.15s', lineHeight: 1 }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.3)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="post-action-btn" onClick={toggleComments}>
          &#128172;
        </button>
      </div>
      {(reactions.length > 0 || likeCount > 0) && (
        <div style={{ padding: '0 14px 4px', display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          {reactions.map((r, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, cursor: 'pointer', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 12, border: '1px solid var(--border)' }}
              onClick={() => handleReaction(r.emoji)} title={r.emoji}>
              {r.emoji} {r.count}
            </span>
          ))}
          {!reactions.length && likeCount > 0 && <span>{likeCount} {likeCount === 1 ? 'like' : 'likes'}</span>}
        </div>
      )}
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
                color: commentText.trim() ? '#e11d48' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Post
            </button>
          </form>
        </div>
      )}
      <div className="post-time">{scheduled ? '' : timeAgo(post.createdAt)}</div>
    </div>
  );
}
