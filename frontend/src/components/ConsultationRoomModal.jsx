import React, { useState } from 'react';
import { X, Video, Mic, Wifi, Shield, PhoneOff, Activity, Users, Radio, CheckCircle2 } from 'lucide-react';

export default function ConsultationRoomModal({ isOpen, onClose, sessionDetails, currentUserRole }) {
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content room-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {/* Room Header */}
        <div className="room-header">
          <div className="room-status-badge">
            <span className="pulse-dot" style={{ backgroundColor: '#10b981' }} />
            <span>Telemedicine Consultation Room (Ready)</span>
          </div>
          <div className="bandwidth-tag">
            <Wifi size={14} color="#38bdf8" />
            <span>Rural 2G/3G Low-Bandwidth Mode • 120 kbps</span>
          </div>
        </div>

        {/* Video Simulation Canvas */}
        <div className="room-video-container">
          <div className="remote-video-placeholder">
            <div className="remote-participant-center">
              <div className="participant-avatar-big">
                {currentUserRole === 'doctor' ? 'RK' : 'AS'}
              </div>
              <h3 style={{ fontSize: '1.2rem', marginTop: '10px' }}>
                {currentUserRole === 'doctor'
                  ? sessionDetails?.patientName || 'Ramesh Kumar (Patient)'
                  : sessionDetails?.doctorName || 'Dr. Ananya Sharma, MD'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#14b8a6' }}>
                {currentUserRole === 'doctor'
                  ? 'Connected via Rampur Village Health Kiosk'
                  : 'Tele-Cardiology & General Medicine • AIIMS'}
              </p>
              <div className="channel-secure-pill">
                <Shield size={13} color="#10b981" />
                <span>Encrypted Signaling (Ready for WebRTC Phase 3)</span>
              </div>
            </div>

            {/* Self-view PiP box */}
            <div className="self-pip-box">
              <div className="pip-label">You ({currentUserRole === 'doctor' ? 'Doctor' : 'Patient'})</div>
              <div className="pip-status">
                {cameraActive ? 'Camera On' : 'Camera Off'} • {micActive ? 'Mic Active' : 'Muted'}
              </div>
            </div>

            {/* Live Vitals HUD */}
            <div className="vitals-hud-overlay">
              <div className="hud-metric">
                <span className="hud-title">Vitals Stream</span>
                <span className="hud-val" style={{ color: '#10b981' }}>BP: 124/82 mmHg</span>
              </div>
              <div className="hud-metric">
                <span className="hud-title">Pulse</span>
                <span className="hud-val" style={{ color: '#f43f5e' }}>72 bpm</span>
              </div>
              <div className="hud-metric">
                <span className="hud-title">SpO2</span>
                <span className="hud-val" style={{ color: '#38bdf8' }}>98%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Consultation Call Controls */}
        <div className="room-controls-bar">
          <button
            className={`room-btn ${micActive ? 'active' : 'muted'}`}
            onClick={() => setMicActive(!micActive)}
            title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            <Mic size={18} />
            <span>{micActive ? 'Mic On' : 'Muted'}</span>
          </button>

          <button
            className={`room-btn ${cameraActive ? 'active' : 'muted'}`}
            onClick={() => setCameraActive(!cameraActive)}
            title={cameraActive ? 'Turn Camera Off' : 'Turn Camera On'}
          >
            <Video size={18} />
            <span>{cameraActive ? 'Video On' : 'Video Off'}</span>
          </button>

          <button
            className="room-btn leave"
            onClick={onClose}
            title="Leave Consultation"
          >
            <PhoneOff size={18} />
            <span>Leave Session</span>
          </button>
        </div>

        <div className="room-footer-note">
          <CheckCircle2 size={14} color="#14b8a6" />
          <span>
            Socket.IO real-time channel linked. Peer-to-peer WebRTC media streaming configured for Phase 3.
          </span>
        </div>
      </div>
    </div>
  );
}
