import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useOnlineStatus from './hooks/useOnlineStatus';
import { io as socketIO } from 'socket.io-client';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ChatList from './pages/ChatList';
import Onboarding from './components/Onboarding';
import Splash from './components/Splash';
import DeviceManager from './components/DeviceManager';
import ContactImporter from './components/ContactImporter';
import CallManager from './components/CallManager';
import { api } from './api';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (user) return <Navigate to="/" />;
  return children;
}

function OnboardingGate({ children }) {
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('pulse_onboarded'));
  if (showOnboarding) return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  return children;
}

function AppInner() {
  useKeyboardShortcuts();
  useOnlineStatus();
  const { user } = useAuth();
  const [appSocket, setAppSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      setAppSocket(null);
      return;
    }
    const token = localStorage.getItem('pulse_token');
    if (!token) return;
    const socket = socketIO('http://localhost:3003', { auth: { token } });
    setAppSocket(socket);
    return () => {
      socket.disconnect();
      setAppSocket(null);
    };
  }, [user]);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <OnboardingGate>
            {appSocket && <CallManager socket={appSocket} user={user} />}
            <Routes>
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
              <Route path="/" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
              <Route path="/chat/:conversationId" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
              <Route path="/contacts" element={<ProtectedRoute><ContactImporter api={api} onClose={() => window.history.back()} /></ProtectedRoute>} />
              <Route path="/devices" element={<ProtectedRoute><DeviceManager api={api} /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </OnboardingGate>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem('pulse_splash_seen'));
  const handleSplashComplete = useCallback(() => {
    localStorage.setItem('pulse_splash_seen', '1');
    setShowSplash(false);
  }, []);

  return (
    <>
      {showSplash && <Splash onComplete={handleSplashComplete} />}
      <AppInner />
    </>
  );
}
