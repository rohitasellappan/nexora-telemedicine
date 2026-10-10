// backend/test_phase9_security.js
import jwt from 'jsonwebtoken';
import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'nexora_telemedicine_super_secure_jwt_secret_2026';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runSecurityTests() {
  console.log('================================================================');
  console.log('🛡️ NEXORA PHASE 9: SECURITY, PRIVACY & ACCESS CONTROL TEST SUITE');
  console.log('================================================================\n');

  // --- 1. AUTHENTICATION & SESSIONS ---
  console.log('--- 1. Authentication, Bcrypt Hashing & JWT Verification ---');

  // 1a. Register user with bcrypt
  const rand = Math.floor(Math.random() * 90000 + 10000);
  const regEmail = `sec.patient.${rand}@nexora.health`;
  const regRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: regEmail,
      password: 'StrongPassword123!',
      name: 'Security Test Patient',
      role: 'patient',
    }),
  });
  const regJson = await regRes.json();
  assert(regRes.status === 201, 'Registration returns HTTP 201 Created');
  assert(Boolean(regJson.token), 'Registration returns signed JWT token');
  assert(!regJson.user?.password, 'Password hash is NEVER exposed in registration response');

  // 1b. Login with bcrypt
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: regEmail,
      password: 'StrongPassword123!',
      role: 'patient',
    }),
  });
  const loginJson = await loginRes.json();
  assert(loginRes.status === 200, 'Login with correct password returns HTTP 200');
  assert(Boolean(loginJson.token), 'Login returns valid JWT session token');
  assert(!loginJson.user?.password, 'Password hash is NEVER exposed in login response');

  // 1c. Login failure on wrong password
  const badLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: regEmail,
      password: 'WrongPassword456!',
      role: 'patient',
    }),
  });
  assert(badLoginRes.status === 401, 'Login with wrong password rejected with HTTP 401 Unauthorized');

  // 1d. Expired token rejection
  const expiredToken = jwt.sign(
    { id: regJson.user.id, role: 'patient', name: 'Security Test Patient' },
    JWT_SECRET,
    { expiresIn: -10 } // Expired 10 seconds ago
  );
  const expiredRes = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  const expiredJson = await expiredRes.json();
  assert(expiredRes.status === 401, 'Expired JWT session rejected with HTTP 401 Unauthorized');
  assert(expiredJson.code === 'TOKEN_EXPIRED', 'Expired session returns code: TOKEN_EXPIRED');

  // 1e. Tampered / invalid token rejection
  const tamperedToken = expiredToken.slice(0, -6) + 'abcdef';
  const tamperedRes = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tamperedToken}` },
  });
  const tamperedJson = await tamperedRes.json();
  assert(tamperedRes.status === 401, 'Tampered JWT session rejected with HTTP 401 Unauthorized');
  assert(tamperedJson.code === 'INVALID_TOKEN', 'Tampered session returns code: INVALID_TOKEN');

  // --- 2. ROLE-BASED ACCESS CONTROL & IDOR PROTECTION ---
  console.log('\n--- 2. Role-Based Access Control (RBAC) & IDOR Protection ---');

  // Create JWT for Patient A
  const tokenPatientA = jwt.sign(
    { id: 'pat-1', role: 'patient', name: 'Kumar' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Create JWT for Patient B
  const tokenPatientB = jwt.sign(
    { id: 'pat-2', role: 'patient', name: 'Sunita Devi' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Create JWT for Unauthorized Doctor C (doc-4 who has NO appointments with pat-1)
  const tokenDoctorUnauthorized = jwt.sign(
    { id: 'doc-4', role: 'doctor', name: 'Dr. Vikram Malhotra' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 2a. Patient B attempts to access Patient A's health records -> MUST BE 403
  const idorRecordRes = await fetch(`${API_BASE}/api/health-records/patient/pat-1`, {
    headers: { Authorization: `Bearer ${tokenPatientB}` },
  });
  assert(idorRecordRes.status === 403, 'Patient B attempting to access Patient A medical records blocked with HTTP 403 Forbidden');

  // 2b. Unauthorized Doctor C attempts to access Patient A's health records -> MUST BE 403
  const docIdorRecordRes = await fetch(`${API_BASE}/api/health-records/patient/pat-1`, {
    headers: { Authorization: `Bearer ${tokenDoctorUnauthorized}` },
  });
  assert(docIdorRecordRes.status === 403, 'Unauthorized Doctor C (not assigned) attempting to access Patient A records blocked with HTTP 403 Forbidden');

  // 2c. Patient B attempts to view Patient A's dashboard -> MUST BE 403
  const idorDashboardRes = await fetch(`${API_BASE}/api/patient/dashboard?patientId=pat-1`, {
    headers: { Authorization: `Bearer ${tokenPatientB}` },
  });
  assert(idorDashboardRes.status === 403, 'Patient B attempting to view Patient A dashboard blocked with HTTP 403 Forbidden');

  // 2d. Patient A attempts to view Doctor dashboard -> MUST BE 403
  const patDocDashRes = await fetch(`${API_BASE}/api/doctor/dashboard`, {
    headers: { Authorization: `Bearer ${tokenPatientA}` },
  });
  assert(patDocDashRes.status === 403, 'Patient A attempting to view clinician dashboard blocked with HTTP 403 Forbidden');

  // 2e. Patient B attempts to cancel Patient A's appointment -> MUST BE 403
  const aptTamperRes = await fetch(`${API_BASE}/api/appointments/APT-101`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenPatientB}`,
    },
    body: JSON.stringify({ status: 'Cancelled' }),
  });
  assert(aptTamperRes.status === 403, 'Patient B attempting to alter Patient A appointment status blocked with HTTP 403 Forbidden');

  // --- 3. HEALTH RECORD PRIVACY ---
  console.log('\n--- 3. Digital Health Record Privacy ---');

  // 3a. Patient attempting to author clinical assessment/prescription via POST -> MUST BE 403
  const patAuthorRes = await fetch(`${API_BASE}/api/health-records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenPatientA}`,
    },
    body: JSON.stringify({
      patientId: 'pat-1',
      symptoms: 'Self diagnosis',
      diagnosis: 'Unauthorized entry',
    }),
  });
  assert(patAuthorRes.status === 403, 'Patient attempting to author medical records blocked with HTTP 403 Forbidden');

  // 3b. Authorized Doctor doc-1 accesses pat-1 records -> 200 OK
  const tokenDoctorAuthorized = jwt.sign(
    { id: 'doc-1', role: 'doctor', name: 'Dr. Ananya Sharma, MD' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  const docAuthRes = await fetch(`${API_BASE}/api/health-records/patient/pat-1`, {
    headers: { Authorization: `Bearer ${tokenDoctorAuthorized}` },
  });
  assert(docAuthRes.status === 200, 'Authorized Doctor doc-1 accesses Patient pat-1 records with HTTP 200');

  // --- 4. VIDEO RECORDING SECURITY & PATH TRAVERSAL DEFENSE ---
  console.log('\n--- 4. Consultation Recording Security & Path Traversal ---');

  // 4a. Path Traversal attack in recordingId URL parameter -> REJECTED (HTTP 400 or 403)
  const traversalRes = await fetch(`${API_BASE}/api/recordings/..%2F..%2Fetc%2Fpasswd`, {
    headers: { Authorization: `Bearer ${tokenPatientA}` },
  });
  assert(traversalRes.status === 400 || traversalRes.status === 403 || traversalRes.status === 404, 'Path traversal attack in recordingId parameter safely rejected');

  // 4b. Unauthorized playback access by Patient B to Patient A recording -> 403
  const recUnauthPlayRes = await fetch(`${API_BASE}/api/recordings/REC-101-SAMPLE`, {
    headers: { Authorization: `Bearer ${tokenPatientB}` },
  });
  assert(recUnauthPlayRes.status === 403, 'Unauthorized playback by stranger blocked with HTTP 403 Forbidden');

  // 4c. Unauthorized deletion by stranger -> 403
  const recUnauthDelRes = await fetch(`${API_BASE}/api/recordings/REC-101-SAMPLE`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenPatientB}` },
  });
  assert(recUnauthDelRes.status === 403, 'Unauthorized recording deletion blocked with HTTP 403 Forbidden');

  // --- 5. REAL-TIME SECURITY (SOCKET.IO) ---
  console.log('\n--- 5. Real-Time Socket.IO Security & Consultation Room Isolation ---');

  // 5a. Unauthorized patient attempting to join someone else\'s consultation room
  const intruderSocket = io(API_BASE, {
    transports: ['websocket'],
    auth: { token: tokenPatientB, userId: 'pat-2', role: 'patient' },
  });

  const roomJoinBlocked = await new Promise((resolve) => {
    intruderSocket.on('connect', () => {
      // Intruder pat-2 tries to join pat-1 & doc-1 consultation room
      intruderSocket.emit('join-room', {
        roomId: 'consultation_APT-101',
        userId: 'pat-2',
        role: 'patient',
        participantName: 'Intruder Patient',
      });
    });

    intruderSocket.on('room-error', (errData) => {
      resolve(errData.error?.includes('Forbidden') || errData.error?.includes('Unauthorized') || errData.error?.includes('participant'));
    });

    setTimeout(() => resolve(false), 2000);
  });
  intruderSocket.disconnect();

  assert(roomJoinBlocked, 'Unauthorized user blocked from joining consultation_APT-101 (room-error emitted)');

  // --- 6. SECURITY HEADERS & CORS ---
  console.log('\n--- 6. Security Headers & Payload Controls ---');
  const healthRes = await fetch(`${API_BASE}/api/health`);
  assert(healthRes.headers.get('x-content-type-options') === 'nosniff', 'Security Header X-Content-Type-Options: nosniff present');
  assert(healthRes.headers.get('x-frame-options') === 'SAMEORIGIN', 'Security Header X-Frame-Options: SAMEORIGIN present');
  assert(healthRes.headers.get('x-xss-protection')?.includes('mode=block'), 'Security Header X-XSS-Protection: mode=block present');
  assert(healthRes.headers.get('referrer-policy')?.includes('origin'), 'Security Header Referrer-Policy present');

  console.log('\n================================================================');
  console.log('🎉 ALL 18 PHASE 9 SECURITY & PRIVACY TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runSecurityTests().catch((err) => {
  console.error('\n❌ Phase 9 Security Test Suite Failed:', err);
  process.exit(1);
});
