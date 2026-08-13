import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import SecureImage from './SecureImage';

const Navbar = ({ user, onLogout, theme, onToggleTheme }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
    setMenuOpen(false);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const isAdmin = user?.role === 'admin';
  const isDark  = theme === 'dark';

  const navLinks = isAdmin ? [
    { to: '/admin', label: '📋 Dashboard', end: true },
    { to: '/admin/ledger', label: '🏦 Ledger', end: false },
  ] : [
    { to: '/student',           label: '🏠 Home',              end: true },
    { to: '/student/clearance', label: '📄 Clearance Request', end: false },
    { to: '/student/profile',   label: '👤 My Profile',        end: false },
  ];

  return (
    <>
      <nav className="navbar">
        {/* Brand */}
        <div className="navbar-brand">
          <div className="navbar-logo">🎓</div>
          <div>
            <div className="navbar-title">ClearanceHub</div>
            <div className="navbar-subtitle">UNICROSS Payment Verification</div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="navbar-nav">
          {navLinks.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right side: theme toggle + user info + logout + hamburger */}
        <div className="navbar-right">
          {/* ── Theme Toggle Switch ── */}
          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
            id="theme-toggle-btn"
          >
            <div className="theme-toggle-thumb">
              {isDark ? '🌙' : '☀️'}
            </div>
          </button>

          {/* ── User Info ── */}
          <div className="navbar-user">
            <div className="navbar-avatar" style={{
              overflow: user?.avatar_url ? 'hidden' : 'visible',
              padding: user?.avatar_url ? 0 : undefined,
            }}>
              {user?.avatar_url ? (
                <SecureImage
                  src={user.avatar_url}
                  alt="Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                getInitials(user?.full_name || user?.username)
              )}
            </div>
            <div className="navbar-user-info">
              <div className="navbar-user-name">
                {user?.full_name || user?.username || 'User'}
              </div>
              <div className="navbar-user-role">
                {isAdmin ? '⚡ Admin' : '🎓 Student'}
              </div>
            </div>
          </div>

          {/* ── Logout ── */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            title="Sign out"
            id="logout-btn"
          >
            Sign Out
          </button>

          {/* ── Hamburger (mobile only) ── */}
          <button
            className={`hamburger${menuOpen ? ' open' : ''}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            id="hamburger-btn"
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </button>
        </div>
      </nav>

      {/* Mobile Dropdown Menu */}
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        {navLinks.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            {label}
          </NavLink>
        ))}

        <div className="mobile-menu-divider" />

        {/* User info in mobile menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px' }}>
          <div className="navbar-avatar" style={{ width: '32px', height: '32px', fontSize: '13px' }}>
            {getInitials(user?.full_name || user?.username)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
              {user?.full_name || user?.username}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {isAdmin ? '⚡ Admin' : '🎓 Student'}
            </div>
          </div>
        </div>

        {/* Theme toggle in mobile menu */}
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px var(--space-4)', background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-primary)', borderRadius: 'var(--radius-md)',
            fontSize: '14px', fontWeight: 500, width: '100%', textAlign: 'left',
          }}
          onClick={onToggleTheme}
        >
          {isDark ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
        </button>

        <button
          className="btn btn-ghost btn-sm"
          onClick={handleLogout}
          style={{ justifyContent: 'flex-start', marginTop: '4px' }}
        >
          ↩ Sign Out
        </button>
      </div>
    </>
  );
};

export default Navbar;
