import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.username.length < 3) return setError('Username must be at least 3 characters');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
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
        <div className="auth-logo">Whisper</div>
        <div className="auth-subtitle">Create your account</div>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>First Name</label>
              <input className="form-input" type="text" value={form.firstName} onChange={update('firstName')} placeholder="First" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Last Name</label>
              <input className="form-input" type="text" value={form.lastName} onChange={update('lastName')} placeholder="Last" />
            </div>
          </div>
          <div className="form-group">
            <label>Username</label>
            <input className="form-input" type="text" value={form.username} onChange={update('username')} placeholder="Choose a username" required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input className="form-input" type="email" value={form.email} onChange={update('email')} placeholder="Enter email" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="form-input" type="password" value={form.password} onChange={update('password')} placeholder="At least 6 characters" required />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
