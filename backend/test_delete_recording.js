// test_delete_recording.js
import fs from 'fs';

async function runDeleteTests() {
  console.log('--- Testing NEXORA Secure Recording Deletion ---');

  // Step 1: Create a temporary test recording
  const fileContent = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x99, 0x88]);
  const formData = new FormData();
  formData.append('appointmentId', 'APT-101');
  formData.append('patientId', 'pat-1');
  formData.append('doctorId', 'doc-1');
  formData.append('patientName', 'Ramesh Kumar');
  formData.append('doctorName', 'Dr. Ananya Sharma, MD');
  formData.append('duration', '00:15');
  formData.append('uploaderId', 'pat-1');
  formData.append('uploadedByRole', 'patient');
  formData.append('recording', new Blob([fileContent], { type: 'video/webm' }), 'test_to_delete.webm');

  const uploadRes = await fetch('http://localhost:5000/api/recordings', {
    method: 'POST',
    body: formData,
  });
  const uploadJson = await uploadRes.json();
  const testRecordingId = uploadJson.recording.recordingId;
  console.log(`Created test recording: ${testRecordingId}`);

  // Test 1: Patient B (pat-2) attempts to delete Patient A's recording -> MUST FAIL WITH 403
  const unauthPatientRes = await fetch(`http://localhost:5000/api/recordings/${testRecordingId}?userId=pat-2`, {
    method: 'DELETE',
  });
  console.log(`Test 1 (Unauthorized Patient B deletion): Status = ${unauthPatientRes.status} (Expected: 403)`);
  if (unauthPatientRes.status !== 403) throw new Error('Unauthorized Patient B was not blocked with 403!');

  // Test 2: Doctor B (doc-3) attempts to delete Doctor A's recording -> MUST FAIL WITH 403
  const unauthDoctorRes = await fetch(`http://localhost:5000/api/recordings/${testRecordingId}?userId=doc-3`, {
    method: 'DELETE',
  });
  console.log(`Test 2 (Unauthorized Doctor B deletion): Status = ${unauthDoctorRes.status} (Expected: 403)`);
  if (unauthDoctorRes.status !== 403) throw new Error('Unauthorized Doctor B was not blocked with 403!');

  // Test 3: Authorized Doctor (doc-1) or Patient (pat-1) deletes their own recording -> MUST SUCCEED WITH 200
  const authDeleteRes = await fetch(`http://localhost:5000/api/recordings/${testRecordingId}?userId=pat-1`, {
    method: 'DELETE',
  });
  const authDeleteJson = await authDeleteRes.json();
  console.log(`Test 3 (Authorized Patient deletion): Status = ${authDeleteRes.status}, Success = ${authDeleteJson.success}`);
  if (authDeleteRes.status !== 200 || !authDeleteJson.success) throw new Error('Authorized deletion failed!');

  // Test 4: Verify recording is completely gone from the list
  const listRes = await fetch('http://localhost:5000/api/recordings?patientId=pat-1');
  const listJson = await listRes.json();
  const exists = listJson.recordings.some((r) => r.recordingId === testRecordingId);
  console.log(`Test 4 (Verify recording removed from list): Exists = ${exists} (Expected: false)`);
  if (exists) throw new Error('Deleted recording still appears in list!');

  // Test 5: Handle case where physical file is already missing
  // Create another recording, manually delete file from disk, then call DELETE endpoint
  const formData2 = new FormData();
  formData2.append('appointmentId', 'APT-101');
  formData2.append('patientId', 'pat-1');
  formData2.append('doctorId', 'doc-1');
  formData2.append('recording', new Blob([fileContent], { type: 'video/webm' }), 'missing_file.webm');

  const uploadRes2 = await fetch('http://localhost:5000/api/recordings', { method: 'POST', body: formData2 });
  const uploadJson2 = await uploadRes2.json();
  const missingFileRecId = uploadJson2.recording.recordingId;

  // Manually remove file to simulate missing file
  const filePath = uploadJson2.recording.filePath;
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const deleteMissingFileRes = await fetch(`http://localhost:5000/api/recordings/${missingFileRecId}?userId=doc-1`, {
    method: 'DELETE',
  });
  console.log(`Test 5 (Missing physical file handling): Status = ${deleteMissingFileRes.status} (Expected: 200)`);
  if (deleteMissingFileRes.status !== 200) throw new Error('Missing file deletion failed!');

  console.log('🎉 ALL DELETE RECORDING SECURITY TESTS PASSED SUCCESSFULLY!');
}

runDeleteTests().catch((err) => {
  console.error('❌ Delete test failed:', err);
  process.exit(1);
});
