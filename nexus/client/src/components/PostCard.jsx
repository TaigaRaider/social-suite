import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!post.userLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentCount, setCommentCount] = useState(post.commentCount);

  const initials = (post.firstName?.[0] || '') + (post.lastName?.[0] || '') || post.username?.[0] || '?';

  const handleLike = async () => {
    try {
      const res = await api.likePost(post.id);
      setLiked(res.userLiked);
      setLikeCount(res.likeCount);
    } catch {}
  };

  const loadComments = async () => {
    if (showComments) { setShowComments(false); return; }
    try {
      const c = await api.getComments(post.id);
      setComments(c);
      setShowComments(true);
    } catch {}
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const c = await api.addComment(post.id, { content: commentText });
      setComments([...comments, c]);
      setCommentCount(commentCount + 1);
      setCommentText('');
    } catch {}
  };

  const handleDelete = async () => {
    if (confirm('Delete this post?')) {
      try {
        await api.deletePost(post.id);
        onDelete?.(post.id);
      } catch {}
    }
  };

  return (
    <div className="card post">
      <div className="post-header">
        <div className="avatar" style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.userId}`)}>
          {initials}
        </div>
        <div className="post-header-info">
          <div className="post-header-name" style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${post.userId}`)}>
            {post.firstName} {post.lastName}
          </div>
          <div className="post-header-time">{timeAgo(post.createdAt)}</div>
        </div>
        {post.userId === user?.id && (
          <div className="post-menu" onClick={handleDelete} title="Delete post">&#10005;</div>
        )}
      </div>
      {post.content && <div className="post-content">{post.content}</div>}
      {post.image && <img className="post-image" src={post.image} alt="" />}
      <div className="post-stats">
        <span>{likeCount > 0 && `${likeCount} like${likeCount !== 1 ? 's' : ''}`}</span>
        <span style={{ cursor: 'pointer' }} onClick={loadComments}>{commentCount > 0 && `${commentCount} comment${commentCount !== 1 ? 's' : ''}`}</span>
      </div>
      <div className="post-actions">
        <button className={`post-action ${liked ? 'liked' : ''}`} onClick={handleLike}>
          {liked ? '👍' : '👍'} Like
        </button>
        <button className="post-action" onClick={loadComments}>💬 Comment</button>
      </div>
      {showComments && (
        <div className="comment-section">
          {comments.map(c => (
            <div key={c.id} className="comment">
              <div className="avatar avatar-sm" style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${c.userId}`)}>
                {(c.firstName?.[0] || '') + (c.lastName?.[0] || '') || '?'}
              </div>
              <div>
                <div className="comment-bubble">
                  <div className="comment-name" style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${c.userId}`)}>
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="comment-text">{c.content}</div>
                </div>
                <div className="comment-time">{timeAgo(c.createdAt)}</div>
              </div>
            </div>
          ))}
          <form className="comment-input" onSubmit={handleComment}>
            <input placeholder="Write a comment..." value={commentText} onChange={e => setCommentText(e.target.value)} />
          </form>
        </div>
      )}
    </div>
  );
}
