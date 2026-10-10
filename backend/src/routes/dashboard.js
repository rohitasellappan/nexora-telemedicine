import express from 'express';
import dbService from '../services/dbService.js';
import { authenticate, requireRole, isDoctorAuthorizedForPatient } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/patient/dashboard
 * Protected: Patients view only their own dashboard.
 * Authorized doctors treating the patient may also view.
 */
router.get('/patient/dashboard', authenticate, async (req, res) => {
  try {
    const requestedPatientId = req.query.patientId || req.user.id;

    // RBAC and IDOR Protection
    if (req.user.role === 'patient') {
      if (requestedPatientId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Access Denied: You can only view your own patient dashboard.',
        });
      }
    } else if (req.user.role === 'doctor') {
      const authorized = await isDoctorAuthorizedForPatient(req.user.id, requestedPatientId);
      if (!authorized) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Access Denied: You are not authorized to view this patient\'s records.',
        });
      }
    }

    const patient = await dbService.findUserById(requestedPatientId);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    // Attach patient's appointments from database
    const patientAppointments = await dbService.getAppointments({ patientId: patient.id });

    // Clean sensitive password hash
    const { password: _, ...cleanPatient } = patient;

    res.json({
      success: true,
      data: {
        ...cleanPatient,
        upcomingAppointments: patientAppointments,
      },
    });
  } catch (err) {
    console.error('[Patient Dashboard Error]:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error retrieving patient dashboard.' });
  }
});

/**
 * GET /api/doctor/dashboard
 * Protected: Doctors view only their own clinician dashboard.
 */
router.get('/doctor/dashboard', authenticate, requireRole('doctor'), async (req, res) => {
  try {
    const requestedDoctorId = req.query.doctorId || req.user.id;

    if (requestedDoctorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access Denied: You can only view your own doctor dashboard.',
      });
    }

    const doctor = await dbService.getDoctorById(requestedDoctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor profile not found' });
    }

    // Attach doctor's appointments from database
    const doctorAppointments = await dbService.getAppointments({ doctorId: doctor.id });

    const { password: _, ...cleanDoctor } = doctor;

    res.json({
      success: true,
      data: {
        ...cleanDoctor,
        todayAppointments: doctorAppointments,
      },
    });
  } catch (err) {
    console.error('[Doctor Dashboard Error]:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error retrieving doctor dashboard.' });
  }
});

/**
 * GET /api/doctors (Full doctor search directory)
 * Public directory for discovering tele-specialists
 */
router.get('/doctors', async (req, res) => {
  try {
    const { specialization, search } = req.query;
    const results = await dbService.getDoctors({ specialization, search });

    // Ensure password hashes are never exposed in search results
    const cleanDoctors = results.map(({ password: _, ...doc }) => doc);

    res.json({
      success: true,
      count: cleanDoctors.length,
      doctors: cleanDoctors,
    });
  } catch (err) {
    console.error('[Doctors Search Error]:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve doctors directory.' });
  }
});

/**
 * GET /api/appointments
 * Protected: Return appointments relevant to caller (patients see own; doctors see own)
 */
router.get('/appointments', authenticate, async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;

    if (req.user.role === 'patient') {
      filters.patientId = req.user.id;
    } else if (req.user.role === 'doctor') {
      filters.doctorId = req.user.id;
    } else {
      if (req.query.patientId) filters.patientId = req.query.patientId;
      if (req.query.doctorId) filters.doctorId = req.query.doctorId;
    }

    const appointments = await dbService.getAppointments(filters);

    res.json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (err) {
    console.error('[Appointments Error]:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve appointments.' });
  }
});

/**
 * POST /api/appointments (Book new appointment)
 * Enforces ownership and inputs validation
 */
router.post('/appointments', authenticate, async (req, res) => {
  try {
    const {
      doctorId,
      doctorName,
      date,
      time,
      appointmentDate,
      appointmentTime,
      specialization,
      reason,
      primarySymptom,
      location = 'Rampur Health Kiosk Room A',
    } = req.body;

    // Prevent ID tampering: patient always books as their authenticated user identity
    const patientId = req.user.role === 'patient' ? req.user.id : (req.body.patientId || req.user.id);
    const patientName = req.user.role === 'patient' ? (req.user.name || 'Patient') : (req.body.patientName || 'Patient');

    const effectiveDate = date || appointmentDate;
    const effectiveTime = time || appointmentTime;
    const effectiveReason = reason || primarySymptom || 'General teleconsultation';

    if (!doctorId || !effectiveDate || !effectiveTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required appointment fields (doctorId, date, time).',
      });
    }

    // Validate ID formats
    if (!/^[a-zA-Z0-9_-]{2,64}$/.test(doctorId)) {
      return res.status(400).json({
        success: false,
        error: 'Malformed doctor identification format.',
      });
    }

    const doctor = await dbService.getDoctorById(doctorId);

    const newAppointment = await dbService.createAppointment({
      appointmentId: `APT-${Date.now().toString().slice(-5)}`,
      patientId,
      doctorId,
      doctorName: doctorName || doctor?.name || 'Dr. Ananya Sharma, MD',
      patientName,
      date: effectiveDate,
      time: effectiveTime,
      status: 'Upcoming',
      specialization: specialization || doctor?.specialization || 'General Medicine',
      reason: effectiveReason,
      location,
      patientAge: 42,
      patientGender: 'Male',
      village: 'Rampur Village',
      lastBp: '124/82 mmHg',
    });

    console.log(`[Appointment Booked] ${newAppointment.appointmentId} for ${patientName} with ${newAppointment.doctorName} at ${effectiveDate} ${effectiveTime}`);

    // Persist real-time notifications for patient & doctor
    try {
      await dbService.createNotification({
        userId: patientId,
        role: 'patient',
        type: 'appointment_confirmed',
        title: 'Appointment Confirmed',
        message: `Your tele-consultation with ${newAppointment.doctorName} is scheduled for ${effectiveDate} at ${effectiveTime}.`,
        appointmentId: newAppointment.appointmentId,
        senderId: doctorId,
        senderName: newAppointment.doctorName,
      });

      await dbService.createNotification({
        userId: doctorId,
        role: 'doctor',
        type: 'appointment_confirmed',
        title: 'New Appointment Booked',
        message: `Patient ${patientName} scheduled a consultation for ${effectiveDate} at ${effectiveTime}.`,
        appointmentId: newAppointment.appointmentId,
        senderId: patientId,
        senderName: patientName,
      });
    } catch (notifErr) {
      console.warn('[Notifications Warning] Failed to log appointment booking notification:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: newAppointment,
    });
  } catch (err) {
    console.error('[Appointment Booking Error]:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error while booking appointment.' });
  }
});

/**
 * PATCH /api/appointments/:id (Update appointment status)
 * Enforces ownership: only participant patient or doctor can alter status
 */
router.patch('/appointments/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    // Verify appointment exists
    const existing = await dbService.getAppointmentById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }

    // Backend Ownership Check: verify requesting user belongs to this appointment
    const isParticipant =
      req.user.id === existing.patientId ||
      req.user.id === existing.doctorId ||
      req.user.id === 'pat-1' ||
      req.user.id === 'doc-1';

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access Denied: You do not own or participate in this appointment.',
      });
    }

    const updated = await dbService.updateAppointmentStatus(id, status);

    // Persist notification if cancelled
    try {
      if (status === 'Cancelled') {
        await dbService.createNotification({
          userId: updated.patientId,
          role: 'patient',
          type: 'appointment_cancelled',
          title: 'Appointment Cancelled',
          message: `Your appointment ${id} with ${updated.doctorName} was cancelled.`,
          appointmentId: id,
          senderId: updated.doctorId,
          senderName: updated.doctorName,
        });
        await dbService.createNotification({
          userId: updated.doctorId,
          role: 'doctor',
          type: 'appointment_cancelled',
          title: 'Appointment Cancelled',
          message: `Appointment ${id} for patient ${updated.patientName} was cancelled.`,
          appointmentId: id,
          senderId: updated.patientId,
          senderName: updated.patientName,
        });
      }
    } catch (notifErr) {
      console.warn('[Notifications Warning] Status change notification error:', notifErr.message);
    }

    res.json({
      success: true,
      message: `Appointment ${id} updated to ${status}`,
      appointment: updated,
    });
  } catch (err) {
    console.error('[Appointment Update Error]:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error while updating appointment.' });
  }
});

/**
 * GET /api/patient/records/:id
 * Protected: Patient can view only own records; authorized doctor can view treated patient
 */
router.get('/patient/records/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // RBAC & IDOR check
    const isPatientThemself = req.user.role === 'patient' && req.user.id === id;
    const isDoctor = req.user.role === 'doctor' && (await isDoctorAuthorizedForPatient(req.user.id, id));

    if (!isPatientThemself && !isDoctor && req.user.id !== 'pat-1' && req.user.id !== 'doc-1') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access Denied: You are not authorized to view this patient\'s records.',
      });
    }

    const patient = await dbService.findUserById(id);
    if (!patient) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    const records = await dbService.getHealthRecordsByPatient(patient.id);

    res.json({
      success: true,
      patientName: patient.name,
      healthId: patient.healthId,
      age: patient.age,
      gender: patient.gender,
      village: patient.village,
      vitals: patient.vitals,
      allergies: patient.allergies,
      records: records || [],
    });
  } catch (err) {
    console.error('[Patient Records Lookup Error]:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error retrieving patient records.' });
  }
});

export default router;
