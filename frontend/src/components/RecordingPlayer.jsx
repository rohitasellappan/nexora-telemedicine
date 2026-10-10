import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  Shield,
  Lock,
  X,
  Clock,
  Calendar,
  User,
  Stethoscope,
  AlertCircle
} from 'lucide-react';

export default function RecordingPlayer({
  recording,
  currentUser,
  onClose,
}) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const playerContainerRef = useRef(null);

  const effectiveUserId = currentUser?.id || (currentUser?.role === 'doctor' ? 'doc-1' : 'pat-1');
  const videoSrc = recording?.videoBlobUrl || 
    (recording?.recordingId 
      ? `/api/recordings/${recording.recordingId}?userId=${effectiveUserId}` 
      : '');

  const downloadUrl = recording?.videoBlobUrl ||
    (recording?.recordingId 
      ? `/api/recordings/${recording.recordingId}?userId=${effectiveUserId}&download=true` 
      : '#');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
        setDuration(video.duration);
      }
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = (e) => {
      console.warn('[RecordingPlayer] Media playback notice:', e);
      // If mock sample file buffer cannot be parsed as complete WebM video, gracefully show informative notice
      if (recording?.videoBlobUrl) {
        setHasError(true);
        setErrorMessage('Cannot load local video recording stream.');
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [recording]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Playback error:', err);
      });
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === Infinity) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        ref={playerContainerRef}
        className="recording-player-modal glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '880px',
          width: '94%',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(20, 184, 166, 0.15)',
        }}
      >
        {/* Header with Privacy Indicator */}
        <div
          className="player-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.95)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(20, 184, 166, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#14b8a6',
              }}
            >
              <Lock size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>
                  Private consultation recording
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontWeight: 600,
                  }}
                >
                  🔒 Encrypted • Authorized Access Only
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Appointment: <strong>{recording?.appointmentId}</strong> • Doctor: <strong>{recording?.doctorName}</strong> • Patient: <strong>{recording?.patientName}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Download Link */}
            <a
              href={downloadUrl}
              download={`nexora_${recording?.appointmentId || 'recording'}.webm`}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}
              title="Download Secure Video"
            >
              <Download size={14} />
              <span>Download</span>
            </a>

            <button
              onClick={onClose}
              className="btn-icon-close"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '6px',
              }}
              title="Close Player"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Video Viewport */}
        <div
          className="player-viewport"
          style={{
            position: 'relative',
            backgroundColor: '#020617',
            aspectRatio: '16/9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Note: Explicitly autoPlay={false} as required */}
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay={false}
            playsInline
            controls={false}
            onClick={togglePlay}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              cursor: 'pointer',
            }}
          />

          {/* Big Play Overlay Button when paused */}
          {!isPlaying && !hasError && (
            <button
              onClick={togglePlay}
              className="big-play-btn"
              style={{
                position: 'absolute',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(20, 184, 166, 0.9)',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 30px rgba(20, 184, 166, 0.6)',
                transition: 'all 0.2s ease',
              }}
              title="Play Recording"
            >
              <Play size={28} style={{ marginLeft: '4px' }} />
            </button>
          )}

          {/* Watermark Banner */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(6px)',
              padding: '4px 10px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              color: '#38bdf8',
              pointerEvents: 'none',
            }}
          >
            <Shield size={12} color="#14b8a6" />
            <span>NEXORA Medical Tele-Consultation Archive</span>
          </div>
        </div>

        {/* Video Controls Bar */}
        <div
          className="player-controls"
          style={{
            padding: '14px 20px',
            background: 'rgba(15, 23, 42, 0.98)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* Timeline Seekbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace', minWidth: '40px' }}>
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || (recording?.duration ? 180 : 100)}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              style={{
                flex: 1,
                cursor: 'pointer',
                accentColor: '#14b8a6',
                height: '5px',
              }}
            />
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace', minWidth: '40px' }}>
              {recording?.duration || formatTime(duration)}
            </span>
          </div>

          {/* Control Buttons Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={togglePlay}
                style={{
                  background: isPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(20, 184, 166, 0.2)',
                  border: '1px solid',
                  borderColor: isPlaying ? '#ef4444' : '#14b8a6',
                  color: isPlaying ? '#ef4444' : '#14b8a6',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              {/* Volume & Mute */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={toggleMute}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  style={{ width: '70px', accentColor: '#14b8a6', height: '4px', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Meta tags & Fullscreen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#94a3b8' }}>
                <Calendar size={13} color="#14b8a6" />
                <span>{recording?.createdAt ? new Date(recording.createdAt).toLocaleDateString() : '08 Oct 2026'}</span>
              </div>
              <button
                type="button"
                onClick={toggleFullscreen}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
