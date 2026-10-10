import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const vitalsSchema = new mongoose.Schema(
  {
    bloodPressure: { type: String, default: '120/80 mmHg' },
    heartRate: { type: String, default: '72 bpm' },
    bloodSugar: { type: String, default: '100 mg/dL' },
    spo2: { type: String, default: '98%' },
    temperature: { type: String, default: '98.6 °F' },
    lastUpdated: { type: String, default: 'Recent' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      select: false, // Do not return password by default in queries
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      default: 'patient',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    fullName: {
      type: String,
      trim: true,
    },
    age: {
      type: Number,
      min: 0,
      max: 130,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male',
    },
    phone: {
      type: String,
      trim: true,
    },
    healthId: {
      type: String,
      trim: true,
      sparse: true,
    },
    village: {
      type: String,
      trim: true,
    },
    bloodGroup: {
      type: String,
      trim: true,
    },
    primaryKiosk: {
      type: String,
      trim: true,
    },
    emergencyContact: {
      type: String,
      trim: true,
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
    previousDiagnoses: {
      type: [String],
      default: [],
    },
    vitals: {
      type: vitalsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    return false;
  }
};

// Remove password when converting to JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = mongoose.model('User', userSchema);
export default User;
