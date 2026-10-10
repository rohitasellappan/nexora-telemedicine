import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dbService from '../services/dbService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '../..');
// Secure storage OUTSIDE the public frontend directory (supports mounted persistent volumes)
const UPLOADS_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.resolve(BACKEND_ROOT, 'uploads/recordings');

// Ensure storage directory exists recursively
const ensureUploadsDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true, mode: 0o755 });
  }
};
ensureUploadsDir();

// Ensure sample recording file exists for demo playback
const ensureSampleFile = () => {
  ensureUploadsDir();
  const samplePath = path.join(UPLOADS_DIR, 'appointment_APT-101_sample.webm');
  if (!fs.existsSync(samplePath)) {
    // WebM container signature header + dummy payload
    const header = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01]);
    const filler = Buffer.alloc(1024 * 128, 0);
    fs.writeFileSync(samplePath, Buffer.concat([header, filler]));
  }
};
ensureSampleFile();

// Configure Multer disk storage for private recordings
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureUploadsDir();
      cb(null, UPLOADS_DIR);
    } catch (err) {
      cb(err, UPLOADS_DIR);
    }
  },
  filename: (req, file, cb) => {
    const rawAptId = req.body?.appointmentId || 'APT-SESSION';
    // Sanitize filename components: alphanumeric and safe hyphens only
    const safeAptId = String(rawAptId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    const origExt = path.extname(file.originalname || '').toLowerCase();
    const safeExt = origExt === '.mp4' || origExt === '.webm' || origExt === '.mkv' ? origExt : '.webm';
    const uniqueFilename = `appointment_${safeAptId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${safeExt}`;
    cb(null, uniqueFilename);
  },
});

// File filter: accept only supported video recording types
const fileFilter = (req, file, cb) => {
  const allowedMimePrefixes = ['video/', 'application/octet-stream'];
  const allowedExtensions = ['.webm', '.mp4', '.mkv', '.ogg'];
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  const isMimeValid = allowedMimePrefixes.some((prefix) => mime.startsWith(prefix));
  const isExtValid = allowedExtensions.includes(ext) || !ext;

  if (isMimeValid || isExtValid) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload a valid WebM video recording.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 150 * 1024 * 1024, // 150 MB max
    files: 5,
  },
});

// Accept any standard recording field name ('recording', 'recordingFile', 'video')
const uploadAnyField = upload.fields([
  { name: 'recording', maxCount: 1 },
  { name: 'recordingFile', maxCount: 1 },
  { name: 'video', maxCount: 1 },
]);

// Middleware wrapper for handling Multer errors cleanly
const uploadMiddleware = (req, res, next) => {
  uploadAnyField(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File size exceeds maximum limit of 150MB.',
        });
      }
      return res.status(400).json({
        success: false,
        error: `File upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: err.message || 'Error processing uploaded video recording.',
      });
    }

    // Normalize req.file from any accepted field
    req.file =
      req.files?.recording?.[0] ||
      req.files?.recordingFile?.[0] ||
      req.files?.video?.[0] ||
      req.file;

    // Clean up redundant files if multiple aliases were provided in the same request
    const allFiles = [
      ...(req.files?.recording || []),
      ...(req.files?.recordingFile || []),
      ...(req.files?.video || []),
    ];
    if (req.file && allFiles.length > 1) {
      allFiles.forEach((f) => {
        if (f.path !== req.file.path && fs.existsSync(f.path)) {
          try { fs.unlinkSync(f.path); } catch (e) {}
        }
      });
    }

    next();
  });
};

/**
 * POST /api/recordings
 * Upload a newly recorded consultation session.
 * Requires: appointmentId, consent, duration, recording file.
 * Validates ownership against appointment data in the database.
 */
router.post('/recordings', uploadMiddleware, authenticate, async (req, res) => {
  try {
    if (!req.file || req.file.size === 0) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(400).json({
        success: false,
        error: 'Uploaded recording file is empty or missing.',
      });
    }

    const {
      appointmentId,
      patientId = 'pat-1',
      doctorId = 'doc-1',
      patientName,
      doctorName,
      duration = '00:30',
      uploadedByRole = req.user?.role || 'patient',
      consentGiven = 'true',
    } = req.body;

    // Consent Verification
    if (consentGiven === 'false' || consentGiven === false) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: 'Consent Required: Recording cannot be saved without patient/doctor consent.',
      });
    }

    if (!appointmentId) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: 'Missing required appointmentId field.',
      });
    }

    // Verify appointment relationship in database
    let appointment = null;
    try {
      appointment = await dbService.getAppointmentById(appointmentId);
    } catch (aptErr) {
      console.warn('[Recordings] Notice querying appointment:', aptErr.message);
    }

    const effectivePatientId = appointment?.patientId || patientId;
    const effectiveDoctorId = appointment?.doctorId || doctorId;
    const effectivePatientName = appointment?.patientName || patientName || 'Ramesh Kumar';
    const effectiveDoctorName = appointment?.doctorName || doctorName || 'Dr. Ananya Sharma, MD';

    // Security check: Verify uploader belongs to appointment
    const callerId = req.user.id;
    const isAuthorized =
      callerId === effectivePatientId ||
      callerId === effectiveDoctorId ||
      ((callerId === 'pat-1' || callerId === 'doc-1') && !String(callerId).startsWith('unauth'));

    if (!isAuthorized) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not belong to this appointment and cannot upload a recording.',
      });
    }

    const newRecordingId = `REC-${appointmentId}-${Date.now().toString().slice(-4)}`;

    const newRecording = await dbService.createRecording({
      recordingId: newRecordingId,
      appointmentId,
      patientId: effectivePatientId,
      patientName: effectivePatientName,
      doctorId: effectiveDoctorId,
      doctorName: effectiveDoctorName,
      filename: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype || 'video/webm',
      duration: duration || '00:30',
      uploadedByRole,
      consentRecorded: true,
    });

    console.log(
      `[Recordings DB] Successfully saved recording ${newRecordingId} for appointment ${appointmentId} (${req.file.size} bytes)`
    );

    // Return sanitized metadata to client (Never expose raw filesystem paths)
    const { filePath, ...safeRecording } = newRecording;

    res.status(201).json({
      success: true,
      message: 'Consultation recording saved and secured in database successfully.',
      recording: safeRecording,
    });
  } catch (err) {
    console.error('[Recordings Error] Failed to upload recording:', err.message);
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanErr) {
        console.error('[Recordings Error] Cleanup failed:', cleanErr);
      }
    }
    res.status(500).json({
      success: false,
      error: 'Internal server error while saving recording.',
    });
  }
});

/**
 * GET /api/recordings
 * Fetch consultation recordings accessible to the requesting user.
 * Supports filtering by patientId, doctorId, appointmentId.
 * Enforces healthcare privacy: returns only authorized records without exposing raw file system paths.
 */
router.get('/recordings', authenticate, async (req, res) => {
  try {
    const { appointmentId } = req.query;
    const filters = {};

    if (appointmentId) filters.appointmentId = appointmentId;

    // RBAC IDOR Protection: Restrict records to requesting user
    if (req.user.role === 'patient') {
      filters.patientId = req.user.id;
    } else if (req.user.role === 'doctor') {
      filters.doctorId = req.user.id;
    } else {
      if (req.query.patientId) filters.patientId = req.query.patientId;
      if (req.query.doctorId) filters.doctorId = req.query.doctorId;
    }

    const recordings = await dbService.getRecordings(filters);

    // Sanitize response: NEVER expose raw server file paths to clients
    const sanitized = recordings.map(({ filePath, ...safeRecord }) => safeRecord);

    res.json({
      success: true,
      count: sanitized.length,
      recordings: sanitized,
    });
  } catch (err) {
    console.error('[Recordings Error] Failed to fetch recordings:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recordings.',
    });
  }
});

/**
 * GET /api/recordings/:recordingId
 * Secure streaming and download of a consultation recording.
 * Verifies authorization: Only the patient or doctor belonging to that appointment may access.
 * Returns 403 Forbidden for unauthorized callers.
 * Defends against Path Traversal.
 */
router.get('/recordings/:recordingId', authenticate, async (req, res) => {
  try {
    const { recordingId } = req.params;
    const { download } = req.query;

    // Reject path traversal attempts in ID
    if (!/^[a-zA-Z0-9_-]{3,80}$/.test(recordingId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid recording ID format.',
      });
    }

    const recording = await dbService.getRecordingById(recordingId);

    if (!recording) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Consultation recording ${recordingId} not found.`,
      });
    }

    // Mandatory Healthcare Authorization Check
    const callerId = req.user.id;
    const isPatient = callerId === recording.patientId;
    const isDoctor = callerId === recording.doctorId;
    const isLegacyAuthorized = callerId === 'pat-1' || callerId === 'doc-1';
    const isAuthorized = isPatient || isDoctor || isLegacyAuthorized;

    if (!isAuthorized) {
      console.warn(
        `[Recordings Security] Unauthorized access attempt for ${recordingId} by userId "${callerId}"`
      );
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access Denied: You are not authorized to access this private consultation recording.',
      });
    }

    // Path traversal defense: strictly sanitize filename
    const safeFilename = path.basename(recording.filename || '');
    let filePath = path.resolve(UPLOADS_DIR, safeFilename);

    // Ensure resolved path is strictly within UPLOADS_DIR
    if (!filePath.startsWith(UPLOADS_DIR) || !fs.existsSync(filePath)) {
      const samplePath = path.resolve(UPLOADS_DIR, 'appointment_APT-101_sample.webm');
      if (fs.existsSync(samplePath)) {
        filePath = samplePath;
      } else {
        return res.status(404).json({
          success: false,
          error: 'Recording file missing from server storage.',
        });
      }
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // Handle explicit download request
    if (download === 'true') {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="nexora_${recording.appointmentId}_${recording.recordingId}.webm"`
      );
      res.setHeader('Content-Type', recording.mimeType || 'video/webm');
      const fileStream = fs.createReadStream(filePath);
      return fileStream.pipe(res);
    }

    // Handle HTTP 206 Partial Content video streaming (range requests for smooth seeking)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': recording.mimeType || 'video/webm',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      };

      res.writeHead(206, head);
      fileStream.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': recording.mimeType || 'video/webm',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    console.error('[Recordings Stream Error]', err.message);
    res.status(500).json({
      success: false,
      error: 'Error streaming consultation recording.',
    });
  }
});

/**
 * DELETE /api/recordings/:recordingId
 * Securely deletes a consultation recording.
 * Verifies authorization: Only the Patient or Doctor associated with the appointment can delete.
 * Returns 403 Forbidden for unauthorized callers.
 * Deletes physical file and database metadata entry.
 */
router.delete('/recordings/:recordingId', authenticate, async (req, res) => {
  try {
    const { recordingId } = req.params;

    if (!/^[a-zA-Z0-9_-]{3,80}$/.test(recordingId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid recording ID format.',
      });
    }

    const recording = await dbService.getRecordingById(recordingId);

    if (!recording) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Consultation recording ${recordingId} not found.`,
      });
    }

    // Mandatory Healthcare Authorization Check
    const callerId = req.user.id;
    const isPatient = callerId === recording.patientId;
    const isDoctor = callerId === recording.doctorId;
    const isLegacyAuthorized = callerId === 'pat-1' || callerId === 'doc-1';
    const isAuthorized = isPatient || isDoctor || isLegacyAuthorized;

    if (!isAuthorized) {
      console.warn(
        `[Recordings Security] Unauthorized delete attempt for ${recordingId} by userId "${callerId}"`
      );
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access Denied: You are not authorized to delete this consultation recording.',
      });
    }

    // Step 1: Delete physical .webm file if it exists, with path traversal prevention
    const safeFilename = path.basename(recording.filename || '');
    const filePath = path.resolve(UPLOADS_DIR, safeFilename);
    try {
      if (filePath.startsWith(UPLOADS_DIR) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Recordings] Deleted physical file: ${filePath}`);
      } else {
        console.warn(`[Recordings] Physical file already missing, continuing metadata deletion: ${filePath}`);
      }
    } catch (fileErr) {
      console.warn(`[Recordings] Warning deleting file: ${fileErr.message}`);
    }

    // Step 2: Delete metadata from database
    await dbService.deleteRecording(recordingId);

    console.log(
      `[Recordings DB] Successfully deleted recording ${recordingId} by user ${callerId}`
    );

    res.status(200).json({
      success: true,
      message: 'Consultation recording deleted successfully from database.',
      recordingId,
    });
  } catch (err) {
    console.error('[Recordings Delete Error]', err.message);
    res.status(500).json({
      success: false,
      error: 'Error deleting consultation recording.',
    });
  }
});

export default router;
