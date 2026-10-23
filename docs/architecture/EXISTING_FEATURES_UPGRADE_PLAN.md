# 🛠️ MSCureChain Patient App — Existing Features Upgradation Plan
> **Target:** Bring all half-completed, stubbed, or partially integrated features to **100% Production Readiness**.  
> **Repository:** `mscurechian-app-`  
> **Environment:** React Native / Expo (SDK 57) + Node.js/Express + MongoDB + Socket.IO  
> **Estimated Execution Time (Antigravity AI):** **~19.5 - 23 Hours**

---

## 📋 Executive Summary of Upgradable Features

| # | Existing Feature / Screen | Current State | Target State (100% Production Ready) | Estimated Time |
|---|---------------------------|---------------|--------------------------------------|:--------------:|
| 1 | **Medicine Reminder Screen** (`MedicineReminderScreen.tsx`) | 🔴 20% (Local storage only, `+ Add` empty, disconnected from doctor prescriptions) | Auto-sync from doctor prescriptions, working Add/Edit modal, native push alarm reminders | **3.0 hrs** |
| 2 | **Doctor Chat Screen** (`ChatScreen.tsx`) | 🔴 10% (Static hardcoded UI, fake messages) | Live WebSocket connection with Socket.IO, real MongoDB message sync, photo attachments | **3.5 hrs** |
| 3 | **Vitals Tracker** (`VitalsScreen.tsx`) | 🟡 50% (Read-only hospital visit vitals, no manual logging, no graphs) | Patient self-logging modal (BP, Sugar, SpO2, Weight), interactive 7/30/90-day trend graphs | **3.5 hrs** |
| 4 | **Billing & Payments Scope** (`PaymentsScreen.tsx`) | 🟡 70% (Only OPD consultation bills shown) | Integrated Pharmacy & Lab invoices, "Pay at Clinic" cash indicator, receipt PDF export | **2.0 hrs** |
| 5 | **Lab Reports Reference Visualizer** (`ReportsScreen.tsx`) | 🟢 80% (Raw values in list view, basic signedUrl viewer) | Normal/Borderline/High colored visual meter, 1-line layman explanation, one-tap WhatsApp share | **2.5 hrs** |
| 6 | **Appointment Rescheduling & Live Day Token** (`AppointmentsScreen.tsx`) | 🟢 85% (Cancellation only, no reschedule, no token) | In-app Reschedule button with timeslot picker, live token badge for current day | **2.0 hrs** |
| 7 | **Dashboard Header & Polish** (`DashboardScreen.tsx`) | 🟢 80% (Missing notification bell, carousel glitches on empty hospitals) | Notification bell with unread badge, active inpatient hospital stay alert banner | **1.5 hrs** |
| 8 | **Authentication & Profile Enhancements** (`RegisterScreen.tsx`, `ProfileScreen.tsx`) | 🟢 85% (Missing DOB picker in register, emergency contact not directly callable) | DOB date picker with auto-age, clickable `tel:` emergency call, avatar selection | **1.5 hrs** |
| 9 | **Emergency SOS Post-Trigger Status** (`SOSScreen.tsx`) | 🟢 75% (Sends GPS coordinates, then stops with alert) | Post-signal status card with emergency hotline quick-dials (108, 112) & hospital desk card | **1.5 hrs** |

---

## 🔍 Detailed Feature-by-Feature Upgradation Roadmap

---

### 1. Medicine Cabinet & Pill Reminder Upgrade
* **File:** `src/screens/MedicineReminderScreen.tsx`
* **Current Issue:** 
  * The `+ Add` button has an empty handler (`onPress={() => {}}`).
  * Medications are hardcoded in `AsyncStorage` (`Vitamin D3`, `Metformin`).
  * It does not pull medications from active doctor prescriptions (`GET /api/patients/prescriptions`).
* **Implementation Plan:**
  1. **Prescription Auto-Import:**
     * Call `GET /api/patients/prescriptions` on load.
     * Automatically populate medicines prescribed by doctors (name, dosage, frequency, instructions, duration).
  2. **Interactive Add/Edit Modal:**
     * Create a modal form allowing manual entry: Medicine Name, Dosage (e.g. 500mg), Timing (Morning/Noon/Night, Before/After Food), Frequency, Reminders toggle.
  3. **Local Push Notifications (`expo-notifications`):**
     * Schedule exact device alarms using `Notifications.scheduleNotificationAsync` with `DailyTriggerInput`.
     * Add action buttons on notification: *"Taken"* / *"Snooze (10 mins)"*.
* **Estimated Time:** **3.0 Hours**

---

### 2. Live Doctor Chat (Socket.IO + MongoDB)
* **File:** `src/screens/ChatScreen.tsx`
* **Current Issue:** 
  * Contains completely static hardcoded messages (`Dr. Arjun Reddy`, `pain in my neck`).
  * No socket event listener or connection to the backend `/api/messages` module.
* **Implementation Plan:**
  1. **Socket Integration:**
     * Connect to backend Socket.IO using existing `SocketContext`.
     * Emit `join_room` with `conversationId` or `doctorId + patientId`.
     * Listen for `receive_message` and update state in real-time.
  2. **API Persistence:**
     * Load chat history via `GET /api/messages/:conversationId`.
     * Send messages via `POST /api/messages/send` with fallback optimistic UI updates.
  3. **Image Attachment:**
     * Add camera/gallery button using `expo-image-picker` to send prescription slips or injury photos.
* **Estimated Time:** **3.5 Hours**

---

### 3. Vitals Self-Logging & Interactive Trend Charts
* **File:** `src/screens/VitalsScreen.tsx`
* **Current Issue:** 
  * Only displays values entered by triage nurses during physical hospital visits.
  * Patients cannot record daily home readings. No visual graphs exist.
* **Implementation Plan:**
  1. **"Log Vitals" Floating Action Button & Form Modal:**
     * Input fields for: Blood Pressure (Systolic / Diastolic), Blood Sugar (Fasting / Post-Prandial / Random), SpO2 (%), Pulse (bpm), Body Temperature (°F), Weight (kg).
     * Save readings to MongoDB (`POST /api/patients/vitals`) with fallback to local `AsyncStorage`.
  2. **Interactive Historical Line Charts:**
     * Integrate `react-native-gifted-charts` or `react-native-chart-kit`.
     * Render 7-day, 30-day, and 90-day trend lines with color-coded normal zones (e.g., Blood Sugar: 70-100 mg/dL highlighted in green).
* **Estimated Time:** **3.5 Hours**

---

### 4. Billing & Payments Full Scope Integration
* **File:** `src/screens/PaymentsScreen.tsx`
* **Current Issue:** 
  * Only appointment booking consultation fees are displayed. Pharmacy dispensing charges and Lab test invoices are missing.
* **Implementation Plan:**
  1. **Pharmacy & Lab Invoice Ingestion:**
     * Ingest billings from `/api/patients/dashboard-data` (specifically `labRecords` and `prescriptions` pricing fields) and backend billing routes.
     * Categorize bills under tabs: **All**, **Consultations**, **Pharmacy**, **Diagnostics**.
  2. **Payment Mode Badges:**
     * Clearly badge: `PAID (Razorpay)`, `PENDING (Pay at Hospital Front Desk)`, `WAIVED`.
  3. **Receipt PDF Generation:**
     * Add a "Download Tax Invoice / Receipt" button using `expo-print` and `expo-sharing`.
* **Estimated Time:** **2.0 Hours**

---

### 5. Lab Reports Reference Meter & Explainer
* **File:** `src/screens/ReportsScreen.tsx`
* **Current Issue:** 
  * Displays numerical test values without context (patients don't know if 14.2 hemoglobin is normal or abnormal).
* **Implementation Plan:**
  1. **Reference Range Meter Component:**
     * Add a 3-tier horizontal progress bar (Low [Yellow] — Normal [Green] — High [Red]).
     * Define clinical ranges for common tests (CBC, Glucose, Creatinine, Lipid Profile, SGPT/SGOT, Thyroid).
  2. **Plain English Explainer Card:**
     * Display a 1-line layman explanation (e.g., *"Borderline High: Slightly elevated cholesterol. Exercise and dietary changes recommended."*).
  3. **One-Tap WhatsApp Share:**
     * Add instant share button to send reports or doctor prescriptions directly to family or local pharmacies via `expo-sharing`.
* **Estimated Time:** **2.5 Hours**

---

### 6. Appointment Rescheduling & Day-of-Visit Token
* **File:** `src/screens/AppointmentsScreen.tsx`
* **Current Issue:** 
  * Patients can only cancel appointments. If they want to change the date, they must cancel, lose their slot, and book again.
* **Implementation Plan:**
  1. **Reschedule Action Flow:**
     * Add "Reschedule" button to appointment card.
     * Opens the timeslot picker (`BookAppointmentScreen`) pre-filled with the doctor and hospital, calling `PATCH /api/bookings/:id/reschedule`.
  2. **Live Day-of-Visit Token Card:**
     * If an appointment is scheduled for **TODAY**, display a prominent banner at the top:
       > **Token #18** | Dr. Priya Sharma | Reported: Waiting / With Doctor
* **Estimated Time:** **2.0 Hours**

---

### 7. Dashboard Polish & Header Notification Center
* **File:** `src/screens/DashboardScreen.tsx`
* **Current Issue:** 
  * No access to past notifications in header. Carousel fails gracefully if hospitals array is empty.
* **Implementation Plan:**
  1. **Header Notification Bell:**
     * Add a bell icon in the dashboard header displaying unread notification count badge from `SocketContext`.
     * Tapping navigates to `NotificationCenterScreen`.
  2. **Hospital Card Carousel Fallback:**
     * Add a clean default "Register at Hospital" prompt card if patient has no active registrations.
  3. **Active Inpatient Banner:**
     * If patient has an active hospital admission, display a live sticky card: *"You are currently admitted at City Hospital - Room 304, Bed B"*.
* **Estimated Time:** **1.5 Hours**

---

### 8. Registration & Profile Enhancements
* **Files:** `src/screens/RegisterScreen.tsx`, `src/screens/ProfileScreen.tsx`
* **Current Issue:** 
  * Register screen omits DOB. Profile screen emergency contact cannot be dialed directly.
* **Implementation Plan:**
  1. **Register DOB Picker:**
     * Add Date of Birth calendar picker with automatic age calculation.
  2. **One-Tap Emergency Dial:**
     * Make emergency phone numbers in `ProfileScreen` clickable with `Linking.openURL('tel:' + phone)`.
  3. **Profile Avatar Selector:**
     * Allow patients to choose from 8 preset avatar icons or upload their own photo via `expo-image-picker`.
* **Estimated Time:** **1.5 Hours**

---

### 9. Emergency SOS Post-Broadcast Tracking
* **File:** `src/screens/SOSScreen.tsx`
* **Current Issue:** 
  * Triggers the emergency broadcast API and displays an alert, leaving the user on a blank or static screen.
* **Implementation Plan:**
  1. **Post-Broadcast Card:**
     * Display a live state card: *"Emergency Signal Transmitted to 3 Nearby Hospitals"*.
     * Show timestamps and exact GPS coordinates sent.
  2. **Quick Dial Emergency Hotlines:**
     * Prominent emergency speed-dial buttons: **Call Ambulance (108)**, **Police / Emergency (112)**, **Hospital Emergency Desk**.
* **Estimated Time:** **1.5 Hours**

---

## ⏱️ Total Time Breakdown (Antigravity AI Execution)

| Phase | Tasks Covered | Estimated Duration |
|:---|:---|:---:|
| **Phase 1** | Medicine Cabinet & Push Alarms + Real-time Doctor Chat | **6.5 Hours** |
| **Phase 2** | Vitals Self-Logging & Interactive Charts + Billing/Invoicing Scope | **5.5 Hours** |
| **Phase 3** | Lab Normal/Abnormal Range Meter + Appointment Reschedule Flow | **4.5 Hours** |
| **Phase 4** | Dashboard Header & Bell + Registration DOB & Profile Call + SOS Tracking | **4.5 Hours** |
| **TOTAL** | **Complete Upgrade of All 9 Half-Completed Features** | **~21.0 Hours** |
