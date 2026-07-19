import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMe().then(u => { setUser(u); setLoading(false); }).catch(() => { setLoading(false); });
  }, []);

  const login = async (loginStr, password) => {
    const { user: u } = await api.login(loginStr, password);
    setUser(u);
    return u;
  };

  const register = async (data) => {
    const { user: u } = await api.register(data);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await api.logout().catch(() => {});
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
