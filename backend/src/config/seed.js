import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User, DoctorProfile, Appointment, HealthRecord, RecordingMetadata } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/recordings');

/**
 * Seed MongoDB with realistic, safe sample data if empty.
 * All passwords hashed with bcrypt (salt = 10).
 */
export const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log(`[Database Seeder] Collections already populated (${userCount} users present). Skipping initial seed.`);
      return true;
    }

    console.log('[Database Seeder] Database empty. Seeding initial prototype data with bcrypt password hashing...');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 1. Seed Patients
    const patients = [
      {
        id: 'pat-1',
        email: 'ramesh.patient@nexora.health',
        password: hashedPassword,
        role: 'patient',
        name: 'Kumar',
        fullName: 'Kumar (Ramesh Kumar)',
        age: 42,
        gender: 'Male',
        village: 'Rampur Village, Raebareli District',
        healthId: 'NX-9824-7123',
        phone: '+91 98765 43210',
        bloodGroup: 'O+',
        primaryKiosk: 'Rampur Panchayat Health Outpost #3',
        emergencyContact: 'Suresh Kumar (Brother) • +91 98765 43211',
        allergies: ['None known'],
        existingConditions: ['Diabetes'],
        currentMedications: ['Metformin'],
        previousDiagnoses: ['Viral infection (Oct 2026)', 'Stage 1 Hypertension (Sep 2026)'],
        vitals: {
          bloodPressure: '124/82 mmHg',
          heartRate: '72 bpm',
          bloodSugar: '114 mg/dL',
          spo2: '98%',
          temperature: '98.4 °F',
          lastUpdated: 'Today, 09:30 AM via Village Health Worker',
        },
      },
      {
        id: 'pat-2',
        email: 'sunita.patient@nexora.health',
        password: hashedPassword,
        role: 'patient',
        name: 'Sunita Devi',
        fullName: 'Sunita Devi',
        age: 36,
        gender: 'Female',
        village: 'Balrampur Block, Sector 4',
        healthId: 'NX-4412-8891',
        phone: '+91 97123 45678',
        bloodGroup: 'B+',
        primaryKiosk: 'Balrampur Community Tele-Center',
        emergencyContact: 'Rakesh Devi (Spouse) • +91 97123 45679',
        allergies: ['None reported'],
        existingConditions: ['Chronic Migraine', 'Seasonal Dehydration'],
        currentMedications: ['Naproxen 500mg SOS'],
        previousDiagnoses: ['Migraine with aura (Oct 2026)'],
        vitals: {
          bloodPressure: '118/76 mmHg',
          heartRate: '68 bpm',
          bloodSugar: '98 mg/dL',
          spo2: '99%',
          temperature: '98.6 °F',
          lastUpdated: 'Yesterday, 04:15 PM',
        },
      },
      {
        id: 'pat-3',
        email: 'manoj.patient@nexora.health',
        password: hashedPassword,
        role: 'patient',
        name: 'Manoj Singh',
        fullName: 'Manoj Singh',
        age: 52,
        gender: 'Male',
        village: 'Kherli Village, Sector 9',
        healthId: 'NX-3310-9102',
        phone: '+91 94567 11223',
        bloodGroup: 'A+',
        primaryKiosk: 'Kherli Primary Tele-Kiosk',
        emergencyContact: 'Geeta Singh (Daughter) • +91 94567 11224',
        allergies: ['Sulfa drugs'],
        existingConditions: ['Type 2 Diabetes Mellitus', 'Peripheral Neuropathy'],
        currentMedications: ['Metformin 500mg (BD)', 'Pregabalin 75mg (Bedtime)'],
        previousDiagnoses: ['Type 2 Diabetes (Mar 2024)', 'Mild Peripheral Neuropathy'],
        vitals: {
          bloodPressure: '138/88 mmHg',
          heartRate: '78 bpm',
          bloodSugar: '142 mg/dL',
          spo2: '97%',
          temperature: '99.1 °F',
          lastUpdated: 'Today, 10:00 AM',
        },
      },
    ];

    // 2. Seed Doctors
    const doctors = [
      {
        id: 'doc-1',
        email: 'ananya.doctor@nexora.health',
        password: hashedPassword,
        role: 'doctor',
        name: 'Dr. Ananya Sharma, MD',
        specialization: 'Cardiologist',
        qualification: 'MBBS, MD (General Medicine), DM (Cardiology)',
        experience: '12 years',
        experienceYears: 12,
        availability: 'Mon - Fri (10:00 AM - 07:00 PM)',
        location: 'AIIMS Tele-Network Hub, New Delhi',
        hospital: 'AIIMS Tele-Network Hub',
        shortDescription: 'Specialized in hypertension management, preventative cardiac care, and low-bandwidth rural ECG consultations.',
        registrationNumber: 'MCI-84920 / UP-2015',
        rating: 4.95,
        totalConsultations: 1420,
        languages: ['Hindi', 'English', 'Bhojpuri'],
        status: 'Available & On-Call',
        availableDates: ['Today, Oct 8', 'Tomorrow, Oct 9', 'Fri, Oct 10', 'Sat, Oct 11'],
        timeSlots: ['10:00 AM', '11:30 AM', '02:00 PM', '04:30 PM', '05:30 PM'],
        activeKiosksConnected: ['Rampur Block #3', 'Balrampur Sector #4', 'Kherli Outpost #9'],
      },
      {
        id: 'doc-2',
        email: 'rajesh.doctor@nexora.health',
        password: hashedPassword,
        role: 'doctor',
        name: 'Dr. Rajesh Patel, MD',
        specialization: 'Pediatrician',
        qualification: 'MBBS, MD (Pediatrics), DCH',
        experience: '9 years',
        experienceYears: 9,
        availability: 'Mon - Sat (08:30 AM - 04:30 PM)',
        location: 'Regional Mother & Child Tele-Center, Ahmedabad',
        hospital: 'Regional Mother & Child Tele-Center',
        shortDescription: 'Dedicated to infant nutrition, childhood seasonal illnesses, and pediatric tele-triage for remote villages.',
        registrationNumber: 'MCI-62118 / GUJ-2017',
        rating: 4.88,
        totalConsultations: 980,
        languages: ['Gujarati', 'Hindi', 'English'],
        status: 'Available & On-Call',
        availableDates: ['Today, Oct 8', 'Tomorrow, Oct 9', 'Fri, Oct 10'],
        timeSlots: ['09:00 AM', '11:00 AM', '01:30 PM', '03:30 PM'],
        activeKiosksConnected: ['Sector 8 Rural Kiosk'],
      },
      {
        id: 'doc-3',
        email: 'priya.doctor@nexora.health',
        password: hashedPassword,
        role: 'doctor',
        name: 'Dr. Priya Sharma, MD',
        specialization: 'General Physician',
        qualification: 'MBBS, MD (Internal Medicine)',
        experience: '14 years',
        experienceYears: 14,
        availability: 'Mon - Sat (09:00 AM - 05:00 PM)',
        location: 'District Civil Hospital & Tele-Hub, Lucknow',
        hospital: 'District Civil Hospital & Tele-Hub',
        shortDescription: 'Expert in acute infectious diseases, seasonal fevers, respiratory infections, and rural primary care triage.',
        registrationNumber: 'MCI-51024 / UP-2012',
        rating: 4.91,
        totalConsultations: 2150,
        languages: ['Hindi', 'English', 'Awadhi'],
        status: 'Available & On-Call',
        availableDates: ['Today, Oct 8', 'Tomorrow, Oct 9', 'Sat, Oct 11'],
        timeSlots: ['10:00 AM', '12:00 PM', '02:30 PM', '04:00 PM'],
        activeKiosksConnected: ['Rampur Panchayat Outpost #3', 'Gauriganj Outpost #2'],
      },
      {
        id: 'doc-4',
        email: 'vikram.doctor@nexora.health',
        password: hashedPassword,
        role: 'doctor',
        name: 'Dr. Vikram Malhotra, MD',
        specialization: 'Dermatologist',
        qualification: 'MBBS, MD (Dermatology)',
        experience: '8 years',
        experienceYears: 8,
        availability: 'Tue - Sun (11:00 AM - 06:00 PM)',
        location: 'National Tele-Dermatology Mission, Chandigarh',
        hospital: 'National Tele-Dermatology Mission',
        shortDescription: 'Experienced in diagnosing agricultural contact dermatitis, fungal infections, and allergic rashes.',
        registrationNumber: 'MCI-74892 / PB-2018',
        rating: 4.85,
        totalConsultations: 820,
        languages: ['Punjabi', 'Hindi', 'English'],
        status: 'Available & On-Call',
        availableDates: ['Tomorrow, Oct 9', 'Fri, Oct 10', 'Sun, Oct 12'],
        timeSlots: ['11:30 AM', '01:00 PM', '03:00 PM', '05:00 PM'],
        activeKiosksConnected: ['Kherli Outpost #9'],
      },
      {
        id: 'doc-5',
        email: 'sunita.doctor@nexora.health',
        password: hashedPassword,
        role: 'doctor',
        name: 'Dr. Sunita Rao, MS',
        specialization: 'Gynecologist',
        qualification: 'MBBS, MS (Obstetrics & Gynecology)',
        experience: '11 years',
        experienceYears: 11,
        availability: 'Mon - Fri (09:30 AM - 05:30 PM)',
        location: 'Apex Rural Maternal Health Foundation, Hyderabad',
        hospital: 'Apex Rural Maternal Health Foundation',
        shortDescription: 'Focused on high-risk rural pregnancy screening, anemia management, and maternal nutrition.',
        registrationNumber: 'MCI-69411 / TS-2015',
        rating: 4.96,
        totalConsultations: 1640,
        languages: ['Telugu', 'Hindi', 'English'],
        status: 'Available & On-Call',
        availableDates: ['Today, Oct 8', 'Tomorrow, Oct 9', 'Fri, Oct 10'],
        timeSlots: ['10:30 AM', '12:30 PM', '03:00 PM', '04:30 PM'],
        activeKiosksConnected: ['Balrampur Sector #4'],
      },
    ];

    // Insert Users
    const userDocs = [...patients, ...doctors.map(d => ({
      id: d.id,
      email: d.email,
      password: d.password,
      role: 'doctor',
      name: d.name,
      phone: '+91 99887 76655',
    }))];
    await User.insertMany(userDocs);

    // Insert Doctor Profiles
    await DoctorProfile.insertMany(doctors.map(d => ({
      ...d,
      userId: d.id,
    })));

    // 3. Seed Appointments
    const appointments = [
      {
        appointmentId: 'APT-101',
        patientId: 'pat-1',
        doctorId: 'doc-1',
        doctorName: 'Dr. Ananya Sharma, MD',
        patientName: 'Kumar',
        date: 'Today, Oct 8',
        time: '04:30 PM',
        status: 'Upcoming',
        specialization: 'Cardiologist',
        reason: 'Post-harvest chest discomfort & routine BP check',
        location: 'Rampur Health Kiosk Room A',
        patientAge: 42,
        patientGender: 'Male',
        village: 'Rampur Village',
        lastBp: '124/82 mmHg',
      },
      {
        appointmentId: 'APT-102',
        patientId: 'pat-2',
        doctorId: 'doc-1',
        doctorName: 'Dr. Ananya Sharma, MD',
        patientName: 'Sunita Devi',
        date: 'Today, Oct 8',
        time: '05:15 PM',
        status: 'Upcoming',
        specialization: 'Cardiologist',
        reason: 'Recurrent seasonal migraines & noon heat dizziness',
        location: 'Balrampur Community Tele-Center',
        patientAge: 36,
        patientGender: 'Female',
        village: 'Balrampur Block',
        lastBp: '118/76 mmHg',
      },
      {
        appointmentId: 'APT-103',
        patientId: 'pat-3',
        doctorId: 'doc-1',
        doctorName: 'Dr. Ananya Sharma, MD',
        patientName: 'Manoj Singh',
        date: 'Tomorrow, Oct 9',
        time: '11:00 AM',
        status: 'Upcoming',
        specialization: 'Cardiologist',
        reason: 'Type 2 Diabetes monitoring & feet tingling',
        location: 'Kherli Primary Tele-Kiosk',
        patientAge: 52,
        patientGender: 'Male',
        village: 'Kherli Village',
        lastBp: '138/88 mmHg',
      },
      {
        appointmentId: 'APT-104',
        patientId: 'pat-1',
        doctorId: 'doc-2',
        doctorName: 'Dr. Rajesh Patel, MD',
        patientName: 'Kumar',
        date: 'Oct 14, 2026',
        time: '11:00 AM',
        status: 'Upcoming',
        specialization: 'Pediatrician',
        reason: 'Family preventive wellness evaluation',
        location: 'Mobile Tele-App',
        patientAge: 42,
        patientGender: 'Male',
        village: 'Rampur Village',
        lastBp: '124/82 mmHg',
      },
      {
        appointmentId: 'APT-100',
        patientId: 'pat-1',
        doctorId: 'doc-1',
        doctorName: 'Dr. Ananya Sharma, MD',
        patientName: 'Kumar',
        date: 'Sep 24, 2026',
        time: '03:00 PM',
        status: 'Completed',
        specialization: 'Cardiologist',
        reason: 'Initial hypertension diagnosis and lifestyle guidance',
        location: 'Rampur Health Kiosk Room A',
        patientAge: 42,
        patientGender: 'Male',
        village: 'Rampur Village',
        lastBp: '142/90 mmHg',
      },
    ];
    await Appointment.insertMany(appointments);

    // 4. Seed Health Records
    const healthRecords = [
      {
        id: 'HR-101',
        patientId: 'pat-1',
        patientName: 'Kumar',
        patientAge: 42,
        patientGender: 'Male',
        doctorId: 'doc-3',
        doctorName: 'Dr. Priya Sharma',
        doctorSpecialization: 'General Physician',
        appointmentId: 'APT-099',
        consultationDate: '08 Oct 2026',
        symptoms: 'Fever, body pain',
        diagnosis: 'Viral infection',
        prescription: 'Paracetamol 500mg',
        doctorNotes: 'Take adequate rest and fluids.',
        followUpInstructions: '3 days',
        recordingId: 'REC-101-SAMPLE',
        allergies: ['None known'],
        existingConditions: ['Diabetes'],
        currentMedications: ['Metformin'],
      },
      {
        id: 'HR-102',
        patientId: 'pat-1',
        patientName: 'Kumar',
        patientAge: 42,
        patientGender: 'Male',
        doctorId: 'doc-1',
        doctorName: 'Dr. Ananya Sharma, MD',
        doctorSpecialization: 'Cardiologist',
        appointmentId: 'APT-100',
        consultationDate: '24 Sep 2026',
        symptoms: 'Mild chest discomfort, afternoon fatigue, routine blood pressure check',
        diagnosis: 'Stage 1 Essential Hypertension with exertional strain',
        prescription: 'Tab. Amlodipine 5mg OD (morning) for 30 days\nTab. Multivitamin 1 tablet after meals for 15 days',
        doctorNotes: 'Advised to reduce dietary sodium. Drink 3-4 liters of clean electrolyte water daily. Avoid direct noon heat.',
        followUpInstructions: '14 days BP review at rural health kiosk',
        recordingId: null,
        allergies: ['None known'],
        existingConditions: ['Diabetes', 'Hypertension'],
        currentMedications: ['Metformin', 'Amlodipine 5mg'],
      },
      {
        id: 'HR-103',
        patientId: 'pat-2',
        patientName: 'Sunita Devi',
        patientAge: 36,
        patientGender: 'Female',
        doctorId: 'doc-1',
        doctorName: 'Dr. Ananya Sharma, MD',
        doctorSpecialization: 'Cardiologist',
        appointmentId: 'APT-102',
        consultationDate: '08 Oct 2026',
        symptoms: 'Throbbing unilateral headaches, photophobia, noon heat dizziness, nausea',
        diagnosis: 'Migraine with aura and seasonal heat exhaustion',
        prescription: 'Tab. Naproxen 500mg - SOS with food\nTab. Domperidone 10mg - 1 tablet before meals\nORS Rehydration salts - 1 packet daily in 1L water',
        doctorNotes: 'Maintain regular hydration diary. Cover head with cotton cloth while working in open sunlight. Avoid skipping morning meals.',
        followUpInstructions: '10 days if headaches exceed 2 episodes per week',
        recordingId: null,
        allergies: ['None reported'],
        existingConditions: ['Chronic Migraine'],
        currentMedications: ['Naproxen 500mg SOS'],
      },
    ];
    await HealthRecord.insertMany(healthRecords);

    // 5. Seed Recording Metadata
    const sampleFilePath = path.join(UPLOADS_DIR, 'appointment_APT-101_sample.webm');
    const recordings = [
      {
        recordingId: 'REC-101-SAMPLE',
        appointmentId: 'APT-101',
        patientId: 'pat-1',
        patientName: 'Kumar',
        doctorId: 'doc-1',
        doctorName: 'Dr. Ananya Sharma, MD',
        filename: 'appointment_APT-101_sample.webm',
        filePath: sampleFilePath,
        fileSize: 524288,
        mimeType: 'video/webm',
        duration: '02:45',
        status: 'READY',
        uploadedByRole: 'doctor',
        uploaderId: 'doc-1',
        notes: 'Initial clinical review and baseline vitals assessment',
      },
    ];
    await RecordingMetadata.insertMany(recordings);

    console.log('✅ [Database Seeder] MongoDB successfully seeded with 3 patients, 5 doctors, 5 appointments, 3 health records, and 1 recording metadata record.');
    return true;
  } catch (err) {
    console.error('❌ [Database Seeder Error]:', err.message);
    return false;
  }
};

export default seedDatabase;
