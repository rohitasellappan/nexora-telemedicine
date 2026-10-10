// test_recordings_api.js
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('--- Testing NEXORA Recordings API ---');

  // Test 1: Authorized Patient
  const resPat = await fetch('http://localhost:5000/api/recordings/REC-101-SAMPLE?userId=pat-1');
  console.log(`Test 1 (Patient pat-1 authorized): Status = ${resPat.status} (Expected: 200)`);
  if (resPat.status !== 200) throw new Error('Patient access failed');

  // Test 2: Authorized Doctor
  const resDoc = await fetch('http://localhost:5000/api/recordings/REC-101-SAMPLE?userId=doc-1');
  console.log(`Test 2 (Doctor doc-1 authorized): Status = ${resDoc.status} (Expected: 200)`);
  if (resDoc.status !== 200) throw new Error('Doctor access failed');

  // Test 3: Unauthorized user (e.g. pat-2 or intruder) -> MUST BE 403
  const resUnauth = await fetch('http://localhost:5000/api/recordings/REC-101-SAMPLE?userId=pat-2');
  console.log(`Test 3 (Unauthorized pat-2): Status = ${resUnauth.status} (Expected: 403 Forbidden)`);
  if (resUnauth.status !== 403) throw new Error('Unauthorized user was not blocked with 403!');

  // Test 4: Upload new recording
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const fileContent = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x02, 0x03]);
  
  const formData = new FormData();
  formData.append('appointmentId', 'APT-101');
  formData.append('patientId', 'pat-1');
  formData.append('doctorId', 'doc-1');
  formData.append('patientName', 'Ramesh Kumar');
  formData.append('doctorName', 'Dr. Ananya Sharma, MD');
  formData.append('duration', '00:45');
  formData.append('uploaderId', 'pat-1');
  formData.append('uploadedByRole', 'patient');
  formData.append('recording', new Blob([fileContent], { type: 'video/webm' }), 'test_record.webm');

  const uploadRes = await fetch('http://localhost:5000/api/recordings', {
    method: 'POST',
    body: formData,
  });

  const uploadJson = await uploadRes.json();
  console.log(`Test 4 (Upload new recording): Status = ${uploadRes.status}, Success = ${uploadJson.success}`);
  console.log(`New recording ID created: ${uploadJson.recording?.recordingId}`);
  if (!uploadJson.success) throw new Error('Upload recording failed');

  // Test 5: Verify new recording in list
  const listRes = await fetch('http://localhost:5000/api/recordings?patientId=pat-1');
  const listJson = await listRes.json();
  console.log(`Test 5 (List recordings for pat-1): Total = ${listJson.count}`);

  console.log('🎉 ALL RECORDINGS API TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
