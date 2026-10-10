import React, { useEffect, useState } from 'react';
import {
  Video,
  PhoneOff,
  User,
  MapPin,
  Clock,
  Activity,
  AlertCircle,
  Shield,
  Volume2,
  VolumeX,
  Sparkles,
  Heart
} from 'lucide-react';
import { ringSynthesizer } from '../utils/ringAudio';

export default function DoctorIncomingCallModal({
  callData, // { appointmentId, patientId, patientName, patientAge, patientVillage, symptom, kiosk, doctorId, callerSocketId }
  onAccept,
  onReject,
}) {
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Play ringing chime when modal appears
  useEffect(() => {
    if (!isAudioMuted) {
      ringSynthesizer.startIncomingRing();
    }
    return () => {
      ringSynthesizer.stopRing();
    };
  }, [isAudioMuted]);

  // Elapsed ringing timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleAudio = () => {
    if (isAudioMuted) {
      setIsAudioMuted(false);
      ringSynthesizer.startIncomingRing();
    } else {
      setIsAudioMuted(true);
      ringSynthesizer.stopRing();
    }
  };

  const handleAccept = () => {
    ringSynthesizer.stopRing();
    if (onAccept) onAccept(callData);
  };

  const handleReject = () => {
    ringSynthesizer.stopRing();
    if (onReject) onReject(callData);
  };

  if (!callData) return null;

  return (
    <div className="modal-backdrop" style={{ zIndex: 10000, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)' }}>
      <div
        className="incoming-call-card glass-panel"
        style={{
          maxWidth: '520px',
          width: '92%',
          padding: '32px 28px',
          borderRadius: '24px',
          position: 'relative',
          border: '1.5px solid rgba(16, 185, 129, 0.5)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75), 0 0 50px rgba(16, 185, 129, 0.25)',
          animation: 'incomingCallGlow 2s infinite ease-in-out',
        }}
      >
        {/* Top Sound Toggle */}
        <button
          onClick={toggleAudio}
          className="btn-icon"
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            color: isAudioMuted ? '#94a3b8' : '#10b981',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isAudioMuted ? 'Unmute Ringtone' : 'Mute Ringtone'}
        >
          {isAudioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Pulsing Alert Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span
            className="badge"
            style={{
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              padding: '6px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span className="pulse-dot" style={{ backgroundColor: '#10b981' }} />
            INCOMING TELEMEDICINE CALL • {elapsedSec}s
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Appt: <strong style={{ color: '#38bdf8' }}>{callData.appointmentId}</strong>
            </span>
            <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {callData.time || callData.appointmentTime || 'Today, 04:30 PM'}
            </span>
          </div>
        </div>

        {/* Patient Profile Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.65)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #14b8a6, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.4rem',
              color: '#ffffff',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(20, 184, 166, 0.3)',
            }}
          >
            {callData.patientName?.split(' ').map((n) => n[0]).join('') || 'PT'}
          </div>

          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '2px' }}>
              {callData.patientName || 'Kumar'}
            </h3>
            <p style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600 }}>
              {callData.patientAge ? `${callData.patientAge} yrs` : '42 yrs'} • Patient ID: {callData.patientId || 'pat-1'}
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
              <MapPin size={12} color="#14b8a6" /> {callData.patientVillage || 'Rampur Village'}
            </p>
          </div>
        </div>

        {/* Clinical Triage & Location Info */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '10px',
            marginBottom: '24px',
            fontSize: '0.86rem',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
              Triage Reason / Symptom
            </span>
            <span style={{ color: '#f1f5f9', fontWeight: 600 }}>
              {callData.symptom || 'Routine cardiac follow-up and blood pressure check'}
            </span>
          </div>

          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                Originating Tele-Kiosk
              </span>
              <span style={{ color: '#f1f5f9' }}>
                {callData.kiosk || 'Rampur Panchayat Health Outpost #3'}
              </span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                Security
              </span>
              <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Shield size={12} /> WebRTC P2P
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Accept & Reject */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <button
            id="btn-reject-call"
            onClick={handleReject}
            className="btn btn-secondary"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              borderColor: 'rgba(239, 68, 68, 0.4)',
              padding: '14px 18px',
              borderRadius: '16px',
              fontWeight: 700,
              fontSize: '0.96rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <PhoneOff size={18} />
            <span>Decline / Busy</span>
          </button>

          <button
            id="btn-accept-call"
            onClick={handleAccept}
            className="btn btn-primary"
            style={{
              backgroundColor: '#10b981',
              borderColor: '#059669',
              color: '#ffffff',
              padding: '14px 18px',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '0.96rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
              animation: 'pulseAcceptButton 1.5s infinite',
            }}
          >
            <Video size={18} />
            <span>Accept Call</span>
          </button>
        </div>
      </div>
    </div>
  );
}
