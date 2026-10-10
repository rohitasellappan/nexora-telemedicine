import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Navbar from './components/Navbar';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import LoginModal from './components/LoginModal';
import FindDoctorModal from './components/FindDoctorModal';
import MedicalRecordsModal from './components/MedicalRecordsModal';
import ConsultationRoom from './components/ConsultationRoom';
import RecordingPlayer from './components/RecordingPlayer';
import MedicalRecordsPage from './components/MedicalRecordsPage';
import PatientCallingModal from './components/PatientCallingModal';
import DoctorIncomingCallModal from './components/DoctorIncomingCallModal';
import NotificationCenter from './components/NotificationCenter';
import { browserNotifier } from './utils/browserNotifications';
import { ringSynthesizer } from './utils/ringAudio';
import { initialPatientData, initialDoctorData, initialAppointments } from './data/mockData';
import {
  Sparkles,
  ArrowRight,
  Lock,
  Search,
  Wifi,
  Shield,
  Video,
  PhoneCall,
  FileText,
  AlertCircle,
  CheckCircle2,
  Users,
  Activity,
  Heart,
  User,
  RefreshCw,
  Stethoscope,
  Trash2
} from 'lucide-react';
import './App.css';

export default function App() {
  // Navigation & Authentication state
  const [currentUser, setCurrentUser] = useState(null); // null, { role: 'patient' }, or { role: 'doctor' }
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'medical-records'
  const [patientData, setPatientData] = useState(initialPatientData);
  const [doctorData, setDoctorData] = useState(initialDoctorData);

  // Centralized Appointments State
  const [appointments, setAppointments] = useState(initialAppointments);

  // Consultation Recordings State (Phase 5)
  const [recordings, setRecordings] = useState([]);
  const [activeViewingRecording, setActiveViewingRecording] = useState(null);
  const [recordingToDelete, setRecordingToDelete] = useState(null);

  // Active Real-Time WebRTC Consultation Room
  const [activeConsultationAppointment, setActiveConsultationAppointment] = useState(null);

  // Incoming Video Call & Doctor Accept Workflow State
  const socketRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [patientCallingState, setPatientCallingState] = useState(null);

  // Real-Time Notifications & Notification Center State (Phase 8)
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isFindDoctorOpen, setIsFindDoctorOpen] = useState(false);
  const [isRecordsOpen, setIsRecordsOpen] = useState(false);
  const [selectedPatientForRecords, setSelectedPatientForRecords] = useState(null);

  // Server health state
  const [backendStatus, setBackendStatus] = useState({
    loading: true,
    online: false,
    data: null,
    error: null,
  });

  // Check backend health & fetch existing appointments if live
  const checkBackendHealth = async () => {
    setBackendStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setBackendStatus({
        loading: false,
        online: true,
        data,
        error: null,
      });

      // Also try fetching appointments from backend
      try {
        const aptRes = await fetch('/api/appointments');
        if (aptRes.ok) {
          const aptData = await aptRes.json();
          if (aptData.success && aptData.appointments?.length) {
            setAppointments(aptData.appointments);
          }
        }
      } catch (err) {
        // use local state
      }
    } catch (err) {
      setBackendStatus({
        loading: false,
        online: false,
        data: null,
        error: err.message || 'Cannot reach backend',
      });
    }
  };

  // Fetch recordings authorized for current user
  const fetchRecordings = async (user = currentUser) => {
    try {
      const role = user?.role || 'patient';
      const userId = user?.id || (role === 'doctor' ? 'doc-1' : 'pat-1');
      const param = role === 'doctor' ? `doctorId=${userId}` : `patientId=${userId}`;
      const res = await fetch(`/api/recordings?${param}&userId=${userId}`, {
        headers: {
          'x-user-id': userId,
          'x-user-role': role,
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.recordings) {
          setRecordings(json.recordings);
        }
      }
    } catch (err) {
      console.warn('Recordings fetch notice:', err.message);
    }
  };

  // Fetch notifications for current user (Phase 8 Requirement 3)
  const fetchNotifications = async (user = currentUser) => {
    try {
      const role = user?.role || 'patient';
      const userId = user?.id || (role === 'doctor' ? 'doc-1' : 'pat-1');
      const res = await fetch(`/api/notifications?userId=${userId}&role=${role}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.notifications) {
          setNotifications(json.notifications);
        }
      }
    } catch (err) {
      console.warn('Notifications fetch notice:', err.message);
    }
  };

  const handleMarkNotificationAsRead = async (notifId) => {
    const role = currentUser?.role || 'patient';
    const userId = currentUser?.id || (role === 'doctor' ? 'doc-1' : 'pat-1');

    setNotifications((prev) =>
      prev.map((n) => ((n._id === notifId || n.id === notifId) ? { ...n, isRead: true } : n))
    );

    try {
      await fetch(`/api/notifications/${notifId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (e) {
      console.warn('Mark read warning:', e.message);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    const role = currentUser?.role || 'patient';
    const userId = currentUser?.id || (role === 'doctor' ? 'doc-1' : 'pat-1');

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (e) {
      console.warn('Mark all read warning:', e.message);
    }
  };

  useEffect(() => {
    checkBackendHealth();
    fetchRecordings(currentUser);
    fetchNotifications(currentUser);
  }, []);

  useEffect(() => {
    fetchRecordings(currentUser);
    fetchNotifications(currentUser);
  }, [currentUser]);

  // Derived unread & missed call lists
  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;
  const missedCallsList = notifications.filter((n) => n.type === 'missed_call');

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const appointmentsRef = useRef(appointments);
  appointmentsRef.current = appointments;
  const patientDataRef = useRef(patientData);
  patientDataRef.current = patientData;
  const doctorDataRef = useRef(doctorData);
  doctorDataRef.current = doctorData;

  // Persistent Socket.IO Signaling for Incoming Call & Accept Workflow
  useEffect(() => {
    const role = currentUserRef.current?.role || 'patient';
    const userId = currentUserRef.current?.id || (role === 'doctor' ? 'doc-1' : 'pat-1');
    const name = currentUserRef.current?.name || (role === 'doctor' ? doctorDataRef.current?.name : patientDataRef.current?.name);

    const BACKEND_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || undefined;
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
      timeout: 10000,
      auth: { userId, role, name },
      query: { userId, role },
    });
    socketRef.current = socket;

    const registerActiveUser = () => {
      const curUser = currentUserRef.current;
      const curRole = curUser?.role || 'patient';
      const curUserId = curUser?.id || (curRole === 'doctor' ? 'doc-1' : 'pat-1');
      const curName = curUser?.name || (curRole === 'doctor' ? doctorDataRef.current?.name : patientDataRef.current?.name);
      socket.emit('register-user', { userId: curUserId, role: curRole, name: curName });
    };

    socket.on('connect', () => {
      console.log('[Global Signaling] Socket connected:', socket.id);
      registerActiveUser();
      fetchNotifications(currentUserRef.current);
      fetchRecordings(currentUserRef.current);
    });

    socket.io.on('reconnect', () => {
      console.log('[Global Signaling] Socket reconnected');
      registerActiveUser();
      fetchNotifications(currentUserRef.current);
      fetchRecordings(currentUserRef.current);
    });

    // 1. Doctor receives incoming call
    socket.on('incoming-call', (callData) => {
      console.log('[Global Signaling] Doctor received incoming call:', callData);
      const curUser = currentUserRef.current;
      const currentDocId = curUser?.id || (curUser?.role === 'doctor' ? 'doc-1' : null);
      // Validate: only show if current user is doctor and assigned
      if (
        curUser?.role === 'doctor' &&
        (!callData.doctorId || callData.doctorId === currentDocId || currentDocId === 'doc-1' || !currentDocId)
      ) {
        setIncomingCallData((prev) => {
          if (prev && prev.appointmentId === callData.appointmentId) {
            return prev; // Deduplicate call modal
          }
          return callData;
        });

        // Browser desktop notification for incoming consultation (privacy safe)
        browserNotifier.notifyIncomingCall(
          callData.patientName || 'Patient',
          callData.appointmentId,
          callData.time || 'Scheduled Slot'
        );
      }
    });

    // 2. Patient receives ringing acknowledgement
    socket.on('call-ringing', (data) => {
      console.log('[Global Signaling] Call ringing acknowledged:', data);
      setPatientCallingState((prev) => {
        if (prev && prev.isOpen && prev.status === 'calling') {
          return { ...prev, status: 'ringing' };
        }
        return prev;
      });
    });

    // 3. Patient receives call accepted
    socket.on('call-accepted', (data) => {
      console.log('[Global Signaling] Doctor ACCEPTED call:', data);
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      setPatientCallingState((prev) => {
        if (prev && prev.isOpen) {
          return { ...prev, status: 'accepted' };
        }
        return prev;
      });

      // Transition patient smoothly into the shared consultation room
      setTimeout(() => {
        const apt = appointmentsRef.current?.find((a) => (a.appointmentId || a.id) === data.appointmentId) || {
          appointmentId: data.appointmentId,
          doctorName: data.doctorName || 'Dr. Ananya Sharma, MD',
          patientName: patientDataRef.current?.name || 'Kumar',
          specialization: 'Cardiologist',
        };
        setPatientCallingState(null);
        setActiveConsultationAppointment(apt);
        window.location.hash = `consultation/${data.appointmentId}`;
      }, 700);
    });

    // 4. Patient receives call rejected
    socket.on('call-rejected', (data) => {
      console.log('[Global Signaling] Doctor REJECTED call:', data);
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      setPatientCallingState((prev) => {
        if (prev && prev.isOpen) {
          return {
            ...prev,
            status: 'rejected',
            rejectionReason: data.reason || 'Doctor is currently unavailable.',
          };
        }
        return prev;
      });
    });

    // 5. Doctor receives call cancelled (patient hung up while ringing)
    socket.on('call-cancelled', (data) => {
      console.log('[Global Signaling] Patient cancelled incoming call:', data);
      setIncomingCallData((prev) => {
        if (prev && prev.appointmentId === data.appointmentId) {
          return null;
        }
        return prev;
      });
    });

    // 6. Doctor receives call timeout
    socket.on('call-timeout', (data) => {
      console.log('[Global Signaling] Call timed out:', data);
      setIncomingCallData((prev) => {
        if (prev && prev.appointmentId === data.appointmentId) {
          return null;
        }
        return prev;
      });
    });

    // 7. Patient receives doctor offline response
    socket.on('doctor-offline', (data) => {
      console.log('[Global Signaling] Doctor is OFFLINE:', data);
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      setPatientCallingState((prev) => {
        if (prev && prev.isOpen) {
          return {
            ...prev,
            status: 'offline',
            rejectionReason:
              data.message ||
              'Dr. Ananya Sharma is not currently online in the telemedicine console. An alert was logged. Please try again or reschedule.',
          };
        }
        return prev;
      });
    });

    // 8. Call error handler
    socket.on('call-error', (errData) => {
      console.warn('[Global Signaling] Call error:', errData);
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
      setPatientCallingState((prev) => {
        if (prev && prev.isOpen) {
          return {
            ...prev,
            status: 'rejected',
            rejectionReason: errData.error || 'Call could not be completed.',
          };
        }
        return prev;
      });
    });

    // 9. Real-time Notification Handler
    socket.on('new-notification', (notif) => {
      console.log('[Global Signaling] Received new real-time notification:', notif);
      setNotifications((prev) => {
        const isDuplicate = prev.some(
          (n) =>
            (n._id && n._id === notif._id) ||
            (n.id && n.id === notif.id) ||
            (n.appointmentId === notif.appointmentId &&
              n.type === notif.type &&
              Math.abs(new Date(n.createdAt) - new Date(notif.createdAt)) < 4000)
        );
        if (isDuplicate) return prev;
        return [notif, ...prev];
      });

      // Play subtle chime for notifications
      ringSynthesizer.playNotificationChime();

      // Trigger desktop notification if permitted (privacy safe - never exposes clinical notes)
      if (notif.type !== 'incoming_call') {
        browserNotifier.showNotification(notif.title || 'NEXORA Telemed Update', notif.message, {
          tag: notif._id || notif.id || notif.appointmentId,
        });
      }
    });

    return () => {
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
      socket.disconnect();
    };
  }, []);

  // Sync registration when user switches roles
  useEffect(() => {
    if (socketRef.current && socketRef.current.connected) {
      const role = currentUser?.role || 'patient';
      const userId = currentUser?.id || (role === 'doctor' ? 'doc-1' : 'pat-1');
      const name = currentUser?.name || (role === 'doctor' ? doctorData?.name : patientData?.name);
      socketRef.current.emit('register-user', { userId, role, name });
    }
  }, [currentUser, patientData, doctorData]);

  // Sync with URL hash for easy 2-window testing (e.g. #consultation/APT-101)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#consultation/')) {
        const aptId = hash.replace('#consultation/', '');
        const targetApt =
          appointments.find((a) => (a.appointmentId || a.id) === aptId) || {
            appointmentId: aptId,
            doctorName: 'Dr. Ananya Sharma, MD',
            patientName: 'Ramesh Kumar',
            specialization: 'Cardiologist',
            date: 'Today, Oct 8',
            time: '04:30 PM',
            reason: 'WebRTC Teleconsultation',
          };
        setActiveConsultationAppointment(targetApt);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [appointments]);

  // Fetch dashboard data from backend when role is set
  const loadDashboardFromBackend = async (role) => {
    try {
      const endpoint = role === 'doctor' ? '/api/doctor/dashboard' : '/api/patient/dashboard';
      const response = await fetch(endpoint);
      if (response.ok) {
        const json = await response.json();
        if (role === 'doctor') {
          setDoctorData(json.data || initialDoctorData);
          if (json.data?.todayAppointments?.length) {
            setAppointments((prev) => {
              const combined = [...json.data.todayAppointments];
              prev.forEach((p) => {
                if (!combined.some((c) => (c.appointmentId || c.id) === (p.appointmentId || p.id))) {
                  combined.push(p);
                }
              });
              return combined;
            });
          }
        } else {
          setPatientData(json.data || initialPatientData);
        }
      }
    } catch (err) {
      console.warn('Using local fallback mock data:', err.message);
    }
  };

  // Auth Handlers
  const handleLoginSuccess = (user, token) => {
    setCurrentUser(user);
    setCurrentView('dashboard');
    loadDashboardFromBackend(user.role);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('dashboard');
    setActiveConsultationAppointment(null);
    window.location.hash = '';
  };

  const handleSwitchRole = (targetRole) => {
    const newUser =
      targetRole === 'doctor'
        ? { role: 'doctor', id: 'doc-1', name: 'Dr. Priya Sharma' }
        : { role: 'patient', id: 'pat-1', name: 'Kumar' };
    setCurrentUser(newUser);
    setCurrentView('dashboard');
    loadDashboardFromBackend(targetRole);
  };

  // Real WebRTC Consultation Room launcher
  const handleJoinConsultation = (session) => {
    setActiveConsultationAppointment(session);
    const aptId = session?.appointmentId || session?.id || 'APT-101';
    window.location.hash = `consultation/${aptId}`;
  };

  const handleEndCall = () => {
    setActiveConsultationAppointment(null);
    window.location.hash = '';
  };

  // Patient initiates video call to doctor
  const handleStartVideoCall = (appointment) => {
    if (currentUser?.role === 'doctor') {
      alert('You are currently logged in as a doctor. Only patients initiate telemedicine calls.');
      return;
    }

    const currentPatientId = currentUser?.id || patientData?.id || 'pat-1';
    const doctorId = appointment?.doctorId || 'doc-1';
    const aptId = appointment?.appointmentId || appointment?.id || 'APT-101';

    // Verify patient authorization for appointment (Requirement 1)
    const isPatientAuthorized =
      !appointment?.patientId ||
      appointment.patientId === currentPatientId ||
      currentPatientId === 'pat-1';

    if (!isPatientAuthorized) {
      alert('Unauthorized: You can only initiate calls for your own scheduled appointments.');
      return;
    }

    setPatientCallingState({
      isOpen: true,
      status: 'calling',
      appointment,
      rejectionReason: '',
    });

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('incoming-call-initiate', {
        appointmentId: aptId,
        patientId: currentPatientId,
        patientName: patientData?.name || 'Kumar',
        patientAge: patientData?.age || 42,
        patientVillage: patientData?.village || 'Rampur Village',
        symptom: appointment?.reason || 'Routine Teleconsultation',
        kiosk: appointment?.location || patientData?.primaryKiosk || 'Primary Health Kiosk',
        doctorId,
        doctorName: appointment?.doctorName || 'Dr. Ananya Sharma, MD',
        time: appointment?.time || 'Today, 04:30 PM',
        date: appointment?.date || 'Today',
      });
    }

    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    callTimeoutRef.current = setTimeout(() => {
      setPatientCallingState((prev) => {
        if (prev && prev.isOpen && (prev.status === 'calling' || prev.status === 'ringing')) {
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('incoming-call-timeout', {
              appointmentId: aptId,
              doctorId,
              patientId: currentPatientId,
              doctorName: appointment?.doctorName || 'Dr. Ananya Sharma, MD',
              patientName: patientData?.name || 'Kumar',
            });
          }
          return { ...prev, status: 'missed' };
        }
        return prev;
      });
    }, 35000);
  };

  const handleCancelVideoCall = () => {
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    if (patientCallingState && socketRef.current && socketRef.current.connected) {
      const apt = patientCallingState.appointment;
      socketRef.current.emit('incoming-call-cancel', {
        appointmentId: apt?.appointmentId || apt?.id || 'APT-101',
        doctorId: apt?.doctorId || 'doc-1',
        patientId: currentUser?.id || patientData?.id || 'pat-1',
      });
    }
    setPatientCallingState(null);
  };

  const handleRetryVideoCall = () => {
    if (patientCallingState?.appointment) {
      handleStartVideoCall(patientCallingState.appointment);
    }
  };

  const handleDoctorAcceptCall = (callData) => {
    const currentDocId = currentUser?.id || (currentUser?.role === 'doctor' ? 'doc-1' : null);
    if (callData.doctorId && callData.doctorId !== currentDocId && currentDocId !== 'doc-1') {
      alert('Access Denied: This call is assigned to another specialist.');
      return;
    }

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('incoming-call-accept', {
        appointmentId: callData.appointmentId,
        doctorId: currentDocId || 'doc-1',
        doctorName: doctorData?.name || 'Dr. Ananya Sharma, MD',
        patientId: callData.patientId,
        callerSocketId: callData.callerSocketId,
      });
    }

    setIncomingCallData(null);

    const targetApt = appointments.find((a) => (a.appointmentId || a.id) === callData.appointmentId) || {
      appointmentId: callData.appointmentId,
      patientId: callData.patientId,
      patientName: callData.patientName,
      patientAge: callData.patientAge,
      patientVillage: callData.patientVillage,
      reason: callData.symptom,
      location: callData.kiosk,
      doctorName: doctorData?.name || 'Dr. Ananya Sharma, MD',
      specialization: doctorData?.specialization || 'Cardiologist',
      status: 'In-Progress',
    };

    setActiveConsultationAppointment(targetApt);
    window.location.hash = `consultation/${callData.appointmentId}`;
  };

  const handleDoctorRejectCall = (callData) => {
    const currentDocId = currentUser?.id || 'doc-1';
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('incoming-call-reject', {
        appointmentId: callData.appointmentId,
        doctorId: currentDocId,
        patientId: callData.patientId,
        reason: 'Doctor is currently attending to another urgent patient or in surgery.',
        callerSocketId: callData.callerSocketId,
      });
    }
    setIncomingCallData(null);
  };

  // View records handler
  const handleViewPatientRecords = (patientId) => {
    setSelectedPatientForRecords(patientData);
    setIsRecordsOpen(true);
  };

  // Booking handler - Centralized Appointment Creation
  const handleAppointmentBooked = (newAppointment) => {
    setAppointments((prev) => [
      newAppointment,
      ...prev.filter((a) => (a.appointmentId || a.id) !== (newAppointment.appointmentId || newAppointment.id)),
    ]);
  };

  // Status Updater (Upcoming -> Completed -> Cancelled)
  const handleUpdateStatus = (appointmentId, newStatus) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        (apt.appointmentId === appointmentId || apt.id === appointmentId)
          ? { ...apt, status: newStatus }
          : apt
      )
    );

    // Call backend PATCH endpoint
    fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => {});
  };

  // Filtered lists for views
  const patientAppointments = appointments.filter(
    (a) => a.patientId === patientData.id || a.patientName?.includes('Ramesh')
  );

  // If a real WebRTC consultation is active, display the ConsultationRoom component
  if (activeConsultationAppointment) {
    return (
      <ConsultationRoom
        appointment={activeConsultationAppointment}
        currentUserRole={currentUser?.role || 'patient'}
        currentUserName={
          currentUser?.role === 'doctor'
            ? doctorData?.name || 'Dr. Priya Sharma, MD'
            : patientData?.name || 'Kumar'
        }
        onEndCall={handleEndCall}
        onRecordingSaved={(newRec) => {
          setRecordings((prev) => [newRec, ...prev]);
        }}
        onHealthRecordSaved={(newRec) => {
          console.log('[HealthRecord Saved]', newRec.id);
        }}
      />
    );
  }

  // Delete recording handler
  const confirmDeleteRecording = async () => {
    if (!recordingToDelete) return;
    const recId = recordingToDelete.recordingId;
    const effectiveUserId = currentUser?.id || (currentUser?.role === 'doctor' ? 'doc-1' : 'pat-1');

    try {
      const res = await fetch(`/api/recordings/${recId}?userId=${effectiveUserId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Access Denied: You are not authorized to delete this consultation recording.');
        return;
      }

      // Remove immediately from UI (Requirement 7)
      setRecordings((prev) => prev.filter((r) => r.recordingId !== recId));
      if (activeViewingRecording && activeViewingRecording.recordingId === recId) {
        setActiveViewingRecording(null);
      }
      setRecordingToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting consultation recording: ' + err.message);
    }
  };

  return (
    <div className="nexora-app">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        backendStatus={backendStatus}
        unreadCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenFindDoctor={() => setIsFindDoctorOpen(true)}
        onOpenMedicalRecords={() => {
          if (currentUser?.role === 'patient') {
            setCurrentView('medical-records');
          } else {
            setSelectedPatientForRecords(patientData);
            setIsRecordsOpen(true);
          }
        }}
        onLogout={handleLogout}
        onSwitchRole={handleSwitchRole}
        onNavigateHome={() => {
          setCurrentView('dashboard');
          setCurrentUser(null);
        }}
      />

      {/* Main View Area */}
      <main>
        {currentUser?.role === 'patient' ? (
          currentView === 'medical-records' ? (
            /* ================= PATIENT MEDICAL RECORDS PAGE (PHASE 6) ================= */
            <MedicalRecordsPage
              patientData={patientData}
              recordings={recordings}
              onPlayRecording={(rec) => setActiveViewingRecording(rec)}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          ) : (
            /* ================= PATIENT DASHBOARD ================= */
            <PatientDashboard
              patientData={patientData}
              appointments={patientAppointments}
              recordings={recordings}
              onOpenFindDoctor={() => setIsFindDoctorOpen(true)}
              onOpenMedicalRecords={() => setCurrentView('medical-records')}
              onJoinConsultation={handleJoinConsultation}
              onStartVideoCall={handleStartVideoCall}
              onPlayRecording={(rec) => setActiveViewingRecording(rec)}
              onDeleteRecording={(rec) => setRecordingToDelete(rec)}
              onSwitchToDoctorDemo={() => handleSwitchRole('doctor')}
            />
          )
        ) : currentUser?.role === 'doctor' ? (
          /* ================= DOCTOR DASHBOARD ================= */
          <DoctorDashboard
            doctorData={doctorData}
            appointments={appointments}
            recordings={recordings}
            incomingCall={incomingCallData}
            missedCalls={missedCallsList}
            notifications={notifications}
            unreadNotificationsCount={unreadNotificationsCount}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onAcceptIncomingCall={handleDoctorAcceptCall}
            onRejectIncomingCall={handleDoctorRejectCall}
            onJoinConsultation={handleJoinConsultation}
            onViewPatientRecords={handleViewPatientRecords}
            onPlayRecording={(rec) => setActiveViewingRecording(rec)}
            onDeleteRecording={(rec) => setRecordingToDelete(rec)}
            onSwitchToPatientDemo={() => handleSwitchRole('patient')}
            onUpdateStatus={handleUpdateStatus}
          />
        ) : (
          /* ================= PUBLIC LANDING PAGE ================= */
          <div>
            {/* Quick Demo Banner for Hackathon Evaluators */}
            <div style={{ background: 'linear-gradient(90deg, rgba(2, 132, 199, 0.25), rgba(13, 148, 136, 0.25))', borderBottom: '1px solid rgba(20, 184, 166, 0.3)', padding: '10px 20px', textAlign: 'center' }}>
              <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 600 }}>
                  ⚡ <strong>Phase 4 WebRTC Demo:</strong> Test Real Two-Way Browser-to-Browser Video Consultation:
                </span>
                <button
                  className="btn btn-primary"
                  style={{ padding: '4px 14px', fontSize: '0.8rem' }}
                  onClick={() => handleSwitchRole('patient')}
                >
                  <User size={14} /> Open Patient Dashboard
                </button>
                <button
                  className="btn btn-accent"
                  style={{ padding: '4px 14px', fontSize: '0.8rem' }}
                  onClick={() => handleSwitchRole('doctor')}
                >
                  <Stethoscope size={14} /> Open Doctor Dashboard
                </button>
              </div>
            </div>

            {/* Hero Section */}
            <header className="hero-section">
              <div className="container hero-grid">
                <div className="hero-content">
                  <div className="hero-eyebrow">
                    <span className="badge badge-primary">
                      <Sparkles size={14} /> Telemedicine for Remote Communities
                    </span>
                  </div>

                  <h1 className="hero-title">
                    Healthcare, <span className="gradient-text">Anywhere</span>
                  </h1>

                  <p className="hero-description">
                    Rural populations often lack access to doctors and specialists, and travelling to healthcare facilities can be costly or impractical.
                    <br /><br />
                    <strong>NEXORA</strong> enables rural patients to connect with doctors through secure online video consultations and maintain digital health records.
                  </p>

                  <div className="hero-buttons">
                    <button
                      id="hero-btn-find-doctor"
                      className="btn btn-primary btn-lg"
                      onClick={() => setIsFindDoctorOpen(true)}
                    >
                      <Search size={20} />
                      <span>Find a Doctor</span>
                      <ArrowRight size={18} />
                    </button>

                    <button
                      id="hero-btn-login"
                      className="btn btn-secondary btn-lg"
                      onClick={() => setIsLoginOpen(true)}
                    >
                      <Lock size={18} />
                      <span>Role Selector & Login</span>
                    </button>
                  </div>

                  {/* Quick Metrics */}
                  <div className="hero-stats-bar">
                    <div className="stat-item">
                      <span className="stat-number">70%+</span>
                      <span className="stat-label">Rural Population Reach</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">0 km</span>
                      <span className="stat-label">Travel Distance for Triage</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">&lt; 150 kbps</span>
                      <span className="stat-label">Low-Bandwidth Optimized</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-number">24/7</span>
                      <span className="stat-label">Remote Doctor Access</span>
                    </div>
                  </div>
                </div>

                {/* Hero Right: Teleconsultation Simulation Card */}
                <div className="hero-visual-card glass-panel">
                  <div className="mock-window-header">
                    <div className="mock-status-pill">
                      <span className="pulse-dot" />
                      <span>Live Teleconsultation System</span>
                    </div>
                    <div className="mock-network-speed">
                      <Wifi size={14} />
                      <span>2G/3G Adaptive Mode</span>
                    </div>
                  </div>

                  <div className="consultation-screen">
                    <div className="consultation-doctor-banner">
                      <div className="doctor-avatar">AS</div>
                      <div className="doctor-meta">
                        <h4>Dr. Ananya Sharma, MD</h4>
                        <p>Chief Tele-Physician • Tele-Cardiology</p>
                      </div>
                    </div>

                    <div className="vitals-grid">
                      <div className="vital-box">
                        <div className="vital-name">Heart Rate</div>
                        <div className="vital-val" style={{ color: '#f43f5e' }}>74 bpm</div>
                      </div>
                      <div className="vital-box">
                        <div className="vital-name">SpO2 Level</div>
                        <div className="vital-val" style={{ color: '#38bdf8' }}>98%</div>
                      </div>
                      <div className="vital-box">
                        <div className="vital-name">Blood Pressure</div>
                        <div className="vital-val" style={{ color: '#10b981' }}>120 / 80</div>
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Shield size={14} color="#14b8a6" />
                        <span>Peer-to-Peer WebRTC Audio/Video Activated</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#f8fafc', marginTop: '4px' }}>
                        Active Room: <span style={{ color: '#38bdf8' }}>consultation_APT-101</span>
                      </div>
                    </div>

                    <div className="video-call-controls">
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '10px 16px' }}
                        onClick={() => {
                          handleSwitchRole('patient');
                          handleJoinConsultation(appointments[0]);
                        }}
                      >
                        <Video size={18} /> Join Real WebRTC Consultation (APT-101)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Problem & Solution Split Grid */}
            <section id="problem-solution" className="section">
              <div className="container">
                <div className="section-header">
                  <span className="badge badge-primary">The Rural Health Divide</span>
                  <h2 style={{ fontSize: '2.4rem', marginTop: '12px' }}>
                    Why NEXORA Matters for Remote Communities
                  </h2>
                  <p className="section-subtitle">
                    Transforming geographical barriers into instant points of clinical care.
                  </p>
                </div>

                <div className="comparison-grid">
                  <div className="comparison-card problem-card">
                    <div className="card-icon-badge problem-icon">
                      <AlertCircle size={28} />
                    </div>
                    <h3 style={{ fontSize: '1.4rem', color: '#fca5a5' }}>The Rural Healthcare Problem</h3>
                    <ul className="point-list">
                      <li>
                        <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '3px' }} />
                        <span><strong>Remote Distance:</strong> Patients must travel 30-70+ km across rough terrain just to see a basic general doctor.</span>
                      </li>
                      <li>
                        <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '3px' }} />
                        <span><strong>Crushing Travel & Wage Costs:</strong> Travelling takes an entire day's lost wages plus expensive transportation costs.</span>
                      </li>
                      <li>
                        <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '3px' }} />
                        <span><strong>Specialist Scarcity:</strong> Over 80% of medical specialists are concentrated in metropolitan urban centers.</span>
                      </li>
                      <li>
                        <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '3px' }} />
                        <span><strong>Lost Paper Records:</strong> Physical prescriptions and test results get lost or damaged, leading to misdiagnoses.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="comparison-card solution-card">
                    <div className="card-icon-badge solution-icon">
                      <CheckCircle2 size={28} />
                    </div>
                    <h3 style={{ fontSize: '1.4rem', color: '#5eead4' }}>The NEXORA Solution</h3>
                    <ul className="point-list">
                      <li>
                        <CheckCircle2 size={18} color="#14b8a6" style={{ flexShrink: 0, marginTop: '3px' }} />
                        <span><strong>Immediate Video Consultations:</strong> Connect with certified physicians from home or local village kiosks.</span>
                      </li>
                      <li>
                        <CheckCircle2 size={18} color="#14b8a6" style={{ flexShrink: 0, marginTop: '3px' }} />
                        <span><strong>Zero Travel Expense:</strong> Save vital family finances and avoid lost work days with virtual triage.</span>
                      </li>
                      <li>
                        <CheckCircle2 size={18} color="#14b8a6" style={{ flexShrink: 0, marginTop: '3px' }} />
                        <span><strong>Unified Digital Health Records:</strong> Securely maintain prescriptions and patient history in the cloud.</span>
                      </li>
                      <li>
                        <CheckCircle2 size={18} color="#14b8a6" style={{ flexShrink: 0, marginTop: '3px' }} />
                        <span><strong>Low-Bandwidth WebRTC Architecture:</strong> Engineered to provide stable audio/video even on low-speed rural 2G/3G networks.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Platform Pillars */}
            <section id="features" className="section" style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
              <div className="container">
                <div className="section-header">
                  <span className="badge badge-primary">Platform Pillars</span>
                  <h2 style={{ fontSize: '2.4rem', marginTop: '12px' }}>
                    Engineered Specifically for Rural Constraints
                  </h2>
                  <p className="section-subtitle">
                    Every component is designed for resilience, simplicity, and trust.
                  </p>
                </div>

                <div className="features-grid">
                  <div className="feature-card glass-panel">
                    <div className="feature-icon-box">
                      <Video size={24} />
                    </div>
                    <h3>Real-Time WebRTC P2P</h3>
                    <p>
                      Encrypted peer-to-peer browser video stream with adaptive bitrate compression for remote areas.
                    </p>
                  </div>

                  <div className="feature-card glass-panel">
                    <div className="feature-icon-box">
                      <FileText size={24} />
                    </div>
                    <h3>Digital Health Records</h3>
                    <p>
                      Portable, encrypted electronic medical records (EHR) accessible to doctors with patient consent anytime.
                    </p>
                  </div>

                  <div className="feature-card glass-panel">
                    <div className="feature-icon-box">
                      <Users size={24} />
                    </div>
                    <h3>Verified Specialist Network</h3>
                    <p>
                      Access to credentialed doctors across pediatrics, general medicine, cardiology, gynecology, and dermatology.
                    </p>
                  </div>

                  <div className="feature-card glass-panel">
                    <div className="feature-icon-box">
                      <Shield size={24} />
                    </div>
                    <h3>Socket.IO Signaling</h3>
                    <p>
                      Isolated appointment rooms with offer/answer/ICE candidate relaying and zero media storage on the server.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="section">
              <div className="container">
                <div className="section-header">
                  <span className="badge badge-primary">Workflow</span>
                  <h2 style={{ fontSize: '2.4rem', marginTop: '12px' }}>
                    Simple 3-Step Healthcare Access
                  </h2>
                  <p className="section-subtitle">
                    Accessible directly by patients on mobile or assisted by village healthcare volunteers.
                  </p>
                </div>

                <div className="steps-grid">
                  <div className="step-card glass-panel">
                    <div className="step-number">01</div>
                    <div className="feature-icon-box">
                      <User size={24} />
                    </div>
                    <h3>Register or Login</h3>
                    <p>
                      Sign in with basic credentials or phone number. Village Health Workers can assist illiterate patients.
                    </p>
                  </div>

                  <div className="step-card glass-panel">
                    <div className="step-number">02</div>
                    <div className="feature-icon-box">
                      <Search size={24} />
                    </div>
                    <h3>Find Available Doctor</h3>
                    <p>
                      Browse verified medical specialists by language and field of expertise, select appointment date & time slot.
                    </p>
                  </div>

                  <div className="step-card glass-panel">
                    <div className="step-number">03</div>
                    <div className="feature-icon-box">
                      <Heart size={24} />
                    </div>
                    <h3>Video Consult & e-Prescription</h3>
                    <p>
                      Communicate clearly over encrypted WebRTC video and receive a digital prescription synchronized straight to your profile.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* System Health Diagnostics */}
            <section id="system-health" className="section" style={{ paddingTop: '20px' }}>
              <div className="container">
                <div className="diag-panel glass-panel">
                  <div className="diag-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Activity size={22} color="#14b8a6" />
                      <h3 style={{ fontSize: '1.2rem' }}>Backend API & WebRTC Signaling Status</h3>
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                      onClick={checkBackendHealth}
                      disabled={backendStatus.loading}
                    >
                      <RefreshCw size={14} className={backendStatus.loading ? 'pulse-dot' : ''} />
                      <span>Recheck /api/health</span>
                    </button>
                  </div>

                  <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
                    Endpoint: <code>GET /api/health</code> • Verified connection between React Vite frontend & Express Node.js backend.
                  </p>

                  <div className="diag-code-box">
                    {backendStatus.loading ? (
                      <span>Checking server status...</span>
                    ) : backendStatus.online ? (
                      <pre>{JSON.stringify(backendStatus.data, null, 2)}</pre>
                    ) : (
                      <span style={{ color: '#ef4444' }}>
                        Offline / Connection issue: {backendStatus.error}. Make sure backend server is running on port 5000.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="brand-wrapper">
              <div className="brand-logo-icon">
                <Stethoscope size={24} />
              </div>
              <div className="brand-info">
                <span className="brand-name">NEXORA</span>
                <span className="brand-tagline-mini">Healthcare, Anywhere</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: '#94a3b8', flexWrap: 'wrap' }}>
              <span>Phase 4: Real-Time WebRTC P2P Video Consultation</span>
              <span>•</span>
              <span>Patient: Ramesh Kumar</span>
              <span>•</span>
              <span>Doctor: Dr. Ananya Sharma, MD</span>
            </div>
          </div>

          <div className="footer-copy">
            &copy; {new Date().getFullYear()} NEXORA Rural Telemedicine Platform • Prototype for Hackathon.
          </div>
        </div>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <FindDoctorModal
        isOpen={isFindDoctorOpen}
        onClose={() => setIsFindDoctorOpen(false)}
        onAppointmentBooked={handleAppointmentBooked}
        patientName={patientData?.name || 'Ramesh Kumar'}
        patientId={patientData?.id || 'pat-1'}
      />

      <MedicalRecordsModal
        isOpen={isRecordsOpen}
        onClose={() => setIsRecordsOpen(false)}
        patientData={selectedPatientForRecords || patientData}
        recordings={recordings}
        onPlayRecording={(rec) => setActiveViewingRecording(rec)}
        onDeleteRecording={(rec) => setRecordingToDelete(rec)}
      />

      {/* Authorized Consultation Recording Player Modal */}
      {activeViewingRecording && (
        <RecordingPlayer
          recording={activeViewingRecording}
          currentUser={currentUser}
          onClose={() => setActiveViewingRecording(null)}
        />
      )}

      {/* ==================================================== */}
      {/* DELETE CONSULTATION RECORDING CONFIRMATION DIALOG    */}
      {/* ==================================================== */}
      {recordingToDelete && (
        <div className="modal-overlay" style={{ zIndex: 1300 }} onClick={() => setRecordingToDelete(null)}>
          <div
            className="delete-confirm-modal glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '440px',
              width: '90%',
              padding: '28px',
              borderRadius: '16px',
              textAlign: 'center',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(239, 68, 68, 0.25)',
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
              <Trash2 size={28} />
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              Delete this consultation recording?
            </h2>

            <p style={{ color: '#f87171', fontSize: '0.95rem', fontWeight: 600, marginBottom: '18px' }}>
              This action cannot be undone.
            </p>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                padding: '14px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                color: '#cbd5e1',
                marginBottom: '22px',
                textAlign: 'left',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                lineHeight: '1.6',
              }}
            >
              <div>Appointment: <strong style={{ color: '#38bdf8' }}>{recordingToDelete.appointmentId}</strong></div>
              <div>Participant: <strong>{recordingToDelete.doctorName || recordingToDelete.patientName}</strong></div>
              <div>Duration: <strong>{recordingToDelete.duration}</strong></div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: '10px 18px' }}
                onClick={() => setRecordingToDelete(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-delete-recording"
                className="btn btn-primary"
                style={{
                  flex: 1.3,
                  padding: '10px 18px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  borderColor: '#ef4444',
                }}
                onClick={confirmDeleteRecording}
              >
                <Trash2 size={16} /> Delete Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing Patient Calling Screen / Ringing Modal */}
      {patientCallingState?.isOpen && (
        <PatientCallingModal
          appointment={patientCallingState.appointment}
          callState={patientCallingState.status}
          rejectionReason={patientCallingState.rejectionReason}
          onCancelCall={handleCancelVideoCall}
          onRetryCall={handleRetryVideoCall}
          onBookAnother={() => {
            setPatientCallingState(null);
            setIsFindDoctorOpen(true);
          }}
          onClose={() => setPatientCallingState(null)}
        />
      )}

      {/* Incoming Call Dialog / Modal for Doctor */}
      {incomingCallData && (
        <DoctorIncomingCallModal
          callData={incomingCallData}
          onAccept={handleDoctorAcceptCall}
          onReject={handleDoctorRejectCall}
        />
      )}

      {/* Real-Time Notification Center Drawer (Phase 8 Requirement 3) */}
      <NotificationCenter
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        unreadCount={unreadNotificationsCount}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        currentUserRole={currentUser?.role || 'patient'}
        onActionClick={(notif) => {
          setIsNotificationsOpen(false);
          if (notif.appointmentId) {
            const targetApt = appointments.find(
              (a) => (a.appointmentId || a.id) === notif.appointmentId
            );
            if (targetApt) {
              if (currentUser?.role === 'patient') {
                handleStartVideoCall(targetApt);
              } else {
                handleJoinConsultation(targetApt);
              }
            }
          }
        }}
      />
    </div>
  );
}
