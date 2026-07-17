import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>nexus</h1>
          <p>Log in to connect with friends and the world around you.</p>
        </div>
        {error && <div style={{ color: 'var(--fb-red)', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="btn btn-primary btn-full" disabled={loading} type="submit" style={{ padding: '14px', fontSize: 18 }}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        <div className="auth-divider" />
        <div style={{ textAlign: 'center' }}>
          <Link to="/signup">
            <button className="btn btn-success" style={{ padding: '12px 24px', fontSize: 16 }}>Create new account</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
