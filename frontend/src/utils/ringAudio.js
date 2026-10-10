/**
 * Web Audio API Ringtone & Chime Synthesizer
 * Generates pleasant, native audio cues without any external mp3/wav files.
 * Browser-compliant with AudioContext autoplay policies.
 */

class RingAudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.intervalId = null;
    this.isPlaying = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  /**
   * Plays a gentle double-pulse chime (telephone ring) for incoming calls
   */
  playRingTonePulse() {
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;

      // Pulse 1
      this.createBeep(now, 0.35, 520, 660);
      // Pulse 2
      this.createBeep(now + 0.45, 0.45, 520, 660);
    } catch (e) {
      // Audio play error handled silently
    }
  }

  /**
   * Plays a subtle, gentle notification chime (e.g. for missed calls, bookings)
   */
  playNotificationChime() {
    this.init();
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      this.createBeep(now, 0.18, 587.33, 880); // D5 and A5 notes
    } catch (e) {
      // Audio play error handled silently
    }
  }

  /**
   * Plays a soft periodic pulse for outgoing calling
   */
  playOutgoingRingPulse() {
    if (!this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      this.createBeep(now, 0.7, 440, 480);
    } catch (e) {
      // Audio play error handled silently
    }
  }

  createBeep(startTime, duration, freq1 = 440, freq2 = 480) {
    if (!this.audioCtx) return;

    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq1, startTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq2, startTime);

    // Smooth envelope attack and decay
    gainNode.gain.setValueAtTime(0.001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, startTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc1.start(startTime);
    osc2.start(startTime);

    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
  }

  startIncomingRing() {
    this.stopRing();
    this.init();
    this.isPlaying = true;
    this.playRingTonePulse();
    this.intervalId = setInterval(() => {
      if (this.isPlaying) {
        this.playRingTonePulse();
      }
    }, 2400);
  }

  startOutgoingRing() {
    this.stopRing();
    this.init();
    this.isPlaying = true;
    this.playOutgoingRingPulse();
    this.intervalId = setInterval(() => {
      if (this.isPlaying) {
        this.playOutgoingRingPulse();
      }
    }, 3000);
  }

  stopRing() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const ringSynthesizer = new RingAudioSynthesizer();
