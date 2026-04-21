import type { BookingSlot, BookingConfirmation } from '@/services/paymentService';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ProfileSetup: undefined;
  Dashboard: undefined;
  Appointments: undefined;
  BookAppointment: undefined;
  BookingPayment: { booking: BookingSlot };
  BookingConfirmation: { confirmation: BookingConfirmation };
  BMICalculator: undefined;
  AISymptomChecker: undefined;
  Reports: { patientId?: string };
  Profile: undefined;
  Chat: { doctorId?: string; doctorName?: string };
  SOS: undefined;
  Vitals: undefined;
  Payments: undefined;
  HealthRecords: undefined;
  Hospitals: undefined;
  UpcomingAppointments: undefined;
  DischargeRecords: undefined;
  DischargeDetail: { dischargeId: string };
  Feedback: { hospitalId?: string; hospitalName?: string };
  TermsAndConditions: { initialTab?: 'terms' | 'privacy' };
};
