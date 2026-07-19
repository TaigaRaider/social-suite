import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Navbar from '../components/Navbar';

function StatCard({ label, value }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--fb-blue)' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--fb-gray)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.adminReports(filter).then(setReports).catch(() => setReports([])).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateReport = async (id, status) => {
    await api.adminUpdateReport(id, status);
    setReports(reports.filter(r => r.id !== id));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['pending', 'reviewed', 'resolved', 'dismissed'].map(s => (
          <button key={s} className={`btn ${filter === s ? 'btn-primary' : 'btn-gray'}`} onClick={() => setFilter(s)}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {reports.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No reports</p>
          <p>No {filter !== 'pending' ? filter : ''} reports found.</p>
        </div>
      ) : (
        reports.map(r => (
          <div key={r.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Report #{r.id}</div>
                <div style={{ fontSize: 13, color: 'var(--fb-gray)', marginTop: 2 }}>
                  By @{r.reporterUsername} &middot; {new Date(r.createdAt).toLocaleDateString()}
                </div>
                {r.reason && (
                  <div style={{ fontSize: 13, marginTop: 6, color: 'var(--fb-dark)' }}>{r.reason}</div>
                )}
                <div style={{ marginTop: 6 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                    background: r.status === 'pending' ? '#fff3cd' : r.status === 'resolved' ? '#d4edda' : '#e2e3e5',
                    color: r.status === 'pending' ? '#856404' : r.status === 'resolved' ? '#155724' : '#383d41',
                  }}>{r.status}</span>
                </div>
              </div>
              {r.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => updateReport(r.id, 'resolved')}>Resolve</button>
                  <button className="btn btn-gray" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => updateReport(r.id, 'reviewed')}>Review</button>
                  <button className="btn btn-danger" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => updateReport(r.id, 'dismissed')}>Dismiss</button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.adminUsers(page).then(data => {
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.pages);
    }).catch(() => setUsers([])).finally(() => setLoading(false));
  }, [page]);

  const toggleBan = async (user) => {
    await api.adminBanUser(user.id);
    setUsers(users.map(u => u.id === user.id ? { ...u, lockedUntil: user.lockedUntil ? null : 'banned' } : u));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--fb-gray)', marginBottom: 12 }}>
        {total} users &middot; Page {page} of {totalPages}
      </div>
      {users.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No users</p>
          <p>No users found.</p>
        </div>
      ) : (
        users.map(u => {
          const isBanned = u.lockedUntil && new Date(u.lockedUntil) > new Date();
          return (
            <div key={u.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar">{(u.firstName?.[0] || '') + (u.lastName?.[0] || '') || u.username?.[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{u.firstName} {u.lastName}</div>
                  <div style={{ fontSize: 12, color: 'var(--fb-gray)' }}>@{u.username} &middot; {u.email}</div>
                  <div style={{ fontSize: 12, color: 'var(--fb-gray)' }}>
                    Role: {u.role} &middot; Joined {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className={`btn ${isBanned ? 'btn-success' : 'btn-danger'}`}
                  style={{ fontSize: 12, padding: '6px 14px', whiteSpace: 'nowrap' }}
                  onClick={() => toggleBan(u)}
                >
                  {isBanned ? 'Unban' : 'Ban'}
                </button>
              </div>
            </div>
          );
        })
      )}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="btn btn-gray" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <button className="btn btn-gray" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </>
  );
}

function PostsTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFeed().then(setPosts).catch(() => setPosts([])).finally(() => setLoading(false));
  }, []);

  const deletePost = async (id) => {
    await api.adminDeletePost(id);
    setPosts(posts.filter(p => p.id !== id));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <>
      {posts.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No posts</p>
          <p>No posts to moderate.</p>
        </div>
      ) : (
        posts.map(p => (
          <div key={p.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div className="avatar avatar-sm">{(p.firstName?.[0] || '') + (p.lastName?.[0] || '') || p.username?.[0]}</div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{p.firstName || ''} {p.lastName || ''} @{p.username}</span>
                </div>
                {p.content && (
                  <div style={{ fontSize: 14, lineHeight: 1.4, marginBottom: 6, whiteSpace: 'pre-wrap' }}>
                    {p.content.length > 200 ? p.content.slice(0, 200) + '...' : p.content}
                  </div>
                )}
                {p.image && (
                  <img src={p.image} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }} />
                )}
                <div style={{ fontSize: 12, color: 'var(--fb-gray)' }}>
                  {new Date(p.createdAt).toLocaleString()} &middot; {p.likes || 0} likes &middot; {p.commentCount || 0} comments
                </div>
              </div>
              <button className="btn btn-danger" style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0 }} onClick={() => deletePost(p.id)}>
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}

const TABS = [
  { key: 'stats', label: 'Stats' },
  { key: 'reports', label: 'Reports' },
  { key: 'users', label: 'Users' },
  { key: 'posts', label: 'Posts' },
];

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    api.adminStats().then(setStats).finally(() => setLoadingStats(false));
  }, []);

  if (!user || user.role !== 'admin') {
    return (
      <>
        <Navbar />
        <div className="main">
          <div className="container" style={{ maxWidth: 500, textAlign: 'center', paddingTop: 60 }}>
            <div className="card" style={{ padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>&#128274;</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Access Denied</h2>
              <p style={{ color: 'var(--fb-gray)', fontSize: 14 }}>You do not have permission to view this page.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="main">
        <div className="container" style={{ maxWidth: 800 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Admin Dashboard</h1>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {TABS.map(t => (
              <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-gray'}`} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'stats' && (
            loadingStats ? (
              <div className="loading">Loading...</div>
            ) : stats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <StatCard label="Total Users" value={stats.totalUsers} />
                <StatCard label="Total Posts" value={stats.totalPosts} />
                <StatCard label="Pending Reports" value={stats.pendingReports} />
                <StatCard label="Posts Today" value={stats.postsToday} />
              </div>
            ) : (
              <div className="empty-state">
                <p>Failed to load stats.</p>
              </div>
            )
          )}

          {tab === 'reports' && <ReportsTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'posts' && <PostsTab />}
        </div>
      </div>
    </>
  );
}
