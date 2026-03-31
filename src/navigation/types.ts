export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Appointments: undefined;
  BookAppointment: undefined;
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
  DischargeRecords: undefined;
  DischargeDetail: { dischargeId: string };
  Feedback: { hospitalId?: string; hospitalName?: string };
};
