// e2e_full_verification.js
// Complete End-to-End Verification for Phase 6: Digital Health Record system for NEXORA

const BASE_URL = 'http://localhost:5000';

async function runFullE2ETest() {
  console.log('================================================================');
  console.log('🏥 NEXORA Phase 6: Digital Health Record (DHR) Full E2E Test');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status?.toLowerCase() === 'ok', 'Backend health check status 200 OK');

    // 2. Patient Login Flow
    console.log('\n--- Step 1: Patient Login ---');
    const patLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ramesh.patient@nexora.health', password: 'password123', role: 'patient' }),
    });
    const patLoginData = await patLoginRes.json();
    assert(patLoginRes.status === 200 && patLoginData.success, 'Patient login successful with credentials');
    assert(patLoginData.user.name === 'Kumar' || patLoginData.user.name === 'Ramesh Kumar', `Patient identity confirmed: ${patLoginData.user.name}`);
    assert(patLoginData.user.age === 42, `Patient age verified: ${patLoginData.user.age}`);
    assert(Array.isArray(patLoginData.user.existingConditions) && patLoginData.user.existingConditions.includes('Diabetes'), 'Patient existing condition: Diabetes verified');
    assert(Array.isArray(patLoginData.user.allergies) && patLoginData.user.allergies.includes('None known'), 'Patient allergies: None known verified');
    assert(Array.isArray(patLoginData.user.currentMedications) && patLoginData.user.currentMedications.includes('Metformin'), 'Patient medication: Metformin verified');

    // 3. Doctor Login Flow
    console.log('\n--- Step 2: Doctor Login ---');
    const docLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ananya.doctor@nexora.health', password: 'password123', role: 'doctor' }),
    });
    const docLoginData = await docLoginRes.json();
    assert(docLoginRes.status === 200 && docLoginData.success, 'Doctor login successful');
    assert(docLoginData.user.role === 'doctor', 'Doctor role authenticated');

    // 4. Appointment Verification
    console.log('\n--- Step 3: Appointment Booking / Verification ---');
    const aptRes = await fetch(`${BASE_URL}/api/appointments`);
    const aptData = await aptRes.json();
    assert(aptRes.status === 200 && Array.isArray(aptData.appointments), `Appointments listed (${aptData.appointments.length} active)`);
    const targetApt = aptData.appointments.find(a => a.appointmentId === 'APT-101' || a.id === 'APT-101') || aptData.appointments[0];
    assert(!!targetApt, `Target consultation appointment located: ${targetApt.appointmentId}`);

    // 5. Doctor views Patient Record
    console.log('\n--- Step 4: Doctor Views Patient Record [View Patient Record] ---');
    const docViewRecRes = await fetch(`${BASE_URL}/api/health-records/patient/${targetApt.patientId}?doctorId=doc-1`);
    const docViewRecData = await docViewRecRes.json();
    assert(docViewRecRes.status === 200 && docViewRecData.success, 'Doctor authorized to view patient record');
    assert(Array.isArray(docViewRecData.records) && docViewRecData.records.length > 0, `Doctor retrieved ${docViewRecData.records.length} historical consultation records`);

    const prevConsult = docViewRecData.records.find(r => r.doctorName?.includes('Priya') || r.diagnosis === 'Viral infection') || docViewRecData.records[0];
    assert(!!prevConsult, `Previous consultation located: Dr. ${prevConsult.doctorName} - Diagnosis: ${prevConsult.diagnosis}`);

    // 6. Doctor Consultation Form Entry & Save
    console.log('\n--- Step 5: Doctor Enters Diagnosis, Prescription & Saves Record ---');
    const newRecordPayload = {
      patientId: targetApt.patientId || 'pat-1',
      doctorId: 'doc-1',
      appointmentId: targetApt.appointmentId || 'APT-101',
      patientName: 'Kumar',
      patientAge: 42,
      patientGender: 'Male',
      doctorName: 'Dr. Priya Sharma',
      doctorSpecialization: 'General Physician',
      consultationDate: '08 Oct 2026',
      symptoms: 'Fever, body pain',
      diagnosis: 'Viral infection',
      prescription: 'Paracetamol 500mg',
      doctorNotes: 'Take adequate rest and fluids.',
      followUpInstructions: '3 days',
      recordingId: 'REC-101-SAMPLE',
      allergies: ['None known'],
      existingConditions: ['Diabetes'],
      currentMedications: ['Metformin']
    };

    const saveRecRes = await fetch(`${BASE_URL}/api/health-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecordPayload)
    });
    const saveRecData = await saveRecRes.json();
    assert(saveRecRes.status === 201 && saveRecData.success, 'Doctor consultation record successfully created (201 Created)');
    assert(saveRecData.message === 'Health record saved successfully.', `Success message confirmed: "${saveRecData.message}"`);
    const createdRecordId = saveRecData.record.id;
    assert(!!createdRecordId, `Record ID assigned: ${createdRecordId}`);

    // 7. Patient opens My Medical Records
    console.log('\n--- Step 6: Patient Opens "My Medical Records" ---');
    const patRecordsRes = await fetch(`${BASE_URL}/api/health-records/patient/${targetApt.patientId}?userId=${targetApt.patientId}`);
    const patRecordsData = await patRecordsRes.json();
    assert(patRecordsRes.status === 200 && patRecordsData.success, 'Patient authorized to view own digital health records');

    const patientFoundRecord = patRecordsData.records.find(r => r.id === createdRecordId);
    assert(!!patientFoundRecord, `Patient sees newly created consultation (${createdRecordId}) in health vault`);
    assert(patientFoundRecord.diagnosis === 'Viral infection', `Patient verifies Diagnosis: "${patientFoundRecord.diagnosis}"`);
    assert(patientFoundRecord.prescription === 'Paracetamol 500mg', `Patient verifies Prescription: "${patientFoundRecord.prescription}"`);
    assert(patientFoundRecord.doctorNotes === 'Take adequate rest and fluids.', `Patient verifies Doctor Notes: "${patientFoundRecord.doctorNotes}"`);
    assert(patientFoundRecord.followUpInstructions === '3 days', `Patient verifies Follow-up: "${patientFoundRecord.followUpInstructions}"`);
    assert(patientFoundRecord.recordingId === 'REC-101-SAMPLE', `Patient verifies Consultation Recording attached: "${patientFoundRecord.recordingId}"`);

    // 8. Recording Access Check
    console.log('\n--- Step 7: Consultation Recording Authorized Playback ---');
    const recRes = await fetch(`${BASE_URL}/api/recordings?patientId=${targetApt.patientId}`);
    const recData = await recRes.json();
    assert(recRes.status === 200 && recData.success, 'Patient retrieves authorized recordings');
    assert(Array.isArray(recData.recordings), `Found ${recData.recordings.length} recording entries in vault`);

    // 9. Security & Authorization Verification (Requirement 10)
    console.log('\n--- Step 8: Security & Healthcare Authorization (Requirement 10) ---');
    // Patient pat-2 cannot view pat-1 records
    const unauthPatRes = await fetch(`${BASE_URL}/api/health-records/patient/pat-1?userId=pat-2`);
    assert(unauthPatRes.status === 403, 'Unauthorized patient pat-2 blocked from viewing pat-1 records (403 Forbidden)');

    // Patient cannot post clinical health record
    const patientPostRes = await fetch(`${BASE_URL}/api/health-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: 'pat-1', doctorId: 'pat-1', diagnosis: 'Self Diagnosis' })
    });
    assert(patientPostRes.status === 403, 'Patient forbidden from authoring clinical health record (403 Forbidden)');

    // Doctor not associated with patient cannot access records
    const unauthDocRes = await fetch(`${BASE_URL}/api/health-records/patient/pat-1?doctorId=doc-999_unrelated`);
    assert(unauthDocRes.status === 403, 'Unrelated doctor doc-999 blocked from accessing patient records (403 Forbidden)');

    console.log('\n================================================================');
    console.log(`🎯 Test Results: ${passed} / ${total} tests PASSED!`);
    console.log('================================================================');

    if (passed === total) {
      console.log('🌟 ALL PHASE 6 REQUIREMENTS VERIFIED SUCCESSFULLY!');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  }
}

runFullE2ETest();
