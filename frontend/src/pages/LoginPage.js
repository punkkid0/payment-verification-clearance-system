import React, { useState } from 'react';
import { authService } from '../services/api';

const LoginPage = ({ onLogin }) => {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login form state
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    student_id: '',
  });

  // ── Login ──────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login(loginForm.username, loginForm.password);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(token, user);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (registerForm.password !== registerForm.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    if (registerForm.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Za-z]/.test(registerForm.password) || !/[0-9]/.test(registerForm.password)) {
      setError('Password must contain at least one letter and one number');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: registerForm.full_name,
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password,
      };

      const res = await authService.register(payload);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(token, user);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">🎓</div>
          <h1 className="login-title">ClearanceHub</h1>
          <p className="login-subtitle">Payment Verification &amp; Clearance System</p>
        </div>

        {/* Tab Switcher */}
        <div className="tab-group">
          <button
            id="tab-login"
            className={`tab-btn${tab === 'login' ? ' active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Sign In
          </button>
          <button
            id="tab-register"
            className={`tab-btn${tab === 'register' ? ' active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error mb-4 animate-slideUp">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                required
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? (
                <><div className="spinner spinner-sm" /> Signing in…</>
              ) : (
                'Sign In'
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Don't have an account?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                onClick={() => { setTab('register'); setError(''); }}
              >
                Register here
              </button>
            </p>
          </form>
        )}

        {/* ── REGISTER FORM ── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Student accounts only. Admin access is provisioned by the school.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-fullname">Full Name</label>
              <input
                id="reg-fullname"
                type="text"
                className="form-input"
                placeholder="e.g. Kwame Asante"
                value={registerForm.full_name}
                onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-username">Username</label>
                <input
                  id="reg-username"
                  type="text"
                  className="form-input"
                  placeholder="e.g. kwame01"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email</label>
                <input
                  id="reg-email"
                  type="email"
                  className="form-input"
                  placeholder="e.g. kwame@school.edu"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-password">Password</label>
                <input
                  id="reg-password"
                  type="password"
                  className="form-input"
                  placeholder="Min 8 chars, letter + number"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
                <input
                  id="reg-confirm"
                  type="password"
                  className="form-input"
                  placeholder="Repeat password"
                  value={registerForm.confirm_password}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirm_password: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              id="register-submit"
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={loading}
              style={{ marginTop: '6px' }}
            >
              {loading ? (
                <><div className="spinner spinner-sm" /> Creating account…</>
              ) : (
                'Create Account'
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                onClick={() => { setTab('login'); setError(''); }}
              >
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
