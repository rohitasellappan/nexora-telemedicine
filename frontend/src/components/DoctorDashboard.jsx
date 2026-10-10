import React, { useState } from 'react';
import {
  Stethoscope,
  Users,
  Calendar,
  Clock,
  Video,
  FileText,
  Search,
  Activity,
  CheckCircle2,
  AlertCircle,
  Shield,
  Eye,
  Radio,
  Hospital,
  ArrowRight,
  Filter,
  Sparkles,
  XCircle,
  Check,
  Play,
  Download,
  Film,
  Lock,
  Trash2,
  PhoneOff,
  Bell,
  PhoneMissed
} from 'lucide-react';

export default function DoctorDashboard({
  doctorData,
  appointments = [],
  recordings = [],
  incomingCall = null,
  missedCalls = [],
  notifications = [],
  unreadNotificationsCount = 0,
  onOpenNotifications,
  onAcceptIncomingCall,
  onRejectIncomingCall,
  onJoinConsultation,
  onViewPatientRecords,
  onPlayRecording,
  onDeleteRecording,
  onSwitchToPatientDemo,
  onUpdateStatus
}) {
  const [patientSearch, setPatientSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Upcoming' | 'Completed' | 'Cancelled'

  const assignedPatients = doctorData?.assignedPatients || [];

  // Filter appointments by status tab
  const filteredAppointments = appointments.filter((apt) => {
    if (statusFilter === 'All') return true;
    return apt.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const filteredPatients = assignedPatients.filter((pat) =>
    pat.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    pat.village.toLowerCase().includes(patientSearch.toLowerCase()) ||
    pat.condition.toLowerCase().includes(patientSearch.toLowerCase()) ||
    pat.healthId.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const upcomingCount = appointments.filter((a) => a.status === 'Upcoming').length;
  const completedCount = appointments.filter((a) => a.status === 'Completed').length;
  const cancelledCount = appointments.filter((a) => a.status === 'Cancelled').length;

  return (
    <div className="dashboard-container">
      {/* Top Banner / Clinician Tele-Station Header */}
      <div className="dash-hero-card doctor-hero glass-panel">
        <div className="dash-hero-content">
          <div className="badge badge-primary" style={{ marginBottom: '6px' }}>
            <Sparkles size={13} /> Doctor Tele-Consultation Console
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
            Welcome, <span className="gradient-text">{doctorData?.name || 'Dr. Ananya Sharma, MD'}</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
            <strong>{doctorData?.specialization || 'Cardiologist'}</strong> • {doctorData?.qualification || 'MBBS, MD'} • {doctorData?.hospital || 'AIIMS Tele-Network'}
          </p>
        </div>

        {/* Doctor Status & Kiosks Pill */}
        <div className="dash-hero-actions">
          {incomingCall ? (
            <div className="incoming-call-badge-pill" style={{ cursor: 'pointer' }} onClick={() => onAcceptIncomingCall && onAcceptIncomingCall(incomingCall)}>
              <span className="pulse-dot" style={{ backgroundColor: '#ffffff' }} />
              <span>Incoming Call: {incomingCall.patientName}</span>
            </div>
          ) : (
            <div className="doc-tele-status-pill">
              <span className="pulse-dot" style={{ backgroundColor: '#10b981' }} />
              <span>Tele-Consultation Active & On-Call</span>
            </div>
          )}

          {/* Doctor Notification Center Badge (Phase 8 Requirement 1) */}
          <button
            id="btn-doc-notifications-badge"
            className="btn btn-secondary notif-dash-badge-btn"
            onClick={onOpenNotifications}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              position: 'relative',
              background: unreadNotificationsCount > 0 ? 'rgba(20, 184, 166, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              borderColor: unreadNotificationsCount > 0 ? 'rgba(20, 184, 166, 0.4)' : 'rgba(255, 255, 255, 0.1)',
            }}
            title="Open Notification Center"
          >
            <Bell size={15} color={unreadNotificationsCount > 0 ? '#14b8a6' : '#cbd5e1'} />
            <span style={{ fontSize: '0.84rem' }}>Notifications</span>
            {unreadNotificationsCount > 0 && (
              <span
                id="doc-unread-badge-pill"
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  borderRadius: '10px',
                  padding: '1px 6px',
                  marginLeft: '2px',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                }}
              >
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <div className="license-badge">
            <span>Reg: {doctorData?.registrationNumber || 'MCI-84920'}</span>
          </div>
        </div>
      </div>

      {/* Prominent Incoming Call Alert Banner if doctor has a waiting call */}
      {incomingCall && (
        <div className="incoming-call-banner glass-panel" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
              }}
            >
              <Video size={20} />
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '1.08rem', margin: 0, fontWeight: 700 }}>
                Incoming Video Call from {incomingCall.patientName} ({incomingCall.patientVillage || 'Village Kiosk'})
              </h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.84rem', margin: '3px 0 0' }}>
                Appointment: <strong style={{ color: '#38bdf8' }}>{incomingCall.appointmentId}</strong> • Triage: {incomingCall.symptom}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              id="btn-banner-reject-call"
              className="btn btn-secondary"
              style={{
                padding: '8px 16px',
                fontSize: '0.85rem',
                color: '#f87171',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
              }}
              onClick={() => onRejectIncomingCall && onRejectIncomingCall(incomingCall)}
            >
              <PhoneOff size={15} /> Decline
            </button>
            <button
              id="btn-banner-accept-call"
              className="btn btn-primary"
              style={{
                padding: '8px 18px',
                fontSize: '0.85rem',
                backgroundColor: '#10b981',
                borderColor: '#059669',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              }}
              onClick={() => onAcceptIncomingCall && onAcceptIncomingCall(incomingCall)}
            >
              <Video size={15} /> Accept Call
            </button>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="doc-metrics-grid">
        <div className="doc-metric-card glass-panel">
          <div className="metric-icon-wrap" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' }}>
            <Calendar size={22} />
          </div>
          <div className="metric-info">
            <div className="metric-val">{upcomingCount}</div>
            <div className="metric-title">Upcoming Appointments</div>
          </div>
        </div>

        <div className="doc-metric-card glass-panel">
          <div className="metric-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8' }}>
            <Users size={22} />
          </div>
          <div className="metric-info">
            <div className="metric-val">{doctorData?.totalConsultations || '1,420'}</div>
            <div className="metric-title">Total Rural Consults</div>
          </div>
        </div>

        {/* Missed Calls Metric (Phase 8 Requirement 2) */}
        <div className="doc-metric-card glass-panel" style={{ cursor: 'pointer' }} onClick={onOpenNotifications}>
          <div
            className="metric-icon-wrap"
            style={{
              background: missedCalls.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: missedCalls.length > 0 ? '#ef4444' : '#f59e0b',
            }}
          >
            <PhoneMissed size={22} />
          </div>
          <div className="metric-info">
            <div className="metric-val" style={{ color: missedCalls.length > 0 ? '#f87171' : 'inherit' }}>
              {missedCalls.length}
            </div>
            <div className="metric-title">Missed Calls Logged</div>
          </div>
        </div>

        <div className="doc-metric-card glass-panel">
          <div className="metric-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Activity size={22} />
          </div>
          <div className="metric-info">
            <div className="metric-val">4.95 / 5.0</div>
            <div className="metric-title">Patient Satisfaction</div>
          </div>
        </div>
      </div>

      {/* Dedicated Missed Calls Section (Phase 8 Requirement 2) */}
      {missedCalls.length > 0 && (
        <div className="dash-card glass-panel" style={{ marginTop: '24px', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
          <div className="card-heading-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PhoneMissed size={20} color="#f43f5e" />
              <h2 style={{ fontSize: '1.25rem' }}>
                Missed Consultation Calls ({missedCalls.length})
              </h2>
            </div>
            <span
              className="badge"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                fontSize: '0.78rem',
              }}
            >
              Action Required
            </span>
          </div>

          <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
            {missedCalls.map((item, idx) => {
              const patientName = item.senderName || item.metadata?.patientName || 'Kumar';
              const appointmentId = item.appointmentId || item.metadata?.appointmentId || 'APT-101';
              const timeDisplay = item.createdAt
                ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Recently';
              const dateDisplay = item.createdAt
                ? new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                : 'Today';

              return (
                <div
                  key={item._id || item.id || idx}
                  className="glass-panel"
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    background: 'rgba(15, 23, 42, 0.65)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f43f5e',
                        flexShrink: 0,
                      }}
                    >
                      <PhoneMissed size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#ffffff' }}>{patientName}</h4>
                        <span className="health-id-pill" style={{ fontSize: '0.72rem' }}>{appointmentId}</span>
                      </div>
                      <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        {item.message || 'Call timed out after 35s or was placed while offline.'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      ⏱ {dateDisplay}, {timeDisplay}
                    </span>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => onViewPatientRecords && onViewPatientRecords('pat-1')}
                    >
                      <Eye size={13} /> View EHR
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scheduled Appointments Section */}
      <div className="dash-card glass-panel" style={{ marginTop: '28px' }}>
        <div className="card-heading-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="#14b8a6" />
            <h2 style={{ fontSize: '1.3rem' }}>
              Booked Patient Appointments ({appointments.length})
            </h2>
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`record-tab-btn ${statusFilter === 'All' ? 'active' : ''}`}
              onClick={() => setStatusFilter('All')}
            >
              All ({appointments.length})
            </button>
            <button
              className={`record-tab-btn ${statusFilter === 'Upcoming' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Upcoming')}
            >
              Upcoming ({upcomingCount})
            </button>
            <button
              className={`record-tab-btn ${statusFilter === 'Completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Completed')}
            >
              Completed ({completedCount})
            </button>
            <button
              className={`record-tab-btn ${statusFilter === 'Cancelled' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Cancelled')}
            >
              Cancelled ({cancelledCount})
            </button>
          </div>
        </div>

        <div className="doc-appointments-list">
          {filteredAppointments.length === 0 ? (
            <div className="no-records-box" style={{ padding: '36px', textAlign: 'center' }}>
              No appointments found for status "{statusFilter}".
            </div>
          ) : (
            filteredAppointments.map((apt) => (
              <div key={apt.appointmentId || apt.id} className="doc-apt-card glass-panel">
                <div className="doc-apt-main">
                  <div className="doc-apt-time-badge">
                    <Calendar size={14} color="#38bdf8" />
                    <span>{apt.date}</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                      {apt.time}
                    </span>
                  </div>

                  <div className="doc-patient-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>{apt.patientName}</h3>
                      <span className="health-id-pill">{apt.appointmentId || apt.id}</span>
                      {apt.patientAge && (
                        <span className="patient-age-tag">
                          {apt.patientAge} yrs • {apt.patientGender || 'Male'}
                        </span>
                      )}
                    </div>

                    <div className="patient-location-tag">
                      <span>Village: <strong>{apt.village || 'Rampur Village'}</strong></span>
                      <span className="bullet-sep">•</span>
                      <span>Kiosk: <strong>{apt.location || apt.kiosk || 'Primary Tele-Kiosk'}</strong></span>
                      {apt.lastBp && (
                        <>
                          <span className="bullet-sep">•</span>
                          <span>Last BP: <strong style={{ color: '#10b981' }}>{apt.lastBp}</strong></span>
                        </>
                      )}
                    </div>

                    <div className="patient-symptoms-box">
                      <strong>Triage / Reason:</strong> {apt.reason || 'General health consultation'}
                    </div>
                  </div>
                </div>

                <div className="doc-apt-actions">
                  {/* Status Indicator */}
                  <div className="apt-status-indicator">
                    {apt.status === 'Upcoming' ? (
                      <span className="badge badge-status" style={{ padding: '4px 10px' }}>
                        <span className="pulse-dot" />
                        <span>Upcoming</span>
                      </span>
                    ) : apt.status === 'Completed' ? (
                      <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                        <Check size={12} /> Completed
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                        <XCircle size={12} /> Cancelled
                      </span>
                    )}
                  </div>

                  {/* Primary Action: Join Consultation (Available for upcoming appointments) */}
                  {apt.status === 'Upcoming' && (
                    <button
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                      onClick={() => onJoinConsultation(apt)}
                    >
                      <Video size={16} />
                      <span>Join Consultation</span>
                    </button>
                  )}

                  {/* Secondary Actions */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => onViewPatientRecords(apt.patientId || 'pat-1')}
                    >
                      <FileText size={14} />
                      <span>Records</span>
                    </button>

                    {/* Status update toggles for testing */}
                    {apt.status === 'Upcoming' && (
                      <>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#34d399' }}
                          title="Mark as Completed"
                          onClick={() => onUpdateStatus && onUpdateStatus(apt.appointmentId || apt.id, 'Completed')}
                        >
                          <Check size={14} /> Done
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#f87171' }}
                          title="Cancel Appointment"
                          onClick={() => onUpdateStatus && onUpdateStatus(apt.appointmentId || apt.id, 'Cancelled')}
                        >
                          <XCircle size={14} /> Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Patient List Section */}
      <div className="dash-card glass-panel" style={{ marginTop: '28px' }}>
        <div className="card-heading-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#14b8a6" />
            <h2 style={{ fontSize: '1.3rem' }}>Rural Patient Roster & Records</h2>
          </div>

          <div className="patient-search-mini">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search patients by name, village, condition..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="patient-table-wrapper">
          <table className="doc-patient-table">
            <thead>
              <tr>
                <th>Patient Name</th>
                <th>Health ID</th>
                <th>Village Location</th>
                <th>Clinical Condition</th>
                <th>Last Vitals Recorded</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                    No matching patients found.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((pat) => (
                  <tr key={pat.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#f8fafc' }}>{pat.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        {pat.age} yrs • {pat.gender || 'Rural Resident'}
                      </div>
                    </td>
                    <td>
                      <span className="health-id-pill">{pat.healthId}</span>
                    </td>
                    <td>{pat.village}</td>
                    <td>
                      <strong style={{ color: '#38bdf8' }}>{pat.condition}</strong>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: '#10b981' }}>{pat.vitals || 'BP 124/82'}</td>
                    <td>
                      <span className="badge badge-status" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                        {pat.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => onViewPatientRecords(pat.id)}
                      >
                        <Eye size={14} /> View EHR
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clinical Consultation Recordings Section */}
      <div className="dash-card glass-panel" style={{ marginTop: '28px' }}>
        <div className="card-heading-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Film size={20} color="#ef4444" />
            <h2 style={{ fontSize: '1.3rem' }}>Clinical Consultation Recordings ({recordings.length})</h2>
          </div>
          <span className="health-id-pill" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            🔒 HIPAA / DISHA Compliant Vault
          </span>
        </div>

        <div className="doc-recordings-grid" style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
          {recordings.length === 0 ? (
            <div className="no-records-box" style={{ padding: '28px', textAlign: 'center' }}>
              <p style={{ color: '#94a3b8', margin: 0 }}>No consultation recordings on file for this provider.</p>
              <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>
                Consented consultation recordings will be automatically encrypted and filed here.
              </p>
            </div>
          ) : (
            recordings.map((rec) => (
              <div
                key={rec.recordingId}
                className="doc-recording-card glass-panel"
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '1.1rem', color: '#ffffff', margin: 0 }}>
                        Patient: {rec.patientName || 'Ramesh Kumar'}
                      </h3>
                      <span className="health-id-pill">{rec.appointmentId}</span>
                      <span
                        className="badge"
                        style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.72rem' }}
                      >
                        READY
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.82rem', color: '#94a3b8', marginTop: '6px' }}>
                      <span>
                        📅 {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '08 Oct 2026'}
                      </span>
                      <span>
                        ⏱ Duration: <strong style={{ color: '#ffffff' }}>{rec.duration || '02:45'}</strong>
                      </span>
                      {rec.fileSize && <span>💾 {(rec.fileSize / 1024).toFixed(1)} KB</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                      onClick={() => {
                        if (onPlayRecording) onPlayRecording(rec);
                      }}
                    >
                      <Play size={14} />
                      <span>Watch Recording</span>
                    </button>

                    <a
                      href={rec.videoBlobUrl || `/api/recordings/${rec.recordingId}?userId=${doctorData?.id || 'doc-1'}&download=true`}
                      download={`nexora_${rec.appointmentId || 'consultation'}.webm`}
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '0.84rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Download Encrypted Recording"
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </a>

                    <button
                      type="button"
                      className="btn btn-secondary btn-delete-recording"
                      style={{
                        padding: '8px 14px',
                        fontSize: '0.84rem',
                        color: '#f87171',
                        borderColor: 'rgba(239, 68, 68, 0.35)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      onClick={() => {
                        if (onDeleteRecording) onDeleteRecording(rec);
                      }}
                      title="Delete Consultation Recording"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Switcher for Hackathon Demo */}
      <div className="judge-demo-bar glass-panel" style={{ marginTop: '24px' }}>
        <div>
          <span className="judge-tag">HACKATHON ROLE SWITCHER</span>
          <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
            Booked a new appointment as a patient? Switch views back to Patient to review it:
          </p>
        </div>
        <button
          className="btn btn-accent"
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          onClick={onSwitchToPatientDemo}
        >
          <span>Switch to Ramesh Kumar (Patient View)</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
