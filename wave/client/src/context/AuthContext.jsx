import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('wave_token');
    if (token) {
      api.auth.me()
        .then(u => { setUser(u); setLoading(false); })
        .catch(() => { localStorage.removeItem('wave_token'); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { token, user } = await api.auth.login({ email, password });
    localStorage.setItem('wave_token', token);
    setUser(user);
    return user;
  };

  const register = async (data) => {
    const { token, user } = await api.auth.register(data);
    localStorage.setItem('wave_token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('wave_token');
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
  return useContext(AuthContext);
}
