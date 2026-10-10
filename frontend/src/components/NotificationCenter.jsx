import React, { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Video,
  PhoneMissed,
  Calendar,
  CalendarX,
  FileText,
  Clock,
  X,
  Sparkles,
  PhoneCall,
  Check,
  Shield,
  Volume2
} from 'lucide-react';
import { browserNotifier } from '../utils/browserNotifications';

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkAsRead,
  onMarkAllAsRead,
  currentUserRole = 'patient',
  onActionClick,
}) {
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'calls' | 'appointments'
  const [browserPerm, setBrowserPerm] = useState(browserNotifier.getPermission());

  if (!isOpen) return null;

  const handleRequestBrowserPerm = async () => {
    const res = await browserNotifier.requestPermission();
    setBrowserPerm(res);
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filterTab === 'unread') return !notif.isRead;
    if (filterTab === 'calls') return notif.type.includes('call');
    if (filterTab === 'appointments') return notif.type.includes('appointment');
    return true;
  });

  const getIconForType = (type) => {
    switch (type) {
      case 'incoming_call':
        return <Video size={18} color="#10b981" />;
      case 'missed_call':
        return <PhoneMissed size={18} color="#f43f5e" />;
      case 'appointment_confirmed':
        return <Calendar size={18} color="#38bdf8" />;
      case 'appointment_cancelled':
        return <CalendarX size={18} color="#ef4444" />;
      case 'consultation_completed':
        return <FileText size={18} color="#34d399" />;
      default:
        return <Bell size={18} color="#14b8a6" />;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return 'Recent';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 99999, background: 'rgba(2, 6, 23, 0.65)' }}>
      <div
        className="notification-center-drawer glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          width: '440px',
          maxWidth: '94vw',
          maxHeight: '90vh',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(20, 184, 166, 0.2)',
          border: '1px solid rgba(20, 184, 166, 0.35)',
          overflow: 'hidden',
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.85)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(20, 184, 166, 0.15)',
                color: '#14b8a6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                Notifications
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadCount > 0 && (
              <button
                id="btn-mark-all-read"
                className="btn btn-secondary"
                style={{ padding: '5px 12px', fontSize: '0.76rem', gap: '5px' }}
                onClick={onMarkAllAllRead || onMarkAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="btn-icon"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Browser Notification Permission Banner if not enabled */}
        {browserPerm === 'default' && (
          <div
            style={{
              padding: '10px 18px',
              background: 'rgba(56, 189, 248, 0.1)',
              borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: '#38bdf8',
            }}
          >
            <span>Enable desktop alerts for incoming calls?</span>
            <button
              onClick={handleRequestBrowserPerm}
              className="btn btn-primary"
              style={{ padding: '4px 10px', fontSize: '0.74rem' }}
            >
              Enable
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '10px 18px',
            background: 'rgba(15, 23, 42, 0.5)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {['all', 'unread', 'calls', 'appointments'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                cursor: 'pointer',
                background: filterTab === tab ? '#14b8a6' : 'rgba(255, 255, 255, 0.05)',
                color: filterTab === tab ? '#ffffff' : '#94a3b8',
                transition: 'all 0.15s ease',
              }}
            >
              {tab === 'calls' ? 'Calls / Missed' : tab}
            </button>
          ))}
        </div>

        {/* Notifications Scroll List */}
        <div
          style={{
            overflowY: 'auto',
            maxHeight: '60vh',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {filteredNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <Bell size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
              <p style={{ fontSize: '0.9rem', margin: 0 }}>No notifications found</p>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {filterTab === 'unread' ? 'You have read all your alerts.' : 'New alerts will appear here in real time.'}
              </span>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => onMarkAsRead && onMarkAsRead(notif.id)}
                style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: notif.isRead ? 'rgba(255, 255, 255, 0.02)' : 'rgba(20, 184, 166, 0.08)',
                  border: notif.isRead
                    ? '1px solid rgba(255, 255, 255, 0.05)'
                    : '1px solid rgba(20, 184, 166, 0.3)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.15s ease, background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', gap: '12px' }}>
                  {/* Left Icon Pill */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getIconForType(notif.type)}
                  </div>

                  {/* Text Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                        {notif.title}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {formatTime(notif.createdAt)}
                        </span>
                        {!notif.isRead && (
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              backgroundColor: '#14b8a6',
                              display: 'inline-block',
                            }}
                          />
                        )}
                      </div>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '4px 0 6px', lineHeight: '1.4' }}>
                      {notif.message}
                    </p>

                    {/* Footer Pill & Action Button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                      {notif.appointmentId && (
                        <span
                          className="health-id-pill"
                          style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        >
                          {notif.appointmentId}
                        </span>
                      )}

                      {/* Direct quick action for missed call */}
                      {notif.type === 'missed_call' && onActionClick && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onActionClick(notif);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '3px 10px', fontSize: '0.74rem', gap: '4px' }}
                        >
                          <PhoneCall size={12} />
                          <span>{currentUserRole === 'patient' ? 'Retry Call' : 'Review'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
