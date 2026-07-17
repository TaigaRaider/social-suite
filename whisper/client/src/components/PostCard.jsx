import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useState } from 'react';

function timeAgo(dateStr) {
  const date = new Date(dateStr + 'Z');
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCount(n) {
  if (!n) return '';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export default function PostCard({ post, onDelete, showThreadLine = false, isReply = false }) {
  const navigate = useNavigate();
  const [data, setData] = useState(post);

  const initials = (data.firstName?.[0] || '') + (data.lastName?.[0] || '') || data.username?.[0]?.toUpperCase() || '?';

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const res = await api.toggleLike(data.id);
      setData(prev => ({ ...prev, liked: res.liked, likeCount: res.likeCount }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRepost = async (e) => {
    e.stopPropagation();
    try {
      const res = await api.toggleRepost(data.id);
      setData(prev => ({ ...prev, reposted: res.reposted, repostCount: res.repostCount }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBookmark = async (e) => {
    e.stopPropagation();
    try {
      const res = await api.toggleBookmark(data.id);
      setData(prev => ({ ...prev, bookmarked: res.bookmarked }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm('Delete this post?')) return;
    try {
      await api.deletePost(data.id);
      onDelete?.(data.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const goToPost = (e) => {
    if (e.target.closest('.post-action') || e.target.closest('a')) return;
    navigate(`/thread/${data.id}`);
  };

  return (
    <div className="post-card" onClick={goToPost}>
      {showThreadLine && <div className="thread-connector" />}
      <Link to={`/profile/${data.userId}`} onClick={e => e.stopPropagation()}>
        <div className="post-avatar">
          {data.avatar ? <img src={data.avatar} alt="" /> : initials}
        </div>
      </Link>
      <div className="post-body">
        <div className="post-header">
          <Link to={`/profile/${data.userId}`} onClick={e => e.stopPropagation()} className="post-name">
            {data.firstName || data.lastName ? `${data.firstName} ${data.lastName}`.trim() : data.username}
          </Link>
          <span className="post-username">@{data.username}</span>
          <span className="post-time">{timeAgo(data.createdAt)}</span>
        </div>
        {data.replyToId && isReply && (
          <div className="post-reply-indicator">
            Replying to @{data.replyUsername || 'user'}
          </div>
        )}
        <div className="post-content">{data.content}</div>
        <div className="post-actions">
          <button className="post-action reply" onClick={(e) => { e.stopPropagation(); navigate(`/thread/${data.id}`); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
            {formatCount(data.replyCount)}
          </button>
          <button className={`post-action repost ${data.reposted ? 'active' : ''}`} onClick={handleRepost}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" /></svg>
            {formatCount(data.repostCount)}
          </button>
          <button className={`post-action like ${data.liked ? 'active' : ''}`} onClick={handleLike}>
            <svg viewBox="0 0 24 24" fill={data.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
            {formatCount(data.likeCount)}
          </button>
          <button className={`post-action bookmark ${data.bookmarked ? 'active' : ''}`} onClick={handleBookmark}>
            <svg viewBox="0 0 24 24" fill={data.bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
          </button>
          {data.userId === parseInt(localStorage.getItem('whisper_user_id')) && (
            <button className="post-action delete" onClick={handleDelete}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
