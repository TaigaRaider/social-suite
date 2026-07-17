import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const [form, setForm] = useState({ username: '', email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) return setError('Username, email and password are required');
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">Pulse</div>
        <p className="auth-subtitle">Create your account and start messaging.</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>First Name</label>
              <input type="text" name="firstName" placeholder="First" value={form.firstName} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Last Name</label>
              <input type="text" name="lastName" placeholder="Last" value={form.lastName} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Username</label>
            <input type="text" name="username" placeholder="Choose a username" value={form.username} onChange={handleChange} autoFocus />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" placeholder="Create a password" value={form.password} onChange={handleChange} />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
