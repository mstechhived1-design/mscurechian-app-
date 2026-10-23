import type {
  BookingSlot,
  BookingConfirmation,
} from "@/services/paymentService";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ProfileSetup: undefined;
  Dashboard: undefined;
  Appointments: undefined;
  BookAppointment: { doctorId?: string; hospitalId?: string } | undefined;
  BookingPayment: { booking: BookingSlot };
  BookingConfirmation: { confirmation: BookingConfirmation };
  BMICalculator: undefined;
  AISymptomChecker: undefined;
  Reports: { patientId?: string; initialTab?: 'prescriptions' | 'pharmacy' | 'labs' } | undefined;
  Profile: undefined;
  Chat: { doctorId?: string; doctorName?: string; hospitalId?: string } | undefined;
  SOS: undefined;
  Vitals: undefined;
  Payments: undefined;
  HealthRecords: undefined;
  Hospitals: undefined;
  UpcomingAppointments: undefined;
  DischargeRecords: undefined;
  DischargeDetail: { dischargeId: string };
  Feedback: { hospitalId?: string; hospitalName?: string } | undefined;
  TermsAndConditions: { initialTab?: "terms" | "privacy" } | undefined;
  QRScanner: undefined;
  FoodRecommendation: undefined;
  WaterReminder: undefined;
  MedicineReminder: undefined;
  Achievements: undefined;
  EmergencyMedicalId: undefined;
  LiveQueue: { appointmentId?: string; appointment?: any } | undefined;
  NotificationCenter: undefined;
  OfflineVault: undefined;
  FamilyMembers: undefined;
};
