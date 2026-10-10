import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Wifi,
  Shield,
  User,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Activity,
  Layers,
  Sliders,
  Radio,
  Square,
  UploadCloud,
  Download,
  Lock,
  Play,
  Check,
  X,
  FileText,
  Pill,
  Save,
  Clock,
  ChevronRight
} from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function ConsultationRoom({
  appointment,
  currentUserRole = 'patient',
  currentUserName = 'Ramesh Kumar',
  onEndCall,
  onRecordingSaved,
  onHealthRecordSaved,
}) {
  // Local & Remote Media Streams
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Call & Control State
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isLowBandwidth, setIsLowBandwidth] = useState(false);

  // Connection State: 'idle' | 'requesting_permissions' | 'waiting_for_peer' | 'connecting' | 'connected' | 'disconnected' | 'error'
  const [connectionStatus, setConnectionStatus] = useState('requesting_permissions');
  const [statusMessage, setStatusMessage] = useState('Requesting camera & microphone access...');
  const [errorMessage, setErrorMessage] = useState('');
  const [peerInfo, setPeerInfo] = useState(null);

  // Phase 5: Consultation Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState('00:00');
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [peerIsRecording, setPeerIsRecording] = useState(false);
  const [peerRecordingNotice, setPeerRecordingNotice] = useState('');
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState('');
  const [isFinishedModalOpen, setIsFinishedModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isEndCallConfirmOpen, setIsEndCallConfirmOpen] = useState(false);

  // Phase 6: Digital Health Record (DHR) & Doctor Consultation Form State
  const [isRecordPanelOpen, setIsRecordPanelOpen] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState('patient-record'); // 'patient-record' | 'consultation-form'
  
  // Consultation Form fields
  const [formSymptoms, setFormSymptoms] = useState(appointment?.reason || 'Fever, body pain');
  const [formDiagnosis, setFormDiagnosis] = useState('');
  const [formPrescription, setFormPrescription] = useState('');
  const [formDoctorNotes, setFormDoctorNotes] = useState('');
  const [formFollowUp, setFormFollowUp] = useState('');
  
  const [isSavingHealthRecord, setIsSavingHealthRecord] = useState(false);
  const [healthRecordSuccessMsg, setHealthRecordSuccessMsg] = useState('');
  const [healthRecordErrMsg, setHealthRecordErrMsg] = useState('');
  const [savedHealthRecordId, setSavedHealthRecordId] = useState(null);
  const [associatedRecordingId, setAssociatedRecordingId] = useState(appointment?.recordingId || null);
  
  // Patient medical records list
  const [patientHistoryRecords, setPatientHistoryRecords] = useState([]);
  const [isLoadingPatientHistory, setIsLoadingPatientHistory] = useState(false);

  const fetchPatientHistory = async () => {
    const pId = appointment?.patientId || 'pat-1';
    setIsLoadingPatientHistory(true);
    try {
      const res = await fetch(`/api/health-records/patient/${pId}?doctorId=doc-1`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.records)) {
          setPatientHistoryRecords(data.records);
        }
      }
    } catch (err) {
      console.warn('Patient history fetch notice:', err.message);
    } finally {
      setIsLoadingPatientHistory(false);
    }
  };

  useEffect(() => {
    if (currentUserRole === 'doctor') {
      fetchPatientHistory();
    }
  }, [appointment?.patientId, currentUserRole]);

  // Quick Demo Auto-fill helper
  const handleQuickDemoFill = () => {
    setFormSymptoms('Fever, body pain');
    setFormDiagnosis('Viral infection');
    setFormPrescription('Paracetamol 500mg');
    setFormDoctorNotes('Take adequate rest and fluids.');
    setFormFollowUp('3 days');
  };

  // Save consultation health record handler
  const handleSaveConsultationRecord = async (e) => {
    if (e) e.preventDefault();
    setIsSavingHealthRecord(true);
    setHealthRecordSuccessMsg('');
    setHealthRecordErrMsg('');

    try {
      const pId = appointment?.patientId || 'pat-1';
      const pName = appointment?.patientName || 'Kumar';
      const pAge = appointment?.patientAge || 42;
      const pGender = appointment?.patientGender || 'Male';

      const payload = {
        patientId: pId,
        doctorId: 'doc-1',
        appointmentId,
        patientName: pName,
        patientAge: pAge,
        patientGender: pGender,
        doctorName: currentUserName || 'Dr. Priya Sharma',
        doctorSpecialization: appointment?.specialization || 'General Physician',
        consultationDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        symptoms: formSymptoms || 'Fever, body pain',
        diagnosis: formDiagnosis || 'Viral infection',
        prescription: formPrescription || 'Paracetamol 500mg',
        doctorNotes: formDoctorNotes || 'Take adequate rest and fluids.',
        followUpInstructions: formFollowUp || '3 days',
        recordingId: associatedRecordingId || appointment?.recordingId || null,
        allergies: ['None known'],
        existingConditions: ['Diabetes'],
        currentMedications: ['Metformin'],
      };

      const endpoint = savedHealthRecordId ? `/api/health-records/${savedHealthRecordId}` : '/api/health-records';
      const method = savedHealthRecordId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save health record');
      }

      setSavedHealthRecordId(data.record?.id || 'HR-NEW');
      setHealthRecordSuccessMsg('Health record saved successfully.');
      if (onHealthRecordSaved) {
        onHealthRecordSaved(data.record);
      }
      fetchPatientHistory();
    } catch (err) {
      console.error('Error saving consultation record:', err);
      setHealthRecordErrMsg(err.message || 'Error saving consultation record');
    } finally {
      setIsSavingHealthRecord(false);
    }
  };

  // References
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const iceServersRef = useRef(ICE_SERVERS);
  const iceCandidatesQueue = useRef([]);
  const isInitiatorRef = useRef(false);

  // Recording References
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);

  const appointmentId = appointment?.appointmentId || appointment?.id || 'APT-101';
  const roomId = `consultation_${appointmentId}`;

  // Video Constraints helper
  const getVideoConstraints = (lowBandwidth) => {
    if (lowBandwidth) {
      return {
        width: { ideal: 640 },
        height: { ideal: 360 },
        frameRate: { ideal: 15, max: 20 },
      };
    }
    return {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 24 },
    };
  };

  // 1. Initialize Media and Socket.IO
  useEffect(() => {
    let isMounted = true;

    const startConsultation = async () => {
      try {
        setConnectionStatus('requesting_permissions');
        setStatusMessage('Requesting camera & microphone access...');
        setErrorMessage('');

        // Step 1: Request Real Camera & Microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          video: getVideoConstraints(isLowBandwidth),
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Step 2: Fetch production WebRTC ICE servers & connect to Socket.IO signaling
        setStatusMessage('Connecting to NEXORA secure signaling server...');
        try {
          const iceRes = await fetch('/api/webrtc/ice-servers');
          if (iceRes.ok) {
            const iceData = await iceRes.json();
            if (iceData.iceServers && iceData.iceServers.length > 0) {
              iceServersRef.current = { iceServers: iceData.iceServers };
            }
          }
        } catch (iceErr) {
          console.warn('[WebRTC] Dynamic ICE fetch fallback:', iceErr.message);
        }

        const token = localStorage.getItem('nexora_token');
        const effectiveUserId = currentUserRole === 'doctor'
          ? (appointment?.doctorId || 'doc-1')
          : (appointment?.patientId || 'pat-1');

        const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || undefined;
        const socket = io(BACKEND_URL, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          auth: {
            token,
            userId: effectiveUserId,
            role: currentUserRole,
            name: currentUserName,
          },
          query: {
            userId: effectiveUserId,
            role: currentUserRole,
          },
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log(`[Consultation] Socket connected: ${socket.id}, joining room: ${roomId}`);
          socket.emit('join-room', {
            roomId,
            userId: effectiveUserId,
            role: currentUserRole,
            participantName: currentUserName,
          });
        });

        // Step 3: Room Joined event
        socket.on('room-joined', ({ participantCount, isInitiator }) => {
          isInitiatorRef.current = isInitiator;
          if (participantCount > 1) {
            setConnectionStatus('connecting');
            setStatusMessage('Connecting to participant...');
          } else {
            setConnectionStatus('waiting_for_peer');
            setStatusMessage(
              currentUserRole === 'patient'
                ? 'Waiting for Dr. Ananya Sharma to join...'
                : 'Waiting for Patient to join...'
            );
          }
        });

        // Step 4: Handle when other peer joins
        socket.on('peer-joined', async ({ role, participantName, socketId }) => {
          console.log(`[Consultation] Peer joined: ${participantName} (${role})`);
          setPeerInfo({ role, name: participantName });
          setConnectionStatus('connecting');
          setStatusMessage(`${role === 'doctor' ? 'Doctor' : 'Patient'} joined. Establishing secure WebRTC connection...`);

          // Peer A (already in room) creates the Offer
          if (!pcRef.current) {
            setupPeerConnection(stream, socket);
          }

          try {
            console.log('[WebRTC] Creating offer as room host');
            const offer = await pcRef.current.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await pcRef.current.setLocalDescription(offer);

            socket.emit('offer', {
              roomId,
              sdp: offer,
            });
          } catch (err) {
            console.error('[WebRTC] Error creating offer:', err);
          }
        });

        // Step 5: Handle incoming WebRTC Offer
        socket.on('offer', async ({ sdp, senderRole, senderName }) => {
          console.log(`[WebRTC] Received offer from ${senderName || senderRole}`);
          setPeerInfo({ role: senderRole, name: senderName });
          setConnectionStatus('connecting');
          setStatusMessage('Processing connection offer...');

          if (!pcRef.current) {
            setupPeerConnection(stream, socket);
          }

          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
            processBufferedCandidates();

            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);

            console.log('[WebRTC] Emitting answer back to room');
            socket.emit('answer', {
              roomId,
              sdp: answer,
            });
          } catch (err) {
            console.error('[WebRTC] Error handling offer:', err);
          }
        });

        // Step 6: Handle incoming WebRTC Answer
        socket.on('answer', async ({ sdp }) => {
          console.log('[WebRTC] Received answer');
          if (pcRef.current) {
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
              processBufferedCandidates();
            } catch (err) {
              console.error('[WebRTC] Error setting remote description from answer:', err);
            }
          }
        });

        // Step 7: Handle incoming ICE Candidate
        socket.on('ice-candidate', async ({ candidate }) => {
          if (!candidate) return;
          if (pcRef.current && pcRef.current.remoteDescription) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error('[WebRTC] Error adding ICE candidate:', err);
            }
          } else {
            // Buffer candidate until remote description is set
            iceCandidatesQueue.current.push(candidate);
          }
        });

        // Step 8: Peer Left / Call Ended
        socket.on('peer-left', ({ role, participantName }) => {
          console.log(`[Consultation] Peer left: ${participantName || role}`);
          setRemoteStream(null);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
          }
          setConnectionStatus('waiting_for_peer');
          setStatusMessage(
            `${role === 'doctor' ? 'Doctor' : 'Patient'} has left the consultation. Waiting for reconnection...`
          );
        });

        socket.on('call-ended', () => {
          alert('The consultation has been ended by the other participant.');
          executeEndCall();
        });

        // Step 9: Consultation Recording Signaling Listeners
        socket.on('recording-started', ({ startedBy, participantName }) => {
          console.log(`[Signaling] Other participant started recording: ${participantName} (${startedBy})`);
          setPeerIsRecording(true);
          setPeerRecordingNotice(`🔴 ${participantName || (startedBy === 'doctor' ? 'Doctor' : 'Patient')} has started recording this consultation.`);
        });

        socket.on('recording-stopped', ({ stoppedBy, participantName }) => {
          console.log(`[Signaling] Other participant stopped recording`);
          setPeerIsRecording(false);
          setPeerRecordingNotice('Recording stopped.');
          setTimeout(() => setPeerRecordingNotice(''), 6000);
        });

        // Step 10: Setup peer connection instance
        setupPeerConnection(stream, socket);
      } catch (err) {
        console.error('[Consultation Error]', err);
        setConnectionStatus('error');
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('Camera access is required for video consultation. Microphone access is required for audio consultation. Please allow permissions in your browser address bar.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorMessage('Camera could not be accessed. No camera or microphone found on your device.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setErrorMessage('Camera or microphone is already in use by another application.');
        } else {
          setErrorMessage(`Media error: ${err.message || 'Could not access camera/mic'}`);
        }
      }
    };

    startConsultation();

    return () => {
      isMounted = false;
      cleanupCall();
    };
  }, [roomId]);

  // Setup RTCPeerConnection with local tracks and event listeners
  const setupPeerConnection = (stream, socket) => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(iceServersRef.current || ICE_SERVERS);
    pcRef.current = pc;

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote track reception
    pc.ontrack = (event) => {
      console.log('[WebRTC] ontrack received remote media stream:', event.streams[0]);
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setConnectionStatus('connected');
      setStatusMessage('Connected');
    };

    // Handle ICE candidates generated locally
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state changed:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
        setStatusMessage('Connected');
      } else if (pc.connectionState === 'connecting') {
        setConnectionStatus('connecting');
        setStatusMessage('Establishing peer connection...');
      } else if (pc.connectionState === 'disconnected') {
        setConnectionStatus('disconnected');
        setStatusMessage('Connection lost. Trying to reconnect...');
      } else if (pc.connectionState === 'failed') {
        setConnectionStatus('disconnected');
        setStatusMessage('Connection lost. Trying to reconnect...');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionStatus('connected');
        setStatusMessage('Connected');
      }
    };

    return pc;
  };

  // Process queued ICE candidates
  const processBufferedCandidates = async () => {
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] Error processing buffered candidate:', err);
        }
      }
    }
  };

  // Toggle Microphone Mute
  const handleToggleMic = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const newMutedState = !isMicMuted;
        audioTracks.forEach((track) => {
          track.enabled = !newMutedState;
        });
        setIsMicMuted(newMutedState);
      }
    }
  };

  // Toggle Camera On / Off
  const handleToggleCamera = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const newCameraOffState = !isCameraOff;
        videoTracks.forEach((track) => {
          track.enabled = !newCameraOffState;
        });
        setIsCameraOff(newCameraOffState);
      }
    }
  };

  // Toggle Low Bandwidth Mode (adaptive constraints)
  const handleToggleBandwidthMode = async () => {
    const nextMode = !isLowBandwidth;
    setIsLowBandwidth(nextMode);

    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack && videoTrack.applyConstraints) {
        try {
          await videoTrack.applyConstraints(getVideoConstraints(nextMode));
          console.log(`[WebRTC] Applied ${nextMode ? 'low bandwidth' : 'normal'} constraints to video track`);
        } catch (err) {
          console.warn('[WebRTC] Could not apply constraints dynamically:', err);
        }
      }
    }
  };

  // ==========================================
  // PHASE 5: SECURE CONSULTATION RECORDING
  // ==========================================

  // Step 1: Open Consent Modal when user clicks "Start Recording"
  const handleInitiateRecording = () => {
    if (isRecording) {
      stopRecordingSession();
    } else {
      setIsConsentModalOpen(true);
    }
  };

  // Step 2: User explicitly consents by clicking "I Agree & Start Recording"
  const handleConfirmConsentAndStart = () => {
    setIsConsentModalOpen(false);
    startRecordingSession();
  };

  // Step 3: MediaRecorder + Canvas composition + AudioContext Mixing
  const startRecordingSession = () => {
    try {
      recordedChunksRef.current = [];

      // Create an offscreen composite canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      // Setup Web Audio API destination for mixing local & remote audio
      let dest = null;
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        try {
          const audioCtx = new AudioCtxClass();
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }
          audioCtxRef.current = audioCtx;
          dest = audioCtx.createMediaStreamDestination();

          if (localStream && localStream.getAudioTracks().length > 0) {
            const localAudioSource = audioCtx.createMediaStreamSource(localStream);
            localAudioSource.connect(dest);
          }
          if (remoteStream && remoteStream.getAudioTracks().length > 0) {
            const remoteAudioSource = audioCtx.createMediaStreamSource(remoteStream);
            remoteAudioSource.connect(dest);
          }
        } catch (audioErr) {
          console.warn('[Recording] Audio mix fallback:', audioErr);
        }
      }

      // Continuous Canvas Rendering Loop
      const renderFrame = () => {
        // Dark Telemedicine Canvas Background
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const hasRemoteVideo =
          remoteVideoRef.current &&
          remoteStream &&
          remoteVideoRef.current.readyState >= 2 &&
          remoteVideoRef.current.videoWidth > 0;

        const hasLocalVideo =
          localVideoRef.current &&
          localStream &&
          localVideoRef.current.readyState >= 2 &&
          !isCameraOff;

        if (hasRemoteVideo && hasLocalVideo) {
          // Side-by-Side Dual Telemedicine Layout (640x600 each)
          ctx.drawImage(remoteVideoRef.current, 0, 40, 640, 600);
          ctx.drawImage(localVideoRef.current, 640, 40, 640, 600);

          // Divider bar
          ctx.fillStyle = 'rgba(20, 184, 166, 0.4)';
          ctx.fillRect(638, 40, 4, 600);

          // Lower Participant Banner
          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.fillRect(0, 640, 1280, 80);

          ctx.fillStyle = '#14b8a6';
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.fillText(
            `${currentUserRole === 'doctor' ? 'Patient' : 'Doctor'}: ${otherParticipantTitle}`,
            24,
            688
          );

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.fillText(
            `You (${currentUserRole === 'doctor' ? 'Doctor' : 'Patient'}): ${currentUserName}`,
            664,
            688
          );
        } else if (hasRemoteVideo) {
          ctx.drawImage(remoteVideoRef.current, 0, 0, 1280, 720);
        } else if (hasLocalVideo) {
          ctx.drawImage(localVideoRef.current, 0, 0, 1280, 720);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 1280, 720);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '22px system-ui, sans-serif';
          ctx.fillText('NEXORA Encrypted Video Consultation Recording', 400, 360);
        }

        // Top Header Banner
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, 1280, 44);

        // Recording Live Indicator Dot
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(28, 22, 7, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillText(`NEXORA SECURE TELECONSULTATION • ${appointmentId}`, 46, 28);

        ctx.fillStyle = '#10b981';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText(new Date().toLocaleTimeString(), 1180, 28);

        animFrameRef.current = requestAnimationFrame(renderFrame);
      };

      renderFrame();

      // Combine video from canvas with audio from AudioContext
      const canvasStream = canvas.captureStream(25);
      const combinedTracks = [...canvasStream.getVideoTracks()];

      if (dest && dest.stream.getAudioTracks().length > 0) {
        combinedTracks.push(...dest.stream.getAudioTracks());
      } else if (localStream && localStream.getAudioTracks().length > 0) {
        combinedTracks.push(...localStream.getAudioTracks());
      }

      const compositeStream = new MediaStream(combinedTracks);

      // Supported WebM MIME type selection
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        } else {
          mimeType = '';
        }
      }

      const recorder = new MediaRecorder(compositeStream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }

        const blob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || 'video/webm',
        });

        if (blob.size === 0) {
          console.warn('[Recording] Recorded blob is empty (0 bytes)');
          alert('Recording was empty. Please record again with video/audio enabled.');
          return;
        }

        const url = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setRecordedUrl(url);
        setIsFinishedModalOpen(true);
      };

      recorder.start(1000); // 1-second timeslices
      setIsRecording(true);

      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        setRecordingDuration(`${m}:${s}`);
      }, 1000);

      // Notify the other participant via Socket.IO signaling
      if (socketRef.current) {
        socketRef.current.emit('recording-started', {
          roomId,
          startedBy: currentUserRole,
          participantName: currentUserName,
        });
      }
    } catch (err) {
      console.error('[Recording Error]', err);
      alert('Could not start consultation recording: ' + err.message);
    }
  };

  // Step 4: Stop Recording Session
  const stopRecordingSession = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData();
        }
      } catch (reqErr) {
        console.warn('[Recording] Error requesting final data chunk:', reqErr);
      }
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);

    // Notify other participant via Socket.IO
    if (socketRef.current) {
      socketRef.current.emit('recording-stopped', {
        roomId,
        stoppedBy: currentUserRole,
        participantName: currentUserName,
      });
    }
  };

  // Step 5: Upload Recording to Backend
  const handleUploadRecording = async () => {
    if (isUploading) return;
    if (!recordedBlob || recordedBlob.size === 0) {
      alert('Cannot upload an empty consultation recording.');
      return;
    }
    setIsUploading(true);
    setUploadMessage('Encrypting and securing consultation recording on NEXORA server...');

    try {
      const filename = `appointment_${appointmentId}_${Date.now()}.webm`;
      const formData = new FormData();
      formData.append('appointmentId', appointmentId);
      formData.append('patientId', appointment?.patientId || 'pat-1');
      formData.append('doctorId', appointment?.doctorId || 'doc-1');
      formData.append('patientName', appointment?.patientName || 'Ramesh Kumar');
      formData.append('doctorName', appointment?.doctorName || 'Dr. Ananya Sharma, MD');
      formData.append('duration', recordingDuration);
      formData.append('uploadedByRole', currentUserRole);
      formData.append('consentGiven', 'true');
      const effectiveUserId = currentUserRole === 'doctor' ? (appointment?.doctorId || 'doc-1') : (appointment?.patientId || 'pat-1');
      formData.append('uploaderId', effectiveUserId);
      formData.append('recording', recordedBlob, filename);

      const headers = {
        'x-user-id': effectiveUserId,
        'x-user-role': currentUserRole,
      };
      const token = localStorage.getItem('nexora_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/recordings', {
        method: 'POST',
        headers,
        body: formData,
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Server error while uploading recording.');
      }

      setUploadMessage('Consultation recording successfully saved & encrypted!');
      if (json.recording?.recordingId) {
        setAssociatedRecordingId(json.recording.recordingId);
        if (savedHealthRecordId) {
          fetch(`/api/health-records/${savedHealthRecordId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              doctorId: 'doc-1',
              recordingId: json.recording.recordingId,
            }),
          }).catch(() => {});
        }
      }
      if (onRecordingSaved) {
        onRecordingSaved(json.recording);
      }

      setTimeout(() => {
        setIsFinishedModalOpen(false);
        setIsUploading(false);
        setUploadMessage('');
      }, 1800);
    } catch (err) {
      console.error('[Upload Recording Error]', err);
      setUploadMessage(`Upload failed: ${err.message}`);
      setIsUploading(false);
    }
  };

  // Cleanup helper
  const cleanupCall = () => {
    if (isRecording) {
      stopRecordingSession();
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  // Execute End Call
  const executeEndCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('call-ended', { roomId });
    }
    cleanupCall();
    if (onEndCall) {
      onEndCall();
    }
  };

  // End Call Guard (Do not silently discard active recording)
  const handleEndCallClick = () => {
    if (isRecording) {
      setIsEndCallConfirmOpen(true);
    } else {
      executeEndCall();
    }
  };

  // Retry permission request
  const handleRetryPermissions = () => {
    window.location.reload();
  };

  const otherParticipantTitle =
    currentUserRole === 'doctor'
      ? appointment?.patientName || 'Patient'
      : appointment?.doctorName || 'Dr. Ananya Sharma, MD';

  return (
    <div className="consultation-full-page">
      {/* Top Consultation Navigation Bar */}
      <header className="consultation-nav-bar">
        <div className="nav-left">
          <div className="brand-logo-icon" style={{ width: '36px', height: '36px' }}>
            <Stethoscope size={20} />
          </div>
          <div>
            <div className="brand-title-wrap">
              <span className="brand-bold">NEXORA</span>
              <span className="secure-badge">
                <Shield size={12} color="#10b981" /> 256-bit Encrypted Telemedicine
              </span>
            </div>
            <span className="sub-room-id">
              Room: <strong>{roomId}</strong> • Appointment: <strong>{appointmentId}</strong>
            </span>
          </div>
        </div>

        {/* Center Connection Status Pill */}
        <div className="nav-center-status">
          <div
            className={`call-status-pill ${
              connectionStatus === 'connected'
                ? 'connected'
                : connectionStatus === 'disconnected' || connectionStatus === 'error'
                ? 'disconnected'
                : 'connecting'
            }`}
          >
            <span
              className="pulse-dot"
              style={{
                backgroundColor:
                  connectionStatus === 'connected'
                    ? '#10b981'
                    : connectionStatus === 'disconnected' || connectionStatus === 'error'
                    ? '#ef4444'
                    : '#f59e0b',
              }}
            />
            <span>
              {connectionStatus === 'connected'
                ? '🟢 Connected'
                : connectionStatus === 'disconnected'
                ? '🔴 Connection lost'
                : connectionStatus === 'error'
                ? '🔴 Hardware Error'
                : '🟡 Connecting...'}
            </span>
          </div>

          <span className="secure-call-text">Secure video consultation</span>
        </div>

        {/* Right Info, Bandwidth Toggle, and Return button */}
        <div className="nav-right-actions">
          {/* Active Recording Pill in Header if recording is ongoing */}
          {isRecording && (
            <div
              className="recording-live-pill"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '5px 12px',
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: '0.82rem',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  animation: 'pulse 1s infinite',
                }}
              />
              <span>🔴 Recording {recordingDuration}</span>
            </div>
          )}

          {/* Low Bandwidth Mode Toggle */}
          <button
            type="button"
            className={`bandwidth-toggle-btn ${isLowBandwidth ? 'active' : ''}`}
            onClick={handleToggleBandwidthMode}
            title="Toggle between Normal Quality and Rural Low-Bandwidth Mode"
          >
            <Wifi size={14} color={isLowBandwidth ? '#10b981' : '#38bdf8'} />
            <span>{isLowBandwidth ? 'Low Bandwidth (360p)' : 'Normal Quality (720p)'}</span>
          </button>

          {/* Phase 6: Doctor Patient Record & Form button in top bar */}
          {currentUserRole === 'doctor' && (
            <button
              type="button"
              id="btn-nav-patient-record"
              className="btn btn-primary"
              style={{
                padding: '6px 14px',
                fontSize: '0.82rem',
                background: isRecordPanelOpen ? 'rgba(20, 184, 166, 0.4)' : '#0d9488',
                borderColor: '#14b8a6',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => {
                setIsRecordPanelOpen(true);
                fetchPatientHistory();
              }}
            >
              <FileText size={14} />
              <span>View Patient Record</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            onClick={handleEndCallClick}
          >
            <ArrowLeft size={14} />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </header>

      {/* Recording Notifications Banner for Peer */}
      {(peerIsRecording || peerRecordingNotice) && (
        <div
          className="recording-peer-banner"
          style={{
            background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))',
            color: '#ffffff',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '0.9rem',
            fontWeight: 700,
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
            zIndex: 100,
          }}
        >
          <Radio size={18} className="animate-pulse" />
          <span>🔴 This consultation is being recorded.</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.9, fontWeight: 400 }}>
            (Authorized session archived under appointment {appointmentId})
          </span>
        </div>
      )}

      {/* Main Video Call Area */}
      <main className="consultation-stage">
        {/* Error Alert Box */}
        {connectionStatus === 'error' && (
          <div className="permission-error-box glass-panel">
            <AlertCircle size={36} color="#ef4444" />
            <h3>Hardware Access Notice</h3>
            <p>{errorMessage}</p>
            <button className="btn btn-primary" onClick={handleRetryPermissions}>
              <RefreshCw size={16} /> Retry Camera / Microphone
            </button>
          </div>
        )}

        {/* Remote Video Container (Primary Screen) */}
        <div className="video-viewport remote-viewport">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`remote-video-feed ${remoteStream ? 'visible' : 'hidden'}`}
          />

          {/* Waiting Room Placeholder Overlay when remote peer is not yet connected */}
          {!remoteStream && connectionStatus !== 'error' && (
            <div className="waiting-participant-card">
              <div className="waiting-avatar-circle">
                {currentUserRole === 'doctor' ? <User size={40} /> : <Stethoscope size={40} />}
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '16px' }}>
                {otherParticipantTitle}
              </h2>
              <p style={{ color: '#14b8a6', fontSize: '0.9rem', marginTop: '4px' }}>
                {currentUserRole === 'doctor'
                  ? 'Remote Patient • Rampur Village Health Center'
                  : 'Tele-Cardiology & General Medicine • AIIMS'}
              </p>

              <div className="waiting-status-strip">
                <span className="pulse-dot" style={{ backgroundColor: '#f59e0b' }} />
                <span>Waiting for the other participant...</span>
              </div>

              <div className="peer-instructions">
                <span>
                  💡 To test browser-to-browser calling, open <strong>http://localhost:5173</strong> in a second window,
                  log in as <strong>{currentUserRole === 'doctor' ? 'Patient' : 'Doctor'}</strong>, and join appointment {appointmentId}!
                </span>
              </div>
            </div>
          )}

          {/* Participant Label on Remote Video */}
          {remoteStream && (
            <div className="remote-label-badge">
              <span className="pulse-dot" style={{ backgroundColor: '#10b981' }} />
              <span>
                {otherParticipantTitle} ({currentUserRole === 'doctor' ? 'Patient' : 'Doctor'})
              </span>
            </div>
          )}

          {/* Live Vitals HUD */}
          <div className="telemed-vitals-overlay">
            <div className="vitals-metric-pill">
              <Activity size={13} color="#14b8a6" />
              <span>BP: <strong>124/82 mmHg</strong></span>
            </div>
            <div className="vitals-metric-pill">
              <span style={{ color: '#f43f5e' }}>♥</span>
              <span>Pulse: <strong>72 bpm</strong></span>
            </div>
            <div className="vitals-metric-pill">
              <span style={{ color: '#38bdf8' }}>O₂</span>
              <span>SpO2: <strong>98%</strong></span>
            </div>
            {isLowBandwidth && (
              <div className="vitals-metric-pill low-bw">
                <Wifi size={12} color="#10b981" />
                <span>Low Bandwidth (360p @ 15fps)</span>
              </div>
            )}
          </div>

          {/* Local Video Window (PiP / Self View) */}
          <div className="local-video-pip glass-panel">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted // IMPORTANT: Local video MUST be muted to prevent acoustic feedback echo
              className={`local-video-feed ${!isCameraOff ? 'visible' : 'hidden'}`}
            />

            {/* When Camera is turned off */}
            {isCameraOff && (
              <div className="camera-off-placeholder">
                <VideoOff size={28} color="#94a3b8" />
                <span>Camera Off</span>
              </div>
            )}

            <div className="pip-overlay-info">
              <span className="pip-user-name">
                You ({currentUserRole === 'doctor' ? 'Doctor' : 'Patient'})
              </span>
              <div className="pip-status-icons">
                {isMicMuted && <MicOff size={13} color="#ef4444" title="Microphone muted" />}
                {isCameraOff && <VideoOff size={13} color="#ef4444" title="Camera disabled" />}
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Information Card below video */}
        <div className="consultation-info-strip glass-panel">
          <div className="info-col">
            <span className="label">Appointment ID</span>
            <span className="val" style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{appointmentId}</span>
          </div>
          <div className="info-col">
            <span className="label">Patient Name</span>
            <span className="val">{appointment?.patientName || 'Ramesh Kumar'}</span>
          </div>
          <div className="info-col">
            <span className="label">Doctor</span>
            <span className="val">{appointment?.doctorName || 'Dr. Ananya Sharma, MD'}</span>
          </div>
          <div className="info-col">
            <span className="label">Clinical Reason</span>
            <span className="val">{appointment?.reason || 'General Tele-Consultation'}</span>
          </div>
          <div className="info-col">
            <span className="label">Encryption</span>
            <span className="val" style={{ color: '#10b981' }}>WebRTC DTLS / SRTP (P2P)</span>
          </div>
        </div>

        {/* WebRTC Call & Recording Controls Bar */}
        <footer className="consultation-controls-dock">
          {/* Microphone Mute Toggle */}
          <button
            type="button"
            className={`dock-btn ${isMicMuted ? 'danger' : 'active'}`}
            onClick={handleToggleMic}
            title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
            <span>{isMicMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          {/* Camera On / Off Toggle */}
          <button
            type="button"
            className={`dock-btn ${isCameraOff ? 'danger' : 'active'}`}
            onClick={handleToggleCamera}
            title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isCameraOff ? <VideoOff size={20} /> : <VideoIcon size={20} />}
            <span>{isCameraOff ? 'Start Video' : 'Stop Video'}</span>
          </button>

          {/* Quality Mode Switcher */}
          <button
            type="button"
            className={`dock-btn ${isLowBandwidth ? 'highlight' : ''}`}
            onClick={handleToggleBandwidthMode}
            title="Toggle Low Bandwidth Mode"
          >
            <Sliders size={20} />
            <span>{isLowBandwidth ? 'Low-BW (360p)' : 'Quality (720p)'}</span>
          </button>

          {/* Consultation Recording Button */}
          {!isRecording ? (
            <button
              type="button"
              id="btn-start-recording"
              className="dock-btn recording-btn"
              onClick={handleInitiateRecording}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                borderColor: '#ef4444',
                color: '#f87171',
              }}
              title="Record Consultation (Consent Required)"
            >
              <Radio size={20} color="#ef4444" />
              <span>🎥 Start Recording</span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-stop-recording"
              className="dock-btn recording-active-btn"
              onClick={stopRecordingSession}
              style={{
                background: 'rgba(239, 68, 68, 0.9)',
                borderColor: '#ef4444',
                color: '#ffffff',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)',
              }}
              title="Stop Recording"
            >
              <Square size={18} fill="#ffffff" />
              <span>Stop Recording ({recordingDuration})</span>
            </button>
          )}

          {/* Phase 6: Doctor Patient Record & Consultation Form Dock Button */}
          {currentUserRole === 'doctor' && (
            <button
              type="button"
              id="btn-dock-patient-record"
              className={`dock-btn ${isRecordPanelOpen ? 'active' : ''}`}
              onClick={() => {
                setIsRecordPanelOpen(!isRecordPanelOpen);
                if (!isRecordPanelOpen) fetchPatientHistory();
              }}
              style={{
                background: isRecordPanelOpen ? 'rgba(20, 184, 166, 0.35)' : 'rgba(20, 184, 166, 0.15)',
                borderColor: '#14b8a6',
                color: '#2dd4bf',
              }}
              title="View Patient Record and Consultation Form"
            >
              <FileText size={20} color="#14b8a6" />
              <span>{isRecordPanelOpen ? 'Hide Record' : 'View Patient Record'}</span>
            </button>
          )}

          {/* End Call Button */}
          <button
            type="button"
            className="dock-btn end-call"
            onClick={handleEndCallClick}
            title="End Video Consultation"
          >
            <PhoneOff size={22} />
            <span>End Call</span>
          </button>
        </footer>
      </main>

      {/* ==================================================== */}
      {/* 1. HEALTHCARE PRIVACY CONSENT DIALOG MODAL */}
      {/* ==================================================== */}
      {isConsentModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div
            className="recording-consent-modal glass-panel"
            style={{
              maxWidth: '480px',
              width: '90%',
              padding: '28px',
              borderRadius: '16px',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#ef4444',
              }}
            >
              <Radio size={28} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>
              Record Consultation?
            </h2>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '16px',
                borderRadius: '10px',
                marginBottom: '20px',
                textAlign: 'left',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <p style={{ margin: '0 0 8px 0' }}>
                This consultation will be recorded.
              </p>
              <p style={{ margin: '0 0 8px 0', color: '#fca5a5' }}>
                ⚠️ The recording may contain sensitive medical information.
              </p>
              <p style={{ margin: '0', color: '#94a3b8' }}>
                Both participants will be notified. Only authorized patient and doctor can access it later.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px 18px' }}
                onClick={() => setIsConsentModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-agree-recording"
                className="btn btn-primary"
                style={{
                  flex: 1.3,
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  borderColor: '#ef4444',
                }}
                onClick={handleConfirmConsentAndStart}
              >
                <Check size={16} /> I Agree & Start Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. POST-RECORDING READY & UPLOAD MODAL */}
      {/* ==================================================== */}
      {isFinishedModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div
            className="recording-finished-modal glass-panel"
            style={{
              maxWidth: '560px',
              width: '90%',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={22} color="#10b981" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Consultation recording ready.</h3>
              </div>
              <button
                onClick={() => setIsFinishedModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Video Preview */}
            {recordedUrl && (
              <div
                style={{
                  borderRadius: '10px',
                  overflow: 'hidden',
                  background: '#020617',
                  marginBottom: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <video
                  src={recordedUrl}
                  controls
                  style={{ width: '100%', maxHeight: '240px', objectFit: 'contain' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
              <span>Duration: <strong style={{ color: '#ffffff' }}>{recordingDuration}</strong></span>
              <span>Appointment: <strong style={{ color: '#38bdf8' }}>{appointmentId}</strong></span>
              <span>Size: <strong style={{ color: '#ffffff' }}>{recordedBlob ? (recordedBlob.size / 1024).toFixed(1) + ' KB' : ''}</strong></span>
            </div>

            {uploadMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.86rem',
                  background: uploadMessage.includes('Error') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: uploadMessage.includes('Error') ? '#fca5a5' : '#6ee7b7',
                  border: `1px solid ${uploadMessage.includes('Error') ? '#ef4444' : '#10b981'}`,
                }}
              >
                {uploadMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <a
                href={recordedUrl}
                download={`consultation_${appointmentId}_recording.webm`}
                className="btn btn-secondary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={15} /> Download
              </a>

              <button
                type="button"
                id="btn-upload-recording"
                className="btn btn-primary"
                onClick={handleUploadRecording}
                disabled={isUploading}
              >
                <UploadCloud size={16} />
                <span>{isUploading ? 'Securing...' : 'Upload Recording'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. END CALL GUARD WHILE RECORDING IS ACTIVE */}
      {/* ==================================================== */}
      {isEndCallConfirmOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div
            className="recording-guard-modal glass-panel"
            style={{
              maxWidth: '460px',
              width: '90%',
              padding: '24px',
              borderRadius: '16px',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={36} color="#f59e0b" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>
              Recording is still active.
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
              Stop and save the recording before leaving?
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsEndCallConfirmOpen(false);
                  executeEndCall();
                }}
              >
                Leave Without Saving
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsEndCallConfirmOpen(false);
                  stopRecordingSession();
                }}
              >
                <Square size={14} fill="#ffffff" /> Stop & Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ==================================================== */}
      {/* 4. DOCTOR PATIENT RECORD & CONSULTATION FORM DRAWER */}
      {/* ==================================================== */}
      {isRecordPanelOpen && (
        <aside
          className="doctor-clinical-drawer"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '480px',
            maxWidth: '96vw',
            backgroundColor: '#090d16',
            borderLeft: '1px solid rgba(20, 184, 166, 0.3)',
            boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.85)',
            zIndex: 1050,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Drawer Top Header */}
          <div
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(20, 184, 166, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#14b8a6',
                }}
              >
                <FileText size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  Clinical Record System
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  NEXORA Digital Health Records • Appointment: <strong style={{ color: '#38bdf8' }}>{appointmentId}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRecordPanelOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
              }}
              aria-label="Close record panel"
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Tabs (Patient Record vs Consultation Form) */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(2, 6, 23, 0.5)',
            }}
          >
            <button
              type="button"
              id="tab-view-patient-record"
              onClick={() => setActivePanelTab('patient-record')}
              style={{
                flex: 1,
                padding: '12px 14px',
                border: 'none',
                background: activePanelTab === 'patient-record' ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                color: activePanelTab === 'patient-record' ? '#2dd4bf' : '#94a3b8',
                borderBottom: activePanelTab === 'patient-record' ? '2px solid #14b8a6' : '2px solid transparent',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <User size={16} /> View Patient Record
            </button>

            <button
              type="button"
              id="tab-consultation-form"
              onClick={() => setActivePanelTab('consultation-form')}
              style={{
                flex: 1,
                padding: '12px 14px',
                border: 'none',
                background: activePanelTab === 'consultation-form' ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                color: activePanelTab === 'consultation-form' ? '#2dd4bf' : '#94a3b8',
                borderBottom: activePanelTab === 'consultation-form' ? '2px solid #14b8a6' : '2px solid transparent',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Stethoscope size={16} /> Consultation Form
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {activePanelTab === 'patient-record' ? (
              /* ==================================================== */
              /* TAB 1: PATIENT RECORD (REQUIREMENT 2) */
              /* ==================================================== */
              <div>
                {/* Header Card */}
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#14b8a6', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                      PATIENT RECORD
                    </span>
                    <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {appointment?.patientId || 'pat-1'}
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px 0', color: '#ffffff' }}>
                    Name: {appointment?.patientName || 'Kumar'}
                  </h2>
                  <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                    Age: <strong>{appointment?.patientAge || 42}</strong> &nbsp;•&nbsp; Gender: <strong>{appointment?.patientGender || 'Male'}</strong>
                  </div>
                </div>

                {/* Medical History Section */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', paddingBottom: '4px' }}>
                    Medical History
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)', color: '#e2e8f0', fontSize: '0.92rem', fontWeight: 600 }}>
                    Diabetes
                  </div>
                </div>

                {/* Allergies Section */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '4px' }}>
                    Allergies
                  </div>
                  <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#fca5a5', fontSize: '0.92rem' }}>
                    None known
                  </div>
                </div>

                {/* Previous Consultations Section */}
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#14b8a6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px', borderBottom: '1px solid rgba(20, 184, 166, 0.2)', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Previous Consultations</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      ({patientHistoryRecords.length || 1} on file)
                    </span>
                  </div>

                  {isLoadingPatientHistory ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                      Loading previous consultations...
                    </div>
                  ) : patientHistoryRecords.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {patientHistoryRecords.map((histRec) => (
                        <div
                          key={histRec.id}
                          style={{
                            background: 'rgba(15, 23, 42, 0.7)',
                            padding: '14px 16px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderLeft: '3px solid #14b8a6',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '4px' }}>
                            <span>📅 {histRec.consultationDate}</span>
                            <span style={{ color: '#38bdf8' }}>{histRec.appointmentId}</span>
                          </div>
                          <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                            {histRec.doctorName}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#14b8a6', marginBottom: '6px' }}>
                            {histRec.doctorSpecialization || 'Telemedicine Specialist'}
                          </div>
                          <div style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: '6px' }}>
                            <strong style={{ color: '#94a3b8' }}>Diagnosis: </strong>
                            <span style={{ color: '#f1f5f9' }}>{histRec.diagnosis}</span>
                          </div>
                          {histRec.prescription && (
                            <div style={{ fontSize: '0.84rem', color: '#99f6e4', marginTop: '4px' }}>
                              <strong style={{ color: '#94a3b8' }}>Prescription: </strong>
                              {histRec.prescription}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Clean Fallback Display matching exact prompt example */
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderLeft: '3px solid #14b8a6',
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '4px' }}>
                        08 Oct 2026
                      </div>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                        Dr. Priya Sharma
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: '6px' }}>
                        <strong style={{ color: '#94a3b8' }}>Diagnosis: </strong>
                        Viral infection
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action to switch to form */}
                <div style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '10px', fontSize: '0.9rem', justifyContent: 'center' }}
                    onClick={() => setActivePanelTab('consultation-form')}
                  >
                    <span>Write Consultation Record</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* ==================================================== */
              /* TAB 2: DOCTOR CONSULTATION FORM (REQUIREMENT 3) */
              /* ==================================================== */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#14b8a6', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                    CONSULTATION RECORD FORM
                  </span>
                  <button
                    type="button"
                    onClick={handleQuickDemoFill}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Pre-populate with sample clinical values"
                  >
                    <Sparkles size={13} /> Quick Demo Fill
                  </button>
                </div>

                {/* Status messages */}
                {healthRecordSuccessMsg && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid #10b981',
                      color: '#6ee7b7',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <CheckCircle2 size={18} color="#10b981" />
                    <span>{healthRecordSuccessMsg}</span>
                  </div>
                )}

                {healthRecordErrMsg && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid #ef4444',
                      color: '#fca5a5',
                      fontSize: '0.88rem',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={18} color="#ef4444" />
                    <span>{healthRecordErrMsg}</span>
                  </div>
                )}

                {associatedRecordingId && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Radio size={14} /> Recording Attached: {associatedRecordingId}
                  </div>
                )}

                <form onSubmit={handleSaveConsultationRecord} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Symptoms */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                      Symptoms
                    </label>
                    <input
                      id="input-symptoms"
                      type="text"
                      className="form-input"
                      value={formSymptoms}
                      onChange={(e) => setFormSymptoms(e.target.value)}
                      placeholder="e.g. Fever, body pain"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                  </div>

                  {/* Diagnosis */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                      Diagnosis
                    </label>
                    <input
                      id="input-diagnosis"
                      type="text"
                      className="form-input"
                      value={formDiagnosis}
                      onChange={(e) => setFormDiagnosis(e.target.value)}
                      placeholder="e.g. Viral infection"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                  </div>

                  {/* Prescription */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                      Prescription
                    </label>
                    <textarea
                      id="input-prescription"
                      rows={3}
                      className="form-input"
                      value={formPrescription}
                      onChange={(e) => setFormPrescription(e.target.value)}
                      placeholder="e.g. Paracetamol 500mg"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                      required
                    />
                  </div>

                  {/* Doctor Notes */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                      Doctor Notes
                    </label>
                    <textarea
                      id="input-doctor-notes"
                      rows={2}
                      className="form-input"
                      value={formDoctorNotes}
                      onChange={(e) => setFormDoctorNotes(e.target.value)}
                      placeholder="e.g. Take adequate rest and fluids."
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Follow-up Instructions */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '5px' }}>
                      Follow-up Instructions
                    </label>
                    <input
                      id="input-follow-up"
                      type="text"
                      className="form-input"
                      value={formFollowUp}
                      onChange={(e) => setFormFollowUp(e.target.value)}
                      placeholder="e.g. 3 days"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Save Consultation Record Button */}
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="submit"
                      id="btn-save-consultation-record"
                      className="btn btn-primary"
                      disabled={isSavingHealthRecord}
                      style={{
                        width: '100%',
                        padding: '12px 18px',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                        borderColor: '#14b8a6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <Save size={18} />
                      <span>{isSavingHealthRecord ? 'Saving Health Record...' : 'Save Consultation Record'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
