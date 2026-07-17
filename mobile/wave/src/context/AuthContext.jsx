import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('wave_auth');
        if (saved) {
          const parsed = JSON.parse(saved);
          setToken(parsed.token);
          const profile = await api.getProfile(parsed.token);
          setUser(profile.user || profile);
        }
      } catch {
        await AsyncStorage.removeItem('wave_auth');
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password });
    await AsyncStorage.setItem('wave_auth', JSON.stringify({ token: data.token }));
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const data = await api.signup({ name, email, password });
    await AsyncStorage.setItem('wave_auth', JSON.stringify({ token: data.token }));
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('wave_auth');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
