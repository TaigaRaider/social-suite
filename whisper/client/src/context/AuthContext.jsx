import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('whisper_token');
    if (token) {
      api.getMe().then(u => { setUser(u); localStorage.setItem('whisper_user_id', u.id); setLoading(false); }).catch(() => { localStorage.removeItem('whisper_token'); localStorage.removeItem('whisper_user_id'); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (loginStr, password) => {
    const { token, user: u } = await api.login(loginStr, password);
    localStorage.setItem('whisper_token', token);
    localStorage.setItem('whisper_user_id', u.id);
    setUser(u);
    return u;
  };

  const register = async (data) => {
    const { token, user: u } = await api.register(data);
    localStorage.setItem('whisper_token', token);
    localStorage.setItem('whisper_user_id', u.id);
    setUser(u);
    return u;
  };

  const logout = () => {
    localStorage.removeItem('whisper_token');
    localStorage.removeItem('whisper_user_id');
    setUser(null);
  };

  const updateUser = (u) => setUser(u);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
