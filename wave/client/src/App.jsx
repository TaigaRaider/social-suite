import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useOnlineStatus from './hooks/useOnlineStatus';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import NewGroup from './pages/NewGroup';
import Onboarding from './components/Onboarding';
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
  useKeyboardShortcuts();
  useOnlineStatus();

  return (
    <>
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/group/:groupId" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/new-group" element={<ProtectedRoute><NewGroup /></ProtectedRoute>} />
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
