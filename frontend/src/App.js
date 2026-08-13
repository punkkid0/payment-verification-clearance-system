import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import './App.css';

// Components
import Navbar from './components/Navbar';
import InstallPrompt from './components/InstallPrompt';

// Pages
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import StudentProfile from './pages/StudentProfile';

// Existing components (now redesigned)
import StudentClearanceRequest from './StudentClearanceRequest';
import AdminDashboard from './AdminDashboard';
import AdminLedger from './AdminLedger';
import { authService } from './services/api';

// ── Role Guards ────────────────────────────────────────────────
const AdminRoute = ({ user, isAuthenticated, children }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'admin') return <Navigate to="/student" replace />;
  return children;
};

const StudentRoute = ({ user, isAuthenticated, children }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
};

// ── Layout wrapper for authenticated pages ────────────────────
const AppLayout = ({ user, onLogout, theme, onToggleTheme, children }) => (
  <div className="App">
    <Navbar user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} />
    <main className="app-main">
      <div className="page-content">{children}</div>
    </main>
  </div>
);

// ── Main App ───────────────────────────────────────────────────
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  // Apply theme to <html> element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  // Restore and verify session from localStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      if (!token || !savedUser) {
        setLoading(false);
        return;
      }
      try {
        const res = await authService.verifyToken();
        const verifiedUser = res.data.user || JSON.parse(savedUser);
        setIsAuthenticated(true);
        setUser(verifiedUser);
        localStorage.setItem('user', JSON.stringify(verifiedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  // Update user in state + localStorage after profile edit
  const handleUserUpdate = (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(merged));
    setUser(merged);
  };

  // Global loading screen
  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>Loading ClearanceHub…</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* ── Public: Login ─────────────────────────────── */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={user?.role === 'admin' ? '/admin' : '/student'} replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />

        {/* ── Student Routes ─────────────────────────────── */}
        <Route
          path="/student"
          element={
            <StudentRoute user={user} isAuthenticated={isAuthenticated}>
              <AppLayout user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
                <StudentDashboard user={user} />
              </AppLayout>
            </StudentRoute>
          }
        />
        <Route
          path="/student/clearance"
          element={
            <StudentRoute user={user} isAuthenticated={isAuthenticated}>
              <AppLayout user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
                <StudentClearanceRequest />
              </AppLayout>
            </StudentRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <StudentRoute user={user} isAuthenticated={isAuthenticated}>
              <AppLayout user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
                <StudentProfile user={user} onUserUpdate={handleUserUpdate} />
              </AppLayout>
            </StudentRoute>
          }
        />

        {/* ── Admin Routes ──────────────────────────────── */}
        <Route
          path="/admin"
          element={
            <AdminRoute user={user} isAuthenticated={isAuthenticated}>
              <AppLayout user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
                <AdminDashboard />
              </AppLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/ledger"
          element={
            <AdminRoute user={user} isAuthenticated={isAuthenticated}>
              <AppLayout user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
                <AdminLedger />
              </AppLayout>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/review/:id"
          element={
            <AdminRoute user={user} isAuthenticated={isAuthenticated}>
              <AppLayout user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}>
                <AdminDashboard />
              </AppLayout>
            </AdminRoute>
          }
        />

        {/* ── Root redirect ─────────────────────────────── */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to={user?.role === 'admin' ? '/admin' : '/student'} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* ── 404 catch-all ─────────────────────────────── */}
        <Route
          path="*"
          element={
            <Navigate to={isAuthenticated ? (user?.role === 'admin' ? '/admin' : '/student') : '/login'} replace />
          }
        />
      </Routes>
      <InstallPrompt />
    </Router>
  );
}

export default App;
