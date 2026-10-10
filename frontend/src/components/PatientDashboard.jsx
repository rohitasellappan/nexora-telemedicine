import React from 'react';
import {
  User,
  Heart,
  Activity,
  Calendar,
  Clock,
  Video,
  FileText,
  Search,
  MapPin,
  Phone,
  Shield,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Pill,
  Sparkles,
  Tag,
  Play,
  Download,
  Lock,
  Film,
  Trash2
} from 'lucide-react';

export default function PatientDashboard({
  patientData,
  appointments = [],
  recordings = [],
  onOpenFindDoctor,
  onOpenMedicalRecords,
  onJoinConsultation,
  onStartVideoCall,
  onPlayRecording,
  onDeleteRecording,
  onSwitchToDoctorDemo
}) {
  const records = patientData?.medicalRecords || [];

  // Filter to show appointments
  const upcomingList = appointments.filter(
    (apt) => apt.status === 'Upcoming'
  );
  const pastList = appointments.filter(
    (apt) => apt.status !== 'Upcoming'
  );

  return (
    <div className="dashboard-container">
      {/* Top Banner / Welcome Row */}
      <div className="dash-hero-card glass-panel">
        <div className="dash-hero-content">
          <div className="badge badge-primary" style={{ marginBottom: '6px' }}>
            <Sparkles size={13} /> Patient Telemedicine Portal
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
            Namaste, <span className="gradient-text">{patientData?.name || 'Ramesh Kumar'}</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem' }}>
            Village Health Kiosk Link: <strong>{patientData?.primaryKiosk}</strong>
          </p>
        </div>

        {/* Primary CTA Buttons */}
        <div className="dash-hero-actions">
          <button
            id="btn-patient-find-doc"
            className="btn btn-primary"
            onClick={onOpenFindDoctor}
          >
            <Search size={17} />
            <span>Find a Doctor</span>
          </button>

          <button
            id="btn-patient-records"
            className="btn btn-secondary"
            onClick={onOpenMedicalRecords}
          >
            <FileText size={17} />
            <span>My Medical Records</span>
          </button>
        </div>
      </div>

      {/* Grid Layout: Left Column (Profile & Vitals), Right Column (Appointments & Records) */}
      <div className="dash-main-grid">
        {/* Left Column: Patient Profile & Health Identity */}
        <div className="dash-col-left">
          {/* Profile Card */}
          <div className="dash-card glass-panel">
            <div className="card-heading-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} color="#14b8a6" />
                <h3 style={{ fontSize: '1.15rem' }}>Patient Profile</h3>
              </div>
              <span className="badge badge-status">Active Patient</span>
            </div>

            <div className="patient-avatar-strip">
              <div className="patient-avatar-circle">
                {patientData?.name?.split(' ').map((n) => n[0]).join('') || 'RK'}
              </div>
              <div>
                <h4 style={{ fontSize: '1.15rem', color: '#ffffff' }}>{patientData?.name}</h4>
                <p style={{ fontSize: '0.82rem', color: '#38bdf8' }}>
                  ABHA / Health ID: <strong>{patientData?.healthId}</strong>
                </p>
              </div>
            </div>

            <div className="profile-details-list">
              <div className="detail-item">
                <span className="detail-label">Age / Gender</span>
                <span className="detail-val">{patientData?.age} yrs • {patientData?.gender}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Location</span>
                <span className="detail-val" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="#14b8a6" /> {patientData?.village}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Blood Group</span>
                <span className="detail-val" style={{ color: '#f43f5e', fontWeight: 700 }}>
                  {patientData?.bloodGroup}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Contact</span>
                <span className="detail-val">{patientData?.phone}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Emergency Contact</span>
                <span className="detail-val">{patientData?.emergencyContact}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Allergies</span>
                <span className="detail-val" style={{ color: '#fca5a5' }}>
                  {Array.isArray(patientData?.allergies) ? patientData.allergies.join(', ') : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* Vitals Summary Card */}
          <div className="dash-card glass-panel" style={{ marginTop: '20px' }}>
            <div className="card-heading-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="#14b8a6" />
                <h3 style={{ fontSize: '1.15rem' }}>Recent Vitals</h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Village Sync</span>
            </div>

            <div className="vitals-dashboard-grid">
              <div className="vital-dash-item">
                <div className="vital-item-head">Blood Pressure</div>
                <div className="vital-item-val" style={{ color: '#34d399' }}>
                  {patientData?.vitals?.bloodPressure || '124/82'}
                </div>
                <div className="vital-item-sub">Normal Range</div>
              </div>

              <div className="vital-dash-item">
                <div className="vital-item-head">Heart Rate</div>
                <div className="vital-item-val" style={{ color: '#f43f5e' }}>
                  {patientData?.vitals?.heartRate || '72 bpm'}
                </div>
                <div className="vital-item-sub">Resting Pulse</div>
              </div>

              <div className="vital-dash-item">
                <div className="vital-item-head">Blood Glucose</div>
                <div className="vital-item-val" style={{ color: '#38bdf8' }}>
                  {patientData?.vitals?.bloodSugar || '114 mg/dL'}
                </div>
                <div className="vital-item-sub">Post-Breakfast</div>
              </div>

              <div className="vital-dash-item">
                <div className="vital-item-head">Oxygen (SpO2)</div>
                <div className="vital-item-val" style={{ color: '#10b981' }}>
                  {patientData?.vitals?.spo2 || '98%'}
                </div>
                <div className="vital-item-sub">Optimal</div>
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={13} color="#14b8a6" />
              <span>{patientData?.vitals?.lastUpdated}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Appointments & Records */}
        <div className="dash-col-right">
          {/* Upcoming Appointments Card */}
          <div className="dash-card glass-panel">
            <div className="card-heading-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#14b8a6" />
                <h3 style={{ fontSize: '1.25rem' }}>Upcoming Appointments</h3>
              </div>
              <button
                id="btn-book-more"
                className="btn btn-secondary"
                style={{ padding: '5px 14px', fontSize: '0.82rem' }}
                onClick={onOpenFindDoctor}
              >
                + Book New Appointment
              </button>
            </div>

            <div className="appointment-list">
              {upcomingList.length === 0 ? (
                <div className="no-records-box" style={{ padding: '30px 20px', textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', marginBottom: '12px' }}>No upcoming appointments scheduled.</p>
                  <button className="btn btn-primary" onClick={onOpenFindDoctor}>
                    <Search size={16} /> Find a Doctor to Book
                  </button>
                </div>
              ) : (
                upcomingList.map((apt) => (
                  <div key={apt.appointmentId || apt.id} className="apt-item-card glass-panel">
                    <div className="apt-item-left">
                      <div className="apt-time-badge">
                        <span className="apt-date">{apt.date}</span>
                        <span className="apt-clock">{apt.time}</span>
                      </div>

                      <div className="apt-doc-details">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '1.15rem', color: '#ffffff' }}>{apt.doctorName}</h4>
                          <span className="health-id-pill" style={{ fontSize: '0.72rem' }}>
                            {apt.appointmentId || apt.id}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.86rem', color: '#14b8a6', fontWeight: 600 }}>
                          {apt.specialization || apt.doctorSpecialty}
                        </p>
                        <div className="apt-reason-text">
                          <strong>Reason:</strong> {apt.reason}
                        </div>
                        <div className="apt-kiosk-text">
                          <MapPin size={12} color="#38bdf8" />
                          <span>{apt.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="apt-item-actions">
                      <div
                        className="badge badge-status"
                        style={{
                          fontSize: '0.78rem',
                          padding: '4px 10px',
                          marginBottom: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span className="pulse-dot" />
                        <span>{apt.status || 'Upcoming'}</span>
                      </div>

                      <button
                        id={`btn-call-doctor-${apt.appointmentId || apt.id}`}
                        className="btn btn-primary"
                        style={{
                          padding: '8px 16px',
                          fontSize: '0.88rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          boxShadow: '0 4px 14px rgba(20, 184, 166, 0.35)',
                        }}
                        onClick={() => {
                          if (onStartVideoCall) {
                            onStartVideoCall(apt);
                          } else {
                            onJoinConsultation(apt);
                          }
                        }}
                      >
                        <Video size={16} />
                        <span>Start Video Call</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Past/Completed Appointments subsection if any */}
            {pastList.length > 0 && (
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Past / Completed History ({pastList.length})
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  {pastList.map((apt) => (
                    <div key={apt.appointmentId || apt.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>{apt.doctorName}</strong>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '8px' }}>{apt.date} • {apt.time}</span>
                      </div>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', fontSize: '0.75rem' }}>
                        {apt.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Digital Health Records Preview Card */}
          <div className="dash-card glass-panel" style={{ marginTop: '24px' }}>
            <div className="card-heading-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#14b8a6" />
                <h3 style={{ fontSize: '1.2rem' }}>Digital Health Records (EHR)</h3>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                onClick={onOpenMedicalRecords}
              >
                View Full Vault ({records.length})
              </button>
            </div>

            <div className="records-preview-grid">
              {records.slice(0, 2).map((rec) => (
                <div key={rec.id} className="record-mini-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="record-mini-title">{rec.title}</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{rec.date}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '6px' }}>
                    Prescribed by: <strong style={{ color: '#14b8a6' }}>{rec.doctor}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                    Diagnosis: {rec.diagnosis}
                  </div>
                </div>
              ))}
            </div>

            <div className="records-footer-cta">
              <button
                className="btn btn-secondary"
                style={{ width: '100%', padding: '10px' }}
                onClick={onOpenMedicalRecords}
              >
                <span>Open Digital Prescriptions & Lab Vault</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Consultation Recordings Card */}
          <div className="dash-card glass-panel" style={{ marginTop: '24px' }}>
            <div className="card-heading-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Film size={18} color="#ef4444" />
                <h3 style={{ fontSize: '1.2rem' }}>Consultation Recordings</h3>
              </div>
              <span className="health-id-pill" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                🔒 Encrypted Patient Archive
              </span>
            </div>

            <div className="recordings-patient-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {recordings.length === 0 ? (
                <div className="no-records-box" style={{ padding: '24px', textAlign: 'center' }}>
                  <p style={{ color: '#94a3b8', margin: 0 }}>No consultation recordings on file.</p>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>
                    Recordings appear here after an authorized video consultation session.
                  </p>
                </div>
              ) : (
                recordings.map((rec) => (
                  <div
                    key={rec.recordingId}
                    className="recording-item-card glass-panel"
                    style={{
                      padding: '14px 18px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <h4 style={{ fontSize: '1.02rem', color: '#ffffff', margin: '0 0 4px 0' }}>
                        Consultation with {rec.doctorName || 'Dr. Ananya Sharma, MD'}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: '#94a3b8' }}>
                        <span>
                          📅 {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '08 Oct 2026'}
                        </span>
                        <span>
                          ⏱ Duration: <strong style={{ color: '#ffffff' }}>{rec.duration || '02:45'}</strong>
                        </span>
                        <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{rec.appointmentId}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                        onClick={() => {
                          if (onPlayRecording) onPlayRecording(rec);
                        }}
                      >
                        <Play size={14} />
                        <span>Watch Recording</span>
                      </button>

                      <a
                        href={rec.videoBlobUrl || `/api/recordings/${rec.recordingId}?userId=${patientData?.id || 'pat-1'}&download=true`}
                        download={`nexora_${rec.appointmentId || 'consultation'}.webm`}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.82rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Download Recording"
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </a>

                      <button
                        type="button"
                        className="btn btn-secondary btn-delete-recording"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.82rem',
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
                ))
              )}
            </div>
          </div>

          {/* Quick Demo Switcher Card for Hackathon Judges */}
          <div className="judge-demo-bar glass-panel" style={{ marginTop: '20px' }}>
            <div>
              <span className="judge-tag">HACKATHON DEMO SWITCHER</span>
              <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                Want to see what the doctor sees after an appointment is booked? Switch views instantly:
              </p>
            </div>
            <button
              className="btn btn-accent"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={onSwitchToDoctorDemo}
            >
              <span>Switch to Doctor View (Dr. Ananya Sharma)</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
