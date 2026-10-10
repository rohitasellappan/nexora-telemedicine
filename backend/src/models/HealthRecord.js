import mongoose from 'mongoose';

const healthRecordSchema = new mongoose.Schema(
  {
    id: {
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
    appointmentId: {
      type: String,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    patientAge: {
      type: Number,
      default: 42,
    },
    patientGender: {
      type: String,
      default: 'Male',
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    doctorSpecialization: {
      type: String,
      default: 'General Physician',
    },
    consultationDate: {
      type: String,
      required: true,
    },
    symptoms: {
      type: String,
      required: [true, 'Symptoms description is required'],
    },
    diagnosis: {
      type: String,
      required: [true, 'Clinical diagnosis is required'],
    },
    prescription: {
      type: String,
      required: [true, 'Prescription details are required'],
    },
    doctorNotes: {
      type: String,
      default: 'Take adequate rest and fluids.',
    },
    followUpInstructions: {
      type: String,
      default: 'Review in 3 days if symptoms persist.',
    },
    recordingId: {
      type: String,
      default: null,
      index: true,
    },
    allergies: {
      type: [String],
      default: [],
    },
    existingConditions: {
      type: [String],
      default: [],
    },
    currentMedications: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for rapid authorized lookups
healthRecordSchema.index({ patientId: 1, createdAt: -1 });
healthRecordSchema.index({ doctorId: 1, createdAt: -1 });

export const HealthRecord = mongoose.model('HealthRecord', healthRecordSchema);
export default HealthRecord;
