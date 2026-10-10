import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { isDbConnected } from '../config/db.js';
import { User, DoctorProfile, Appointment, HealthRecord, RecordingMetadata, Notification } from '../models/index.js';
import { mockDoctors, mockPatients, mockAppointments } from '../data/mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

// File paths for persistent file-backed store
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DOCTORS_FILE = path.join(DATA_DIR, 'doctors.json');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');
const HEALTH_RECORDS_FILE = path.join(DATA_DIR, 'healthRecords.json');
const RECORDINGS_FILE = path.join(DATA_DIR, 'recordings.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

// File read/write helpers
const readJsonFile = (filePath, fallback = []) => {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`[dbService] Notice reading ${path.basename(filePath)}:`, err.message);
  }
  return fallback;
};

const writeJsonFile = (filePath, data) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`[dbService] Error writing ${path.basename(filePath)}:`, err.message);
  }
};

// Initialize file stores with bcrypt hashed passwords if they don't exist
const initializeFileStore = async () => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  if (!fs.existsSync(USERS_FILE)) {
    const initialUsers = [
      ...mockPatients.map((p) => ({
        ...p,
        password: hashedPassword,
      })),
      ...mockDoctors.map((d) => ({
        id: d.id,
        email: d.email,
        password: hashedPassword,
        role: 'doctor',
        name: d.name,
        phone: '+91 99887 76655',
      })),
    ];
    writeJsonFile(USERS_FILE, initialUsers);
  }

  if (!fs.existsSync(DOCTORS_FILE)) {
    writeJsonFile(DOCTORS_FILE, mockDoctors.map(({ password: _, ...d }) => d));
  }

  if (!fs.existsSync(APPOINTMENTS_FILE)) {
    writeJsonFile(APPOINTMENTS_FILE, mockAppointments);
  }

  if (!fs.existsSync(NOTIFICATIONS_FILE)) {
    const initialNotifs = [
      {
        id: 'NOTIF-101',
        userId: 'pat-1',
        role: 'patient',
        type: 'appointment_confirmed',
        title: 'Appointment Confirmed',
        message: 'Your tele-consultation with Dr. Ananya Sharma has been confirmed for Oct 9, 02:00 PM.',
        appointmentId: 'APT-101',
        senderId: 'doc-1',
        senderName: 'Dr. Ananya Sharma, MD',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'NOTIF-102',
        userId: 'doc-1',
        role: 'doctor',
        type: 'appointment_confirmed',
        title: 'New Appointment Booked',
        message: 'Patient Kumar has booked a teleconsultation for Oct 9, 02:00 PM at Rampur Kiosk.',
        appointmentId: 'APT-101',
        senderId: 'pat-1',
        senderName: 'Kumar',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'NOTIF-103',
        userId: 'doc-1',
        role: 'doctor',
        type: 'missed_call',
        title: 'Missed Call Alert',
        message: 'Missed consultation call from Ramesh Kumar for appointment APT-101 (timed out after 35s).',
        appointmentId: 'APT-101',
        senderId: 'pat-1',
        senderName: 'Kumar',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'NOTIF-104',
        userId: 'pat-1',
        role: 'patient',
        type: 'consultation_completed',
        title: 'Digital Health Record Ready',
        message: 'Your prescription and clinical assessment report have been filed securely by Dr. Ananya Sharma.',
        appointmentId: 'APT-101',
        senderId: 'doc-1',
        senderName: 'Dr. Ananya Sharma, MD',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    writeJsonFile(NOTIFICATIONS_FILE, initialNotifs);
  }
};

initializeFileStore();

export const dbService = {
  // ==========================================
  // USERS & AUTHENTICATION
  // ==========================================
  async findUserByEmail(email, role = null) {
    const cleanEmail = (email || '').toLowerCase().trim();
    if (isDbConnected()) {
      const query = { email: cleanEmail };
      if (role) query.role = role;
      const user = await User.findOne(query).select('+password');
      return user ? user.toObject() : null;
    }

    const users = readJsonFile(USERS_FILE);
    const user = users.find(
      (u) =>
        (u.email || '').toLowerCase() === cleanEmail &&
        (!role || u.role === role)
    );
    return user ? { ...user } : null;
  },

  async findUserById(id) {
    if (isDbConnected()) {
      const user = await User.findOne({ id });
      return user ? user.toObject() : null;
    }
    const users = readJsonFile(USERS_FILE);
    const user = users.find((u) => u.id === id);
    if (!user) return null;
    const { password: _, ...clean } = user;
    return clean;
  },

  async createUser(userData) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password || 'password123', salt);
    const cleanUser = {
      ...userData,
      password: hashedPassword,
      id: userData.id || `usr-${Date.now().toString().slice(-5)}`,
    };

    if (isDbConnected()) {
      const created = await User.create(cleanUser);
      return created.toObject();
    }

    const users = readJsonFile(USERS_FILE);
    users.push(cleanUser);
    writeJsonFile(USERS_FILE, users);
    const { password: _, ...result } = cleanUser;
    return result;
  },

  async verifyPassword(user, candidatePassword) {
    if (!user || !user.password || !candidatePassword) return false;
    return await bcrypt.compare(candidatePassword, user.password);
  },

  // ==========================================
  // DOCTORS & PROFILES
  // ==========================================
  async getDoctors(filters = {}) {
    const { specialization, search } = filters;

    if (isDbConnected()) {
      let query = {};
      if (specialization && specialization !== 'All') {
        query.specialization = new RegExp(`^${specialization}$`, 'i');
      }
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { specialization: new RegExp(search, 'i') },
          { location: new RegExp(search, 'i') },
          { shortDescription: new RegExp(search, 'i') },
        ];
      }
      const docs = await DoctorProfile.find(query).sort({ rating: -1 });
      return docs.map((d) => d.toObject());
    }

    let docs = readJsonFile(DOCTORS_FILE, mockDoctors);
    if (specialization && specialization !== 'All') {
      docs = docs.filter(
        (d) => d.specialization.toLowerCase() === specialization.toLowerCase()
      );
    }
    if (search) {
      const q = search.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialization.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q) ||
          d.shortDescription.toLowerCase().includes(q)
      );
    }
    return docs;
  },

  async getDoctorById(id) {
    if (isDbConnected()) {
      const doc = await DoctorProfile.findOne({ id });
      return doc ? doc.toObject() : null;
    }
    const docs = readJsonFile(DOCTORS_FILE, mockDoctors);
    return docs.find((d) => d.id === id) || null;
  },

  // ==========================================
  // APPOINTMENTS
  // ==========================================
  async getAppointments(filters = {}) {
    const { patientId, doctorId, status } = filters;

    if (isDbConnected()) {
      let query = {};
      if (patientId) query.patientId = patientId;
      if (doctorId) query.doctorId = doctorId;
      if (status) query.status = new RegExp(`^${status}$`, 'i');
      const list = await Appointment.find(query).sort({ createdAt: -1 });
      return list.map((a) => a.toObject());
    }

    let list = readJsonFile(APPOINTMENTS_FILE, mockAppointments);
    if (patientId) list = list.filter((a) => a.patientId === patientId);
    if (doctorId) list = list.filter((a) => a.doctorId === doctorId);
    if (status) list = list.filter((a) => a.status.toLowerCase() === status.toLowerCase());
    return list;
  },

  async getAppointmentById(appointmentId) {
    if (!appointmentId) return null;
    if (isDbConnected()) {
      const apt = await Appointment.findOne({
        $or: [{ appointmentId }, { id: appointmentId }],
      });
      return apt ? apt.toObject() : null;
    }

    const list = readJsonFile(APPOINTMENTS_FILE, mockAppointments);
    return (
      list.find(
        (a) => a.appointmentId === appointmentId || a.id === appointmentId
      ) || null
    );
  },

  async createAppointment(appointmentData) {
    const appointmentId = appointmentData.appointmentId || `APT-${Date.now().toString().slice(-5)}`;
    const newApt = {
      ...appointmentData,
      appointmentId,
      status: appointmentData.status || 'Upcoming',
      createdAt: new Date().toISOString(),
    };

    if (isDbConnected()) {
      const created = await Appointment.create(newApt);
      return created.toObject();
    }

    const list = readJsonFile(APPOINTMENTS_FILE, mockAppointments);
    list.unshift(newApt);
    writeJsonFile(APPOINTMENTS_FILE, list);
    return newApt;
  },

  async updateAppointmentStatus(appointmentId, newStatus) {
    if (isDbConnected()) {
      const updated = await Appointment.findOneAndUpdate(
        { appointmentId },
        { status: newStatus },
        { new: true }
      );
      return updated ? updated.toObject() : null;
    }

    const list = readJsonFile(APPOINTMENTS_FILE, mockAppointments);
    const index = list.findIndex(
      (a) => a.appointmentId === appointmentId || a.id === appointmentId
    );
    if (index !== -1) {
      list[index].status = newStatus;
      writeJsonFile(APPOINTMENTS_FILE, list);
      return list[index];
    }
    return null;
  },

  // ==========================================
  // DIGITAL HEALTH RECORDS (DHR)
  // ==========================================
  async getHealthRecordsByPatient(patientId) {
    if (isDbConnected()) {
      const records = await HealthRecord.find({ patientId }).sort({ createdAt: -1 });
      return records.map((r) => r.toObject());
    }
    const all = readJsonFile(HEALTH_RECORDS_FILE, []);
    return all.filter((r) => r.patientId === patientId);
  },

  async getHealthRecordById(recordId) {
    if (isDbConnected()) {
      const record = await HealthRecord.findOne({ id: recordId });
      return record ? record.toObject() : null;
    }
    const all = readJsonFile(HEALTH_RECORDS_FILE, []);
    return all.find((r) => r.id === recordId) || null;
  },

  async createHealthRecord(recordData) {
    const id = recordData.id || `HR-${Date.now().toString().slice(-5)}`;
    const cleanRecord = {
      ...recordData,
      id,
      createdAt: new Date().toISOString(),
    };

    if (isDbConnected()) {
      const created = await HealthRecord.create(cleanRecord);
      return created.toObject();
    }

    const all = readJsonFile(HEALTH_RECORDS_FILE, []);
    all.unshift(cleanRecord);
    writeJsonFile(HEALTH_RECORDS_FILE, all);
    return cleanRecord;
  },

  async updateHealthRecord(recordId, updateData) {
    if (isDbConnected()) {
      const updated = await HealthRecord.findOneAndUpdate(
        { id: recordId },
        updateData,
        { new: true }
      );
      return updated ? updated.toObject() : null;
    }

    const all = readJsonFile(HEALTH_RECORDS_FILE, []);
    const index = all.findIndex((r) => r.id === recordId);
    if (index !== -1) {
      all[index] = { ...all[index], ...updateData, updatedAt: new Date().toISOString() };
      writeJsonFile(HEALTH_RECORDS_FILE, all);
      return all[index];
    }
    return null;
  },

  // ==========================================
  // RECORDINGS METADATA
  // ==========================================
  async getRecordings(filters = {}) {
    const { patientId, doctorId, appointmentId, userId } = filters;

    if (isDbConnected()) {
      let query = { status: { $ne: 'DELETED' } };
      if (appointmentId) query.appointmentId = appointmentId;
      if (patientId) query.patientId = patientId;
      if (doctorId) query.doctorId = doctorId;
      if (userId) {
        query.$or = [{ patientId: userId }, { doctorId: userId }];
      }
      const list = await RecordingMetadata.find(query).sort({ createdAt: -1 });
      return list.map((r) => r.toObject());
    }

    let list = readJsonFile(RECORDINGS_FILE, []);
    list = list.filter((r) => r.status !== 'DELETED');
    if (appointmentId) list = list.filter((r) => r.appointmentId === appointmentId);
    if (patientId) list = list.filter((r) => r.patientId === patientId);
    if (doctorId) list = list.filter((r) => r.doctorId === doctorId);
    if (userId) list = list.filter((r) => r.patientId === userId || r.doctorId === userId);
    return list;
  },

  async getRecordingById(recordingId) {
    if (isDbConnected()) {
      const rec = await RecordingMetadata.findOne({ recordingId });
      return rec ? rec.toObject() : null;
    }
    const list = readJsonFile(RECORDINGS_FILE, []);
    return list.find((r) => r.recordingId === recordingId) || null;
  },

  async createRecording(recData) {
    const recordingId = recData.recordingId || `REC-${Date.now().toString().slice(-5)}`;
    const cleanRec = {
      ...recData,
      recordingId,
      status: 'READY',
      createdAt: new Date().toISOString(),
    };

    if (isDbConnected()) {
      const created = await RecordingMetadata.create(cleanRec);
      return created.toObject();
    }

    const list = readJsonFile(RECORDINGS_FILE, []);
    list.unshift(cleanRec);
    writeJsonFile(RECORDINGS_FILE, list);
    return cleanRec;
  },

  async deleteRecording(recordingId) {
    if (isDbConnected()) {
      const deleted = await RecordingMetadata.findOneAndUpdate(
        { recordingId },
        { status: 'DELETED' },
        { new: true }
      );
      return deleted ? deleted.toObject() : null;
    }

    const list = readJsonFile(RECORDINGS_FILE, []);
    const index = list.findIndex((r) => r.recordingId === recordingId);
    if (index !== -1) {
      const removed = list.splice(index, 1)[0];
      writeJsonFile(RECORDINGS_FILE, list);
      return removed;
    }
    return null;
  },

  // ==========================================
  // NOTIFICATIONS & MISSED CALLS
  // ==========================================
  async getNotifications(userId) {
    if (isDbConnected()) {
      const notifs = await Notification.find({ userId }).sort({ createdAt: -1 });
      return notifs.map((n) => n.toObject());
    }
    const list = readJsonFile(NOTIFICATIONS_FILE, []);
    return list
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async createNotification(data) {
    const id = data.id || `NOTIF-${Date.now().toString().slice(-6)}`;
    const cleanNotif = {
      ...data,
      id,
      isRead: false,
      createdAt: data.createdAt || new Date().toISOString(),
    };

    if (isDbConnected()) {
      const created = await Notification.create(cleanNotif);
      return created.toObject();
    }

    const list = readJsonFile(NOTIFICATIONS_FILE, []);
    list.unshift(cleanNotif);
    writeJsonFile(NOTIFICATIONS_FILE, list);
    return cleanNotif;
  },

  async markNotificationAsRead(id, userId) {
    if (isDbConnected()) {
      const updated = await Notification.findOneAndUpdate(
        { id, userId },
        { isRead: true },
        { new: true }
      );
      return updated ? updated.toObject() : null;
    }

    const list = readJsonFile(NOTIFICATIONS_FILE, []);
    const notif = list.find((n) => n.id === id && n.userId === userId);
    if (notif) {
      notif.isRead = true;
      writeJsonFile(NOTIFICATIONS_FILE, list);
      return notif;
    }
    return null;
  },

  async markAllNotificationsAsRead(userId) {
    if (isDbConnected()) {
      await Notification.updateMany({ userId }, { isRead: true });
      return { success: true };
    }

    const list = readJsonFile(NOTIFICATIONS_FILE, []);
    let modified = false;
    list.forEach((n) => {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        modified = true;
      }
    });
    if (modified) {
      writeJsonFile(NOTIFICATIONS_FILE, list);
    }
    return { success: true };
  },

  async getMissedCalls(userId) {
    if (isDbConnected()) {
      const missed = await Notification.find({
        userId,
        type: 'missed_call',
      }).sort({ createdAt: -1 });
      return missed.map((m) => m.toObject());
    }

    const list = readJsonFile(NOTIFICATIONS_FILE, []);
    return list
      .filter((n) => n.userId === userId && n.type === 'missed_call')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
};

export default dbService;
