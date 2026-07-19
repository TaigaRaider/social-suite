import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useOnlineStatus from './hooks/useOnlineStatus';
import Navbar from './components/Navbar';
import Onboarding from './components/Onboarding';
import Splash from './components/Splash';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Feed from './pages/Feed';
import Thread from './pages/Thread';
import Profile from './pages/Profile';
import Bookmarks from './pages/Bookmarks';
import Explore from './pages/Explore';
import Notifications from './pages/Notifications';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookieConsent from './components/CookieConsent';
import { useState, useCallback } from 'react';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (user) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('whisper_onboarded');
  });
  useKeyboardShortcuts();
  useOnlineStatus();

  return (
    <>
      {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}
      <CookieConsent />
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><div className="app-layout"><Navbar /><main className="main-content"><Feed /></main></div></ProtectedRoute>} />
        <Route path="/thread/:id" element={<ProtectedRoute><div className="app-layout"><Navbar /><main className="main-content"><Thread /></main></div></ProtectedRoute>} />
        <Route path="/profile/:id" element={<ProtectedRoute><div className="app-layout"><Navbar /><main className="main-content"><Profile /></main></div></ProtectedRoute>} />
        <Route path="/bookmarks" element={<ProtectedRoute><div className="app-layout"><Navbar /><main className="main-content"><Bookmarks /></main></div></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><div className="app-layout"><Navbar /><main className="main-content"><Notifications /></main></div></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute><div className="app-layout"><Navbar /><main className="main-content"><Explore /></main></div></ProtectedRoute>} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
    </>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem('whisper_splash_seen'));
  const handleSplashComplete = useCallback(() => {
    localStorage.setItem('whisper_splash_seen', '1');
    setShowSplash(false);
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          {showSplash && <Splash onComplete={handleSplashComplete} />}
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
