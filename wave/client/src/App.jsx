import { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useOnlineStatus from './hooks/useOnlineStatus';
import { io as socketIO } from 'socket.io-client';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import NewGroup from './pages/NewGroup';
import Onboarding from './components/Onboarding';
import DeviceManager from './components/DeviceManager';
import ContactImporter from './components/ContactImporter';
import CallManager from './components/CallManager';
import { api } from './api';
import Splash from './components/Splash';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (user) return <Navigate to="/" />;
  return children;
}

function AppContent() {
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('wave_onboarded')
  );
  const { user } = useAuth();
  const [appSocket, setAppSocket] = useState(null);
  useKeyboardShortcuts();
  useOnlineStatus();

  useEffect(() => {
    if (!user) {
      setAppSocket(null);
      return;
    }
    const token = localStorage.getItem('wave_token');
    if (!token) return;
    const socket = socketIO('http://localhost:3004', { auth: { token } });
    setAppSocket(socket);
    return () => {
      socket.disconnect();
      setAppSocket(null);
    };
  }, [user]);

  return (
    <>
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
      <BrowserRouter>
        {appSocket && <CallManager socket={appSocket} user={user} />}
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/group/:groupId" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/new-group" element={<ProtectedRoute><NewGroup /></ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute><ContactImporter api={api} onClose={() => window.history.back()} /></ProtectedRoute>} />
          <Route path="/devices" element={<ProtectedRoute><DeviceManager api={api} /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem('wave_splash_seen'));
  const handleSplashComplete = useCallback(() => {
    localStorage.setItem('wave_splash_seen', '1');
    setShowSplash(false);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        {showSplash && <Splash onComplete={handleSplashComplete} />}
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
