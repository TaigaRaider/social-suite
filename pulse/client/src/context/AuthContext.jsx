import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { init as initCrypto, getLocalIdentity, generateLocalIdentity, uploadKeyBundle } from '../crypto/signalProtocol.js';
import { generateOneTimePreKeys } from '../crypto/keyGeneration.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('pulse_token');
    if (!token) { setLoading(false); return; }
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      localStorage.removeItem('pulse_token');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (email, password) => {
    const { token, user } = await api.login(email, password);
    localStorage.setItem('pulse_token', token);
    setUser(user);
    try {
      initCrypto('http://localhost:3003/api');
      if (!getLocalIdentity()) {
        generateLocalIdentity();
        uploadKeyBundle(token);
      }
      const checkPreKeys = async () => {
        try {
          const bundle = await api.crypto.getPeerBundle(user.id);
          if (!bundle.oneTimePreKeys || bundle.oneTimePreKeys.length < 10) {
            const newKeys = generateOneTimePreKeys(50);
            await api.crypto.replenishPreKeys(newKeys);
          }
        } catch (e) { /* ignore */ }
      };
      checkPreKeys();
    } catch {}
    return user;
  };

  const register = async (data) => {
    const { token, user } = await api.register(data);
    localStorage.setItem('pulse_token', token);
    setUser(user);
    try {
      initCrypto('http://localhost:3003/api');
      if (!getLocalIdentity()) {
        generateLocalIdentity();
        uploadKeyBundle(token);
      }
      const checkPreKeys = async () => {
        try {
          const bundle = await api.crypto.getPeerBundle(user.id);
          if (!bundle.oneTimePreKeys || bundle.oneTimePreKeys.length < 10) {
            const newKeys = generateOneTimePreKeys(50);
            await api.crypto.replenishPreKeys(newKeys);
          }
        } catch (e) { /* ignore */ }
      };
      checkPreKeys();
    } catch {}
    return user;
  };

  const logout = () => {
    localStorage.removeItem('pulse_token');
    setUser(null);
  };

  const updateUser = (data) => setUser(prev => ({ ...prev, ...data }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
