import { io } from 'socket.io-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_URL = 'http://localhost:5000';

let passed = 0;
let failed = 0;

function assert(desc, condition) {
  if (condition) {
    console.log(`✅ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${desc}`);
    failed++;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 NEXORA END-TO-END VERIFICATION: NOTIFICATIONS & RECORDINGS');
  console.log('================================================================\n');

  // ----------------------------------------------------------------
  // PART A: REAL-TIME NOTIFICATIONS & CALLING WORKFLOW
  // ----------------------------------------------------------------
  console.log('--- TEST GROUP 1: Socket.IO Authentication & Personal Rooms ---');

  // Connect Doctor Socket
  const docSocket = io(SERVER_URL, {
    transports: ['websocket'],
    auth: { userId: 'doc-1', role: 'doctor', name: 'Dr. Ananya Sharma, MD' },
  });

  // Connect Patient Socket
  const patSocket = io(SERVER_URL, {
    transports: ['websocket'],
    auth: { userId: 'pat-1', role: 'patient', name: 'Kumar' },
  });

  // Connect Unrelated Doctor Socket (to verify isolation)
  const otherDocSocket = io(SERVER_URL, {
    transports: ['websocket'],
    auth: { userId: 'doc-999', role: 'doctor', name: 'Dr. Other Specialist' },
  });

  await new Promise((resolve) => {
    let connectedCount = 0;
    const check = () => {
      connectedCount++;
      if (connectedCount === 3) resolve();
    };
    docSocket.on('connect', check);
    patSocket.on('connect', check);
    otherDocSocket.on('connect', check);
  });

  assert('Doctor socket connected successfully', docSocket.connected);
  assert('Patient socket connected successfully', patSocket.connected);
  assert('Unrelated doctor socket connected successfully', otherDocSocket.connected);

  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Incoming Call Initiation & Room Routing ---');

  let otherDocReceivedCall = false;
  otherDocSocket.on('incoming-call', () => {
    otherDocReceivedCall = true;
  });

  let assignedDocReceivedCall = false;
  let receivedCallPayload = null;
  docSocket.on('incoming-call', (payload) => {
    assignedDocReceivedCall = true;
    receivedCallPayload = payload;
  });

  let patientRingingAcknowledged = false;
  patSocket.on('call-ringing', (data) => {
    patientRingingAcknowledged = true;
  });

  // Patient initiates call to Dr. Ananya Sharma (doc-1) for appointment APT-101
  patSocket.emit('incoming-call-initiate', {
    appointmentId: 'APT-101',
    patientId: 'pat-1',
    patientName: 'Kumar',
    patientAge: 42,
    patientVillage: 'Rampur Village',
    symptom: 'Chest discomfort & BP review',
    kiosk: 'Rampur Health Kiosk Room A',
    doctorId: 'doc-1',
    doctorName: 'Dr. Ananya Sharma, MD',
  });

  await sleep(600);

  assert('Assigned doctor received incoming-call event', assignedDocReceivedCall);
  assert('Call payload has correct appointmentId APT-101', receivedCallPayload?.appointmentId === 'APT-101');
  assert('Call payload has patient name Kumar', receivedCallPayload?.patientName === 'Kumar');
  assert('Patient received call-ringing status acknowledgement', patientRingingAcknowledged);
  assert('Unrelated doctor DID NOT receive incoming call (privacy isolation)', !otherDocReceivedCall);

  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Call Acceptance & Consultation Room Entry ---');

  let patientReceivedAccept = false;
  let acceptPayload = null;
  patSocket.on('call-accepted', (data) => {
    patientReceivedAccept = true;
    acceptPayload = data;
  });

  // Doctor accepts call
  docSocket.emit('incoming-call-accept', {
    appointmentId: 'APT-101',
    doctorId: 'doc-1',
    doctorName: 'Dr. Ananya Sharma, MD',
    patientId: 'pat-1',
  });

  await sleep(600);

  assert('Patient received call-accepted event in personal room', patientReceivedAccept);
  assert('Consultation roomId matches consultation_APT-101', acceptPayload?.roomId === 'consultation_APT-101');

  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Doctor Offline Status & Missed Call Handling ---');

  // Disconnect doctor socket to simulate clinician offline
  docSocket.disconnect();
  await sleep(300);

  let patientReceivedOfflineNotice = false;
  let offlineNoticeData = null;
  patSocket.on('doctor-offline', (data) => {
    patientReceivedOfflineNotice = true;
    offlineNoticeData = data;
  });

  // Patient tries calling offline doctor
  patSocket.emit('incoming-call-initiate', {
    appointmentId: 'APT-101',
    patientId: 'pat-1',
    patientName: 'Kumar',
    doctorId: 'doc-1',
    doctorName: 'Dr. Ananya Sharma, MD',
  });

  await sleep(600);

  assert('Patient received doctor-offline notification', patientReceivedOfflineNotice);
  assert('Offline status returned properly', offlineNoticeData?.status === 'offline');
  assert('Clear informative offline message returned', Boolean(offlineNoticeData?.message));

  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Notification Persistence & APIs ---');

  // Fetch notifications via GET /api/notifications
  const notifRes = await fetch(`${SERVER_URL}/api/notifications?userId=pat-1`);
  const notifJson = await notifRes.json();

  assert('GET /api/notifications returned HTTP 200', notifRes.status === 200);
  assert('Notifications response has success: true', notifJson.success === true);
  assert('Notifications array is returned', Array.isArray(notifJson.notifications));
  assert('Unread count is a valid number', typeof notifJson.unreadCount === 'number');

  // Verify missed call / offline notification was saved in DB
  const offlineNotif = notifJson.notifications.find(
    (n) => n.appointmentId === 'APT-101' && (n.type === 'missed_call' || n.type === 'call_accepted')
  );
  assert('Persistent notification found in database for appointment APT-101', Boolean(offlineNotif));

  if (offlineNotif) {
    // Mark single notification as read
    const readRes = await fetch(`${SERVER_URL}/api/notifications/${offlineNotif.id || offlineNotif._id}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'pat-1' }),
    });
    const readJson = await readRes.json();
    assert('PATCH /api/notifications/:id/read returned HTTP 200', readRes.status === 200);
    assert('Notification isRead updated to true', readJson.notification?.isRead === true);
  }

  // Mark all notifications read
  const markAllRes = await fetch(`${SERVER_URL}/api/notifications/mark-all-read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'pat-1' }),
  });
  assert('POST /api/notifications/mark-all-read returned HTTP 200', markAllRes.status === 200);

  // ----------------------------------------------------------------
  // PART B: VIDEO RECORDING SAVE, SECURING & PLAYBACK
  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Video Recording Upload & Multi-field Support ---');

  // Create real test WebM file buffer
  const webmHeader = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01]);
  const dummyPayload = Buffer.alloc(1024 * 64, 0xAA);
  const testWebmBuffer = Buffer.concat([webmHeader, dummyPayload]);

  // Test 1: Upload with 'recording' field name
  const boundary = '----WebKitFormBoundaryTest' + Math.random().toString(36).substring(2);
  let bodyBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="appointmentId"\r\n\r\nAPT-101\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="patientId"\r\n\r\npat-1\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="doctorId"\r\n\r\ndoc-1\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="duration"\r\n\r\n01:15\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="recording"; filename="consultation_APT-101.webm"\r\nContent-Type: video/webm\r\n\r\n`),
    testWebmBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const uploadRes1 = await fetch(`${SERVER_URL}/api/recordings`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'x-user-id': 'pat-1',
    },
    body: bodyBuffer,
  });
  const uploadJson1 = await uploadRes1.json();

  assert('POST /api/recordings with "recording" field returned HTTP 201', uploadRes1.status === 201);
  assert('Upload response returned success: true', uploadJson1.success === true);
  assert('Recording metadata created with unique recordingId', Boolean(uploadJson1.recording?.recordingId));
  const createdRecId = uploadJson1.recording?.recordingId;

  // Test 2: Upload with 'recordingFile' field name
  const boundary2 = '----WebKitFormBoundaryTest2' + Math.random().toString(36).substring(2);
  let bodyBuffer2 = Buffer.concat([
    Buffer.from(`--${boundary2}\r\nContent-Disposition: form-data; name="appointmentId"\r\n\r\nAPT-101\r\n`),
    Buffer.from(`--${boundary2}\r\nContent-Disposition: form-data; name="patientId"\r\n\r\npat-1\r\n`),
    Buffer.from(`--${boundary2}\r\nContent-Disposition: form-data; name="doctorId"\r\n\r\ndoc-1\r\n`),
    Buffer.from(`--${boundary2}\r\nContent-Disposition: form-data; name="recordingFile"; filename="consultation_APT-101_v2.webm"\r\nContent-Type: video/webm\r\n\r\n`),
    testWebmBuffer,
    Buffer.from(`\r\n--${boundary2}--\r\n`),
  ]);

  const uploadRes2 = await fetch(`${SERVER_URL}/api/recordings`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary2}`,
      'x-user-id': 'pat-1',
    },
    body: bodyBuffer2,
  });
  const uploadJson2 = await uploadRes2.json();

  assert('POST /api/recordings with "recordingFile" field returned HTTP 201', uploadRes2.status === 201);
  assert('Multi-field upload supports both "recording" and "recordingFile"', uploadJson2.success === true);

  // Test 3: Empty file rejection
  const boundaryEmpty = '----WebKitFormBoundaryEmpty' + Math.random().toString(36).substring(2);
  let emptyBuffer = Buffer.concat([
    Buffer.from(`--${boundaryEmpty}\r\nContent-Disposition: form-data; name="appointmentId"\r\n\r\nAPT-101\r\n`),
    Buffer.from(`--${boundaryEmpty}\r\nContent-Disposition: form-data; name="recording"; filename="empty.webm"\r\nContent-Type: video/webm\r\n\r\n`),
    Buffer.alloc(0),
    Buffer.from(`\r\n--${boundaryEmpty}--\r\n`),
  ]);

  const emptyRes = await fetch(`${SERVER_URL}/api/recordings`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundaryEmpty}`,
      'x-user-id': 'pat-1',
    },
    body: emptyBuffer,
  });
  assert('Empty recording file rejected with HTTP 400 Bad Request', emptyRes.status === 400);

  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Authorized Listing & Streaming Playback ---');

  // Authorized Patient queries their recordings
  const listPatRes = await fetch(`${SERVER_URL}/api/recordings?patientId=pat-1&userId=pat-1`, {
    headers: { 'x-user-id': 'pat-1' },
  });
  const listPatJson = await listPatRes.json();

  assert('GET /api/recordings for patient returned HTTP 200', listPatRes.status === 200);
  assert('Patient sees the newly saved recording', listPatJson.recordings?.some((r) => r.recordingId === createdRecId));
  assert('Server internal filePath is NOT leaked to client', !listPatJson.recordings?.[0]?.filePath);

  // Authorized Doctor queries their recordings
  const listDocRes = await fetch(`${SERVER_URL}/api/recordings?doctorId=doc-1&userId=doc-1`, {
    headers: { 'x-user-id': 'doc-1' },
  });
  const listDocJson = await listDocRes.json();
  assert('GET /api/recordings for doctor returned HTTP 200', listDocRes.status === 200);
  assert('Doctor sees the newly saved recording', listDocJson.recordings?.some((r) => r.recordingId === createdRecId));

  // Authorized Patient plays recording via streaming endpoint
  const streamRes = await fetch(`${SERVER_URL}/api/recordings/${createdRecId}?userId=pat-1`);
  assert('Authorized video streaming returned HTTP 200', streamRes.status === 200);
  assert('Stream Content-Type is video/webm', streamRes.headers.get('content-type')?.includes('video/webm'));
  const streamBuf = await streamRes.arrayBuffer();
  assert('Stream delivered actual video bytes', streamBuf.byteLength > 0);

  // Unauthorized access test: Stranger tries to access patient recording
  const unauthRes = await fetch(`${SERVER_URL}/api/recordings/${createdRecId}?userId=unauthorized-stranger-99`);
  assert('Unauthorized playback access blocked with HTTP 403 Forbidden', unauthRes.status === 403);

  // ----------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Delete Recording & File Cleanup ---');

  const delRes = await fetch(`${SERVER_URL}/api/recordings/${createdRecId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'pat-1' },
    body: JSON.stringify({ userId: 'pat-1' }),
  });
  const delJson = await delRes.json();

  assert('DELETE /api/recordings/:id returned HTTP 200', delRes.status === 200);
  assert('Delete response returned success: true', delJson.success === true);

  // Verify deleted recording is gone from listing
  const listAfterDel = await fetch(`${SERVER_URL}/api/recordings?patientId=pat-1&userId=pat-1`);
  const listAfterJson = await listAfterDel.json();
  assert('Deleted recording removed from user dashboard listing', !listAfterJson.recordings?.some((r) => r.recordingId === createdRecId));

  // Cleanup sockets
  patSocket.disconnect();
  otherDocSocket.disconnect();

  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
