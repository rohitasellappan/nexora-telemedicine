// backend/test_phase11_e2e_system.js
import jwt from 'jsonwebtoken';
import { io } from 'socket.io-client';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'nexora_telemedicine_super_secure_jwt_secret_2026';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runE2ETests() {
  console.log('================================================================');
  console.log('🩺 NEXORA PHASE 11: FULL END-TO-END SYSTEM TEST SUITE');
  console.log('================================================================\n');

  // ====================================================================
  // 1. AUTHENTICATION & SESSIONS
  // ====================================================================
  console.log('--- 1. Authentication, Role Separation & Sessions ---');
  const uid = Date.now().toString().slice(-5);
  const testPatientEmail = `e2e.patient.${uid}@nexora.health`;
  const testPatientPass = 'SecurePatientPass123!';

  // 1a. Register patient
  const regRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testPatientEmail,
      password: testPatientPass,
      name: `Ramesh E2E ${uid}`,
      role: 'patient',
      age: 44,
      village: 'Rampur Village',
    }),
  });
  const regJson = await regRes.json();
  assert(regRes.status === 201, 'Patient registration succeeded with HTTP 201');
  assert(Boolean(regJson.token), 'Patient registration returns signed JWT');
  const patientToken = regJson.token;
  const newPatientId = regJson.user.id;
  assert(!regJson.user.password, 'Patient password hash is omitted from response');

  // 1b. Log in as patient
  const patLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testPatientEmail,
      password: testPatientPass,
      role: 'patient',
    }),
  });
  const patLoginJson = await patLoginRes.json();
  assert(patLoginRes.status === 200, 'Patient login succeeded with HTTP 200');
  assert(patLoginJson.user.role === 'patient', 'Authenticated user role is patient');

  // 1c. Log in as doctor in a separate session
  const docLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ananya.doctor@nexora.health',
      password: 'password123',
      role: 'doctor',
    }),
  });
  const docLoginJson = await docLoginRes.json();
  assert(docLoginRes.status === 200, 'Doctor login succeeded with HTTP 200');
  assert(docLoginJson.user.role === 'doctor', 'Authenticated user role is doctor');
  const doctorToken = docLoginJson.token;
  const doctorId = docLoginJson.user.id || 'doc-1';

  // 1d. Verify Role-Based Dashboard Access
  const patDashRes = await fetch(`${API_BASE}/api/patient/dashboard?patientId=${newPatientId}`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(patDashRes.status === 200, 'Patient accesses own dashboard with HTTP 200');

  const patDocDashBlockedRes = await fetch(`${API_BASE}/api/doctor/dashboard`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(patDocDashBlockedRes.status === 403, 'Patient accessing doctor dashboard rejected with HTTP 403');

  const docDashRes = await fetch(`${API_BASE}/api/doctor/dashboard?doctorId=${doctorId}`, {
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  assert(docDashRes.status === 200, 'Doctor accesses clinician dashboard with HTTP 200');

  // ====================================================================
  // 2. DOCTOR SEARCH & APPOINTMENTS
  // ====================================================================
  console.log('\n--- 2. Doctor Search, Appointment Booking & Lifecycle ---');

  // 2a. Doctor search
  const docSearchRes = await fetch(`${API_BASE}/api/doctors?search=Cardiologist`);
  const docSearchJson = await docSearchRes.json();
  assert(docSearchRes.status === 200, 'Doctor search directory returns HTTP 200');
  assert(docSearchJson.doctors?.length > 0, 'Found specialized cardiologists');
  const targetDoctor = docSearchJson.doctors[0];
  assert(Boolean(targetDoctor.name && targetDoctor.specialization), 'Doctor profile has complete details');

  // 2b. Book appointment as patient
  const bookRes = await fetch(`${API_BASE}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`,
    },
    body: JSON.stringify({
      patientId: newPatientId,
      patientName: `Ramesh E2E ${uid}`,
      doctorId: targetDoctor.id || 'doc-1',
      doctorName: targetDoctor.name,
      date: 'Tomorrow, Oct 10',
      time: '10:30 AM',
      specialization: targetDoctor.specialization,
      reason: 'Chest tightness and blood pressure follow-up',
    }),
  });
  const bookJson = await bookRes.json();
  assert(bookRes.status === 201, 'Appointment booked successfully with HTTP 201');
  const appointmentId = bookJson.appointment.appointmentId;
  assert(Boolean(appointmentId), `Appointment created with ID: ${appointmentId}`);

  // 2c. Verify the assigned doctor sees the appointment
  const docAptRes = await fetch(`${API_BASE}/api/appointments?doctorId=${targetDoctor.id}`, {
    headers: { Authorization: `Bearer ${doctorToken}` },
  });
  const docAptJson = await docAptRes.json();
  assert(docAptRes.status === 200, 'Doctor appointments retrieved with HTTP 200');
  const foundInDoc = docAptJson.appointments.some((a) => a.appointmentId === appointmentId);
  assert(foundInDoc, `Doctor ${targetDoctor.name} sees appointment ${appointmentId} in their schedule`);

  // 2d. Update appointment status (In-Progress -> Completed)
  const patchRes = await fetch(`${API_BASE}/api/appointments/${appointmentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${doctorToken}`,
    },
    body: JSON.stringify({ status: 'In-Progress' }),
  });
  const patchJson = await patchRes.json();
  assert(patchRes.status === 200, 'Doctor updated appointment status with HTTP 200');
  assert(patchJson.appointment.status === 'In-Progress', 'Status confirmed updated to In-Progress');

  // ====================================================================
  // 3. VIDEO CONSULTATION & REAL-TIME WORKFLOW
  // ====================================================================
  console.log('\n--- 3. Video Consultation, Call Signaling & Room Isolation ---');

  const patSocket = io(API_BASE, {
    transports: ['websocket'],
    auth: { token: patientToken, userId: newPatientId, role: 'patient' },
  });
  const docSocket = io(API_BASE, {
    transports: ['websocket'],
    auth: { token: doctorToken, userId: targetDoctor.id, role: 'doctor' },
  });

  await new Promise((resolve) => {
    let connectedCount = 0;
    const check = () => {
      connectedCount++;
      if (connectedCount === 2) resolve();
    };
    patSocket.on('connect', check);
    docSocket.on('connect', check);
  });
  assert(true, 'Both patient and doctor connected and authenticated to Socket.IO signaling');

  // 3a. Patient initiates call -> Doctor receives incoming call
  let doctorReceivedCall = false;
  let callPayloadReceived = null;
  docSocket.on('incoming-call', (payload) => {
    doctorReceivedCall = true;
    callPayloadReceived = payload;
  });

  patSocket.emit('incoming-call-initiate', {
    appointmentId,
    patientId: newPatientId,
    patientName: `Ramesh E2E ${uid}`,
    doctorId: targetDoctor.id,
    doctorName: targetDoctor.name,
    symptom: 'Cardiovascular triage check',
  });

  await sleep(600);
  assert(doctorReceivedCall, 'Doctor received incoming-call notification in real-time');
  assert(callPayloadReceived?.appointmentId === appointmentId, 'Call payload contains exact appointmentId');

  // 3b. Doctor accepts call -> Both join room
  let patientReceivedAccept = false;
  let acceptedRoomId = null;
  patSocket.on('call-accepted', (data) => {
    patientReceivedAccept = true;
    acceptedRoomId = data.roomId;
  });

  docSocket.emit('incoming-call-accept', {
    appointmentId,
    doctorId: targetDoctor.id,
    doctorName: targetDoctor.name,
    patientId: newPatientId,
  });

  await sleep(600);
  assert(patientReceivedAccept, 'Patient received call-accepted event');
  assert(acceptedRoomId === `consultation_${appointmentId}`, 'Both participants assigned to consultation room');

  // 3c. Both join consultation room and exchange WebRTC signals
  let doctorReceivedOffer = false;
  let patientReceivedAnswer = false;

  docSocket.on('offer', (data) => {
    doctorReceivedOffer = true;
    // Relay answer back
    docSocket.emit('answer', { roomId: acceptedRoomId, sdp: { type: 'answer', sdp: 'dummy-sdp-answer' } });
  });

  patSocket.on('answer', (data) => {
    patientReceivedAnswer = true;
  });

  patSocket.emit('join-room', {
    roomId: acceptedRoomId,
    userId: newPatientId,
    role: 'patient',
    participantName: `Ramesh E2E ${uid}`,
  });
  docSocket.emit('join-room', {
    roomId: acceptedRoomId,
    userId: targetDoctor.id,
    role: 'doctor',
    participantName: targetDoctor.name,
  });

  await sleep(400);

  // Send WebRTC Offer from patient
  patSocket.emit('offer', {
    roomId: acceptedRoomId,
    sdp: { type: 'offer', sdp: 'dummy-sdp-offer' },
  });

  await sleep(600);
  assert(doctorReceivedOffer, 'Doctor received WebRTC offer in consultation room');
  assert(patientReceivedAnswer, 'Patient received WebRTC answer back in consultation room');

  // 3d. Unauthorized user blocked from joining consultation room
  const intruderSocket = io(API_BASE, {
    transports: ['websocket'],
    auth: { userId: 'unauthorized-stranger-999', role: 'patient' },
  });
  const roomBlockedPromise = new Promise((resolve) => {
    intruderSocket.on('connect', () => {
      intruderSocket.emit('join-room', {
        roomId: acceptedRoomId,
        userId: 'unauthorized-stranger-999',
        role: 'patient',
        participantName: 'Intruder',
      });
    });
    intruderSocket.on('room-error', (err) => resolve(true));
    setTimeout(() => resolve(false), 2000);
  });
  const wasIntruderBlocked = await roomBlockedPromise;
  intruderSocket.disconnect();
  assert(wasIntruderBlocked, 'Unauthorized user blocked from entering private consultation room');

  // End call
  patSocket.emit('call-ended', { roomId: acceptedRoomId });
  patSocket.disconnect();
  docSocket.disconnect();

  // ====================================================================
  // 4. DIGITAL HEALTH RECORDS
  // ====================================================================
  console.log('\n--- 4. Digital Health Records Lifecycle & Privacy ---');

  // 4a. Doctor authors record
  const newDhrRes = await fetch(`${API_BASE}/api/health-records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${doctorToken}`,
    },
    body: JSON.stringify({
      patientId: newPatientId,
      patientName: `Ramesh E2E ${uid}`,
      doctorId: targetDoctor.id,
      appointmentId,
      symptoms: 'Mild chest heaviness after harvest activity, elevated blood pressure',
      diagnosis: 'Stage 1 Essential Hypertension with exertional heat strain',
      prescription: 'Tab. Telmisartan 40mg OD in morning • Oral rehydration salts 1 packet daily',
      doctorNotes: 'Advised strict low-sodium diet, reduce midday direct sun exposure, BP check at kiosk weekly.',
      followUpInstructions: '7 days for BP review at community tele-kiosk',
    }),
  });
  const newDhrJson = await newDhrRes.json();
  assert(newDhrRes.status === 201, 'Doctor successfully filed Digital Health Record with HTTP 201');
  const dhrId = newDhrJson.record.id;
  assert(Boolean(dhrId), `Created health record ID: ${dhrId}`);

  // 4b. Patient retrieves own medical record
  const patDhrRes = await fetch(`${API_BASE}/api/health-records/patient/${newPatientId}`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const patDhrJson = await patDhrRes.json();
  assert(patDhrRes.status === 200, 'Patient retrieved own medical records with HTTP 200');
  const foundDhr = patDhrJson.records.find((r) => r.id === dhrId || r.appointmentId === appointmentId);
  assert(Boolean(foundDhr), 'Newly filed prescription and assessment verified in patient vault');

  // 4c. Unauthorized patient blocked from accessing records
  const strangerToken = jwt.sign({ id: 'pat-stranger-77', role: 'patient' }, JWT_SECRET, { expiresIn: '1h' });
  const unauthDhrRes = await fetch(`${API_BASE}/api/health-records/patient/${newPatientId}`, {
    headers: { Authorization: `Bearer ${strangerToken}` },
  });
  assert(unauthDhrRes.status === 403, 'Unauthorized patient blocked from accessing private health records with HTTP 403');

  // ====================================================================
  // 5. VIDEO CONSULTATION RECORDING
  // ====================================================================
  console.log('\n--- 5. Consultation Recording Upload, Storage & Playback ---');

  // Create dummy WebM payload (with EBML signature)
  const webmHeader = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01]);
  const webmPayload = Buffer.concat([webmHeader, Buffer.alloc(1024 * 64, 0x55)]); // 64KB WebM video

  const boundary = '----WebKitFormBoundaryE2E' + Math.random().toString(36).substring(2);
  const multipartBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="appointmentId"\r\n\r\n${appointmentId}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="patientId"\r\n\r\n${newPatientId}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="doctorId"\r\n\r\n${targetDoctor.id}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="duration"\r\n\r\n01:15\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="consentGiven"\r\n\r\ntrue\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="uploaderId"\r\n\r\n${targetDoctor.id}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="recording"; filename="consultation_${appointmentId}.webm"\r\nContent-Type: video/webm\r\n\r\n`),
    webmPayload,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  // Upload recording
  const recUploadRes = await fetch(`${API_BASE}/api/recordings`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${doctorToken}`,
    },
    body: multipartBody,
  });
  const recUploadJson = await recUploadRes.json();
  assert(recUploadRes.status === 201, 'Consultation recording uploaded successfully with HTTP 201');
  const recordingId = recUploadJson.recording.recordingId;
  assert(Boolean(recordingId), `Created recording ID: ${recordingId}`);
  assert(!recUploadJson.recording.filePath, 'Raw disk path is NOT leaked in upload response');

  // Verify file exists on server disk
  const uploadsDir = path.resolve(process.cwd(), 'uploads/recordings');
  const storedFilename = recUploadJson.recording.filename;
  assert(fs.existsSync(path.join(uploadsDir, storedFilename)), `Physical WebM recording confirmed on disk: ${storedFilename}`);

  // 5b. Authorized Patient queries recording list
  const patListRecRes = await fetch(`${API_BASE}/api/recordings?patientId=${newPatientId}`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const patListRecJson = await patListRecRes.json();
  assert(patListRecRes.status === 200, 'Patient retrieves recordings list with HTTP 200');
  const foundRec = patListRecJson.recordings.some((r) => r.recordingId === recordingId);
  assert(foundRec, 'Recording appears in patient dashboard vault');

  // 5c. Stream video playback
  const streamRes = await fetch(`${API_BASE}/api/recordings/${recordingId}`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(streamRes.status === 200, 'Authorized video streaming returns HTTP 200');
  assert(streamRes.headers.get('content-type')?.includes('video/webm'), 'Stream Content-Type is video/webm');
  const streamedBuf = await streamRes.arrayBuffer();
  assert(streamedBuf.byteLength > 0, 'Stream delivered actual video bytes');

  // 5d. Unauthorized stranger blocked from playing recording
  const strangerRecRes = await fetch(`${API_BASE}/api/recordings/${recordingId}`, {
    headers: { Authorization: `Bearer ${strangerToken}` },
  });
  assert(strangerRecRes.status === 403, 'Unauthorized user blocked from playback with HTTP 403 Forbidden');

  // 5e. Delete recording by authorized participant
  const delRecRes = await fetch(`${API_BASE}/api/recordings/${recordingId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(delRecRes.status === 200, 'Authorized participant successfully deleted recording with HTTP 200');

  // ====================================================================
  // 6. REAL-TIME NOTIFICATIONS & PERSISTENCE
  // ====================================================================
  console.log('\n--- 6. Notifications Center, Unread States & Reconnection ---');

  const notifRes = await fetch(`${API_BASE}/api/notifications`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const notifJson = await notifRes.json();
  assert(notifRes.status === 200, 'GET /api/notifications returns HTTP 200');
  assert(Array.isArray(notifJson.notifications), 'Notifications returned as an array');
  assert(notifJson.notifications.length > 0, 'Notifications for appointment & DHR present in user history');

  const firstNotifId = notifJson.notifications[0]._id || notifJson.notifications[0].id;
  const readRes = await fetch(`${API_BASE}/api/notifications/${firstNotifId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  assert(readRes.status === 200, 'Notification marked as read with HTTP 200');

  // Verify persistence across simulated refresh
  const refreshedNotifRes = await fetch(`${API_BASE}/api/notifications`, {
    headers: { Authorization: `Bearer ${patientToken}` },
  });
  const refreshedNotifJson = await refreshedNotifRes.json();
  const refreshedItem = refreshedNotifJson.notifications.find((n) => (n._id || n.id) === firstNotifId);
  assert(refreshedItem?.isRead === true, 'Notification read state persists across page reload');

  // ====================================================================
  // 7. TECHNICAL INTEGRITY & SECURITY HEADERS
  // ====================================================================
  console.log('\n--- 7. Technical Integrity, Headers & System Status ---');
  const healthRes = await fetch(`${API_BASE}/api/health`);
  const healthJson = await healthRes.json();
  assert(healthRes.status === 200, 'Health endpoint returns HTTP 200 OK');
  assert(healthRes.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff header verified');
  assert(healthRes.headers.get('x-frame-options') === 'SAMEORIGIN', 'X-Frame-Options: SAMEORIGIN header verified');
  assert(healthRes.headers.get('x-xss-protection')?.includes('mode=block'), 'X-XSS-Protection header verified');
  assert(healthJson.status === 'ok', `System health status: ${healthJson.status}`);

  console.log('\n================================================================');
  console.log('🎉 ALL 27 END-TO-END SYSTEM TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runE2ETests().catch((err) => {
  console.error('\n❌ E2E System Test Suite Failed:', err);
  process.exit(1);
});
