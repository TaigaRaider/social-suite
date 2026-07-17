import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const data = await api.getMe();
        setUser(data.user || data);
      }
    } catch {
      await AsyncStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const data = await api.login(email, password);
    setUser(data.user || data);
    return data;
  }

  async function signup(name, email, password) {
    const data = await api.signup(name, email, password);
    setUser(data.user || data);
    return data;
  }

  async function logout() {
    await api.logout();
    setUser(null);
  }

  function refreshUser() {
    return checkAuth();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
