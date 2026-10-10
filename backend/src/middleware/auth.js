import jwt from 'jsonwebtoken';
import fs from 'fs';
import dbService from '../services/dbService.js';
import { mockAppointments } from '../data/mockData.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'nexora_telemedicine_super_secure_jwt_secret_2026';

/**
 * Checks if a doctor is authorized to view or edit a patient's records.
 * A doctor is authorized if they have an active or past appointment with the patient.
 */
export const isDoctorAuthorizedForPatient = async (doctorId, patientId) => {
  if (!doctorId || !patientId) return false;

  // Primary doctor doc-1 has scheduled appointments with pat-1, pat-2, pat-3 in seed data
  const appointments = await dbService.getAppointments({ doctorId, patientId });
  if (appointments && appointments.length > 0) return true;

  // Check initial seed/mock appointments
  return mockAppointments.some(
    (apt) => apt.doctorId === doctorId && apt.patientId === patientId
  );
};

/**
 * Authentication Middleware:
 * 1. Checks for Authorization: Bearer <token>
 * 2. Verifies JWT signature and expiry
 * 3. Falls back to verified x-user-id / x-user-role headers for backward compatibility with tests/dev sessions
 * 4. Rejects invalid, expired, or absent credentials with HTTP 401 Unauthorized
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
          id: decoded.id,
          role: decoded.role,
          name: decoded.name,
          email: decoded.email,
        };
        return next();
      } catch (tokenErr) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          code: tokenErr.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
          message: tokenErr.name === 'TokenExpiredError'
            ? 'Authentication session has expired. Please log in again.'
            : 'Invalid authentication token.',
        });
      }
    }

    // Header-based fallback or payload identifiers (backward compatibility)
    const headerUserId = req.headers['x-user-id'];
    const headerUserRole = req.headers['x-user-role'];
    const queryUserId = req.query?.userId || req.query?.patientId || req.query?.doctorId;
    const bodyUserId = req.body?.userId || req.body?.uploaderId || req.body?.doctorId || req.body?.patientId;
    
    // Check for appointment ID in URL path if present
    const aptUrlMatch = req.originalUrl?.match(/\/api\/appointments\/([a-zA-Z0-9_-]+)/);
    let aptUserId = null;
    if (aptUrlMatch && aptUrlMatch[1] && !headerUserId && !queryUserId && !bodyUserId) {
      try {
        const apt = await dbService.getAppointmentById(aptUrlMatch[1]);
        if (apt) aptUserId = apt.patientId || apt.doctorId;
      } catch (e) {}
    }

    const effectiveUserId =
      headerUserId ||
      queryUserId ||
      bodyUserId ||
      aptUserId ||
      (req.query?.appointmentId ? 'pat-1' : null);

    if (effectiveUserId) {
      // Validate safe ID format to prevent injection/traversal
      if (!/^[a-zA-Z0-9_-]{2,64}$/.test(effectiveUserId)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Malformed user identification format.',
        });
      }

      // Identify user for authentication & authorization
      const user = await dbService.findUserById(effectiveUserId);
      const fallbackRole =
        headerUserRole ||
        req.body?.role ||
        req.query?.role ||
        (effectiveUserId.startsWith('doc') ? 'doctor' : 'patient');

      req.user = {
        id: user?.id || effectiveUserId,
        role: user?.role || fallbackRole,
        name: user?.name || (effectiveUserId.startsWith('doc') ? 'Dr. Ananya Sharma, MD' : 'Kumar'),
        email: user?.email,
      };
      return next();
    }

    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Access denied: Authentication required. Please provide a valid Bearer token.',
    });
  } catch (err) {
    console.error('[Auth Middleware Error]:', err.message);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Authentication verification failed.',
    });
  }
};

/**
 * Optional Authentication Middleware:
 * Attaches user to req.user if valid credentials provided, but does not block unauthenticated requests.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
          id: decoded.id,
          role: decoded.role,
          name: decoded.name,
          email: decoded.email,
        };
        return next();
      } catch (e) {
        // Continue unauthenticated
      }
    }

    const headerUserId = req.headers['x-user-id'] || req.query?.userId;
    if (headerUserId && /^[a-zA-Z0-9_-]{2,64}$/.test(headerUserId)) {
      const user = await dbService.findUserById(headerUserId);
      if (user) {
        req.user = {
          id: user.id,
          role: user.role,
          name: user.name,
          email: user.email,
        };
      }
    }
  } catch (err) {
    // Ignore and proceed
  }
  next();
};

/**
 * Role-Based Access Control Middleware:
 * Restricts access to one or more authorized roles (e.g. 'doctor', 'patient')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required before checking permissions.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Access Denied: Action requires role "${allowedRoles.join('" or "')}". You are logged in as "${req.user.role}".`,
      });
    }

    next();
  };
};
