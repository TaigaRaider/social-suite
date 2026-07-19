import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';
import { init as initCrypto, generateLocalIdentity, uploadKeyBundle, isE2EEEnabled } from '../crypto/signalProtocol.js';
import { generateOneTimePreKeys } from '../crypto/keyGeneration.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('wave_token');
    if (token) {
      api.auth.me()
        .then(u => {
          setUser(u);
          setLoading(false);
          initCrypto('http://localhost:3004/api');
          if (!isE2EEEnabled()) {
            generateLocalIdentity();
          }
          uploadKeyBundle(token).catch(() => {});
          const checkPreKeys = async () => {
            try {
              const bundle = await api.crypto.getPeerBundle(u.id);
              if (!bundle.oneTimePreKeys || bundle.oneTimePreKeys.length < 10) {
                const newKeys = generateOneTimePreKeys(50);
                await api.crypto.replenishPreKeys(newKeys);
              }
            } catch (e) { /* ignore */ }
          };
          checkPreKeys();
        })
        .catch(() => { localStorage.removeItem('wave_token'); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { token, user } = await api.auth.login({ email, password });
    localStorage.setItem('wave_token', token);
    setUser(user);
    initCrypto('http://localhost:3004/api');
    if (!isE2EEEnabled()) {
      generateLocalIdentity();
    }
    uploadKeyBundle(token).catch(() => {});
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
    return user;
  };

  const register = async (data) => {
    const { token, user } = await api.auth.register(data);
    localStorage.setItem('wave_token', token);
    setUser(user);
    initCrypto('http://localhost:3004/api');
    if (!isE2EEEnabled()) {
      generateLocalIdentity();
    }
    uploadKeyBundle(token).catch(() => {});
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
