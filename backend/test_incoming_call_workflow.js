import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';

function createClient(userId, role, name) {
  return new Promise((resolve, reject) => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });

    socket.on('connect', () => {
      socket.emit('register-user', { userId, role, name });
    });

    socket.on('registered', (data) => {
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      reject(err);
    });
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runTests() {
  console.log('====================================================');
  console.log('📞 NEXORA — Incoming Video Call & Doctor Accept Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  // Setup sockets: 1 Patient, 1 Assigned Doctor, 1 Unrelated Doctor
  console.log('[Setup] Connecting test clients to Socket.IO signaling server...');
  const patientSocket = await createClient('pat-1', 'patient', 'Kumar');
  const doctorSocket = await createClient('doc-1', 'doctor', 'Dr. Ananya Sharma, MD');
  const otherDoctorSocket = await createClient('doc-2', 'doctor', 'Dr. Rajesh Patel, MD');
  console.log('   ✓ Connected & registered: Patient (pat-1), Assigned Doctor (doc-1), Other Doctor (doc-2)\n');

  // -------------------------------------------------------------
  // Test 1: Patient calls doctor -> Doctor receives incoming-call with details
  // -------------------------------------------------------------
  console.log('[Test 1/6] Patient Initiates Call -> Doctor Receives Incoming Call');
  try {
    let doctorReceivedCall = null;
    let otherDoctorReceivedCall = false;

    doctorSocket.once('incoming-call', (call) => {
      doctorReceivedCall = call;
    });

    otherDoctorSocket.once('incoming-call', (call) => {
      // If doc-2 receives a call intended for doc-1, check whether it was routed to doc-2 specifically
      if (call.doctorId === 'doc-1') {
        otherDoctorReceivedCall = true;
      }
    });

    patientSocket.emit('incoming-call-initiate', {
      appointmentId: 'APT-101',
      patientId: 'pat-1',
      patientName: 'Kumar',
      patientAge: 42,
      patientVillage: 'Rampur Village',
      symptom: 'Chest tightness and blood pressure review',
      kiosk: 'Rampur Panchayat Health Outpost #3',
      doctorId: 'doc-1',
      doctorName: 'Dr. Ananya Sharma, MD',
    });

    await wait(400);

    if (!doctorReceivedCall) {
      throw new Error('Assigned doctor did not receive incoming-call event');
    }
    if (doctorReceivedCall.appointmentId !== 'APT-101') {
      throw new Error(`Appointment ID mismatch: ${doctorReceivedCall.appointmentId}`);
    }
    if (doctorReceivedCall.patientName !== 'Kumar') {
      throw new Error(`Patient name mismatch: ${doctorReceivedCall.patientName}`);
    }
    console.log(`   ✓ Doctor doc-1 received call from ${doctorReceivedCall.patientName} for appointment ${doctorReceivedCall.appointmentId}`);
    passed++;
  } catch (err) {
    console.error(`   ✗ FAILED: ${err.message}`);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 2: Doctor Accepts Call -> Patient Receives call-accepted
  // -------------------------------------------------------------
  console.log('\n[Test 2/6] Doctor Accepts Call -> Patient Receives call-accepted');
  try {
    let patientReceivedAccept = null;

    patientSocket.once('call-accepted', (data) => {
      patientReceivedAccept = data;
    });

    doctorSocket.emit('incoming-call-accept', {
      appointmentId: 'APT-101',
      doctorId: 'doc-1',
      doctorName: 'Dr. Ananya Sharma, MD',
      patientId: 'pat-1',
      callerSocketId: patientSocket.id,
    });

    await wait(300);

    if (!patientReceivedAccept) {
      throw new Error('Patient did not receive call-accepted event');
    }
    if (patientReceivedAccept.roomId !== 'consultation_APT-101') {
      throw new Error(`Room ID mismatch: expected consultation_APT-101, got ${patientReceivedAccept.roomId}`);
    }
    console.log(`   ✓ Patient received acceptance for room: ${patientReceivedAccept.roomId}`);
    passed++;
  } catch (err) {
    console.error(`   ✗ FAILED: ${err.message}`);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 3: WebRTC Room Joining & Offer/Answer Exchange
  // -------------------------------------------------------------
  console.log('\n[Test 3/6] Both join consultation_APT-101 & Exchange WebRTC Offer/Answer');
  try {
    let patientPeerJoined = false;
    let doctorReceivedOffer = false;
    let patientReceivedAnswer = false;

    const roomId = 'consultation_APT-101';

    patientSocket.emit('join-room', {
      roomId,
      userId: 'pat-1',
      role: 'patient',
      participantName: 'Kumar',
    });

    await wait(100);

    patientSocket.once('peer-joined', (data) => {
      patientPeerJoined = true;
    });

    doctorSocket.once('offer', (data) => {
      doctorReceivedOffer = true;
      // Emit answer back
      doctorSocket.emit('answer', {
        roomId,
        sdp: { type: 'answer', sdp: 'mock-sdp-answer-data' },
      });
    });

    patientSocket.once('answer', (data) => {
      patientReceivedAnswer = true;
    });

    // Doctor joins the same room
    doctorSocket.emit('join-room', {
      roomId,
      userId: 'doc-1',
      role: 'doctor',
      participantName: 'Dr. Ananya Sharma, MD',
    });

    await wait(200);

    // Patient sends offer
    patientSocket.emit('offer', {
      roomId,
      sdp: { type: 'offer', sdp: 'mock-sdp-offer-data' },
    });

    await wait(300);

    if (!patientPeerJoined) {
      throw new Error('Patient did not receive peer-joined event when Doctor entered room');
    }
    if (!doctorReceivedOffer) {
      throw new Error('Doctor did not receive WebRTC offer in consultation room');
    }
    if (!patientReceivedAnswer) {
      throw new Error('Patient did not receive WebRTC answer in consultation room');
    }

    console.log('   ✓ Both participants successfully joined consultation_APT-101 and exchanged WebRTC offer/answer');

    // Clean up room
    patientSocket.emit('leave-room', { roomId });
    doctorSocket.emit('leave-room', { roomId });
    passed++;
  } catch (err) {
    console.error(`   ✗ FAILED: ${err.message}`);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 4: Doctor Rejection Workflow
  // -------------------------------------------------------------
  console.log('\n[Test 4/6] Doctor Rejection Workflow');
  try {
    let patientReceivedReject = null;

    patientSocket.once('call-rejected', (data) => {
      patientReceivedReject = data;
    });

    // Patient calls for appointment APT-102
    patientSocket.emit('incoming-call-initiate', {
      appointmentId: 'APT-102',
      patientId: 'pat-1',
      patientName: 'Kumar',
      doctorId: 'doc-1',
    });

    await wait(200);

    // Doctor rejects call
    doctorSocket.emit('incoming-call-reject', {
      appointmentId: 'APT-102',
      doctorId: 'doc-1',
      patientId: 'pat-1',
      reason: 'Doctor is attending to an emergency surgery case.',
      callerSocketId: patientSocket.id,
    });

    await wait(300);

    if (!patientReceivedReject) {
      throw new Error('Patient did not receive call-rejected event');
    }
    if (!patientReceivedReject.reason.includes('emergency')) {
      throw new Error(`Rejection reason missing: ${JSON.stringify(patientReceivedReject)}`);
    }

    console.log(`   ✓ Patient received rejection with explanation: "${patientReceivedReject.reason}"`);
    passed++;
  } catch (err) {
    console.error(`   ✗ FAILED: ${err.message}`);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 5: Patient Cancellation while Ringing
  // -------------------------------------------------------------
  console.log('\n[Test 5/6] Patient Cancels Call while Ringing');
  try {
    let doctorReceivedCancel = null;

    doctorSocket.once('call-cancelled', (data) => {
      doctorReceivedCancel = data;
    });

    // Patient calls for appointment APT-103
    patientSocket.emit('incoming-call-initiate', {
      appointmentId: 'APT-103',
      patientId: 'pat-1',
      doctorId: 'doc-1',
    });

    await wait(200);

    // Patient cancels call before doctor answers
    patientSocket.emit('incoming-call-cancel', {
      appointmentId: 'APT-103',
      doctorId: 'doc-1',
      patientId: 'pat-1',
    });

    await wait(300);

    if (!doctorReceivedCancel) {
      throw new Error('Doctor did not receive call-cancelled event');
    }
    if (doctorReceivedCancel.appointmentId !== 'APT-103') {
      throw new Error('Cancelled appointment ID mismatch');
    }

    console.log(`   ✓ Doctor received call-cancelled for ${doctorReceivedCancel.appointmentId}`);
    passed++;
  } catch (err) {
    console.error(`   ✗ FAILED: ${err.message}`);
    failed++;
  }

  // -------------------------------------------------------------
  // Test 6: Call Timeout / Missed Call Workflow
  // -------------------------------------------------------------
  console.log('\n[Test 6/6] Call Timeout / Missed Call Notification');
  try {
    let doctorReceivedTimeout = null;

    doctorSocket.once('call-timeout', (data) => {
      doctorReceivedTimeout = data;
    });

    // Patient emits timeout after ringing duration expires
    patientSocket.emit('incoming-call-timeout', {
      appointmentId: 'APT-104',
      doctorId: 'doc-1',
      patientId: 'pat-1',
    });

    await wait(300);

    if (!doctorReceivedTimeout) {
      throw new Error('Doctor did not receive call-timeout event');
    }
    if (doctorReceivedTimeout.appointmentId !== 'APT-104') {
      throw new Error('Timeout appointment ID mismatch');
    }

    console.log(`   ✓ Doctor received call-timeout for ${doctorReceivedTimeout.appointmentId}`);
    passed++;
  } catch (err) {
    console.error(`   ✗ FAILED: ${err.message}`);
    failed++;
  }

  // Cleanup
  patientSocket.disconnect();
  doctorSocket.disconnect();
  otherDoctorSocket.disconnect();

  console.log('\n====================================================');
  console.log(`Total: 6 | Passed: ${passed} | Failed: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL INCOMING VIDEO CALL & DOCTOR ACCEPT TESTS PASSED!');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
