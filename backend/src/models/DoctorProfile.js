import mongoose from 'mongoose';

const doctorProfileSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      ref: 'User',
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Doctor name is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
      index: true,
    },
    qualification: {
      type: String,
      default: 'MBBS, MD',
    },
    experience: {
      type: String,
      default: '10 years',
    },
    experienceYears: {
      type: Number,
      default: 10,
    },
    availability: {
      type: String,
      default: 'Mon - Fri (09:00 AM - 05:00 PM)',
    },
    location: {
      type: String,
      default: 'Regional Tele-Hub',
    },
    hospital: {
      type: String,
      default: 'Apex Tele-Health Network',
    },
    shortDescription: {
      type: String,
      default: 'Dedicated to rural primary tele-consultations.',
    },
    registrationNumber: {
      type: String,
      required: true,
      default: 'MCI-84920',
    },
    rating: {
      type: Number,
      default: 4.9,
      min: 1,
      max: 5,
    },
    totalConsultations: {
      type: Number,
      default: 0,
    },
    languages: {
      type: [String],
      default: ['Hindi', 'English'],
    },
    status: {
      type: String,
      default: 'Available & On-Call',
    },
    availableDates: {
      type: [String],
      default: ['Today, Oct 8', 'Tomorrow, Oct 9'],
    },
    timeSlots: {
      type: [String],
      default: ['10:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'],
    },
    activeKiosksConnected: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Search indexes for text searching
doctorProfileSchema.index({
  name: 'text',
  specialization: 'text',
  location: 'text',
  shortDescription: 'text',
});

export const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);
export default DoctorProfile;
