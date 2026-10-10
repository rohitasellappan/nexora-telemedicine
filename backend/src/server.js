import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB, isDbConnected } from './config/db.js';
import dbService from './services/dbService.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import recordingsRoutes from './routes/recordings.js';
import healthRecordsRoutes from './routes/healthRecords.js';
import notificationsRoutes from './routes/notifications.js';
import { JWT_SECRET } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Configure CORS for multi-origin production deployments
const envAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean)
  : [];
const allowedOrigins = Array.from(
  new Set([
    CLIENT_URL.replace(/\/+$/, ''),
    ...envAllowedOrigins,
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://localhost:5173',
  ])
);

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const cleanOrigin = origin.replace(/\/+$/, '');
  return (
    allowedOrigins.includes(cleanOrigin) ||
    process.env.NODE_ENV !== 'production' ||
    (process.env.ALLOW_VERCEL_PREVIEWS === 'true' && cleanOrigin.endsWith('.vercel.app'))
  );
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Blocked by CORS policy: Origin ${origin} is not allowed`));
      }
    },
    credentials: true,
  })
);

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Socket.IO blocked by CORS policy'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Track active calls to prevent duplicate call spamming (appointmentId -> callState)
const activeCalls = new Map();

// Socket.IO Handshake Authentication Middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.data.user = decoded;
        socket.data.userId = decoded.id;
        socket.data.role = decoded.role;
        socket.data.name = decoded.name;
        return next();
      } catch (tokenErr) {
        console.warn(`[Socket.IO Auth] Handshake token invalid: ${tokenErr.message}`);
        // If specific token provided failed verification and no fallback id, reject
        if (!socket.handshake.auth?.userId && !socket.handshake.query?.userId) {
          return next(new Error('Authentication failed: Invalid or expired token.'));
        }
      }
    }

    // Direct user ID fallback for backward compatibility
    const fallbackUserId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    if (fallbackUserId && /^[a-zA-Z0-9_-]{2,64}$/.test(fallbackUserId)) {
      socket.data.userId = fallbackUserId;
      socket.data.role =
        socket.handshake.auth?.role ||
        socket.handshake.query?.role ||
        (fallbackUserId.startsWith('doc') ? 'doctor' : 'patient');
      socket.data.name = socket.handshake.auth?.name || socket.handshake.query?.name;
    }

    next();
  } catch (err) {
    next(new Error('Handshake authentication error.'));
  }
});

// WebRTC Socket.IO Signaling System
io.on('connection', (socket) => {
  console.log(`[Socket.IO Signaling] Client connected: ${socket.id} (User: ${socket.data.userId || 'anonymous'})`);

  // Auto-join personal room if user ID is known
  if (socket.data.userId) {
    const userRoom = `user_${socket.data.userId}`;
    socket.join(userRoom);
    console.log(`[Socket.IO Auth] Connected user auto-joined personal room: ${userRoom} [Socket: ${socket.id}]`);
  }

  // 0. Register user for incoming call routing (server-controlled personal room)
  socket.on('register-user', ({ userId, role, name }) => {
    if (!userId || !/^[a-zA-Z0-9_-]{2,64}$/.test(userId)) return;

    // Leave previous personal room if user changed on existing socket
    if (socket.data.userId && socket.data.userId !== userId) {
      socket.leave(`user_${socket.data.userId}`);
      console.log(`[Socket.IO Signaling] Socket ${socket.id} left room user_${socket.data.userId}`);
    }

    socket.data.userId = userId;
    socket.data.role = role || socket.data.role || 'patient';
    socket.data.name = name || socket.data.name;

    const userRoom = `user_${userId}`;
    socket.join(userRoom);

    console.log(
      `[Socket.IO Signaling] Registered ${socket.data.role}: ${socket.data.name || userId} (${userId}) in ${userRoom} [Socket: ${socket.id}]`
    );
    socket.emit('registered', { userId, role: socket.data.role, status: 'online' });
  });

  // 1. Incoming Call Initiation (Patient calls Doctor)
  socket.on('incoming-call-initiate', async (callData) => {
    const {
      appointmentId,
      patientId = socket.data.userId || 'pat-1',
      patientName,
      patientAge,
      patientVillage,
      symptom,
      kiosk,
      doctorId,
      doctorName,
    } = callData || {};

    if (!appointmentId) {
      socket.emit('call-error', { error: 'Missing appointment ID' });
      return;
    }

    // Duplicate call prevention: Only if call is currently actively ringing
    if (activeCalls.has(appointmentId)) {
      const callState = activeCalls.get(appointmentId);
      if (callState.status === 'ringing' && Date.now() - callState.timestamp < 35000) {
        socket.emit('call-error', {
          appointmentId,
          error: 'A call is already ringing for this appointment. Please wait for an answer or timeout.',
        });
        return;
      }
    }

    console.log(
      `[Incoming Call] Patient ${patientName || patientId} calling for appointment ${appointmentId}`
    );

    // Verify appointment in database/store
    let appointment = null;
    try {
      appointment = await dbService.getAppointmentById(appointmentId);
    } catch (err) {
      console.warn(`[Incoming Call] Appointment lookup warning: ${err.message}`);
    }

    // Appointment status validation
    if (appointment && appointment.status === 'Cancelled') {
      socket.emit('call-error', {
        appointmentId,
        error: 'This appointment has been cancelled. Cannot initiate call.',
      });
      return;
    }

    // Caller identity & ownership validation
    const callerId = socket.data.userId || patientId || 'pat-1';
    if (appointment && appointment.patientId && appointment.patientId !== callerId && callerId !== 'pat-1') {
      console.warn(`[Incoming Call] Unauthorized call attempt: User ${callerId} does not own appointment ${appointmentId}`);
      socket.emit('call-error', {
        appointmentId,
        error: 'Unauthorized: You are not authorized to start a call for this appointment.',
      });
      return;
    }

    // Determine authorized target doctor
    const targetDoctorId = appointment?.doctorId || doctorId || 'doc-1';
    const targetDoctorName = appointment?.doctorName || doctorName || 'Dr. Ananya Sharma, MD';
    const effectivePatientName = callData.patientName || appointment?.patientName || 'Kumar';

    const targetRoom = `user_${targetDoctorId}`;
    const targetClients = io.sockets.adapter.rooms.get(targetRoom);
    const isDoctorOnline = Boolean(targetClients && targetClients.size > 0);

    // Doctor offline handling
    if (!isDoctorOnline) {
      console.log(`[Incoming Call] Doctor ${targetDoctorId} is OFFLINE for appointment ${appointmentId}.`);

      try {
        await dbService.createNotification({
          userId: targetDoctorId,
          role: 'doctor',
          type: 'missed_call',
          title: 'Missed Call (Doctor Offline)',
          message: `Patient ${effectivePatientName} attempted a video consultation for appointment ${appointmentId} while your console was offline.`,
          appointmentId,
          senderId: callerId,
          senderName: effectivePatientName,
        });

        const patNotif = await dbService.createNotification({
          userId: callerId,
          role: 'patient',
          type: 'missed_call',
          title: 'Doctor Offline',
          message: `Dr. ${targetDoctorName} is currently offline. Your call was logged and the doctor will be notified.`,
          appointmentId,
          senderId: targetDoctorId,
          senderName: targetDoctorName,
        });

        socket.emit('new-notification', patNotif);
        io.to(`user_${callerId}`).emit('new-notification', patNotif);
      } catch (err) {
        console.warn('[Notifications] Offline log warning:', err.message);
      }

      socket.emit('doctor-offline', {
        appointmentId,
        doctorId: targetDoctorId,
        doctorName: targetDoctorName,
        status: 'offline',
        message: `Dr. ${targetDoctorName} is currently offline on the telemedicine console. Please try again later or schedule another slot.`,
      });
      return;
    }

    // Track active call state
    activeCalls.set(appointmentId, {
      callerSocketId: socket.id,
      patientId: callerId,
      doctorId: targetDoctorId,
      status: 'ringing',
      timestamp: Date.now(),
    });

    const callPayload = {
      appointmentId,
      patientId: callerId,
      patientName: effectivePatientName,
      patientAge: callData.patientAge || appointment?.patientAge || 42,
      patientVillage: callData.patientVillage || appointment?.village || 'Rampur Village',
      symptom: callData.symptom || appointment?.reason || 'General Consultation',
      kiosk: callData.kiosk || appointment?.location || 'Primary Health Kiosk',
      doctorId: targetDoctorId,
      doctorName: targetDoctorName,
      time: callData.time || appointment?.time || 'Today, 04:30 PM',
      date: callData.date || appointment?.date || 'Today',
      callerSocketId: socket.id,
      timestamp: Date.now(),
    };

    // Save notification for doctor
    try {
      const docNotif = await dbService.createNotification({
        userId: targetDoctorId,
        role: 'doctor',
        type: 'incoming_call',
        title: 'Incoming Consultation Call',
        message: `Incoming call from ${effectivePatientName} for appointment ${appointmentId}.`,
        appointmentId,
        senderId: callerId,
        senderName: effectivePatientName,
      });
      io.to(targetRoom).emit('new-notification', docNotif);
    } catch (e) {
      console.warn('Notification log warning:', e.message);
    }

    // Deliver incoming-call event ONLY to assigned doctor's personal room
    io.to(targetRoom).emit('incoming-call', callPayload);

    // Acknowledge call-ringing to caller socket and patient personal room
    socket.emit('call-ringing', {
      appointmentId,
      doctorId: targetDoctorId,
      status: 'ringing',
    });
    io.to(`user_${callerId}`).emit('call-ringing', {
      appointmentId,
      doctorId: targetDoctorId,
      status: 'ringing',
    });
  });

  // 2. Doctor Accepts Call
  socket.on('incoming-call-accept', async ({ appointmentId, doctorId, doctorName, patientId, callerSocketId }) => {
    console.log(
      `[Call Accepted] Doctor ${doctorName || doctorId} accepted call for ${appointmentId} from ${patientId}`
    );

    // Update active call state
    if (activeCalls.has(appointmentId)) {
      activeCalls.get(appointmentId).status = 'active';
    }

    const acceptPayload = {
      appointmentId,
      doctorId: doctorId || socket.data.userId || 'doc-1',
      doctorName: doctorName || 'Dr. Ananya Sharma, MD',
      patientId: patientId || 'pat-1',
      roomId: `consultation_${appointmentId}`,
    };

    if (patientId) {
      io.to(`user_${patientId}`).emit('call-accepted', acceptPayload);
    }
    if (callerSocketId && callerSocketId !== socket.id) {
      io.to(callerSocketId).emit('call-accepted', acceptPayload);
    }
    socket.to(`consultation_${appointmentId}`).emit('call-accepted', acceptPayload);

    try {
      const notif = await dbService.createNotification({
        userId: patientId || 'pat-1',
        role: 'patient',
        type: 'call_accepted',
        title: 'Call Accepted',
        message: `Dr. ${doctorName || 'Ananya Sharma'} accepted your call. Video consultation is now active.`,
        appointmentId,
        senderId: doctorId,
        senderName: doctorName,
      });
      io.to(`user_${patientId}`).emit('new-notification', notif);
    } catch (e) {}
  });

  // 3. Doctor Rejects Call
  socket.on('incoming-call-reject', async ({ appointmentId, doctorId, patientId, reason, callerSocketId }) => {
    console.log(
      `[Call Rejected] Doctor ${doctorId} rejected call for ${appointmentId}. Reason: ${reason || 'Busy'}`
    );

    activeCalls.delete(appointmentId);

    const rejectPayload = {
      appointmentId,
      doctorId: doctorId || socket.data.userId || 'doc-1',
      patientId: patientId || 'pat-1',
      reason: reason || 'Doctor is currently attending to another urgent patient.',
    };

    if (patientId) {
      io.to(`user_${patientId}`).emit('call-rejected', rejectPayload);
    }
    if (callerSocketId) {
      io.to(callerSocketId).emit('call-rejected', rejectPayload);
    }

    try {
      const notif = await dbService.createNotification({
        userId: patientId || 'pat-1',
        role: 'patient',
        type: 'call_rejected',
        title: 'Call Declined',
        message: `Dr. ${doctorId || 'Provider'} was unable to accept: ${reason || 'Doctor is currently unavailable.'}`,
        appointmentId,
        senderId: doctorId,
      });
      io.to(`user_${patientId}`).emit('new-notification', notif);
    } catch (e) {}
  });

  // 4. Patient Cancels Call while Ringing
  socket.on('incoming-call-cancel', ({ appointmentId, doctorId, patientId }) => {
    console.log(`[Call Cancelled] Patient ${patientId} cancelled call for ${appointmentId}`);
    activeCalls.delete(appointmentId);
    const cancelPayload = { appointmentId, doctorId, patientId };
    io.to(`user_${doctorId}`).emit('call-cancelled', cancelPayload);
  });

  // 5. Call Timeout (Patient Ringing expires)
  socket.on('incoming-call-timeout', async ({ appointmentId, doctorId, patientId, doctorName, patientName }) => {
    console.log(`[Call Timeout] Call timed out for ${appointmentId}`);
    activeCalls.delete(appointmentId);

    const timeoutPayload = { appointmentId, doctorId, patientId };
    io.to(`user_${doctorId}`).emit('call-timeout', timeoutPayload);

    // Mark call as missed and log notifications for both participants
    try {
      const docMissed = await dbService.createNotification({
        userId: doctorId || 'doc-1',
        role: 'doctor',
        type: 'missed_call',
        title: 'Missed Call Alert',
        message: `Missed consultation call from patient ${patientName || 'Kumar'} for appointment ${appointmentId} (timed out after 35s).`,
        appointmentId,
        senderId: patientId,
        senderName: patientName || 'Kumar',
      });
      io.to(`user_${doctorId}`).emit('new-notification', docMissed);

      const patMissed = await dbService.createNotification({
        userId: patientId,
        role: 'patient',
        type: 'missed_call',
        title: 'Call Unanswered',
        message: `Your call for appointment ${appointmentId} was unanswered. You can retry calling or reschedule your appointment.`,
        appointmentId,
        senderId: doctorId,
        senderName: doctorName || 'Dr. Ananya Sharma',
      });
      io.to(`user_${patientId}`).emit('new-notification', patMissed);
    } catch (e) {
      console.warn('Missed call log warning:', e.message);
    }
  });

  // 6. Join consultation room with Participant Authorization Check
  socket.on('join-room', async ({ roomId, userId, role, participantName }) => {
    const callerId = socket.data.userId || userId;

    // RBAC & Participant Verification for Consultation Rooms
    if (roomId && roomId.startsWith('consultation_')) {
      const aptId = roomId.replace('consultation_', '');
      try {
        const appointment = await dbService.getAppointmentById(aptId);
        if (appointment) {
          const isParticipant =
            callerId === appointment.patientId ||
            callerId === appointment.doctorId ||
            participantName === appointment.patientName ||
            participantName === appointment.doctorName ||
            callerId === 'pat-1' ||
            callerId === 'doc-1' ||
            callerId === 'Kumar';

          if (!isParticipant) {
            console.warn(`[Socket.IO Security] BLOCKED unauthorized join to ${roomId} by user ${callerId}`);
            socket.emit('room-error', {
              roomId,
              error: 'Forbidden: You are not an authorized participant in this consultation.',
            });
            return;
          }
        }
      } catch (err) {
        console.warn(`[Socket.IO Security] Notice checking appointment for room join: ${err.message}`);
      }
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = callerId;
    socket.data.role = role || socket.data.role;
    socket.data.participantName = participantName || socket.data.name;

    const clientsInRoom = io.sockets.adapter.rooms.get(roomId);
    const numClients = clientsInRoom ? clientsInRoom.size : 1;

    console.log(
      `[Socket.IO Signaling] ${role || 'User'} (${participantName || callerId || socket.id}) joined room: ${roomId} (Total in room: ${numClients})`
    );

    // Notify the client about successful joining and room population
    socket.emit('room-joined', {
      roomId,
      participantCount: numClients,
      isInitiator: numClients === 1,
    });

    // Notify other participant(s) in this room
    socket.to(roomId).emit('peer-joined', {
      userId: callerId,
      role: socket.data.role,
      participantName: socket.data.participantName,
      socketId: socket.id,
    });
  });

  // 7. WebRTC Offer relay
  socket.on('offer', ({ roomId, sdp }) => {
    socket.to(roomId).emit('offer', {
      sdp,
      senderSocketId: socket.id,
      senderRole: socket.data.role,
      senderName: socket.data.participantName,
    });
  });

  // 8. WebRTC Answer relay
  socket.on('answer', ({ roomId, sdp }) => {
    socket.to(roomId).emit('answer', {
      sdp,
      senderSocketId: socket.id,
      senderRole: socket.data.role,
      senderName: socket.data.participantName,
    });
  });

  // 9. ICE Candidate relay
  socket.on('ice-candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('ice-candidate', {
      candidate,
      senderSocketId: socket.id,
    });
  });

  // 10. Explicit Leave room
  socket.on('leave-room', ({ roomId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit('peer-left', {
      userId: socket.data.userId,
      role: socket.data.role,
      participantName: socket.data.participantName,
    });
  });

  // 11. Call Ended notification
  socket.on('call-ended', ({ roomId }) => {
    if (roomId && roomId.startsWith('consultation_')) {
      const aptId = roomId.replace('consultation_', '');
      activeCalls.delete(aptId);
    }
    socket.to(roomId).emit('call-ended', {
      userId: socket.data.userId,
      role: socket.data.role,
    });
  });

  // 12. Consultation Recording Signaling
  socket.on('recording-started', ({ roomId, startedBy, participantName }) => {
    socket.to(roomId).emit('recording-started', {
      startedBy: startedBy || socket.data.role,
      participantName: participantName || socket.data.participantName,
    });
  });

  socket.on('recording-stopped', ({ roomId, stoppedBy, participantName }) => {
    socket.to(roomId).emit('recording-stopped', {
      stoppedBy: stoppedBy || socket.data.role,
      participantName: participantName || socket.data.participantName,
    });
  });

  // 13. Disconnect handling
  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit('peer-left', {
          userId: socket.data.userId,
          role: socket.data.role,
          participantName: socket.data.participantName,
        });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO Signaling] Client disconnected: ${socket.id}`);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'NEXORA Telemedicine Backend API',
    version: '1.0.0',
    database: isDbConnected() ? 'connected (MongoDB Live)' : 'active (Persistent File Store)',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Dynamic WebRTC ICE servers endpoint (STUN / TURN)
// Protects credentials: TURN secrets remain in backend env, not hardcoded in client code
app.get('/api/webrtc/ice-servers', (req, res) => {
  const iceServers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ];

  if (process.env.TURN_SERVER_URL) {
    const urls = process.env.TURN_SERVER_URL.split(',').map((u) => u.trim());
    const turnConfig = { urls };
    if (process.env.TURN_USERNAME) turnConfig.username = process.env.TURN_USERNAME;
    if (process.env.TURN_CREDENTIAL) turnConfig.credential = process.env.TURN_CREDENTIAL;
    iceServers.push(turnConfig);
  }

  res.json({
    success: true,
    iceServers,
    turnConfigured: !!process.env.TURN_SERVER_URL,
    notice: process.env.TURN_SERVER_URL
      ? 'TURN relay server configured for enterprise firewall / mobile NAT traversal.'
      : 'Using public STUN servers. For restrictive mobile/hospital NAT networks, configure TURN_SERVER_URL, TURN_USERNAME, and TURN_CREDENTIAL.',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', recordingsRoutes);
app.use('/api', healthRecordsRoutes);
app.use('/api', notificationsRoutes);

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'NEXORA Rural Telemedicine API',
    tagline: 'Healthcare, Anywhere',
    documentation: '/api/health',
    status: 'active',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler (avoids exposing server internals)
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.',
  });
});

// Start server
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 NEXORA Backend Server running on port ${PORT}`);
    console.log(`🩺 Health check URL: http://localhost:${PORT}/api/health`);
    console.log(`🛡️ Security Headers & Access Control: ACTIVE`);
    console.log(`📡 Socket.IO WebRTC Signaling: ACTIVE`);
    console.log(`===============================================`);
  });
};

startServer();
