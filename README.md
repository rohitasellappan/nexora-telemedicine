# NEXORA — Rural Telemedicine Platform

> **"Healthcare, Anywhere"**  
> Bridging the rural healthcare divide through low-bandwidth video consultations, secure consultation recording, and unified digital health records.

---

## 🏥 Problem Overview
Rural populations frequently lack direct access to specialized doctors and quality healthcare facilities. Traveling 40–80 km to the nearest urban clinic results in:
- High transportation and accommodation expenses
- Lost daily wages for families
- Delays in critical triage and treatment
- Lost or damaged physical medical records

## 💡 The NEXORA Solution
NEXORA provides a streamlined telemedicine platform engineered specifically for rural constraints:
- **Real-Time WebRTC Peer-to-Peer Video Consultations:** Direct encrypted browser-to-browser audio/video streams.
- **Low-Bandwidth Adaptive Mode:** Optimized for rural 2G/3G connectivity (< 150 kbps, 360p resolution, 15 fps).
- **Socket.IO Signaling Backbone:** Isolated consultation rooms (`consultation_${appointmentId}`) without media routing through the server.
- **Consensual Consultation Recording:** Encrypted recording with mandatory patient/doctor consent and private authorization controls.
- **Unified Digital Health Vault:** Portable electronic health records accessible anywhere.
- **Verified Specialist Network:** On-demand access to certified physicians across specialties.

---

## 📹 Phase 4: Real-Time WebRTC Video Consultation

### 1. WebRTC Architecture
- **Media Capture:** Native `navigator.mediaDevices.getUserMedia({ video, audio })`
- **Peer-to-Peer Transport:** Native `RTCPeerConnection` with Google STUN servers (`stun:stun.l.google.com:19302`)
- **Signaling:** Socket.IO relaying session descriptions and ICE candidates:
  - `join-room` (`consultation_${appointmentId}`)
  - `offer` / `answer`
  - `ice-candidate`
  - `peer-joined` / `peer-left`
  - `call-ended`
- **Zero Server Media Storage:** Live audio and video streams flow exclusively peer-to-peer between client browsers.

---

## 🎥 Phase 5: Secure Consultation Recording & Authorized Sharing

### 1. Healthcare Privacy & Consent Principles
1. **Never Automatically Recorded:** Recording can never begin without explicit human action.
2. **Explicit Consent Dialog:** When clicking **"🎥 Start Recording"**, a consent modal appears:
   > *"This consultation will be recorded. The recording may contain sensitive medical information. Both participants will be notified."*
   > Requires clicking **"I Agree & Start Recording"**.
3. **Live Indicator & Timer:** Displays `🔴 Recording 00:32` in the controls dock and header.
4. **Peer Notification:** When either participant begins recording, Socket.IO notifies the other participant with a banner:
   > `🔴 This consultation is being recorded.`
5. **Combined Stream Composition:**
   - **Canvas Rendering Loop:** Renders a side-by-side view with participant names, appointment ID, and timestamp watermark.
   - **Web Audio API (`AudioContext`):** Mixes local and remote microphone tracks into a unified `MediaStreamDestination`.
   - **MediaRecorder:** Encodes composite video/audio into `video/webm;codecs=vp8,opus`.
6. **Upload & Storage Architecture:**
   - Saved locally to `backend/uploads/recordings/` with unique filenames: `appointment_<appointmentId>_<timestamp>.webm`.
   - **No Public URLs:** Folder is **not** exposed via `express.static`.
   - Accessible only via authenticated endpoint: `GET /api/recordings/:recordingId`.
   - **Authorization Enforcement:** If the requesting user does not belong to the appointment (different patient or different doctor), returns **`403 Forbidden`**.
7. **Recording Library:**
   - **Patient Dashboard:** Under "Consultation Recordings" and "Medical Records Vault".
   - **Doctor Dashboard:** Under "Clinical Consultation Recordings".
   - Shows date, duration, appointment ID, `[ ▶ Watch Recording ]`, and `[ ⬇ Download ]`.
8. **Secure Video Player (`RecordingPlayer.jsx`):**
   - Play / Pause, seekbar scrub timeline, volume & mute, fullscreen toggle, duration display.
   - **Does NOT autoplay**.
   - Displays *"Private consultation recording • 🔒 Encrypted • Authorized Access Only"*.
9. **End Call Guard:**
   - If user clicks "End Call" while recording is active, prompts:
     > *"Recording is still active. Stop and save the recording before leaving?"*
     > Options: `[ Stop & Save ]` or `[ Leave Without Saving ]`.

---

## 🧪 How to Test Video Calling & Recording Between Two Windows

Both servers run locally:
- **Backend API & Socket.IO**: `http://localhost:5000`
- **Frontend Vite App**: `http://localhost:5173`

Follow these steps to demonstrate the complete Phase 4 + Phase 5 flow:

### Step 1: Open Window 1 (Patient)
1. Open browser window at: **`http://localhost:5173`**
2. Click **"Open Patient Dashboard"** (or Sign In as **Ramesh Kumar**).
3. Under **Upcoming Appointments**, click **"Join Consultation"** on `APT-101`.
4. Allow camera and microphone permissions.
5. Window 1 shows the consultation stage with:
   > *"Waiting for the other participant..."*

---

### Step 2: Open Window 2 (Doctor)
1. In a **second browser window** (or Incognito window), go to: **`http://localhost:5173`**
2. Click **"Open Doctor Dashboard"** (or Sign In as **Dr. Ananya Sharma, MD**).
3. Under **Booked Patient Appointments**, click **"Join Consultation"** on `APT-101`.
4. Allow camera and microphone permissions.
5. Within 1–2 seconds, WebRTC establishes **🟢 Connected** status:
   - Patient sees Doctor's video.
   - Doctor sees Patient's video.
   - Two-way audio is live.

---

### Step 3: Test Consent & Recording
1. In Window 1 (Patient), click **"🎥 Start Recording"**.
2. Notice the **Consent Dialog**:
   > *"Record Consultation? This consultation will be recorded. The recording may contain sensitive medical information. Both participants will be notified."*
3. Click **"I Agree & Start Recording"**.
4. Observe:
   - Window 1 displays `🔴 Recording 00:05` with pulsing animation.
   - Window 2 (Doctor) instantly displays:
     > `🔴 This consultation is being recorded. (Authorized session archived under appointment APT-101)`
5. Talk and move for a few seconds to capture video and audio.
6. Click **"Stop Recording"** in Window 1.
7. Observe:
   - Window 2 receives notification: *"Recording stopped."*
   - Window 1 shows modal: *"Consultation recording ready."* with a preview player and duration.
8. Click **"Upload Recording"**. The recording is encrypted and saved to the backend.

---

### Step 4: Verify Recording Library & Playback
1. In Window 1, click **"Return to Dashboard"**.
2. Scroll to the **Consultation Recordings** section on the Patient Dashboard:
   - The newly uploaded recording appears alongside its duration and appointment ID.
   - Click **"Watch Recording"**: Opens `RecordingPlayer.jsx` (does not autoplay, plays with sound and seekbar).
   - Click **"Download"**: Downloads the authenticated WebM recording file.
3. In Window 2 (Doctor), click **"Return to Dashboard"**.
   - Check the **Clinical Consultation Recordings** section on the Doctor Dashboard.
   - The same recording is present and playable for Dr. Ananya Sharma!

---

### Step 5: Verify Healthcare Privacy & 403 Forbidden Enforcement
1. Try accessing the recording endpoint as an unauthorized user:
   ```powershell
   curl "http://localhost:5000/api/recordings/REC-101-SAMPLE?userId=pat-99"
   ```
2. Result: **`403 Forbidden`**
   ```json
   {
     "success": false,
     "error": "Forbidden",
     "message": "Access Denied: You are not authorized to access this private consultation recording."
   }
   ```
3. Only the patient (`pat-1`) and doctor (`doc-1`) belonging to that appointment can stream or download it!

---

### Step 6: Test Secure Deleting Recording & Confirmation Dialog
1. On the **Patient Dashboard** or **Doctor Dashboard**, click the **"Delete"** button beside any consultation recording.
2. Observe the required **Confirmation Dialog**:
   > *"Delete this consultation recording?"*  
   > *"This action cannot be undone."*  
   > Displays appointment details, participant name, and duration.  
   > `[ Cancel ]` `[ Delete Recording ]`
3. Click **"Cancel"**:
   - The dialog closes, and the recording remains intact.
4. Click **"Delete"** again, then click **"Delete Recording"**:
   - The backend validates patient/doctor authorization (`DELETE /api/recordings/:recordingId`).
   - The physical `.webm` file is removed from `backend/uploads/recordings/` (and handles missing files cleanly).
   - The recording metadata is removed.
   - The recording is removed from the dashboard and medical records vault immediately.
5. **Unauthorized Deletion Protection**:
   - If a different patient (`pat-2`) or doctor (`doc-3`) attempts to delete the recording:
     `DELETE /api/recordings/REC-APT-101-xxxx?userId=pat-2`
   - The request is immediately rejected with **`403 Forbidden`**!

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, WebRTC (`RTCPeerConnection`), MediaRecorder API, HTML5 Canvas, Web Audio API (`AudioContext`), Socket.IO-Client, Lucide Icons, Modern CSS |
| **Backend** | Node.js, Express.js, Socket.IO Signaling Server, Multer (multipart/form-data), CORS, Dotenv |
| **Signaling** | Socket.IO Rooms (`consultation_${appointmentId}`) |
| **STUN Servers** | `stun:stun.l.google.com:19302`, `stun:stun1.l.google.com:19302` |
| **Security** | P2P DTLS/SRTP Media Encryption, 403 Healthcare Authorization Validation, No Public Media URLs, Authorized Deletion |

