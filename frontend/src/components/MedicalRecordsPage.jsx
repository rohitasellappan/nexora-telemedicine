import React, { useState, useEffect } from 'react';
import {
  FileText,
  Activity,
  Heart,
  Pill,
  AlertTriangle,
  Calendar,
  User,
  Stethoscope,
  Video,
  Play,
  ArrowLeft,
  Download,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';

export default function MedicalRecordsPage({
  patientData,
  recordings = [],
  onPlayRecording,
  onBackToDashboard,
}) {
  const [healthRecords, setHealthRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRecordId, setExpandedRecordId] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'with-recording' | 'prescriptions'

  const patientId = patientData?.id || 'pat-1';

  // Fetch verified digital health records from backend
  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass patientId as current effective user
      const res = await fetch(`/api/health-records/patient/${patientId}?userId=${patientId}`);
      if (!res.ok) {
        throw new Error(`Failed to load health records (Status ${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        setHealthRecords(data.records);
        // Expand the first record by default if available
        if (data.records.length > 0) {
          setExpandedRecordId(data.records[0].id);
        }
      } else {
        setHealthRecords([]);
      }
    } catch (err) {
      console.warn('Backend health records fallback:', err.message);
      // Fallback to local patient records if network interrupted
      const localFallback = (patientData?.medicalRecords || []).map((r, i) => ({
        id: r.id || `HR-FALLBACK-${i}`,
        patientId,
        patientName: patientData?.name || 'Ramesh Kumar',
        patientAge: patientData?.age || 42,
        patientGender: patientData?.gender || 'Male',
        doctorId: 'doc-1',
        doctorName: r.doctor || 'Dr. Ananya Sharma, MD',
        doctorSpecialization: 'General Physician',
        appointmentId: `APT-10${i}`,
        consultationDate: r.date || '08 Oct 2026',
        symptoms: 'Mild fever, body ache and seasonal fatigue',
        diagnosis: r.diagnosis || 'Viral infection',
        prescription: Array.isArray(r.medications)
          ? r.medications.map(m => `${m.name} ${m.dosage || ''}`).join(', ')
          : 'Paracetamol 500mg',
        doctorNotes: r.notes || 'Take adequate rest and fluids.',
        followUpInstructions: '3 days if symptoms persist',
        recordingId: null,
      }));
      setHealthRecords(localFallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [patientId]);

  // Find associated recording object if present
  const findAssociatedRecording = (record) => {
    if (record.recordingId) {
      const match = recordings.find((r) => r.recordingId === record.recordingId);
      if (match) return match;
      return {
        recordingId: record.recordingId,
        appointmentId: record.appointmentId,
        doctorName: record.doctorName,
        createdAt: record.createdAt || record.consultationDate,
        duration: '02:45',
      };
    }
    // Also check if any recording matches appointmentId
    if (record.appointmentId) {
      const match = recordings.find((r) => r.appointmentId === record.appointmentId);
      if (match) return match;
    }
    return null;
  };

  const toggleExpand = (recordId) => {
    setExpandedRecordId((prev) => (prev === recordId ? null : recordId));
  };

  // Filter records
  const filteredRecords = healthRecords.filter((rec) => {
    if (filterType === 'with-recording') {
      return !!findAssociatedRecording(rec);
    }
    return true;
  });

  return (
    <div className="medical-records-page container" style={{ padding: '28px 20px', maxWidth: '1160px', margin: '0 auto' }}>
      {/* Top Header & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBackToDashboard}
            style={{ marginBottom: '12px', padding: '7px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(20, 184, 166, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#14b8a6' }}>
              <FileText size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
                MY HEALTH RECORD
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '2px 0 0 0' }}>
                ABHA & Digital Health Vault • Secure Unified Electronic Health Record (EHR)
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchRecords}
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            title="Refresh Records"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} /> 256-Bit Encrypted
          </div>
        </div>
      </div>

      {/* Patient Health Overview Card */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', marginBottom: '28px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '18px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #14b8a6, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '1.25rem', fontWeight: 800 }}>
              {patientData?.name ? patientData.name.split(' ').map(n => n[0]).join('') : 'RK'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  Patient: {patientData?.name || 'Ramesh Kumar'}
                </h2>
                <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                  {patientData?.healthId || 'NX-9824-7123'}
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                Age: <strong style={{ color: '#f1f5f9' }}>{patientData?.age || 42}</strong> • Gender: <strong style={{ color: '#f1f5f9' }}>{patientData?.gender || 'Male'}</strong> • Blood Group: <strong style={{ color: '#f43f5e' }}>{patientData?.bloodGroup || 'O+'}</strong> • Kiosk: <strong style={{ color: '#f1f5f9' }}>{patientData?.primaryKiosk || 'Rampur Panchayat Outpost'}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Blood Pressure</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#14b8a6' }}>{patientData?.vitals?.bloodPressure || '124/82 mmHg'}</div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Pulse Rate</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f43f5e' }}>{patientData?.vitals?.heartRate || '72 bpm'}</div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>SpO2</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>{patientData?.vitals?.spo2 || '98%'}</div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MEDICAL HISTORY SECTION */}
        {/* ========================================================= */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Activity size={18} color="#14b8a6" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Medical History
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {/* Existing Conditions */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <Heart size={14} /> Existing Conditions
              </div>
              {patientData?.existingConditions && patientData.existingConditions.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  {patientData.existingConditions.map((cond, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}><strong>{cond}</strong></li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem' }}>None recorded</p>
              )}
            </div>

            {/* Allergies */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <AlertTriangle size={14} /> Allergies
              </div>
              {patientData?.allergies && patientData.allergies.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#fca5a5', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  {patientData.allergies.map((allg, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}><strong>{allg}</strong></li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem' }}>None known</p>
              )}
            </div>

            {/* Current Medications */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(20, 184, 166, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#14b8a6', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <Pill size={14} /> Current Medications
              </div>
              {patientData?.currentMedications && patientData.currentMedications.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#99f6e4', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  {patientData.currentMedications.map((med, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}><strong>{med}</strong></li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem' }}>None currently active</p>
              )}
            </div>

            {/* Previous Diagnoses */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <Stethoscope size={14} /> Previous Diagnoses
              </div>
              {patientData?.previousDiagnoses && patientData.previousDiagnoses.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '18px', color: '#fde68a', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  {patientData.previousDiagnoses.map((diag, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}><strong>{diag}</strong></li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem' }}>None logged</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CONSULTATION HISTORY SECTION */}
      {/* ========================================================= */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              Consultation History
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
              Past doctor teleconsultations, diagnoses, prescriptions, notes, and session recordings
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`record-tab-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              All Consultations ({healthRecords.length})
            </button>
            <button
              type="button"
              className={`record-tab-btn ${filterType === 'with-recording' ? 'active' : ''}`}
              onClick={() => setFilterType('with-recording')}
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
            >
              🎥 With Recordings
            </button>
          </div>
        </div>

        {loading ? (
          <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', borderRadius: '16px' }}>
            <RefreshCw size={28} className="animate-spin" color="#14b8a6" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#94a3b8' }}>Loading verified health records from NEXORA vault...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', borderRadius: '16px' }}>
            <FileText size={36} color="#64748b" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.15rem', color: '#cbd5e1' }}>No consultation records found</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Consultations completed with your doctors will be securely archived here automatically.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {filteredRecords.map((record) => {
              const isExpanded = expandedRecordId === record.id;
              const associatedRec = findAssociatedRecording(record);

              return (
                <div
                  key={record.id}
                  className="glass-panel"
                  style={{
                    borderRadius: '14px',
                    borderLeft: '4px solid #14b8a6',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Summary Bar */}
                  <div
                    style={{
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      flexWrap: 'wrap',
                      gap: '14px',
                      background: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    }}
                    onClick={() => toggleExpand(record.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          background: 'rgba(20, 184, 166, 0.15)',
                          color: '#14b8a6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}
                      >
                        <Stethoscope size={22} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} color="#14b8a6" /> {record.consultationDate}
                          </span>
                          <span style={{ color: '#475569' }}>•</span>
                          <span style={{ fontSize: '0.78rem', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {record.appointmentId || record.id}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '4px 0 2px 0', color: '#ffffff' }}>
                          {record.doctorName}
                        </h3>
                        <p style={{ color: '#14b8a6', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>
                          {record.doctorSpecialization || 'Telemedicine Specialist'}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Recording Pill Preview */}
                      {associatedRec ? (
                        <span
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Play size={11} fill="#ef4444" /> Recording Available
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          No recording
                        </span>
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(record.id);
                        }}
                      >
                        {isExpanded ? (
                          <>
                            <span>Hide Details</span> <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            <span>View Details</span> <ChevronDown size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Consultation Details */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '0 24px 24px 24px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        marginTop: '4px',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                          gap: '16px',
                          marginTop: '18px',
                        }}
                      >
                        {/* Symptoms */}
                        <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                            Symptoms
                          </span>
                          <p style={{ margin: '6px 0 0 0', color: '#f1f5f9', fontSize: '0.92rem', lineHeight: '1.5' }}>
                            {record.symptoms || 'None recorded'}
                          </p>
                        </div>

                        {/* Diagnosis */}
                        <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
                          <span style={{ fontSize: '0.78rem', color: '#14b8a6', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                            Diagnosis
                          </span>
                          <p style={{ margin: '6px 0 0 0', color: '#f8fafc', fontSize: '1rem', fontWeight: 700 }}>
                            {record.diagnosis || 'Clinical evaluation pending'}
                          </p>
                        </div>

                        {/* Prescription */}
                        <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                            <Pill size={14} /> Prescription
                          </div>
                          <div style={{ margin: '6px 0 0 0', color: '#99f6e4', fontSize: '0.92rem', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                            {record.prescription || 'No medications prescribed'}
                          </div>
                        </div>

                        {/* Doctor Notes */}
                        <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                            Doctor Notes
                          </span>
                          <p style={{ margin: '6px 0 0 0', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            {record.doctorNotes || 'Take adequate rest and fluids.'}
                          </p>
                        </div>
                      </div>

                      {/* Follow-up and Recording Actions Row */}
                      <div
                        style={{
                          marginTop: '18px',
                          padding: '16px 20px',
                          background: 'rgba(2, 6, 23, 0.6)',
                          borderRadius: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '14px',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                        }}
                      >
                        {/* Follow-up Instructions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Clock size={16} color="#fbbf24" />
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Follow-up Instructions:
                            </span>
                            <div style={{ color: '#fde68a', fontWeight: 700, fontSize: '0.9rem' }}>
                              {record.followUpInstructions || 'Review in 3 days if symptoms persist'}
                            </div>
                          </div>
                        </div>

                        {/* Consultation Recording (Requirement 8) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>
                              Consultation Recording
                            </span>
                            {!associatedRec && (
                              <span style={{ fontSize: '0.84rem', color: '#64748b', fontStyle: 'italic' }}>
                                No recording available.
                              </span>
                            )}
                          </div>

                          {associatedRec ? (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                              onClick={() => {
                                if (onPlayRecording) {
                                  onPlayRecording(associatedRec);
                                }
                              }}
                            >
                              <Play size={14} fill="#ffffff" />
                              <span>▶ Watch Recording</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
