import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Feed from './pages/Feed';
import Thread from './pages/Thread';
import Profile from './pages/Profile';
import Bookmarks from './pages/Bookmarks';
import Explore from './pages/Explore';
import Notifications from './pages/Notifications';

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
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><div className="app-layout"><Navbar /><main className="main-content"><Feed /></main></div></ProtectedRoute>} />
      <Route path="/thread/:id" element={<ProtectedRoute><div className="app-layout"><Navbar /><main className="main-content"><Thread /></main></div></ProtectedRoute>} />
      <Route path="/profile/:id" element={<ProtectedRoute><div className="app-layout"><Navbar /><main className="main-content"><Profile /></main></div></ProtectedRoute>} />
      <Route path="/bookmarks" element={<ProtectedRoute><div className="app-layout"><Navbar /><main className="main-content"><Bookmarks /></main></div></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><div className="app-layout"><Navbar /><main className="main-content"><Notifications /></main></div></ProtectedRoute>} />
      <Route path="/explore" element={<ProtectedRoute><div className="app-layout"><Navbar /><main className="main-content"><Explore /></main></div></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
