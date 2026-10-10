// test_health_records_api.js

async function runTests() {
  console.log('--- Testing NEXORA Digital Health Records API ---');

  // Test 1: Patient pat-1 retrieves their own health records -> 200 OK
  const resPat = await fetch('http://localhost:5000/api/health-records/patient/pat-1?userId=pat-1');
  const jsonPat = await resPat.json();
  console.log(`Test 1 (Patient pat-1 authorized): Status = ${resPat.status}, Count = ${jsonPat.count} (Expected: 200)`);
  if (resPat.status !== 200 || !jsonPat.success) throw new Error('Patient self-access failed');

  // Test 2: Patient pat-2 attempts to view pat-1's records -> MUST RETURN 403
  const resUnauthPat = await fetch('http://localhost:5000/api/health-records/patient/pat-1?userId=pat-2');
  console.log(`Test 2 (Unauthorized Patient pat-2): Status = ${resUnauthPat.status} (Expected: 403 Forbidden)`);
  if (resUnauthPat.status !== 403) throw new Error('Cross-patient access was not blocked with 403!');

  // Test 3: Authorized Doctor doc-1 accesses pat-1's records -> 200 OK
  const resDoc = await fetch('http://localhost:5000/api/health-records/patient/pat-1?userId=doc-1');
  const jsonDoc = await resDoc.json();
  console.log(`Test 3 (Authorized Doctor doc-1): Status = ${resDoc.status}, Count = ${jsonDoc.count} (Expected: 200)`);
  if (resDoc.status !== 200 || !jsonDoc.success) throw new Error('Authorized doctor access failed');

  // Test 4: Patient attempting to create a clinical record via POST -> MUST RETURN 403
  const resUnauthPost = await fetch('http://localhost:5000/api/health-records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: 'pat-1',
      role: 'patient',
      userId: 'pat-1',
      symptoms: 'Headache',
      diagnosis: 'Migraine',
    }),
  });
  console.log(`Test 4 (Patient authoring record blocked): Status = ${resUnauthPost.status} (Expected: 403 Forbidden)`);
  if (resUnauthPost.status !== 403) throw new Error('Patient authoring was not blocked with 403!');

  // Test 5: Authorized Doctor creates consultation record via POST -> 201 Created
  const newRecordPayload = {
    patientId: 'pat-1',
    doctorId: 'doc-1',
    appointmentId: 'APT-101',
    symptoms: 'Mild chest tightness, elevated morning BP, fatigue after harvest work',
    diagnosis: 'Stage 1 Essential Hypertension with exertional heat strain',
    prescription: 'Tab. Telmisartan 40mg OD • Hydration salts 1 packet daily',
    doctorNotes: 'Monitor morning BP readings at village health center. Reduce dietary sodium.',
    followUpInstructions: '7 days for BP review',
    recordingId: 'REC-APT-101-SAMPLE',
    userId: 'doc-1',
    role: 'doctor',
  };

  const resPost = await fetch('http://localhost:5000/api/health-records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRecordPayload),
  });
  const jsonPost = await resPost.json();
  console.log(`Test 5 (Doctor creates record): Status = ${resPost.status}, Record ID = ${jsonPost.record?.id} (Expected: 201)`);
  if (resPost.status !== 201 || !jsonPost.success) throw new Error('Doctor record creation failed');

  const createdId = jsonPost.record.id;

  // Test 6: Doctor updates consultation record via PUT -> 200 OK
  const resPut = await fetch(`http://localhost:5000/api/health-records/${createdId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctorNotes: 'Patient advised to strictly avoid midday field work.',
      followUpInstructions: '5 days BP review',
      userId: 'doc-1',
      role: 'doctor',
    }),
  });
  const jsonPut = await resPut.json();
  console.log(`Test 6 (Doctor updates record): Status = ${resPut.status}, Follow-up = "${jsonPut.record?.followUpInstructions}" (Expected: 200)`);
  if (resPut.status !== 200 || !jsonPut.success) throw new Error('Doctor record update failed');

  // Test 7: Verify newly created record appears in Patient pat-1's records list
  const resVerify = await fetch('http://localhost:5000/api/health-records/patient/pat-1?userId=pat-1');
  const jsonVerify = await resVerify.json();
  const exists = jsonVerify.records.some((r) => r.id === createdId);
  console.log(`Test 7 (Patient verifies new consultation record in vault): Found = ${exists} (Expected: true)`);
  if (!exists) throw new Error('Created record not found in patient list!');

  console.log('🎉 ALL DIGITAL HEALTH RECORDS API TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
