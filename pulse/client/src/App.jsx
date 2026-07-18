import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useOnlineStatus from './hooks/useOnlineStatus';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ChatList from './pages/ChatList';
import Onboarding from './components/Onboarding';
import Splash from './components/Splash';
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
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <OnboardingGate>
            <Routes>
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
              <Route path="/" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
              <Route path="/chat/:conversationId" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
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
