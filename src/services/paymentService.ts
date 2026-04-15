/**
 * MSCureChain Patient App — Payment & Booking Service
 *
 * HYBRID BOOKING MODEL:
 *   - FRONTDESK/WALK-IN: Receptionist books directly via helpdesk dashboard
 *     → Patient goes straight to queue (no timeslot required)
 *   - APP BOOKING (this file): Patient selects a specific timeslot
 *     → Appointment is created with that exact time slot in the backend
 *
 * LOCAL BACKEND: Multitenant_MsCurechain_Backend (port 5003)
 * API Base: http://192.168.29.48:5003/api
 *
 * Key Endpoints (from backend analysis):
 *   GET  /api/hospitals                              → list all hospitals (public)
 *   GET  /api/doctors?speciality=X&hospitalId=Y     → filter doctors
 *   GET  /api/bookings/availability                  → hourly slot blocks
 *   POST /api/bookings/book                          → create appointment
 *   GET  /api/patients/appointments                  → patient's appointments
 */

import apiClient from '@/api/axiosConfig';

export const RAZORPAY_KEY_ID = 'rzp_test_SbfpbKBXqOa5tv';


// ─── Types ────────────────────────────────────────────────────────────────────

export interface Hospital {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  hospitalId?: string;
  branches?: Branch[];
  logo?: string;
  specialties?: string[];
}

export interface Branch {
  _id: string;
  name: string;
  address?: string;
}

export interface Doctor {
  _id: string;
  name?: string;              // resolved display name
  user?: {
    _id: string;
    name: string;
    email?: string;
    mobile?: string;
    doctorId?: string;
  };
  hospital?: {
    _id: string;
    name: string;
    address?: string;
    hospitalId?: string;
  };
  hospitals?: Array<{ _id: string; name: string }>;
  specialties?: string[];
  specialty?: string;
  department?: string;
  qualifications?: string[];
  bio?: string;
  experience?: number;
  experienceStart?: string;
  consultationFee: number;
  rating?: number;
  profilePic?: string;
  consultationDuration?: number;
  availability?: DoctorAvailability[];
}

export interface DoctorAvailability {
  days: string[];
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

/** Hourly slot block returned by /bookings/availability */
export interface HourBlock {
  timeSlot: string;           // e.g. "9:00 AM - 10:00 AM"
  totalCapacity: number;
  bookedCount: number;
  availableCount: number;
  isFull: boolean;
}

/** Availability response shape */
export interface AvailabilityResponse {
  slots: HourBlock[];
  isLeave?: boolean;
  message?: string;
}

/** Everything needed to proceed to payment */
export interface BookingSlot {
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  hospitalId: string;
  hospitalName: string;
  date: string;               // ISO "2026-04-15"
  timeSlot: string;           // "9:00 AM - 10:00 AM" (hourly block label)
  startTime: string;          // "9:00 AM"
  endTime: string;            // "10:00 AM"
  consultationFee: number;
  appointmentType: 'OPD' | 'Video';
  symptoms: string;
  notes: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

/** Returned by backend after successful booking */
export interface BookingConfirmation {
  appointmentId: string;
  bookingReference: string;
  doctorName: string;
  doctorSpecialty: string;
  hospitalName: string;
  date: string;
  time: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  mrn?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatCurrency = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN')}`;

export const formatDate = (iso: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getDoctorDisplayName = (doc: Doctor): string => {
  const raw = doc.user?.name || doc.name || 'Physician';
  return raw.startsWith('Dr.') ? raw : `Dr. ${raw}`;
};

export const getDoctorSpecialty = (doc: Doctor): string =>
  doc.specialties?.[0] || doc.specialty || doc.department || 'General';

export const getDoctorExperience = (doc: Doctor): number => {
  if (doc.experience !== undefined) return doc.experience;
  if (doc.experienceStart) {
    return new Date().getFullYear() - new Date(doc.experienceStart).getFullYear();
  }
  return 0;
};

// ─── API: Hospitals ────────────────────────────────────────────────────────────

/**
 * Fetch all hospitals from the local backend.
 * Route: GET /api/hospitals  (public, no auth required)
 */
export const fetchHospitals = async (): Promise<Hospital[]> => {
  try {
    const res = await apiClient.get('/hospitals');
    // Backend returns array directly or wrapped in data
    const list: Hospital[] = Array.isArray(res.data)
      ? res.data
      : res.data?.data || res.data?.hospitals || [];
    console.log('[PaymentService] Hospitals fetched:', list.length);
    return list;
  } catch (err: any) {
    console.error('[PaymentService] fetchHospitals error:', err.message);
    return [];
  }
};

// ─── API: Doctors ──────────────────────────────────────────────────────────────

/**
 * Fetch and filter doctors.
 * Route: GET /api/doctors?speciality=X&hospitalId=Y
 * (Public endpoint — no auth required, searchDoctors controller)
 */
export const fetchDoctors = async (opts?: {
  hospitalId?: string;
  specialty?: string;
  search?: string;
}): Promise<Doctor[]> => {
  try {
    const params: Record<string, string> = {};
    if (opts?.specialty) params.speciality = opts.specialty; // backend uses 'speciality'
    if (opts?.hospitalId) params.hospitalId = opts.hospitalId;

    const res = await apiClient.get('/doctors', { params });
    let list: Doctor[] = Array.isArray(res.data)
      ? res.data
      : res.data?.data || res.data?.doctors || [];

    // Client-side hospital filter if backend doesn't filter by hospitalId
    if (opts?.hospitalId) {
      list = list.filter((d) => {
        const h = d.hospital?._id || (d.hospitals?.[0] as any)?._id;
        return !h || h === opts.hospitalId;
      });
    }

    // Client-side search filter
    if (opts?.search && opts.search.trim()) {
      const q = opts.search.toLowerCase();
      list = list.filter((d) => {
        const name = getDoctorDisplayName(d).toLowerCase();
        const spec = getDoctorSpecialty(d).toLowerCase();
        return name.includes(q) || spec.includes(q);
      });
    }

    console.log('[PaymentService] Doctors fetched:', list.length);
    return list;
  } catch (err: any) {
    console.error('[PaymentService] fetchDoctors error:', err.message);
    return [];
  }
};

/**
 * Collect unique specialties from a doctor list for filter UI.
 */
export const extractSpecialties = (doctors: Doctor[]): string[] => {
  const set = new Set<string>();
  doctors.forEach((d) => {
    (d.specialties || []).forEach((s) => { if (s) set.add(s); });
    if (d.specialty) set.add(d.specialty);
    if (d.department) set.add(d.department);
  });
  return Array.from(set).sort();
};

// ─── API: Availability ─────────────────────────────────────────────────────────

/**
 * Fetch hourly slot blocks for a doctor on a given date.
 *
 * Route: GET /api/bookings/availability?doctorId=X&hospitalId=Y&date=YYYY-MM-DD
 * Returns: { slots: HourBlock[] }
 *
 * The backend generates 5-min sub-slots internally and groups them into
 * hourly blocks (each block holds up to 12 patients).
 */
export const fetchDoctorAvailability = async (
  doctorId: string,
  hospitalId: string,
  date: string,
): Promise<AvailabilityResponse> => {
  try {
    const res = await apiClient.get('/bookings/availability', {
      params: { doctorId, hospitalId, date },
    });

    console.log('[PaymentService] Availability response:', JSON.stringify(res.data));

    if (res.data?.isLeave) {
      return { slots: [], isLeave: true, message: 'Doctor is on leave' };
    }
    if (res.data?.message && !res.data?.slots) {
      return { slots: [], message: res.data.message };
    }

    const slots: HourBlock[] = (res.data?.slots || []).filter(
      (s: HourBlock) => !s.isFull,
    );
    return { slots };
  } catch (err: any) {
    console.error('[PaymentService] fetchDoctorAvailability error:', err.message);
    // Fallback: generate default morning/afternoon blocks
    return { slots: generateFallbackHourBlocks() };
  }
};

/** Generate fallback blocks (9 AM–5 PM) when API is unavailable */
export const generateFallbackHourBlocks = (): HourBlock[] => {
  const blocks: HourBlock[] = [];
  for (let h = 9; h < 17; h++) {
    const formatH = (hour: number) => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 || 12;
      return `${h12}:00 ${ampm}`;
    };
    blocks.push({
      timeSlot: `${formatH(h)} - ${formatH(h + 1)}`,
      totalCapacity: 12,
      bookedCount: 0,
      availableCount: 12,
      isFull: false,
    });
  }
  return blocks;
};

// ─── API: Book Appointment ────────────────────────────────────────────────────

/**
 * Book an appointment directly via the local backend.
 *
 * Route: POST /api/bookings/book
 * Auth: Bearer token (patient role)
 *
 * The backend:
 * 1. Creates the Appointment record with status "Booked"
 * 2. Assigns / creates MRN
 * 3. Notifies doctor + helpdesk
 * 4. Returns appointment object
 *
 * NOTE: For app bookings we set payment method to "online" and paymentStatus "Paid".
 * Walk-in patients go through the helpdesk dashboard and don't use this path.
 */
export const bookAppointment = async (booking: BookingSlot): Promise<BookingConfirmation> => {
  const payload = {
    doctorId: booking.doctorId,
    date: booking.date,
    // Backend accepts "startTime - endTime" combined format
    timeSlot: `${booking.startTime} - ${booking.endTime}`,
    startTime: booking.startTime,
    endTime: booking.endTime,
    symptoms: booking.symptoms ? [booking.symptoms] : [],
    reason: booking.notes || booking.symptoms || 'General Consultation',
    type: booking.appointmentType === 'Video' ? 'online' : 'offline',
    urgency: 'non-urgent',
    paymentMethod: 'online',
    paymentStatus: 'Paid',
    razorpayOrderId: booking.razorpayOrderId,
    razorpayPaymentId: booking.razorpayPaymentId,
  };

  console.log('[PaymentService] bookAppointment payload:', JSON.stringify(payload));

  const res = await apiClient.post('/bookings/book', payload);
  const appt = res.data?.appointment || res.data;

  return {
    appointmentId: appt._id || appt.appointmentId,
    bookingReference: appt.appointmentId || `BK${Date.now()}`,
    doctorName: booking.doctorName,
    doctorSpecialty: booking.doctorSpecialty,
    hospitalName: booking.hospitalName,
    date: booking.date,
    time: `${booking.startTime} - ${booking.endTime}`,
    amount: booking.consultationFee,
    paymentMethod: 'Online',
    paymentStatus: 'Paid',
    mrn: appt.mrn,
  };
};

/**
 * DEV-ONLY: Simulate full booking flow without Razorpay
 */
export const simulatePaymentAndBook = async (
  booking: BookingSlot,
): Promise<BookingConfirmation> => {
  console.log('[PaymentService] DEV simulate payment for:', booking);
  return bookAppointment(booking);
};

// ─── Razorpay Methods ─────────────────────────────────────────────────────────

/**
 * Create a Razorpay order via the backend.
 * Route: POST /api/bookings/create-order
 */
export const createRazorpayOrder = async (amount: number): Promise<any> => {
  const res = await apiClient.post('/bookings/create-order', { amount });
  return res.data; // This returns the Razorpay order object (id, amount, currency, etc.)
};

/**
 * Verify Razorpay payment signature via the backend.
 * Route: POST /api/bookings/verify-payment
 */
export const verifyRazorpayPayment = async (data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<any> => {
  const res = await apiClient.post('/bookings/verify-payment', data);
  return res.data;
};
