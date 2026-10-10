import React from 'react';
import {
  Stethoscope,
  Search,
  User,
  LogOut,
  RefreshCw,
  Sparkles,
  ArrowRightLeft,
  FileText,
  Home,
  Bell
} from 'lucide-react';

export default function Navbar({
  currentUser,
  backendStatus,
  unreadCount = 0,
  onOpenNotifications,
  onOpenLogin,
  onOpenFindDoctor,
  onOpenMedicalRecords,
  onLogout,
  onSwitchRole,
  onNavigateHome,
}) {
  return (
    <nav className="navbar">
      <div className="container nav-container">
        {/* Brand Logo & Name */}
        <div
          className="brand-wrapper"
          onClick={onNavigateHome}
          style={{ cursor: 'pointer' }}
          title="Return to NEXORA Homepage"
        >
          <div className="brand-logo-icon">
            <Stethoscope size={24} strokeWidth={2.4} />
          </div>
          <div className="brand-info">
            <span className="brand-name">
              NEXORA
              <span
                style={{
                  fontSize: '0.65rem',
                  color: '#14b8a6',
                  border: '1px solid #14b8a6',
                  borderRadius: '4px',
                  padding: '1px 5px',
                  fontWeight: 600,
                  marginLeft: '4px',
                }}
              >
                TELEMED
              </span>
            </span>
            <span className="brand-tagline-mini">Healthcare, Anywhere</span>
          </div>
        </div>

        {/* Center Navigation Links */}
        {!currentUser ? (
          <div className="nav-center">
            <a href="#problem-solution" className="nav-link">Problem & Solution</a>
            <a href="#features" className="nav-link">Platform Pillars</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#system-health" className="nav-link">API Status</a>
          </div>
        ) : (
          <div className="nav-center">
            <button
              className="nav-link-btn"
              onClick={onNavigateHome}
              title="View Public Landing Page"
            >
              <Home size={15} /> Landing Page
            </button>

            {currentUser.role === 'patient' && (
              <>
                <button className="nav-link-btn" onClick={onOpenFindDoctor}>
                  <Search size={15} /> Find Doctor
                </button>
                <button className="nav-link-btn" onClick={onOpenMedicalRecords}>
                  <FileText size={15} /> Medical Records
                </button>
              </>
            )}

            {/* Quick Demo Role Switcher in Nav */}
            <button
              className="nav-link-btn role-switch-btn"
              onClick={() => onSwitchRole(currentUser.role === 'patient' ? 'doctor' : 'patient')}
              title={`Switch directly to ${currentUser.role === 'patient' ? 'Doctor' : 'Patient'} view`}
            >
              <ArrowRightLeft size={14} color="#38bdf8" />
              <span>Switch to {currentUser.role === 'patient' ? 'Doctor' : 'Patient'} Demo</span>
            </button>
          </div>
        )}

        {/* Right Actions & Auth Bar */}
        <div className="nav-actions">
          {/* Server status pill */}
          <div
            className={`server-pill ${backendStatus.online ? 'online' : 'offline'}`}
            title={backendStatus.online ? 'Backend API Active' : 'Connecting to API'}
          >
            <span className="pulse-dot" style={{ backgroundColor: backendStatus.online ? '#10b981' : '#ef4444' }} />
            <span>{backendStatus.online ? 'API Online' : 'Connecting'}</span>
          </div>

          {!currentUser ? (
            <>
              <button
                id="nav-btn-find-doctor"
                className="btn btn-secondary"
                onClick={onOpenFindDoctor}
              >
                <Search size={16} />
                <span>Find Doctor</span>
              </button>

              <button
                id="nav-btn-login"
                className="btn btn-primary"
                onClick={onOpenLogin}
              >
                <User size={16} />
                <span>Login / Demo</span>
              </button>
            </>
          ) : (
            <div className="user-nav-profile" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Notification Bell Button (Phase 8) */}
              <button
                id="nav-btn-notifications"
                className="btn btn-secondary btn-icon-only notif-bell-btn"
                onClick={onOpenNotifications}
                title={`Notifications (${unreadCount} unread)`}
                style={{
                  position: 'relative',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '10px',
                  background: unreadCount > 0 ? 'rgba(20, 184, 166, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                  border: unreadCount > 0 ? '1px solid rgba(20, 184, 166, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: unreadCount > 0 ? '#14b8a6' : '#cbd5e1',
                  cursor: 'pointer',
                }}
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span
                    id="nav-unread-badge"
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      minWidth: '18px',
                      height: '18px',
                      borderRadius: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.8)',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className="user-badge-chip">
                <span className="user-role-tag">
                  {currentUser.role === 'patient' ? 'PATIENT' : 'DOCTOR'}
                </span>
                <span className="user-name-text">
                  {currentUser.role === 'patient' ? 'Ramesh Kumar' : 'Dr. Ananya Sharma'}
                </span>
              </div>

              <button
                className="btn btn-secondary btn-icon-only"
                onClick={onLogout}
                title="Logout / Return to Landing"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
