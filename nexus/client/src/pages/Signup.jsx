import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
        <div className="auth-header">
          <h1>nexus</h1>
          <p>Create a new account</p>
        </div>
        {error && <div style={{ color: 'var(--fb-red)', fontSize: 13, marginBottom: 8, textAlign: 'center' }}>{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input placeholder="First name" value={form.firstName} onChange={update('firstName')} required />
            <input placeholder="Last name" value={form.lastName} onChange={update('lastName')} required />
          </div>
          <input placeholder="Username" value={form.username} onChange={update('username')} required />
          <input type="email" placeholder="Email address" value={form.email} onChange={update('email')} required />
          <input type="password" placeholder="New password" value={form.password} onChange={update('password')} required minLength={4} />
          <button className="btn btn-success btn-full" disabled={loading} type="submit" style={{ padding: '14px', fontSize: 18 }}>
            {loading ? 'Creating...' : 'Sign Up'}
          </button>
        </form>
        <div className="auth-switch">
          <Link to="/login">Already have an account? Log in</Link>
        </div>
      </div>
    </div>
  );
}
