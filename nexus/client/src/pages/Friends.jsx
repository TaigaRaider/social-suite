import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Navbar from '../components/Navbar';

export default function Friends() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getFriends(), api.getFriendRequests(), api.getSuggestions()])
      .then(([f, r, s]) => { setFriends(f); setRequests(r); setSuggestions(s); })
      .finally(() => setLoading(false));
  }, []);

  const acceptRequest = async (id) => {
    try {
      await api.acceptFriend(id);
      setRequests(requests.filter(r => r.id !== id));
      const updated = await api.getFriends();
      setFriends(updated);
    } catch {}
  };

  const declineRequest = async (id) => {
    try {
      await api.declineFriend(id);
      setRequests(requests.filter(r => r.id !== id));
    } catch {}
  };

  const sendRequest = async (userId) => {
    try {
      await api.sendFriendRequest(userId);
      setSuggestions(suggestions.filter(s => s.id !== userId));
    } catch {}
  };

  const removeFriend = async (userId) => {
    if (confirm('Remove this friend?')) {
      try {
        await api.removeFriend(userId);
        setFriends(friends.filter(f => f.id !== userId));
      } catch {}
    }
  };

  const initials = (u) => (u.firstName?.[0] || '') + (u.lastName?.[0] || '') || u.username?.[0] || '?';

  return (
    <>
      <Navbar />
      <div className="main">
        <div className="container" style={{ maxWidth: 680 }}>
          {loading ? <div className="loading">Loading...</div> : (
            <>
              {requests.length > 0 && (
                <div className="card">
                  <h3 style={{ marginBottom: 12 }}>Friend Requests ({requests.length})</h3>
                  {requests.map(r => (
                    <div key={r.id} className="friend-card">
                      <div className="avatar">{initials(r)}</div>
                      <div className="friend-card-info">
                        <div className="friend-card-name">{r.firstName} {r.lastName}</div>
                        <div className="friend-card-status">@{r.username}</div>
                      </div>
                      <div className="friend-card-actions">
                        <button className="btn btn-primary" style={{ padding: '6px 16px' }} onClick={() => acceptRequest(r.id)}>Confirm</button>
                        <button className="btn btn-gray" style={{ padding: '6px 16px' }} onClick={() => declineRequest(r.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="card">
                <h3 style={{ marginBottom: 12 }}>All Friends ({friends.length})</h3>
                {friends.length === 0 && <div className="empty-state">No friends yet</div>}
                {friends.map(f => (
                  <div key={f.id} className="friend-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/profile/${f.id}`)}>
                    <div className="avatar">{initials(f)}</div>
                    <div className="friend-card-info">
                      <div className="friend-card-name">{f.firstName} {f.lastName}</div>
                      <div className="friend-card-status">@{f.username}</div>
                    </div>
                    <button className="btn btn-gray" style={{ padding: '6px 12px', fontSize: 13 }} onClick={(e) => { e.stopPropagation(); removeFriend(f.id); }}>Remove</button>
                  </div>
                ))}
              </div>

              {suggestions.length > 0 && (
                <div className="card">
                  <h3 style={{ marginBottom: 12 }}>People you may know</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                    {suggestions.map(s => (
                      <div key={s.id} className="friend-suggestion card">
                        <div className="avatar-lg">{initials(s)}</div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{s.firstName} {s.lastName}</div>
                        <div style={{ color: 'var(--fb-gray)', fontSize: 12 }}>@{s.username}</div>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => sendRequest(s.id)}>Add Friend</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
