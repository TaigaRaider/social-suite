import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Navbar from '../components/Navbar';

export default function Analytics() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState(null);
  const [trends, setTrends] = useState([]);
  const [topPosts, setTopPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    Promise.all([
      api.getAnalyticsInsights(),
      api.getAnalyticsTrends(),
      api.getAnalyticsTopPosts(),
    ])
      .then(([ins, tr, tp]) => {
        setInsights(ins);
        setTrends(tr.trends || []);
        setTopPosts(tp.posts || []);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load analytics');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [navigate]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="main">
          <div className="container">
            <div className="loading" style={{ minHeight: '60vh' }}>Loading analytics...</div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="main">
          <div className="container">
            <div className="card empty-state">
              <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Error</p>
              <p>{error}</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>Retry</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const maxViews = Math.max(...trends.map(t => t.views), 1);

  return (
    <>
      <Navbar />
      <div className="main">
        <div className="container">
          <h2 style={{ marginBottom: 16, fontSize: 22, fontWeight: 700 }}>Analytics Dashboard</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
            <StatCard label="Posts" value={insights?.postCount ?? 0} />
            <StatCard label="Total Views" value={insights?.totalViews ?? 0} />
            <StatCard label="Total Likes" value={insights?.totalLikes ?? 0} />
            <StatCard label="Total Comments" value={insights?.totalComments ?? 0} />
            <StatCard label="Avg Engagement" value={`${insights?.avgEngagement ?? 0}%`} />
          </div>

          {trends.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Trends</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, padding: '0 4px' }}>
                {trends.map((t, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 11, color: 'var(--fb-gray)' }}>{t.views}</div>
                    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 120, width: '100%' }}>
                      <div
                        style={{
                          flex: 1,
                          background: 'var(--fb-blue)',
                          borderRadius: '3px 3px 0 0',
                          height: `${(t.views / maxViews) * 100}%`,
                          minHeight: 2,
                          opacity: 0.9,
                        }}
                        title={`Views: ${t.views}`}
                      />
                      <div
                        style={{
                          flex: 1,
                          background: 'var(--fb-green)',
                          borderRadius: '3px 3px 0 0',
                          height: `${(t.likes / maxViews) * 100}%`,
                          minHeight: 2,
                          opacity: 0.9,
                        }}
                        title={`Likes: ${t.likes}`}
                      />
                      <div
                        style={{
                          flex: 1,
                          background: 'var(--fb-red)',
                          borderRadius: '3px 3px 0 0',
                          height: `${(t.comments / maxViews) * 100}%`,
                          minHeight: 2,
                          opacity: 0.9,
                        }}
                        title={`Comments: ${t.comments}`}
                      />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fb-gray)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                      {t.date?.slice(5)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, fontSize: 12, color: 'var(--fb-gray)' }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--fb-blue)', marginRight: 4, verticalAlign: 'middle' }} />Views</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--fb-green)', marginRight: 4, verticalAlign: 'middle' }} />Likes</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--fb-red)', marginRight: 4, verticalAlign: 'middle' }} />Comments</span>
              </div>
            </div>
          )}

          <div className="card">
            <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 700 }}>Top Posts</h3>
            {topPosts.length === 0 ? (
              <div className="empty-state">No posts to show yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--fb-border)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--fb-gray)' }}>Post</th>
                      <th style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--fb-gray)', textAlign: 'right' }}>Views</th>
                      <th style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--fb-gray)', textAlign: 'right' }}>Likes</th>
                      <th style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--fb-gray)', textAlign: 'right' }}>Comments</th>
                      <th style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--fb-gray)', textAlign: 'right' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPosts.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--fb-border)' }}>
                        <td style={{ padding: '10px 8px', maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.content}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{p.views}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{p.likes}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>{p.comments}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>{p.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--fb-blue)' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--fb-gray)', marginTop: 4 }}>{label}</div>
    </div>
  );
}
