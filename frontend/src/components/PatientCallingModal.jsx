import React, { useEffect, useState } from 'react';
import {
  PhoneOff,
  Video,
  Volume2,
  VolumeX,
  Clock,
  MapPin,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { ringSynthesizer } from '../utils/ringAudio';

export default function PatientCallingModal({
  appointment,
  callState = 'calling', // 'calling' | 'ringing' | 'accepted' | 'rejected' | 'missed' | 'offline' | 'cancelled'
  rejectionReason = '',
  onCancelCall,
  onRetryCall,
  onBookAnother,
  onClose,
}) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Play outgoing ringing tone during calling/ringing state
  useEffect(() => {
    if (callState === 'calling' || callState === 'ringing') {
      if (!isAudioMuted) {
        ringSynthesizer.startOutgoingRing();
      }
    } else {
      ringSynthesizer.stopRing();
    }

    return () => {
      ringSynthesizer.stopRing();
    };
  }, [callState, isAudioMuted]);

  // Elapsed timer
  useEffect(() => {
    let timer = null;
    if (callState === 'calling' || callState === 'ringing') {
      timer = setInterval(() => {
        setElapsedSec((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  const toggleAudio = () => {
    if (isAudioMuted) {
      setIsAudioMuted(false);
      ringSynthesizer.startOutgoingRing();
    } else {
      setIsAudioMuted(true);
      ringSynthesizer.stopRing();
    }
  };

  const doctorName = appointment?.doctorName || 'Dr. Ananya Sharma, MD';
  const specialization = appointment?.specialization || 'Cardiologist';
  const location = appointment?.location || 'AIIMS Tele-Network Hub';
  const appointmentId = appointment?.appointmentId || appointment?.id || 'APT-101';

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div
        className="calling-modal-card glass-panel"
        style={{
          maxWidth: '460px',
          width: '92%',
          padding: '32px 28px',
          textAlign: 'center',
          position: 'relative',
          borderRadius: '24px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(20, 184, 166, 0.2)',
          border: '1px solid rgba(20, 184, 166, 0.3)',
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
            color: isAudioMuted ? '#94a3b8' : '#14b8a6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isAudioMuted ? 'Unmute Ringtone' : 'Mute Ringtone'}
        >
          {isAudioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Header Tag */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
          <span
            className="badge badge-primary"
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={13} /> NEXORA Rural Tele-Connect
          </span>
        </div>

        {/* Animated Avatar with Pulsing Rings */}
        <div
          style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            margin: '0 auto 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {(callState === 'calling' || callState === 'ringing') && (
            <>
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '2px solid rgba(20, 184, 166, 0.6)',
                  animation: 'pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: '125%',
                  height: '125%',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(56, 189, 248, 0.4)',
                  animation: 'pulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
                  animationDelay: '0.6s',
                }}
              />
            </>
          )}

          <div
            style={{
              width: '92px',
              height: '92px',
              borderRadius: '50%',
              background:
                callState === 'accepted'
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : callState === 'rejected' || callState === 'missed' || callState === 'offline'
                  ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                  : 'linear-gradient(135deg, #14b8a6, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              zIndex: 2,
            }}
          >
            {callState === 'accepted' ? (
              <CheckCircle2 size={44} color="#ffffff" />
            ) : callState === 'rejected' || callState === 'missed' || callState === 'offline' ? (
              <AlertCircle size={44} color="#ffffff" />
            ) : (
              <Stethoscope size={44} color="#ffffff" />
            )}
          </div>
        </div>

        {/* Doctor Information */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
          {doctorName}
        </h2>
        <p style={{ color: '#14b8a6', fontWeight: 600, fontSize: '0.92rem', marginBottom: '4px' }}>
          {specialization}
        </p>
        <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '16px' }}>
          <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
          {location} • <span style={{ color: '#38bdf8' }}>{appointmentId}</span>
        </p>

        {/* Call State Status Box */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            borderRadius: '14px',
            padding: '14px 18px',
            marginBottom: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {callState === 'calling' && (
            <div style={{ color: '#38bdf8', fontSize: '0.92rem' }}>
              <span className="pulse-dot" style={{ backgroundColor: '#38bdf8', marginRight: '8px' }} />
              Connecting to Doctor's station... ({elapsedSec}s)
            </div>
          )}

          {callState === 'ringing' && (
            <div style={{ color: '#34d399', fontSize: '0.92rem', fontWeight: 600 }}>
              <span className="pulse-dot" style={{ backgroundColor: '#10b981', marginRight: '8px' }} />
              Ringing Doctor's console... ({elapsedSec}s)
            </div>
          )}

          {callState === 'accepted' && (
            <div style={{ color: '#34d399', fontSize: '0.92rem', fontWeight: 700 }}>
              ✓ Doctor Accepted! Launching secure video consultation...
            </div>
          )}

          {callState === 'rejected' && (
            <div style={{ color: '#f87171', fontSize: '0.88rem' }}>
              <strong>Doctor Declined Call</strong>
              <p style={{ marginTop: '4px', fontSize: '0.82rem', color: '#cbd5e1' }}>
                {rejectionReason || 'Dr. Sharma is currently in another consultation or unavailable.'}
              </p>
            </div>
          )}

          {callState === 'missed' && (
            <div style={{ color: '#f59e0b', fontSize: '0.88rem' }}>
              <strong style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Clock size={16} /> Doctor Did Not Answer (Timed Out)
              </strong>
              <p style={{ marginTop: '4px', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                The doctor did not answer within 35 seconds. A missed call alert was sent to the doctor. You can retry calling or book another appointment.
              </p>
            </div>
          )}

          {callState === 'offline' && (
            <div style={{ color: '#f87171', fontSize: '0.88rem' }}>
              <strong style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <AlertCircle size={16} /> Doctor is Currently Offline
              </strong>
              <p style={{ marginTop: '4px', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                {rejectionReason || 'The doctor is not currently online in the NEXORA portal. Your call was logged as an alert. Please try again later or book another appointment.'}
              </p>
            </div>
          )}

          {callState === 'cancelled' && (
            <div style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
              Call cancelled by patient.
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          {(callState === 'calling' || callState === 'ringing') ? (
            <button
              id="btn-cancel-call"
              onClick={onCancelCall}
              className="btn btn-secondary"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                padding: '12px 28px',
                borderRadius: '30px',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <PhoneOff size={18} />
              <span>Cancel Call</span>
            </button>
          ) : callState === 'accepted' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
              <RefreshCw size={18} className="animate-spin" />
              <span>Connecting Video...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {onRetryCall && (
                <button
                  id="btn-retry-call"
                  onClick={onRetryCall}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 18px',
                    borderRadius: '24px',
                    fontSize: '0.88rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={15} />
                  <span>Call Again</span>
                </button>
              )}
              {onBookAnother && (
                <button
                  id="btn-book-another-call"
                  onClick={() => {
                    onClose();
                    onBookAnother();
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '10px 18px',
                    borderRadius: '24px',
                    fontSize: '0.88rem',
                    borderColor: 'rgba(56, 189, 248, 0.5)',
                    color: '#38bdf8',
                  }}
                >
                  Book Another Appointment
                </button>
              )}
              <button
                id="btn-close-call-modal"
                onClick={onClose}
                className="btn btn-secondary"
                style={{
                  padding: '10px 20px',
                  borderRadius: '24px',
                  fontSize: '0.88rem',
                }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
