/**
 * MSCureChain Patient App — API Endpoints
 *
 * All paths are relative to the baseURL in axiosConfig.ts.
 * Extracted from:
 *   - lib/integrations/config/endpoints.ts (frontend)
 *   - PATIENT_PORTAL_POSTMAN_GUIDE.md (backend)
 *
 * Only the endpoints a Patient needs are kept here — avoids importing
 * hospital-staff-only routes into the mobile app.
 */

// ─── Auth Endpoints (POST /auth/login, GET /auth/me, etc.) ───────────────────
export const AUTH_ENDPOINTS = {
  /** POST — Patient login: { mobile, password } → { tokens, user } */
  LOGIN: '/auth/login',

  /** POST — Patient self-registration: { name, mobile, email, password, role, consentGiven } */
  REGISTER: '/auth/register',

  /** GET — Get currently authenticated user info (Bearer token required) */
  ME: '/auth/me',

  /** POST — Refresh access token: { refreshToken } → { tokens } */
  REFRESH: '/auth/refresh',

  /** POST — Logout current device: { refreshToken } */
  LOGOUT: '/auth/logout',

  /** POST — Logout ALL devices (no body needed) */
  LOGOUT_ALL: '/auth/logout-all',

  /** POST — Change password: { currentPassword, newPassword } */
  CHANGE_PASSWORD: '/auth/change-password',

  /** POST — Send OTP to mobile/email */
  SEND_OTP: '/auth/send-otp',

  /** POST — Verify OTP: { otp } */
  VERIFY_OTP: '/auth/verify-otp',
} as const;


// ─── Patient Endpoints (GET /patients/*, PATCH /patients/profile) ─────────────
export const PATIENT_ENDPOINTS = {
  /**
   * GET — Full medical profile (MRN, blood group, allergies, hospital, emergency contact)
   * Auth: Bearer patient token
   */
  PROFILE: '/patients/profile',

  /**
   * PATCH — Update own profile (name, email, address, bloodGroup, allergies, etc.)
   * Auth: Bearer patient token  |  Content-Type: application/json
   */
  UPDATE_PROFILE: '/patients/profile',

  /**
   * GET — ALL-IN-ONE dashboard call.
   * Returns: profile + appointments + prescriptions + labRecords + dischargeRecords + helpdeskPrescriptions
   * This is the PRIMARY endpoint for the patient home screen.
   * Auth: Bearer patient token
   */
  DASHBOARD_DATA: '/patients/dashboard-data',

  /**
   * GET — All appointments (OPD + IPD), sorted newest first, limit 50
   * Auth: Bearer patient token
   */
  APPOINTMENTS: '/patients/appointments',

  /**
   * GET — All prescriptions (OPD + pharmacy tokens + IPD meds), merged list, limit 50
   * Auth: Bearer patient token
   */
  PRESCRIPTIONS: '/patients/prescriptions',

  /**
   * GET — All lab test records ordered by doctor.
   * Status lifecycle: pending → collected → processing → completed
   * Auth: Bearer patient token
   */
  LAB_RECORDS: '/patients/lab-records',

  /**
   * GET — Appointments booked on the patient's behalf by frontdesk staff
   * Auth: Bearer patient token
   */
  HELPDESK_PRESCRIPTIONS: '/patients/helpdesk-prescriptions',

  /**
   * GET — Patient profile by ID (used by hospital staff — included for completeness)
   */
  PROFILE_BY_ID: (id: string) => `/patients/profile/${id}`,

  /**
   * GET — Hospitals the patient is registered with
   */
  HOSPITALS: '/patients/hospitals',

  /**
   * GET — All discharge summaries from IPD admissions
   */
  DISCHARGE_RECORDS: '/discharge/records/patient/records',

  /**
   * GET — Detailed view of a single discharge record
   */
  DISCHARGE_VIEW: (id: string) => `/discharge/records/patient-view/${id}`,
} as const;

// ─── Booking / Appointment Endpoints ─────────────────────────────────────────
export const BOOKING_ENDPOINTS = {
  /** GET — Check doctor availability */
  AVAILABILITY: '/bookings/availability',

  /** POST — Book an appointment */
  BOOK: '/bookings/book',

  /** GET — My appointments via bookings module */
  MY_APPOINTMENTS: '/bookings/my-appointments',

  /** GET — Appointment detail by ID */
  DETAILS: (id: string) => `/bookings/${id}`,
} as const;

// ─── Report / Lab Report Endpoints ───────────────────────────────────────────
export const REPORT_ENDPOINTS = {
  /** GET — Reports for a specific patient: /reports/patient/:patientId */
  GET_BY_PATIENT: (patientId: string) => `/reports/patient/${patientId}`,
} as const;

// ─── Notification Endpoints ───────────────────────────────────────────────────
export const NOTIFICATION_ENDPOINTS = {
  /** GET — All notifications for the current user */
  BASE: '/notifications',

  /** PUT — Mark a single notification as read */
  READ: (id: string) => `/notifications/${id}/read`,

  /** PUT — Mark all notifications as read */
  READ_ALL: '/notifications/read-all',

  /** DELETE — Delete a specific notification */
  DELETE: (id: string) => `/notifications/${id}`,

  /** DELETE — Clear all notifications */
  CLEAR_ALL: '/notifications/clear-all',
} as const;

// ─── Support / Ticket Endpoints ───────────────────────────────────────────────
export const SUPPORT_ENDPOINTS = {
  /** POST — Create a new support ticket */
  CREATE: '/support',

  /** GET — My support tickets */
  MY_TICKETS: '/support/my-tickets',

  /** GET — Ticket detail by ID */
  DETAILS: (id: string) => `/support/${id}`,

  /** POST — Reply to a ticket */
  REPLY: (id: string) => `/support/${id}/reply`,
} as const;

// ─── Emergency Endpoints (Postman Guide: /api/emergency/requests) ──────────────
// ─── Feedback Endpoints ──────────────────────────────────────────────────────
export const FEEDBACK_ENDPOINTS = {
  /** POST — Submit feedback for a hospital: { hospitalId, rating, comment } */
  SUBMIT: '/feedback',
} as const;

export const EMERGENCY_ENDPOINTS = {
  /** POST — Trigger SOS signal: { type, severity, location, symptoms, hospitalId } */
  TRIGGER: '/emergency/requests/patient',

  /** GET — Past SOS history for the current patient */
  HISTORY: '/emergency/requests/patient/my-requests',

  /** GET — Live signal tracking / detail by SOS ID */
  TRACKING: (requestId: string) => `/emergency/requests/${requestId}`,
} as const;


// ─── Payment Endpoints ────────────────────────────────────────────────────────
export const PAYMENT_ENDPOINTS = {
  /**
   * POST — Create a Razorpay payment order before booking
   * Body: { doctorId, hospitalId, date, time, amount, currency, appointmentType }
   * Returns: { orderId, amount, currency, key, checkoutUrl?, ... }
   */
  CREATE_ORDER: '/payments/create-order',

  /**
   * POST — Verify Razorpay payment signature & confirm appointment
   * Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingDetails }
   * Returns: { appointmentId, bookingReference, paymentStatus: 'paid', ... }
   */
  VERIFY_PAYMENT: '/payments/verify',

  /**
   * GET — Get payment receipt by order ID
   */
  RECEIPT: (orderId: string) => `/payments/receipt/${orderId}`,

  /**
   * GET — All payment history for the logged-in patient
   */
  HISTORY: '/payments/history',
} as const;
