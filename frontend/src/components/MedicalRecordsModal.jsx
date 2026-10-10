import React, { useState } from 'react';
import {
  X,
  FileText,
  Activity,
  ShieldCheck,
  Download,
  Pill,
  Stethoscope,
  AlertTriangle,
  Calendar,
  Video,
  Play,
  Clock,
  Lock,
  Trash2
} from 'lucide-react';

export default function MedicalRecordsModal({
  isOpen,
  onClose,
  patientData,
  recordings = [],
  onPlayRecording,
  onDeleteRecording,
}) {
  const [activeTab, setActiveTab] = useState('all');

  if (!isOpen || !patientData) return null;

  const records = patientData.medicalRecords || [];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1150 }}>
      <div className="modal-content records-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {/* Header */}
        <div className="records-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="records-icon-pill">
              <FileText size={22} color="#14b8a6" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Digital Health Vault (EHR)</h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Secure medical records for {patientData.name} • ABHA / ID: <span style={{ color: '#38bdf8' }}>{patientData.healthId}</span>
              </p>
            </div>
          </div>

          <div className="patient-quick-vitals-strip">
            <div className="quick-badge">
              <span>Blood Group:</span> <strong>{patientData.bloodGroup}</strong>
            </div>
            <div className="quick-badge">
              <span>Known Allergies:</span>{' '}
              <strong style={{ color: '#fca5a5' }}>
                {Array.isArray(patientData.allergies) ? patientData.allergies.join(', ') : 'None'}
              </strong>
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="records-filter-tabs">
          <button
            className={`record-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Documents ({records.length})
          </button>
          <button
            className={`record-tab-btn ${activeTab === 'prescriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('prescriptions')}
          >
            Prescriptions
          </button>
          <button
            className={`record-tab-btn ${activeTab === 'recordings' ? 'active' : ''}`}
            onClick={() => setActiveTab('recordings')}
          >
            🎥 Consultation Recordings ({recordings.length})
          </button>
        </div>

        {/* Records Content */}
        <div className="records-scroll-container">
          {activeTab === 'recordings' ? (
            /* Consultation Recordings Tab */
            <div className="recordings-tab-view" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {recordings.length === 0 ? (
                <div className="no-records-box" style={{ padding: '36px', textAlign: 'center' }}>
                  <Video size={32} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                  <p style={{ color: '#94a3b8' }}>No consultation recordings on file for this patient.</p>
                  <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Authorized recordings will appear here automatically when consented during video calls.
                  </p>
                </div>
              ) : (
                recordings.map((rec) => (
                  <div
                    key={rec.recordingId}
                    className="record-card glass-panel"
                    style={{
                      borderLeft: '4px solid #ef4444',
                      padding: '18px 20px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#ef4444',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            VIDEO CONSULTATION
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                            {rec.appointmentId}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginTop: '6px' }}>
                          Consultation with {rec.doctorName || 'Dr. Ananya Sharma, MD'}
                        </h3>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.82rem', color: '#94a3b8', marginTop: '6px' }}>
                          <span>📅 {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '08 Oct 2026'}</span>
                          <span>⏱ Duration: <strong style={{ color: '#ffffff' }}>{rec.duration || '02:45'}</strong></span>
                          <span>🔒 256-bit Authorized Encrypted</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                          href={rec.videoBlobUrl || `/api/recordings/${rec.recordingId}?userId=${patientData.id || 'pat-1'}&download=true`}
                          download={`nexora_${rec.appointmentId || 'consultation'}.webm`}
                          className="btn btn-secondary"
                          style={{ padding: '8px 14px', fontSize: '0.84rem', textDecoration: 'none' }}
                          title="Download Encrypted WebM"
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
          ) : (
            /* EHR Documents / Prescriptions */
            records.length === 0 ? (
              <div className="no-records-box">No health records uploaded yet.</div>
            ) : (
              records.map((rec) => (
                <div key={rec.id} className="record-card glass-panel">
                  <div className="record-card-top">
                    <div className="record-type-badge">
                      <FileText size={15} />
                      <span>{rec.title}</span>
                    </div>
                    <div className="record-date-badge">
                      <Calendar size={13} />
                      <span>{rec.date}</span>
                    </div>
                  </div>

                  <div className="record-doctor-meta">
                    <span>Prescribing Clinician: <strong>{rec.doctor}</strong></span>
                    <span className="bullet-sep">•</span>
                    <span>Facility: <strong>{rec.facility || 'NEXORA Regional Network'}</strong></span>
                  </div>

                  <div className="record-diagnosis-box">
                    <strong>Diagnosis / Clinical Assessment:</strong>
                    <p>{rec.diagnosis}</p>
                  </div>

                  {rec.medications && rec.medications.length > 0 && (
                    <div className="record-medications-section">
                      <div className="med-section-title">
                        <Pill size={15} color="#14b8a6" />
                        <span>Prescribed Medications:</span>
                      </div>
                      <div className="meds-table-wrapper">
                        <table className="meds-table">
                          <thead>
                            <tr>
                              <th>Medicine</th>
                              <th>Dosage</th>
                              <th>Frequency</th>
                              <th>Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rec.medications.map((med, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 600, color: '#f8fafc' }}>{med.name}</td>
                                <td>{med.dosage}</td>
                                <td>{med.freq}</td>
                                <td>{med.duration}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {rec.notes && (
                    <div className="record-clinical-notes">
                      <strong>Doctor Instructions:</strong> {rec.notes}
                    </div>
                  )}

                  <div className="record-footer-actions">
                    <span className="encrypted-tag">
                      <ShieldCheck size={14} color="#10b981" /> 256-bit Encrypted Record
                    </span>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      onClick={() => alert(`Simulating PDF download for record #${rec.id}: ${rec.title}`)}
                    >
                      <Download size={14} /> Download Prescription PDF
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>

        <div className="records-modal-footer">
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            ABHA / Digital Health Record integration active for rural healthcare outreach.
          </p>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
