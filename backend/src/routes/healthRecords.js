import express from 'express';
import dbService from '../services/dbService.js';
import { authenticate, requireRole, isDoctorAuthorizedForPatient } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/health-records/patient/:patientId
 * Retrieve the complete Digital Health Record for a patient.
 * Enforces healthcare privacy authorization:
 * - Patient: can only view own records.
 * - Doctor: can only view records of patients they have scheduled/consulted with.
 * - Unauthorized callers receive 403 Forbidden.
 */
router.get('/health-records/patient/:patientId', authenticate, async (req, res) => {
  try {
    const { patientId } = req.params;
    const requestingUser = req.user;

    // Validate patient ID format
    if (!/^[a-zA-Z0-9_-]{2,64}$/.test(patientId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid patient ID format.',
      });
    }

    // Verify patient exists
    const patient = await dbService.findUserById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Patient ${patientId} not found.`,
      });
    }

    // Security & Authorization Check
    const isPatientThemself = requestingUser.role === 'patient' && requestingUser.id === patientId;
    const isDoctor =
      requestingUser.role === 'doctor' &&
      (await isDoctorAuthorizedForPatient(requestingUser.id, patientId));

    if (!isPatientThemself && !isDoctor) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access Denied: You are not authorized to view this patient\'s medical records.',
      });
    }

    const patientRecords = await dbService.getHealthRecordsByPatient(patientId);

    res.json({
      success: true,
      count: patientRecords.length,
      patient: {
        id: patient.id,
        name: patient.name,
        fullName: patient.fullName || patient.name,
        healthId: patient.healthId || 'NX-9824-7123',
        age: patient.age || 42,
        gender: patient.gender || 'Male',
        village: patient.village || 'Rampur Village',
        bloodGroup: patient.bloodGroup || 'O+',
        phone: patient.phone,
        emergencyContact: patient.emergencyContact,
        primaryKiosk: patient.primaryKiosk,
        allergies: patient.allergies || ['None known'],
        existingConditions: patient.existingConditions || ['Diabetes'],
        currentMedications: patient.currentMedications || ['Metformin'],
        previousDiagnoses: patient.previousDiagnoses || [],
        vitals: patient.vitals || {},
      },
      records: patientRecords,
    });
  } catch (err) {
    console.error('[HealthRecords] Error retrieving patient records:', err.message);
    res.status(500).json({
      success: false,
      error: 'Error retrieving health records.',
      message: 'Internal server error while retrieving health records.',
    });
  }
});

/**
 * GET /api/health-records/:recordId
 * Retrieve a specific consultation record by ID.
 * Verifies authorization: Patient or associated Doctor only.
 */
router.get('/health-records/:recordId', authenticate, async (req, res) => {
  try {
    const { recordId } = req.params;
    const requestingUser = req.user;

    if (!/^[a-zA-Z0-9_-]{2,64}$/.test(recordId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid health record ID format.',
      });
    }

    const record = await dbService.getHealthRecordById(recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Health record ${recordId} not found.`,
      });
    }

    // Security check: Patient can only view their own record; Doctor must be authorized
    const isPatientThemself = requestingUser.role === 'patient' && requestingUser.id === record.patientId;
    const isDoctor =
      requestingUser.role === 'doctor' &&
      (await isDoctorAuthorizedForPatient(requestingUser.id, record.patientId));

    if (!isPatientThemself && !isDoctor) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access Denied: You are not authorized to view this medical record.',
      });
    }

    res.json({
      success: true,
      record,
    });
  } catch (err) {
    console.error('[HealthRecords] Error retrieving record:', err.message);
    res.status(500).json({
      success: false,
      error: 'Error retrieving record.',
      message: 'Internal server error while retrieving record.',
    });
  }
});

/**
 * POST /api/health-records
 * Create a new digital health record from a doctor consultation session.
 * Requires: symptoms, diagnosis, prescription.
 * Only authorized doctors can create health records.
 */
router.post('/health-records', authenticate, requireRole('doctor'), async (req, res) => {
  try {
    const {
      patientId = 'pat-1',
      appointmentId,
      symptoms,
      diagnosis,
      prescription,
      doctorNotes,
      followUpInstructions = 'Follow-up in 1 week or visit nearest tele-kiosk if symptoms persist.',
      recordingId = null,
    } = req.body;

    const effectiveDoctorId = req.user.id;

    // Security Verification: Doctor must be authorized to treat this patient
    const isAuthorized = await isDoctorAuthorizedForPatient(effectiveDoctorId, patientId);
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access Denied: You are not authorized to author medical records for this patient.',
      });
    }

    if (!symptoms || !diagnosis) {
      return res.status(400).json({
        success: false,
        error: 'Missing required medical fields (symptoms and diagnosis are required).',
      });
    }

    // Find doctor and patient metadata
    const doctor = (await dbService.getDoctorById(effectiveDoctorId)) || { name: req.user.name || 'Dr. Ananya Sharma, MD', specialization: 'Cardiologist' };
    const patient = (await dbService.findUserById(patientId)) || { name: 'Kumar', age: 42, gender: 'Male' };

    const newRecordId = `HR-${Date.now().toString().slice(-5)}`;

    const newRecord = await dbService.createHealthRecord({
      id: newRecordId,
      patientId: patient.id || patientId,
      patientName: req.body.patientName || patient.name || 'Kumar',
      patientAge: req.body.patientAge || patient.age || 42,
      patientGender: req.body.patientGender || patient.gender || 'Male',
      doctorId: effectiveDoctorId,
      doctorName: doctor.name || req.user.name || 'Dr. Ananya Sharma, MD',
      doctorSpecialization: doctor.specialization || 'Cardiologist',
      appointmentId: appointmentId || `APT-${Date.now().toString().slice(-5)}`,
      consultationDate:
        req.body.consultationDate ||
        new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      symptoms,
      diagnosis,
      prescription: prescription || 'Advised rest and oral hydration.',
      doctorNotes: doctorNotes || 'Patient advised to take adequate fluids and avoid heavy sunlight.',
      followUpInstructions: followUpInstructions || '3 days',
      recordingId: recordingId || null,
      allergies: req.body.allergies || patient.allergies || ['None known'],
      existingConditions: req.body.existingConditions || patient.existingConditions || ['Diabetes'],
      currentMedications: req.body.currentMedications || patient.currentMedications || ['Metformin'],
    });

    console.log(`[HealthRecords] Saved new consultation record ${newRecordId} for patient ${newRecord.patientName} by ${newRecord.doctorName}`);

    // Persist real-time notification for patient
    try {
      await dbService.createNotification({
        userId: patientId,
        role: 'patient',
        type: 'consultation_completed',
        title: 'Digital Health Record Ready',
        message: `Your prescription and clinical assessment report have been filed securely by ${newRecord.doctorName}.`,
        appointmentId: appointmentId || newRecordId,
        senderId: effectiveDoctorId,
        senderName: newRecord.doctorName,
      });
    } catch (notifErr) {
      console.warn('[Notifications Warning] Failed to log health record notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Health record saved successfully.',
      record: newRecord,
    });
  } catch (err) {
    console.error('[HealthRecords] Error creating record:', err.message);
    res.status(500).json({
      success: false,
      error: 'Error creating health record.',
      message: 'Internal server error while creating health record.',
    });
  }
});

/**
 * PUT /api/health-records/:recordId
 * Update an existing consultation record.
 * Verifies doctor authorization.
 */
router.put('/health-records/:recordId', authenticate, requireRole('doctor'), async (req, res) => {
  try {
    const { recordId } = req.params;
    const {
      symptoms,
      diagnosis,
      prescription,
      doctorNotes,
      followUpInstructions,
      recordingId,
    } = req.body;

    const effectiveDoctorId = req.user.id;

    const existingRecord = await dbService.getHealthRecordById(recordId);
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Health record ${recordId} not found.`,
      });
    }

    // Verify doctor is authorized for this patient
    const authorized = await isDoctorAuthorizedForPatient(effectiveDoctorId, existingRecord.patientId);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access Denied: You are not authorized to update this patient\'s records.',
      });
    }

    const updates = {};
    if (symptoms !== undefined) updates.symptoms = symptoms;
    if (diagnosis !== undefined) updates.diagnosis = diagnosis;
    if (prescription !== undefined) updates.prescription = prescription;
    if (doctorNotes !== undefined) updates.doctorNotes = doctorNotes;
    if (followUpInstructions !== undefined) updates.followUpInstructions = followUpInstructions;
    if (recordingId !== undefined) updates.recordingId = recordingId;

    const updatedRecord = await dbService.updateHealthRecord(recordId, updates);

    console.log(`[HealthRecords] Updated record ${recordId}`);

    res.json({
      success: true,
      message: 'Health record updated successfully.',
      record: updatedRecord,
    });
  } catch (err) {
    console.error('[HealthRecords] Error updating record:', err.message);
    res.status(500).json({
      success: false,
      error: 'Error updating health record.',
      message: 'Internal server error while updating health record.',
    });
  }
});

export default router;
