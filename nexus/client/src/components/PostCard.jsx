import { useState, useEffect } from 'react';
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

function PollDisplay({ postId }) {
  const [poll, setPoll] = useState(null);
  const [selected, setSelected] = useState(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    api.getPoll(postId).then(setPoll).catch(() => {});
  }, [postId]);

  const handleVote = async () => {
    if (!selected || voting) return;
    setVoting(true);
    try {
      const updated = await api.votePoll(postId, selected);
      setPoll(updated);
    } catch {}
    setVoting(false);
  };

  if (!poll) return null;
  const voted = poll.options.some(o => o.userVoted);

  return (
    <div style={{ border: '1px solid var(--fb-border)', borderRadius: 8, padding: 12, marginTop: 8 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>{poll.question}</div>
      {poll.options.map(opt => {
        const pct = poll.totalVotes > 0 ? Math.round((opt.voteCount / poll.totalVotes) * 100) : 0;
        return (
          <div key={opt.id} style={{ marginBottom: 8 }}>
            {voted ? (
              <div style={{ position: 'relative', background: opt.userVoted ? 'rgba(24,119,242,0.1)' : 'var(--fb-bg)', border: `1px solid ${opt.userVoted ? 'var(--fb-blue)' : 'var(--fb-border)'}`, borderRadius: 6, padding: '8px 12px', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct}%`, background: opt.userVoted ? 'rgba(24,119,242,0.15)' : 'rgba(255,255,255,0.05)', transition: 'width 0.3s' }} />
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>{opt.text}</span>
                  <span style={{ fontWeight: 600 }}>{pct}%</span>
                </div>
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--fb-bg)', border: `1px solid ${selected === opt.id ? 'var(--fb-blue)' : 'var(--fb-border)'}`, borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderColor: selected === opt.id ? 'var(--fb-blue)' : 'var(--fb-border)' }}>
                <input type="radio" name={`poll-${postId}`} checked={selected === opt.id} onChange={() => setSelected(opt.id)} style={{ accentColor: 'var(--fb-blue)' }} />
                {opt.text}
              </label>
            )}
          </div>
        );
      })}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--fb-gray)' }}>{poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}</span>
        {!voted && <button className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 13 }} disabled={!selected || voting} onClick={handleVote}>{voting ? '...' : 'Vote'}</button>}
      </div>
    </div>
  );
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👎'];

export default function PostCard({ post, onDelete, scheduled, onCancelScheduled }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!post.userLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [userReactions, setUserReactions] = useState([]);

  const initials = (post.firstName?.[0] || '') + (post.lastName?.[0] || '') || post.username?.[0] || '?';

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
          <div className="post-header-time">
            {scheduled ? (
              <span style={{ color: 'var(--fb-blue)' }}>&#128197; Scheduled for {new Date(post.scheduledAt).toLocaleString()}</span>
            ) : (
              timeAgo(post.createdAt)
            )}
          </div>
        </div>
        {post.userId === user?.id && (
          scheduled ? (
            <button className="btn btn-gray" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => onCancelScheduled?.(post.id)}>Cancel</button>
          ) : (
            <div className="post-menu" onClick={handleDelete} title="Delete post">&#10005;</div>
          )
        )}
      </div>
      {post.content && <div className="post-content">{post.content}</div>}
      {post.image && <img className="post-image" src={post.image} alt="" />}
      {post.hasPoll ? <PollDisplay postId={post.id} /> : null}
      {!scheduled && (
        <>
          <div className="post-stats">
            {reactions.length > 0 && (
              <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {reactions.map((r, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, cursor: 'pointer', background: 'var(--fb-bg)', padding: '2px 6px', borderRadius: 12, border: '1px solid var(--fb-border)' }}
                    onClick={() => handleReaction(r.emoji)} title={r.emoji}>
                    {r.emoji} <span>{r.count}</span>
                  </span>
                ))}
              </span>
            )}
            <span style={{ cursor: 'pointer' }} onClick={loadComments}>{commentCount > 0 && `${commentCount} comment${commentCount !== 1 ? 's' : ''}`}</span>
          </div>
          <div className="post-actions" style={{ position: 'relative' }}>
            <div
              onMouseEnter={() => setShowReactionPicker(true)}
              onMouseLeave={() => setShowReactionPicker(false)}
              style={{ position: 'relative', flex: 1 }}
            >
              <button className={`post-action ${userReactions.length > 0 ? 'liked' : ''}`}
                onClick={() => handleReaction(userReactions.length > 0 ? userReactions[0] : '👍')}>
                {userReactions.length > 0 ? userReactions[0] : '👍'} {userReactions.length > 0 ? 'Reacted' : 'Like'}
              </button>
              {showReactionPicker && (
                <div style={{ position: 'absolute', bottom: '100%', left: 0, display: 'flex', gap: 2, background: 'var(--fb-card)', border: '1px solid var(--fb-border)', borderRadius: 24, padding: '6px 8px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', zIndex: 10 }}>
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
        </>
      )}
    </div>
  );
}
