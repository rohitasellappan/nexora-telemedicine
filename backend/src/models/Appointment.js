import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      index: true,
    },
    doctorId: {
      type: String,
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'Appointment date is required'],
    },
    time: {
      type: String,
      required: [true, 'Appointment time is required'],
    },
    status: {
      type: String,
      enum: ['Upcoming', 'Completed', 'Cancelled'],
      default: 'Upcoming',
      index: true,
    },
    specialization: {
      type: String,
      default: 'General Medicine',
    },
    reason: {
      type: String,
      default: 'General teleconsultation',
    },
    location: {
      type: String,
      default: 'Rampur Health Kiosk Room A',
    },
    patientAge: {
      type: Number,
      default: 42,
    },
    patientGender: {
      type: String,
      default: 'Male',
    },
    village: {
      type: String,
      default: 'Rampur Village',
    },
    lastBp: {
      type: String,
      default: '120/80 mmHg',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying a patient's or doctor's schedule quickly
appointmentSchema.index({ patientId: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
