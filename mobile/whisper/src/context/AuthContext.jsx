import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const data = await api.getMe();
        setUser(data.user || data);
      }
    } catch (e) {
      await AsyncStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await api.login(email, password);
    await AsyncStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const signup = async (name, username, email, password) => {
    const data = await api.signup(name, username, email, password);
    await AsyncStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user || data);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
