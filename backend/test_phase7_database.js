import http from 'http';

const BASE_URL = 'http://localhost:5000';

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    if (postData) {
      if (typeof postData === 'object' && !Buffer.isBuffer(postData)) {
        postData = JSON.stringify(postData);
        reqOptions.headers['Content-Type'] = 'application/json';
      }
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

const tests = [];
function addTest(name, fn) {
  tests.push({ name, fn });
}

// -------------------------------------------------------------
// Test 1: Health check
// -------------------------------------------------------------
addTest('Health Check (/api/health)', async () => {
  const res = await request({ path: '/api/health' });
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  if (res.data.status !== 'ok') throw new Error(`Status not ok: ${JSON.stringify(res.data)}`);
  console.log(`   ✓ Health OK (Database mode: ${res.data.database})`);
});

// -------------------------------------------------------------
// Test 2: User Registration with bcrypt password hashing
// -------------------------------------------------------------
const testRegEmail = `priya.test_${Date.now()}@nexora.health`;
let registeredUser = null;
addTest('Patient Registration (POST /api/auth/register)', async () => {
  const payload = {
    name: 'Priya Sharma',
    email: testRegEmail,
    password: 'securePassword456',
    role: 'patient',
    age: 29,
    gender: 'Female',
    village: 'Sonpur Village',
  };
  const res = await request({ path: '/api/auth/register', method: 'POST' }, payload);
  if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
  if (!res.data.token) throw new Error('Expected JWT token upon registration');
  if (res.data.user.password) throw new Error('Security Breach: user.password must NEVER be returned in response');
  if (res.data.user.email !== testRegEmail) throw new Error('Email mismatch');
  registeredUser = res.data.user;
  console.log(`   ✓ Registered user ${registeredUser.name} (${registeredUser.id}) without exposing password hash`);
});

// -------------------------------------------------------------
// Test 3: Re-registration conflict check
// -------------------------------------------------------------
addTest('Registration Conflict on Duplicate Email (POST /api/auth/register)', async () => {
  const payload = {
    name: 'Priya Sharma Clone',
    email: testRegEmail,
    password: 'securePassword456',
    role: 'patient',
  };
  const res = await request({ path: '/api/auth/register', method: 'POST' }, payload);
  if (res.status !== 409) throw new Error(`Expected 409 Conflict, got ${res.status}`);
  console.log('   ✓ Duplicate email correctly rejected with 409 Conflict');
});

// -------------------------------------------------------------
// Test 4: User Login with correct credentials (seed user)
// -------------------------------------------------------------
let seedPatientToken = null;
addTest('Patient Login with valid credentials (POST /api/auth/login)', async () => {
  const res = await request(
    { path: '/api/auth/login', method: 'POST' },
    { email: 'ramesh.patient@nexora.health', password: 'password123', role: 'patient' }
  );
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
  if (!res.data.token) throw new Error('Missing token');
  if (res.data.user.password) throw new Error('Security Breach: password returned in login response');
  if (res.data.user.email !== 'ramesh.patient@nexora.health') throw new Error('Incorrect user returned');
  seedPatientToken = res.data.token;
  console.log(`   ✓ Logged in as ${res.data.user.name} (Role: ${res.data.user.role}) with bcrypt verification`);
});

// -------------------------------------------------------------
// Test 5: User Login with registered user credentials
// -------------------------------------------------------------
addTest('Registered User Login with bcrypt password (POST /api/auth/login)', async () => {
  const res = await request(
    { path: '/api/auth/login', method: 'POST' },
    { email: testRegEmail, password: 'securePassword456', role: 'patient' }
  );
  if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.data)}`);
  if (!res.data.token) throw new Error('Missing token');
  console.log(`   ✓ Successfully logged in with newly registered account`);
});

// -------------------------------------------------------------
// Test 6: Rejection of wrong password
// -------------------------------------------------------------
addTest('Login rejection on wrong password (POST /api/auth/login)', async () => {
  const res = await request(
    { path: '/api/auth/login', method: 'POST' },
    { email: 'ramesh.patient@nexora.health', password: 'wrongPasswordXYZ', role: 'patient' }
  );
  if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
  console.log('   ✓ Wrong password rejected with 401 Unauthorized');
});

// -------------------------------------------------------------
// Test 7: Rejection of unregistered user
// -------------------------------------------------------------
addTest('Login rejection on non-existent email (POST /api/auth/login)', async () => {
  const res = await request(
    { path: '/api/auth/login', method: 'POST' },
    { email: 'ghost.user.unknown@nexora.health', password: 'somepassword', role: 'patient' }
  );
  if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
  console.log('   ✓ Non-existent user rejected with 401 Unauthorized');
});

// -------------------------------------------------------------
// Test 8: Doctor Directory & Search Filtering
// -------------------------------------------------------------
addTest('Doctor Directory & Search (GET /api/doctors)', async () => {
  // All doctors
  const allRes = await request({ path: '/api/doctors' });
  if (allRes.status !== 200) throw new Error(`Expected 200, got ${allRes.status}`);
  if (!Array.isArray(allRes.data.doctors) || allRes.data.doctors.length === 0) {
    throw new Error('Expected doctor profiles array');
  }

  // Filter by Specialization
  const specRes = await request({ path: '/api/doctors?specialization=Cardiologist' });
  if (specRes.status !== 200) throw new Error(`Expected 200, got ${specRes.status}`);
  const allCardio = specRes.data.doctors.every((d) => d.specialization.toLowerCase().includes('cardio'));
  if (!allCardio) throw new Error('Specialization filter failed');

  // Search keyword
  const searchRes = await request({ path: '/api/doctors?search=Sharma' });
  if (searchRes.status !== 200) throw new Error(`Expected 200, got ${searchRes.status}`);
  if (searchRes.data.doctors.length === 0) throw new Error('Search by name failed');

  console.log(`   ✓ Found ${allRes.data.doctors.length} doctors; specialization & name filters functioning`);
});

// -------------------------------------------------------------
// Test 9: Appointment Booking & Status Management
// -------------------------------------------------------------
let bookedAppointmentId = null;
addTest('Appointment Booking Flow (POST /api/appointments)', async () => {
  const bookingPayload = {
    patientId: 'pat-1',
    patientName: 'Kumar',
    patientAge: 42,
    patientVillage: 'Rampur Village',
    patientPhone: '+91 98765 43210',
    doctorId: 'doc-1',
    doctorName: 'Dr. Ananya Sharma, MD',
    doctorSpecialization: 'Cardiologist',
    hospital: 'AIIMS Tele-Network Hub',
    appointmentDate: 'Tomorrow, Oct 9',
    appointmentTime: '02:00 PM',
    consultationType: 'Video Consultation',
    primarySymptom: 'Routine cardiac follow-up and blood pressure check',
    kioskLocation: 'Rampur Panchayat Health Outpost #3',
  };

  const bookRes = await request({ path: '/api/appointments', method: 'POST' }, bookingPayload);
  if (bookRes.status !== 201) throw new Error(`Expected 201, got ${bookRes.status}: ${JSON.stringify(bookRes.data)}`);
  if (!bookRes.data.appointment || !bookRes.data.appointment.appointmentId) {
    throw new Error('Invalid appointment created');
  }
  bookedAppointmentId = bookRes.data.appointment.appointmentId;

  // Retrieve appointments for patient
  const listRes = await request({ path: '/api/appointments?patientId=pat-1' });
  if (listRes.status !== 200) throw new Error(`Expected 200, got ${listRes.status}`);
  const found = listRes.data.appointments.find((a) => a.appointmentId === bookedAppointmentId);
  if (!found) throw new Error('Booked appointment not found in patient list');

  // Update status (e.g. COMPLETED or IN_PROGRESS)
  const patchRes = await request(
    { path: `/api/appointments/${bookedAppointmentId}`, method: 'PATCH' },
    { status: 'COMPLETED' }
  );
  if (patchRes.status !== 200) throw new Error(`Expected 200, got ${patchRes.status}`);
  if (patchRes.data.appointment.status !== 'COMPLETED') throw new Error('Appointment status update failed');

  console.log(`   ✓ Booked appointment ${bookedAppointmentId} and updated status to COMPLETED`);
});

// -------------------------------------------------------------
// Test 10: Digital Health Records (DHR) Creation & Retrieval
// -------------------------------------------------------------
let createdRecordId = null;
addTest('Digital Health Record Lifecycle (POST & GET /api/health-records)', async () => {
  const recordPayload = {
    patientId: 'pat-1',
    patientName: 'Kumar',
    patientAge: 42,
    patientVillage: 'Rampur Village',
    doctorId: 'doc-1',
    doctorName: 'Dr. Ananya Sharma, MD',
    doctorSpecialization: 'Cardiologist',
    hospital: 'AIIMS Tele-Network Hub',
    appointmentId: bookedAppointmentId || 'APT-101',
    consultationDate: 'Oct 09, 2026',
    diagnosis: 'Borderline Hypertension - Managed via Lifestyle Modification',
    symptoms: ['Mild evening headache', 'Exertional fatigue'],
    doctorNotes: 'Patient blood pressure stabilized at 124/82 mmHg. Advised low-sodium diet and daily brisk walking.',
    prescriptions: [
      {
        medicine: 'Telmisartan 20mg',
        dosage: '1 tab daily in the morning',
        duration: '30 days',
        instructions: 'Take after breakfast',
      },
    ],
    followUpDate: 'Nov 09, 2026',
    followUpInstructions: 'Recheck BP at Rampur Panchayat Health Outpost in 30 days',
  };

  const createRes = await request({ path: '/api/health-records', method: 'POST' }, recordPayload);
  if (createRes.status !== 201) throw new Error(`Expected 201, got ${createRes.status}: ${JSON.stringify(createRes.data)}`);
  createdRecordId = createRes.data.record.id;

  // Retrieve records for patient
  const getRes = await request({ path: '/api/health-records/patient/pat-1?userId=pat-1' });
  if (getRes.status !== 200) throw new Error(`Expected 200, got ${getRes.status}`);
  const match = getRes.data.records.find((r) => r.id === createdRecordId);
  if (!match) throw new Error(`Created health record ${createdRecordId} not found in patient records`);

  console.log(`   ✓ Created health record ${createdRecordId} with prescriptions & retrieved successfully`);
});

// -------------------------------------------------------------
// Test 11: Consultation Recording Security & Access Control
// -------------------------------------------------------------
addTest('Consultation Recording Metadata & Security Authorization', async () => {
  // Fetch recordings list
  const listRes = await request({ path: '/api/recordings?patientId=pat-1' });
  if (listRes.status !== 200) throw new Error(`Expected 200, got ${listRes.status}`);
  if (!Array.isArray(listRes.data.recordings) || listRes.data.recordings.length === 0) {
    throw new Error('Expected sample recording in database');
  }

  // Security Check 1: filePath must NEVER be exposed in JSON response
  for (const rec of listRes.data.recordings) {
    if (rec.filePath) {
      throw new Error(`Security Breach: filePath exposed in recording metadata (${rec.recordingId})`);
    }
  }

  const sampleRec = listRes.data.recordings[0];

  // Security Check 2: Unauthorized user must receive 403 Forbidden
  const unauthRes = await request({
    path: `/api/recordings/${sampleRec.recordingId}?userId=unauthorized-attacker-999`,
  });
  if (unauthRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for unauthorized user, got ${unauthRes.status}`);
  }

  // Security Check 3: Authorized patient or doctor gets 200/206
  const authRes = await request({
    path: `/api/recordings/${sampleRec.recordingId}?userId=${sampleRec.patientId}`,
  });
  if (authRes.status !== 200 && authRes.status !== 206) {
    throw new Error(`Expected 200/206 for authorized user, got ${authRes.status}`);
  }

  console.log(`   ✓ Protected recording metadata: raw filePath hidden, 403 enforced for unauthorized access`);
});

// -------------------------------------------------------------
// Test Runner
// -------------------------------------------------------------
async function runAllTests() {
  console.log('====================================================');
  console.log('🏥 NEXORA Telemedicine — Phase 7 Database Integration Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const { name, fn } = tests[i];
    console.log(`[Test ${i + 1}/${tests.length}] ${name}`);
    try {
      await fn();
      passed++;
    } catch (err) {
      console.error(`   ✗ FAILED: ${err.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('====================================================');
  console.log(`Total: ${tests.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL PHASE 7 DATABASE INTEGRATION TESTS PASSED!');
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
