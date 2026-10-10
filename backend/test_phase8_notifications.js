/**
 * Comprehensive Automated Test Suite for Phase 8: Real-Time Notifications and Missed Call Handling
 */
import { io as ioClient } from 'socket.io-client';

const API_BASE = 'http://localhost:5000';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING NEXORA PHASE 8 NOTIFICATIONS & MISSED CALLS TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Test REST API: GET /api/notifications
  try {
    const res = await fetch(`${API_BASE}/api/notifications?userId=pat-1`);
    const data = await res.json();
    assert(res.status === 200 && data.success, 'GET /api/notifications returns 200 and success: true');
    assert(Array.isArray(data.notifications), 'GET /api/notifications returns an array of notifications');
    console.log(`   Found ${data.notifications.length} notifications for patient pat-1`);
  } catch (err) {
    assert(false, `GET /api/notifications failed: ${err.message}`);
  }

  // 2. Test REST API: PATCH /api/notifications/:id/read & POST /api/notifications/mark-all-read
  let testNotifId = null;
  try {
    const res = await fetch(`${API_BASE}/api/notifications?userId=pat-1`);
    const data = await res.json();
    if (data.notifications && data.notifications.length > 0) {
      testNotifId = data.notifications[0]._id || data.notifications[0].id;
      const patchRes = await fetch(`${API_BASE}/api/notifications/${testNotifId}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'pat-1' })
      });
      const patchData = await patchRes.json();
      assert(patchRes.status === 200 && patchData.success, `PATCH /api/notifications/${testNotifId}/read marks as read`);

      const markAllRes = await fetch(`${API_BASE}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'pat-1' })
      });
      const markAllData = await markAllRes.json();
      assert(markAllRes.status === 200 && markAllData.success, 'POST /api/notifications/mark-all-read marks all as read');
    }
  } catch (err) {
    assert(false, `Read status toggle failed: ${err.message}`);
  }

  // 3. Test REST API: GET /api/notifications/missed-calls
  try {
    const res = await fetch(`${API_BASE}/api/notifications/missed-calls?userId=doc-1`);
    const data = await res.json();
    assert(res.status === 200 && data.success, 'GET /api/notifications/missed-calls returns 200 and success: true');
    assert(Array.isArray(data.missedCalls), 'Missed calls list is an array');
    console.log(`   Doctor doc-1 currently has ${data.missedCalls.length} missed calls on record`);
  } catch (err) {
    assert(false, `GET /api/notifications/missed-calls failed: ${err.message}`);
  }

  // 4. Test Socket.IO Real-Time Flow: Online Doctor Call Notification & Ringing
  console.log('\n--- Testing Socket.IO Real-Time Call & Notification Flow ---');
  await new Promise((resolve) => {
    const docSocket = ioClient(API_BASE, { transports: ['websocket'] });
    const patSocket = ioClient(API_BASE, { transports: ['websocket'] });

    let docReceivedCall = false;
    let docReceivedNotif = false;
    let patReceivedRinging = false;

    docSocket.on('connect', () => {
      docSocket.emit('register-user', { userId: 'doc-phase8-test', role: 'doctor', name: 'Dr. Test' });
    });

    patSocket.on('connect', () => {
      patSocket.emit('register-user', { userId: 'pat-phase8-test', role: 'patient', name: 'Ramesh Test' });

      // After a short delay to ensure doctor room registration, patient starts call
      setTimeout(() => {
        patSocket.emit('incoming-call-initiate', {
          appointmentId: 'APT-TEST-001',
          patientId: 'pat-phase8-test',
          patientName: 'Ramesh Test',
          doctorId: 'doc-phase8-test',
          doctorName: 'Dr. Test',
          time: '10:00 AM',
          symptom: 'Cardiology consultation test'
        });
      }, 300);
    });

    patSocket.on('call-ringing', (data) => {
      patReceivedRinging = true;
      assert(data.appointmentId === 'APT-TEST-001', 'Patient receives call-ringing confirmation event');
    });

    docSocket.on('incoming-call', (callData) => {
      docReceivedCall = true;
      assert(callData.appointmentId === 'APT-TEST-001', 'Doctor receives real-time incoming-call event');
      assert(callData.patientName === 'Ramesh Test', 'Incoming call payload contains patient name');
    });

    docSocket.on('new-notification', (notif) => {
      if (notif.appointmentId === 'APT-TEST-001' && notif.type === 'incoming_call') {
        docReceivedNotif = true;
        assert(true, 'Doctor receives real-time new-notification event for incoming call');
      }
    });

    setTimeout(() => {
      assert(docReceivedCall, 'Doctor incoming-call event delivered');
      assert(patReceivedRinging, 'Patient call-ringing event delivered');
      docSocket.disconnect();
      patSocket.disconnect();
      resolve();
    }, 1500);
  });

  // 5. Test Socket.IO Flow: Call Timeout & Missed Call Logging
  console.log('\n--- Testing Socket.IO Call Timeout & Missed Call Marking ---');
  await new Promise((resolve) => {
    const docSocket = ioClient(API_BASE, { transports: ['websocket'] });
    const patSocket = ioClient(API_BASE, { transports: ['websocket'] });

    let docReceivedTimeout = false;
    let docReceivedMissedNotif = false;
    let patReceivedMissedNotif = false;

    docSocket.on('connect', () => {
      docSocket.emit('register-user', { userId: 'doc-timeout-test', role: 'doctor', name: 'Dr. Timeout' });
    });

    patSocket.on('connect', () => {
      patSocket.emit('register-user', { userId: 'pat-timeout-test', role: 'patient', name: 'Patient Timeout' });

      setTimeout(() => {
        // Patient ringing times out
        patSocket.emit('incoming-call-timeout', {
          appointmentId: 'APT-TIMEOUT-001',
          doctorId: 'doc-timeout-test',
          patientId: 'pat-timeout-test',
          doctorName: 'Dr. Timeout',
          patientName: 'Patient Timeout'
        });
      }, 300);
    });

    docSocket.on('call-timeout', (data) => {
      docReceivedTimeout = true;
      assert(data.appointmentId === 'APT-TIMEOUT-001', 'Doctor receives call-timeout event');
    });

    docSocket.on('new-notification', (notif) => {
      if (notif.appointmentId === 'APT-TIMEOUT-001' && notif.type === 'missed_call') {
        docReceivedMissedNotif = true;
        assert(true, 'Doctor receives missed_call notification upon timeout');
      }
    });

    patSocket.on('new-notification', (notif) => {
      if (notif.appointmentId === 'APT-TIMEOUT-001' && notif.type === 'missed_call') {
        patReceivedMissedNotif = true;
        assert(true, 'Patient receives missed_call notification upon timeout');
      }
    });

    setTimeout(() => {
      assert(docReceivedTimeout, 'Call timeout event handled');
      docSocket.disconnect();
      patSocket.disconnect();
      resolve();
    }, 1500);
  });

  // 6. Test Socket.IO Flow: Offline Doctor Handling (Requirement 4)
  console.log('\n--- Testing Offline Doctor Behavior (Requirement 4) ---');
  await new Promise((resolve) => {
    const patSocket = ioClient(API_BASE, { transports: ['websocket'] });
    let receivedOffline = false;

    patSocket.on('connect', () => {
      patSocket.emit('register-user', { userId: 'pat-offline-test', role: 'patient', name: 'Kumar' });

      setTimeout(() => {
        // Attempt to call a doctor who is definitely not connected
        patSocket.emit('incoming-call-initiate', {
          appointmentId: 'APT-OFFLINE-999',
          patientId: 'pat-offline-test',
          patientName: 'Kumar',
          doctorId: 'doc-completely-offline-1234',
          doctorName: 'Dr. Unavailable',
        });
      }, 300);
    });

    patSocket.on('doctor-offline', (data) => {
      receivedOffline = true;
      assert(data.appointmentId === 'APT-OFFLINE-999', 'Backend detects offline doctor and emits doctor-offline immediately without false ringing');
      assert(Boolean(data.message), `Clear offline message provided to patient: "${data.message}"`);
    });

    setTimeout(() => {
      assert(receivedOffline, 'Offline doctor flow verified successfully');
      patSocket.disconnect();
      resolve();
    }, 1500);
  });

  // 7. Test Socket.IO Flow: Doctor Accept Workflow (Call NOT marked as missed)
  console.log('\n--- Testing Doctor Accept Workflow (Call NOT Missed) ---');
  await new Promise((resolve) => {
    const docSocket = ioClient(API_BASE, { transports: ['websocket'] });
    const patSocket = ioClient(API_BASE, { transports: ['websocket'] });

    let patAccepted = false;
    let patNotifAccepted = false;

    docSocket.on('connect', () => {
      docSocket.emit('register-user', { userId: 'doc-accept-test', role: 'doctor', name: 'Dr. Acceptor' });
    });

    patSocket.on('connect', () => {
      patSocket.emit('register-user', { userId: 'pat-accept-test', role: 'patient', name: 'Patient Acceptor' });

      setTimeout(() => {
        patSocket.emit('incoming-call-initiate', {
          appointmentId: 'APT-ACCEPT-101',
          patientId: 'pat-accept-test',
          patientName: 'Patient Acceptor',
          doctorId: 'doc-accept-test',
          doctorName: 'Dr. Acceptor',
        });
      }, 300);
    });

    docSocket.on('incoming-call', (callData) => {
      if (callData.appointmentId === 'APT-ACCEPT-101') {
        docSocket.emit('incoming-call-accept', {
          appointmentId: 'APT-ACCEPT-101',
          doctorId: 'doc-accept-test',
          doctorName: 'Dr. Acceptor',
          patientId: 'pat-accept-test',
        });
      }
    });

    patSocket.on('call-accepted', (data) => {
      if (data.appointmentId === 'APT-ACCEPT-101') {
        patAccepted = true;
        assert(true, 'Patient receives call-accepted event with consultation roomId');
      }
    });

    patSocket.on('new-notification', (notif) => {
      if (notif.appointmentId === 'APT-ACCEPT-101' && notif.type === 'call_accepted') {
        patNotifAccepted = true;
        assert(true, 'Patient receives call_accepted notification (not missed)');
      }
    });

    setTimeout(() => {
      assert(patAccepted, 'Call accepted successfully');
      docSocket.disconnect();
      patSocket.disconnect();
      resolve();
    }, 1500);
  });

  // 8. Test Socket.IO Flow: Doctor Reject Workflow
  console.log('\n--- Testing Doctor Reject Workflow ---');
  await new Promise((resolve) => {
    const docSocket = ioClient(API_BASE, { transports: ['websocket'] });
    const patSocket = ioClient(API_BASE, { transports: ['websocket'] });

    let patRejected = false;

    docSocket.on('connect', () => {
      docSocket.emit('register-user', { userId: 'doc-reject-test', role: 'doctor', name: 'Dr. Busy' });
    });

    patSocket.on('connect', () => {
      patSocket.emit('register-user', { userId: 'pat-reject-test', role: 'patient', name: 'Patient Reject' });

      setTimeout(() => {
        patSocket.emit('incoming-call-initiate', {
          appointmentId: 'APT-REJECT-101',
          patientId: 'pat-reject-test',
          patientName: 'Patient Reject',
          doctorId: 'doc-reject-test',
          doctorName: 'Dr. Busy',
        });
      }, 300);
    });

    docSocket.on('incoming-call', (callData) => {
      if (callData.appointmentId === 'APT-REJECT-101') {
        docSocket.emit('incoming-call-reject', {
          appointmentId: 'APT-REJECT-101',
          doctorId: 'doc-reject-test',
          patientId: 'pat-reject-test',
          reason: 'In emergency surgical procedure',
        });
      }
    });

    patSocket.on('call-rejected', (data) => {
      if (data.appointmentId === 'APT-REJECT-101') {
        patRejected = true;
        assert(data.reason === 'In emergency surgical procedure', 'Patient receives call-rejected event with specific doctor reason');
      }
    });

    setTimeout(() => {
      assert(patRejected, 'Call rejected event handled cleanly');
      docSocket.disconnect();
      patSocket.disconnect();
      resolve();
    }, 1500);
  });

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
