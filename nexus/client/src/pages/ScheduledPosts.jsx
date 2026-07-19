import { useState, useEffect } from 'react';
import { api } from '../api';
import Navbar from '../components/Navbar';
import ScheduledPostComposer from '../components/ScheduledPostComposer';

export default function ScheduledPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);

  useEffect(() => {
    api.getScheduledPosts().then(setPosts).finally(() => setLoading(false));
  }, []);

  const cancelPost = async (id) => {
    try {
      await api.cancelScheduled(id);
      setPosts(posts.filter(p => p.id !== id));
    } catch {}
  };

  const addPost = (post) => {
    setPosts([post, ...posts]);
    setShowComposer(false);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <Navbar />
      <div className="main">
        <div className="container" style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2>Scheduled Posts</h2>
            <button className="btn btn-primary" onClick={() => setShowComposer(!showComposer)}>
              {showComposer ? 'Cancel' : '+ New Scheduled Post'}
            </button>
          </div>

          {showComposer && (
            <ScheduledPostComposer onPost={addPost} onCancel={() => setShowComposer(false)} />
          )}

          {loading ? (
            <div className="loading">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="card empty-state">
              <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No scheduled posts</p>
              <p>Schedule a post to be published automatically at a later time.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowComposer(true)}>
                Create your first scheduled post
              </button>
            </div>
          ) : (
            posts.map(p => (
              <div key={p.id} className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--fb-gray)' }}>
                    Scheduled for {formatDate(p.scheduledAt)}
                  </div>
                  <button className="btn btn-danger" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => cancelPost(p.id)}>
                    Cancel
                  </button>
                </div>
                <div className="post-content">{p.content}</div>
                {p.image && (
                  <img src={p.image} alt="" style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
