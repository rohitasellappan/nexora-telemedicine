import mongoose from 'mongoose';

const recordingMetadataSchema = new mongoose.Schema(
  {
    recordingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    appointmentId: {
      type: String,
      required: [true, 'Appointment ID is required'],
      index: true,
    },
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      index: true,
    },
    patientName: {
      type: String,
      default: 'Kumar',
    },
    doctorId: {
      type: String,
      required: [true, 'Doctor ID is required'],
      index: true,
    },
    doctorName: {
      type: String,
      default: 'Dr. Priya Sharma, MD',
    },
    filename: {
      type: String,
      required: [true, 'Filename is required'],
    },
    filePath: {
      type: String,
      required: [true, 'Private file path is required'],
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: 'video/webm',
    },
    duration: {
      type: String,
      default: '02:45',
    },
    status: {
      type: String,
      enum: ['READY', 'PROCESSING', 'DELETED', 'ARCHIVED'],
      default: 'READY',
      index: true,
    },
    uploadedByRole: {
      type: String,
      enum: ['doctor', 'patient'],
      default: 'doctor',
    },
    uploaderId: {
      type: String,
      default: 'doc-1',
    },
    notes: {
      type: String,
      default: 'Encrypted consultation recording',
    },
  },
  {
    timestamps: true,
  }
);

recordingMetadataSchema.index({ patientId: 1, createdAt: -1 });
recordingMetadataSchema.index({ doctorId: 1, createdAt: -1 });

export const RecordingMetadata = mongoose.model('RecordingMetadata', recordingMetadataSchema);
export default RecordingMetadata;
