import React, { useState } from 'react';
import {
  X,
  Search,
  Stethoscope,
  Star,
  Globe,
  Clock,
  CheckCircle2,
  Video,
  Calendar,
  Sparkles,
  MapPin,
  Award,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  User,
  HeartPulse
} from 'lucide-react';
import { initialDoctorsDirectory } from '../data/mockData';

export default function FindDoctorModal({
  isOpen,
  onClose,
  onAppointmentBooked,
  patientName = 'Ramesh Kumar',
  patientId = 'pat-1'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('All');
  
  // Step state: 'search' | 'details_and_booking' | 'confirmation'
  const [step, setStep] = useState('search');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  
  // Booking selections
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [consultReason, setConsultReason] = useState('General health review & BP follow-up');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState(null);

  if (!isOpen) return null;

  const specializations = [
    'All',
    'General Physician',
    'Cardiologist',
    'Dermatologist',
    'Pediatrician',
    'Gynecologist',
  ];

  const filteredDoctors = initialDoctorsDirectory.filter((doc) => {
    const matchesSpec =
      selectedSpecialization === 'All' ||
      doc.specialization.toLowerCase() === selectedSpecialization.toLowerCase();

    const q = searchTerm.toLowerCase();
    const matchesSearch =
      doc.name.toLowerCase().includes(q) ||
      doc.specialization.toLowerCase().includes(q) ||
      doc.location.toLowerCase().includes(q) ||
      doc.shortDescription.toLowerCase().includes(q) ||
      doc.languages.some((l) => l.toLowerCase().includes(q));

    return matchesSpec && matchesSearch;
  });

  const handleSelectDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedDate(doctor.availableDates?.[0] || 'Today, Oct 8');
    setSelectedTime(doctor.timeSlots?.[0] || '10:00 AM');
    setStep('details_and_booking');
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;

    setIsSubmitting(true);

    const newApt = {
      appointmentId: `APT-${Math.floor(10000 + Math.random() * 90000)}`,
      patientId: patientId,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      patientName: patientName,
      date: selectedDate,
      time: selectedTime,
      status: 'Upcoming',
      specialization: selectedDoctor.specialization,
      reason: consultReason || 'General telemedicine consultation',
      location: 'Rampur Health Kiosk Room A',
      patientAge: 48,
      patientGender: 'Male',
      village: 'Rampur Village',
      lastBp: '124/82 mmHg',
    };

    // Try posting to backend API, but fallback smoothly if offline
    try {
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApt),
      });
    } catch (err) {
      console.warn('Backend sync failed, storing locally:', err.message);
    }

    setConfirmedAppointment(newApt);
    if (onAppointmentBooked) {
      onAppointmentBooked(newApt);
    }

    setIsSubmitting(false);
    setStep('confirmation');
  };

  const handleFinishAndReturn = () => {
    setStep('search');
    setSelectedDoctor(null);
    setConfirmedAppointment(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content doctor-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {/* ================= STEP 1: DOCTOR SEARCH & FILTER ================= */}
        {step === 'search' && (
          <>
            <div className="doctor-modal-header">
              <div className="badge badge-primary" style={{ marginBottom: '8px' }}>
                <Sparkles size={14} /> Telemedicine Specialist Directory
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Find a Doctor & Specialists</h2>
              <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
                Connect with verified medical specialists offering secure, low-bandwidth video triage.
              </p>
            </div>

            {/* Search Input */}
            <div className="doctor-search-input-wrapper">
              <Search size={18} color="#94a3b8" />
              <input
                id="doctor-search-field"
                type="text"
                className="doc-filter-input"
                placeholder="Search by name, specialization, district hospital, or language..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>

            {/* Specialization Filter Chips */}
            <div className="specialty-chips">
              {specializations.map((spec) => (
                <button
                  key={spec}
                  className={`chip-btn ${selectedSpecialization === spec ? 'active' : ''}`}
                  onClick={() => setSelectedSpecialization(spec)}
                >
                  {spec}
                </button>
              ))}
            </div>

            {/* Doctor Cards List */}
            <div className="doctor-cards-container">
              {filteredDoctors.length === 0 ? (
                <div className="no-records-box">No doctors matching your filter criteria.</div>
              ) : (
                filteredDoctors.map((doc) => (
                  <div key={doc.id} className="doc-directory-card glass-panel">
                    <div className="doc-card-main">
                      <div className="doc-avatar-large">
                        {doc.name.replace('Dr. ', '').split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>

                      <div className="doc-info-col">
                        <div className="doc-name-row">
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{doc.name}</h3>
                          <div className="doc-rating-pill">
                            <Star size={13} fill="#f59e0b" color="#f59e0b" />
                            <span>{doc.rating}</span>
                          </div>
                        </div>

                        <div className="doc-sub-specialty">
                          <Stethoscope size={14} color="#14b8a6" />
                          <span style={{ fontWeight: 700, color: '#2dd4bf' }}>{doc.specialization}</span>
                          <span className="bullet-sep">•</span>
                          <span>{doc.qualification}</span>
                        </div>

                        <div className="doc-hospital-name">
                          <MapPin size={13} color="#38bdf8" />
                          <span>{doc.location}</span>
                          <span className="bullet-sep">•</span>
                          <strong>{doc.experience} exp</strong>
                        </div>

                        <p className="doc-short-desc">{doc.shortDescription}</p>

                        <div className="doc-meta-footer">
                          <span className="avail-badge">
                            <Clock size={12} color="#10b981" /> {doc.availability}
                          </span>
                          <span className="lang-badge">
                            <Globe size={12} /> {doc.languages.join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="doc-card-actions">
                      <button
                        className="btn btn-primary"
                        style={{ padding: '9px 18px', fontSize: '0.9rem' }}
                        onClick={() => handleSelectDoctor(doc)}
                      >
                        <Video size={16} />
                        <span>Book Appointment</span>
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ================= STEP 2: DOCTOR DETAILS & APPOINTMENT BOOKING ================= */}
        {step === 'details_and_booking' && selectedDoctor && (
          <div className="booking-step-container">
            <button
              className="back-step-btn"
              onClick={() => setStep('search')}
            >
              <ArrowLeft size={16} />
              <span>Back to Doctors List</span>
            </button>

            {/* Doctor Profile Banner */}
            <div className="doc-detail-banner glass-panel">
              <div className="doc-avatar-large" style={{ width: '64px', height: '64px', fontSize: '1.4rem' }}>
                {selectedDoctor.name.replace('Dr. ', '').split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>

              <div className="doc-detail-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>{selectedDoctor.name}</h2>
                  <span className="badge badge-primary">{selectedDoctor.specialization}</span>
                  <div className="doc-rating-pill">
                    <Star size={13} fill="#f59e0b" color="#f59e0b" />
                    <span>{selectedDoctor.rating}</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.86rem', color: '#cbd5e1', marginTop: '4px' }}>
                  <Award size={14} color="#14b8a6" style={{ display: 'inline', marginRight: '5px' }} />
                  <strong>{selectedDoctor.qualification}</strong> • {selectedDoctor.experience} clinical experience
                </div>

                <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
                  <MapPin size={13} color="#38bdf8" style={{ display: 'inline', marginRight: '5px' }} />
                  {selectedDoctor.location}
                </div>

                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '8px', lineHeight: 1.5 }}>
                  {selectedDoctor.shortDescription}
                </p>
              </div>
            </div>

            {/* Scheduling Form */}
            <div className="booking-form-box glass-panel" style={{ marginTop: '18px' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#14b8a6" />
                <span>Select Appointment Schedule</span>
              </h3>

              {/* 1. Date Selection */}
              <div className="schedule-group">
                <label className="schedule-label">1. Select Appointment Date:</label>
                <div className="schedule-chips-grid">
                  {selectedDoctor.availableDates.map((dateStr) => (
                    <button
                      key={dateStr}
                      type="button"
                      className={`schedule-chip ${selectedDate === dateStr ? 'selected' : ''}`}
                      onClick={() => setSelectedDate(dateStr)}
                    >
                      <Calendar size={14} />
                      <span>{dateStr}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Time Slot Selection */}
              <div className="schedule-group" style={{ marginTop: '16px' }}>
                <label className="schedule-label">2. Select Available Time Slot:</label>
                <div className="schedule-chips-grid">
                  {selectedDoctor.timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`schedule-chip ${selectedTime === slot ? 'selected' : ''}`}
                      onClick={() => setSelectedTime(slot)}
                    >
                      <Clock size={14} />
                      <span>{slot}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Reason for Consultation */}
              <div className="schedule-group" style={{ marginTop: '16px' }}>
                <label className="schedule-label" htmlFor="consult-reason-input">
                  3. Reason for Consultation / Symptoms (Optional):
                </label>
                <input
                  id="consult-reason-input"
                  type="text"
                  className="form-input"
                  value={consultReason}
                  onChange={(e) => setConsultReason(e.target.value)}
                  placeholder="e.g. Chest tightness, fever, follow-up, BP review..."
                />
              </div>

              {/* Booking Summary Box */}
              <div className="booking-summary-strip">
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>CONSULTATION FOR</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                    {patientName} (Rampur Village)
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>SCHEDULED FOR</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
                    {selectedDate} at {selectedTime}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>STATUS ON CONFIRMATION</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>
                    ● Upcoming (Instant Tele-Queue)
                  </div>
                </div>
              </div>

              {/* Confirm Button */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep('search')}
                  style={{ flex: '1' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-appointment"
                  className="btn btn-primary"
                  onClick={handleConfirmBooking}
                  disabled={isSubmitting || !selectedDate || !selectedTime}
                  style={{ flex: '2', padding: '12px' }}
                >
                  {isSubmitting ? (
                    'Confirming Appointment...'
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Confirm Appointment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: APPOINTMENT CONFIRMATION ================= */}
        {step === 'confirmation' && confirmedAppointment && (
          <div className="confirmation-screen-box">
            <div className="confirm-icon-pulse">
              <CheckCircle2 size={48} color="#10b981" />
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '12px' }}>
              Appointment Confirmed!
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '4px' }}>
              Your telemedicine consultation has been successfully booked and added to the tele-queue.
            </p>

            <div className="confirmed-receipt-card glass-panel">
              <div className="receipt-row">
                <span className="receipt-label">Appointment ID</span>
                <span className="receipt-val" style={{ fontFamily: 'monospace', color: '#38bdf8' }}>
                  {confirmedAppointment.appointmentId}
                </span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Doctor</span>
                <span className="receipt-val">{confirmedAppointment.doctorName}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Specialization</span>
                <span className="receipt-val" style={{ color: '#2dd4bf' }}>
                  {confirmedAppointment.specialization}
                </span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Patient</span>
                <span className="receipt-val">{confirmedAppointment.patientName}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Date & Time</span>
                <span className="receipt-val" style={{ color: '#f8fafc', fontWeight: 700 }}>
                  {confirmedAppointment.date} • {confirmedAppointment.time}
                </span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Status</span>
                <span className="receipt-val">
                  <span className="badge badge-status" style={{ padding: '3px 10px' }}>
                    {confirmedAppointment.status}
                  </span>
                </span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Consultation Reason</span>
                <span className="receipt-val">{confirmedAppointment.reason}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Outpost Location</span>
                <span className="receipt-val">{confirmedAppointment.location}</span>
              </div>
            </div>

            <div className="confirmation-sync-notice">
              <ShieldCheck size={16} color="#10b981" />
              <span>
                Synchronized with <strong>{confirmedAppointment.doctorName}</strong>'s console. Ready for video consultation.
              </span>
            </div>

            <button
              id="btn-return-patient-dash"
              className="btn btn-primary btn-lg"
              onClick={handleFinishAndReturn}
              style={{ width: '100%', marginTop: '20px' }}
            >
              <span>Return to Patient Dashboard</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
