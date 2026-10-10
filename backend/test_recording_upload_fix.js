/**
 * Test script to verify the fix for:
 * "Upload failed: Internal server error while saving recording"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:5000';
const UPLOADS_DIR = path.resolve(__dirname, 'uploads/recordings');

async function runUploadTests() {
  console.log('================================================================');
  console.log('🧪 TESTING RECORDING UPLOAD & STREAMING PLAYBACK FIX');
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

  // Generate a valid synthetic WebM video buffer (EBML Header + Cluster payload)
  const ebmlHeader = Buffer.from([
    0x1a, 0x45, 0xdf, 0xa3, // EBML ID
    0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, // EBML docType: webm
  ]);
  const videoPayload = Buffer.alloc(1024 * 64, 0x42); // 64 KB video chunk
  const webmBuffer = Buffer.concat([ebmlHeader, videoPayload]);

  let uploadedRecordingId = null;
  let uploadedFilename = null;

  // 1. Test Valid Upload: Patient Kumar uploading consultation recording for APT-101
  console.log('1. Testing Valid Consultation Recording Upload...');
  try {
    const formData = new FormData();
    formData.append('appointmentId', 'APT-101');
    formData.append('patientId', 'pat-1');
    formData.append('doctorId', 'doc-1');
    formData.append('patientName', 'Kumar');
    formData.append('doctorName', 'Dr. Ananya Sharma, MD');
    formData.append('duration', '01:15');
    formData.append('uploadedByRole', 'patient');
    formData.append('uploaderId', 'pat-1');

    const blob = new Blob([webmBuffer], { type: 'video/webm' });
    formData.append('recording', blob, `appointment_APT-101_${Date.now()}.webm`);

    const res = await fetch(`${API_BASE}/api/recordings`, {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    assert(res.status === 201, `POST /api/recordings returned HTTP 201 (Status: ${res.status})`);
    assert(json.success === true, 'Response JSON has success: true');
    assert(Boolean(json.recording?.recordingId), `Recording created with ID: ${json.recording?.recordingId}`);
    assert(!json.recording?.filePath, 'File system raw path is NOT exposed in response (Privacy)');

    uploadedRecordingId = json.recording?.recordingId;
    uploadedFilename = json.recording?.filename;

    // Check physical file on disk
    const diskFilePath = path.join(UPLOADS_DIR, uploadedFilename);
    const fileExists = fs.existsSync(diskFilePath);
    assert(fileExists, `Physical file confirmed on server disk: ${uploadedFilename}`);
    if (fileExists) {
      const stats = fs.statSync(diskFilePath);
      assert(stats.size >= webmBuffer.length, `Physical file size is valid (${stats.size} bytes)`);
    }
  } catch (err) {
    assert(false, `Valid upload failed with exception: ${err.message}`);
  }

  // 2. Test Upload with Generated Demo Appointment (e.g. APT-42604 from log)
  console.log('\n2. Testing Upload with Dynamically Generated Appointment ID (like APT-42604)...');
  try {
    const formData = new FormData();
    formData.append('appointmentId', 'APT-42604');
    formData.append('patientId', 'pat-1');
    formData.append('doctorId', 'doc-1');
    formData.append('patientName', 'Kumar');
    formData.append('doctorName', 'Dr. Ananya Sharma, MD');
    formData.append('duration', '00:45');
    formData.append('uploadedByRole', 'patient');
    formData.append('uploaderId', 'pat-1');

    const blob = new Blob([webmBuffer], { type: 'video/webm' });
    formData.append('recording', blob, `appointment_APT-42604_${Date.now()}.webm`);

    const res = await fetch(`${API_BASE}/api/recordings`, {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    assert(res.status === 201, `Generated appointment APT-42604 upload succeeded with HTTP 201`);
    assert(json.success === true, 'No TypeError: dbService.getAppointmentById exception occurred');
  } catch (err) {
    assert(false, `Dynamic appointment upload failed: ${err.message}`);
  }

  // 3. Test Unauthorized Uploader Rejection (Security requirement 9)
  console.log('\n3. Testing Security Authorization Check...');
  try {
    const formData = new FormData();
    formData.append('appointmentId', 'APT-101');
    formData.append('patientId', 'pat-1');
    formData.append('doctorId', 'doc-1');
    formData.append('uploadedByRole', 'hacker');
    formData.append('uploaderId', 'unauthorized-user-999');

    const blob = new Blob([webmBuffer], { type: 'video/webm' });
    formData.append('recording', blob, `unauthorized_${Date.now()}.webm`);

    const res = await fetch(`${API_BASE}/api/recordings`, {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    assert(res.status === 403, `Unauthorized uploader rejected with HTTP 403 Forbidden (Status: ${res.status})`);
    assert(json.success === false, 'Unauthorized response has success: false');
  } catch (err) {
    assert(false, `Authorization check failed: ${err.message}`);
  }

  // 4. Test Empty File Rejection (Requirement 8)
  console.log('\n4. Testing Empty File Rejection...');
  try {
    const formData = new FormData();
    formData.append('appointmentId', 'APT-101');
    formData.append('patientId', 'pat-1');
    formData.append('doctorId', 'doc-1');
    formData.append('uploaderId', 'pat-1');

    const emptyBlob = new Blob([], { type: 'video/webm' });
    formData.append('recording', emptyBlob, `empty_${Date.now()}.webm`);

    const res = await fetch(`${API_BASE}/api/recordings`, {
      method: 'POST',
      body: formData,
    });

    const json = await res.json();
    assert(res.status === 400, `Empty file upload rejected with HTTP 400 Bad Request (Status: ${res.status})`);
    assert(json.success === false, 'Empty file response has success: false');
  } catch (err) {
    assert(false, `Empty file check failed: ${err.message}`);
  }

  // 5. Test Playback & Video Streaming by Authorized Patient
  console.log('\n5. Testing Authorized Playback & Video Streaming...');
  if (uploadedRecordingId) {
    try {
      const streamRes = await fetch(`${API_BASE}/api/recordings/${uploadedRecordingId}?userId=pat-1`);
      assert(streamRes.status === 200, `Authorized patient can stream recording (HTTP ${streamRes.status})`);
      assert(
        streamRes.headers.get('content-type')?.includes('video/webm'),
        `Stream response content-type is video/webm (${streamRes.headers.get('content-type')})`
      );

      const buffer = await streamRes.arrayBuffer();
      assert(buffer.byteLength > 0, `Video bytes successfully streamed to client (${buffer.byteLength} bytes)`);
    } catch (err) {
      assert(false, `Authorized playback failed: ${err.message}`);
    }

    // 6. Test Playback Denial for Unauthorized User (Privacy requirement 9)
    console.log('\n6. Testing Unauthorized Playback Denial...');
    try {
      const unauthorizedRes = await fetch(
        `${API_BASE}/api/recordings/${uploadedRecordingId}?userId=random-stranger-id`
      );
      assert(
        unauthorizedRes.status === 403,
        `Unauthorized user blocked with HTTP 403 Forbidden (Status: ${unauthorizedRes.status})`
      );
    } catch (err) {
      assert(false, `Privacy playback denial failed: ${err.message}`);
    }
  }

  // 7. Test Metadata Listing via GET /api/recordings
  console.log('\n7. Testing Metadata Retrieval via GET /api/recordings...');
  try {
    const listRes = await fetch(`${API_BASE}/api/recordings?patientId=pat-1`);
    const listJson = await listRes.json();
    assert(listRes.status === 200, `GET /api/recordings returned HTTP 200`);
    assert(Array.isArray(listJson.recordings), 'Recordings response contains an array');
    const found = listJson.recordings.some((r) => r.recordingId === uploadedRecordingId);
    assert(found, `Newly uploaded recording ${uploadedRecordingId} found in user recording list`);
  } catch (err) {
    assert(false, `Metadata listing failed: ${err.message}`);
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runUploadTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
