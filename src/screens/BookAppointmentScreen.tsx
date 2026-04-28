/**
 * BookAppointmentScreen — Multi-Step Appointment Booking (App Users / Timeslot Flow)
 *
 * HYBRID MODEL: This screen handles APP-side bookings only.
 * Frontdesk/walk-in → helpdesk dashboard (queue flow, no timeslot required).
 * App patient        → this screen → selects timeslot → confirmed appointment.
 *
 * STEPS:
 *   1 → Choose Doctor (search + hospital filter)
 *   2 → Pick Date + Time Slot (hourly blocks from /bookings/availability)
 *   3 → Symptoms & Notes
 *   4 → Review Summary → Confirm Booking
 *
 * Backend: Multitenant_MsCurechain_Backend (local, port 5003)
 * API Base: http://192.168.31.47:5003/api
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
  GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Calendar,
  Clock,
  Building2,
  User,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  Activity,
  Star,
  Heart,
  MapPin,
  Filter,
} from 'lucide-react-native';

import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/designSystem';
import { SanctuaryText } from '@/components/SanctuaryComponents';
import {
  fetchHospitals,
  fetchDoctors,
  fetchDoctorAvailability,
  extractSpecialties,
  getDoctorDisplayName,
  getDoctorSpecialty,
  getDoctorExperience,
  formatCurrency,
  formatDate,
  Hospital,
  Doctor,
  HourBlock,
  BookingSlot,
} from '@/services/paymentService';

const { width } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;
const STEP_LABELS = ['Doctor', 'Date & Time', 'Symptoms', 'Review'];

const APPOINTMENT_TYPES: Array<{
  id: string;
  label: string;
  icon: any;
  color: string;
  desc: string;
}> = [
  {
    id: 'OPD',
    label: 'In-Person',
    icon: Stethoscope,
    color: '#2563EB',
    desc: 'Visit the clinic physically',
  },
];

const COMMON_SYMPTOMS = [
  'Fever', 'Headache', 'Cough', 'Body ache', 'Fatigue',
  'Chest pain', 'Breathlessness', 'Nausea', 'Dizziness', 'Back pain',
  'Joint pain', 'Skin rash', 'Vomiting', 'Abdominal pain', 'General Check-up',
];

// ─── Main Component ────────────────────────────────────────────────────────────

export default function BookAppointmentScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'BookAppointment'>>();
  const qrParams = route.params;

  // ── Wizard step ──
  const [step, setStep] = useState(1);

  const [notes, setNotes] = useState('');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  // ── Processing ──
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Step 1 Data (Hospitals & Doctors) ──
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [appointmentType, setAppointmentType] = useState<string>('Consultation');

  const [vitals, setVitals] = useState({
    weight: '',
    bp: '',
    spO2: '',
    temp: '',
  });

  // ── Step 2 Data (Availability) ──
  const [selectedDate, setSelectedDate] = useState('');
  const [availableBlocks, setAvailableBlocks] = useState<HourBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<HourBlock | null>(null);
  const [selectedSubSlot, setSelectedSubSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState('');

  // ── Step 3 Data (Symptoms) ──
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');

  // ── Filtered doctors ──
  const filteredDoctors = useMemo(() => {
    let list = allDoctors;
    if (selectedSpecialty) {
      list = list.filter((d) => {
        const specs = d.specialties || [];
        const s = d.specialty || d.department || '';
        return specs.includes(selectedSpecialty) || s === selectedSpecialty;
      });
    }
    if (doctorSearch.trim()) {
      const q = doctorSearch.toLowerCase();
      list = list.filter((d) => {
        const n = getDoctorDisplayName(d).toLowerCase();
        const sp = getDoctorSpecialty(d).toLowerCase();
        return n.includes(q) || sp.includes(q);
      });
    }
    return list;
  }, [allDoctors, selectedSpecialty, doctorSearch]);

  // ── NEXT 7 days (starts from tomorrow) ──
  const availableDates = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      return d.toISOString().split('T')[0];
    }),
  []);

  // ── LOAD INITIAL DATA ──
  useEffect(() => {
    (async () => {
      setLoadingDoctors(true);
      const [hList, dList] = await Promise.all([
        fetchHospitals(),
        fetchDoctors(),
      ]);
      setHospitals(hList);
      setAllDoctors(dList);
      setSpecialties(extractSpecialties(dList));
      setLoadingDoctors(false);
    })();
  }, []);

  // ── When a doctor is selected, update selectedHospital automatically if not set or mismatched ──
  useEffect(() => {
    if (selectedDoctor && selectedDoctor.hospital) {
      const hId = selectedDoctor.hospital._id;
      if (!selectedHospital || selectedHospital._id !== hId) {
        const h = hospitals.find(x => x._id === hId);
        if (h) setSelectedHospital(h);
      }
    }
  }, [selectedDoctor, hospitals, selectedHospital]);

  // Handle QR Auto-Selection
  useEffect(() => {
    if (qrParams?.doctorId && allDoctors.length > 0 && step === 1) {
      console.log('[BookAppointment] Applying QR Params:', qrParams);
      const doc = allDoctors.find(d => d._id === qrParams.doctorId);
      if (doc) {
        setSelectedDoctor(doc);
        setStep(2); // Jump to Step 2 (Date & Time)
      }
    }
  }, [qrParams, allDoctors]);

  // Handle Hospital Auto-Selection from Navigation Params
  useEffect(() => {
    if (qrParams?.hospitalId && hospitals.length > 0) {
      console.log('[BookAppointment] Applying Hospital Params:', qrParams.hospitalId);
      const h = hospitals.find(x => x._id === qrParams.hospitalId);
      if (h) {
        setSelectedHospital(h);
      }
    }
  }, [qrParams, hospitals]);

  // ── LOAD AVAILABILITY when doctor + date selected ──
  useEffect(() => {
    if (!selectedDoctor || !selectedDate || !selectedHospital) return;
    setLoadingSlots(true);
    setAvailableBlocks([]);
    setSelectedBlock(null);
    setSlotsMessage('');
    fetchDoctorAvailability(selectedDoctor._id, selectedHospital._id, selectedDate).then(
      (resp) => {
        setAvailableBlocks(resp.slots);
        setSlotsMessage(resp.message || '');
        setLoadingSlots(false);
        // Reset subslot if date changes
        setSelectedSubSlot(null);
      },
    );
  }, [selectedDoctor, selectedDate, selectedHospital]);

  // ── Wizard helpers ──
  const goBack = useCallback(() => {
    if (step > 1) setStep((s) => s - 1);
    else navigation.goBack();
  }, [step, navigation]);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  }, [step]);

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 1: return !!selectedDoctor;
      case 2: return !!selectedDate && !!selectedBlock && !!selectedSubSlot;
      case 3: return customSymptom.trim().length > 0;
      case 4: return hasAcceptedTerms;
      default: return true;
    }
  }, [step, selectedDoctor, selectedDate, selectedBlock, selectedSubSlot, selectedSymptoms, notes, customSymptom, hasAcceptedTerms]);

  // ── Build payload ──
  const buildBookingSlot = (): BookingSlot => {
    // If we have subslot, use it, else fallback to block boundaries
    const startTime = selectedSubSlot?.startTime || selectedBlock!.timeSlot.split(' - ')[0].trim();
    const endTime = selectedSubSlot?.endTime || selectedBlock!.timeSlot.split(' - ')[1].trim();
    
    return {
      doctorId: selectedDoctor!._id,
      doctorName: getDoctorDisplayName(selectedDoctor!),
      doctorSpecialty: getDoctorSpecialty(selectedDoctor!),
      hospitalId: selectedHospital!._id,
      hospitalName: selectedHospital!.name,
      date: selectedDate,
      timeSlot: selectedBlock!.timeSlot,
      startTime,
      endTime,
      consultationFee: selectedDoctor!.consultationFee || 500,
      appointmentType,
      symptoms: customSymptom.trim(),
      notes: notes.trim(),
      vitals,
    };
  };

  // ── Proceed to Payment ──
  const proceedToPayment = useCallback(() => {
    if (!selectedDoctor || !selectedHospital || !selectedBlock || !selectedSubSlot) return;
    navigation.navigate('BookingPayment', { booking: buildBookingSlot() });
  }, [selectedDoctor, selectedHospital, selectedBlock, selectedSubSlot, selectedDate, selectedSymptoms, customSymptom, notes, appointmentType]);

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <SanctuaryText variant="headline_sm" style={styles.headerTitle}>
          Book Appointment
        </SanctuaryText>
        <View style={{ width: 40 }} />
      </View>



      {/* ── Step Content ── */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {step === 1 && (
          <StepDoctor
            hospitals={hospitals}
            selectedHospital={selectedHospital}
            onSelectHospital={setSelectedHospital}
            doctors={filteredDoctors}
            loading={loadingDoctors}
            selected={selectedDoctor}
            onSelect={setSelectedDoctor}
            specialties={specialties}
            selectedSpecialty={selectedSpecialty}
            onSelectSpecialty={setSelectedSpecialty}
            search={doctorSearch}
            onSearch={setDoctorSearch}
            appointmentType={appointmentType}
            onTypeChange={setAppointmentType}
          />
        )}

        {step === 2 && (
          <StepDateTime
            dates={availableDates}
            selectedDate={selectedDate}
            onSelectDate={(d) => { setSelectedDate(d); setSelectedBlock(null); setSelectedSubSlot(null); }}
            blocks={availableBlocks}
            selectedBlock={selectedBlock}
            onSelectBlock={(b) => { setSelectedBlock(b); setSelectedSubSlot(null); }}
            selectedSubSlot={selectedSubSlot}
            onSelectSubSlot={setSelectedSubSlot}
            loading={loadingSlots}
            message={slotsMessage}
          />
        )}

        {step === 3 && (
          <StepSymptoms
            selected={selectedSymptoms}
            onToggle={(s: string) => setSelectedSymptoms((prev: string[]) =>
              prev.includes(s) ? prev.filter((x: string) => x !== s) : [...prev, s]
            )}
            custom={customSymptom}
            onCustomChange={setCustomSymptom}
            notes={notes}
            onNotesChange={setNotes}
            appointmentType={appointmentType}
            onTypeChange={setAppointmentType}
            vitals={vitals}
            onVitalsChange={(v: any) => setVitals(prev => ({ ...prev, ...v }))}
          />
        )}

        {step === 4 && selectedDoctor && selectedHospital && selectedBlock && selectedSubSlot && (
          <StepReview
            doctor={selectedDoctor}
            hospital={selectedHospital}
            date={selectedDate}
            block={selectedBlock}
            subSlot={selectedSubSlot}
            reason={customSymptom.trim()}
            notes={notes}
            appointmentType={appointmentType}
            vitals={vitals}
            hasAcceptedTerms={hasAcceptedTerms}
            onToggleTerms={() => setHasAcceptedTerms(!hasAcceptedTerms)}
          />
        )}

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View style={styles.footer}>
        {step < TOTAL_STEPS ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
            onPress={goNext}
            disabled={!canProceed()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={canProceed() ? ['#1E40AF', '#2563EB'] : ['#CBD5E1', '#CBD5E1']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.nextGrad}
            >
              <SanctuaryText variant="label_lg" style={styles.nextTxt}>
                Continue — {STEP_LABELS[step] || 'Next'}
              </SanctuaryText>
              <ChevronRight size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.payBtn, !canProceed() && styles.nextBtnDisabled]} 
            onPress={proceedToPayment} 
            disabled={!canProceed()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={canProceed() ? ['#15803D', '#16A34A'] : ['#CBD5E1', '#CBD5E1']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.nextGrad}
            >
              <CreditCard size={20} color="#fff" />
              <SanctuaryText variant="label_lg" style={styles.nextTxt}>
                Confirm & Pay {selectedDoctor ? formatCurrency(selectedDoctor.consultationFee || 500) : ''}
              </SanctuaryText>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── STEP COMPONENTS ─────────────────────────────────────────────────────────

function StepDoctor({
  hospitals, selectedHospital, onSelectHospital,
  doctors, loading, selected, onSelect,
  specialties, selectedSpecialty, onSelectSpecialty,
  search, onSearch,
  appointmentType,
  onTypeChange,
}: {
  hospitals: Hospital[];
  selectedHospital: Hospital | null;
  onSelectHospital: (h: Hospital | null) => void;
  doctors: Doctor[];
  loading: boolean;
  selected: Doctor | null;
  onSelect: (d: Doctor | null) => void;
  specialties: string[];
  selectedSpecialty: string;
  onSelectSpecialty: (s: string) => void;
  search: string;
  onSearch: (t: string) => void;
  appointmentType: string;
  onTypeChange: (t: string) => void;
}) {
  const filteredByHospital = useMemo(() => {
    if (!selectedHospital) return doctors;
    return doctors.filter(d => {
      const hId = d.hospital?._id || (d.hospitals?.[0] as any)?._id;
      return hId === selectedHospital._id;
    });
  }, [doctors, selectedHospital]);

  return (
    <View>
      <SanctuaryText variant="headline_sm" style={S.sectionTitle}>Find Your Doctor</SanctuaryText>
      <SanctuaryText variant="body_sm" style={S.sectionSub}>
        Collaborated Hospitals: {hospitals.length} centers available
      </SanctuaryText>

      {/* Hospital scroll (Collaborated with) */}
      <View style={{ marginBottom: 20 }}>
        <View style={S.filterHeader}>
          <Building2 size={13} color="#64748B" />
          <SanctuaryText variant="label_sm" style={S.filterLabel}>OUR COLLABORATED HOSPITALS</SanctuaryText>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.specialtyScroll}>
          <TouchableOpacity
            style={[S.specChip, !selectedHospital && S.specChipActive]}
            onPress={() => onSelectHospital(null)}
          >
            <SanctuaryText variant="label_sm" style={[S.specChipTxt, !selectedHospital && { color: '#fff' }]}>
              All Hospitals
            </SanctuaryText>
          </TouchableOpacity>
          {hospitals.map((h) => (
            <TouchableOpacity
              key={h._id}
              style={[S.specChip, selectedHospital?._id === h._id && S.specChipActive]}
              onPress={() => onSelectHospital(selectedHospital?._id === h._id ? null : h)}
            >
              <SanctuaryText variant="label_sm" style={[S.specChipTxt, selectedHospital?._id === h._id && { color: '#fff' }]}>
                {h.name}
              </SanctuaryText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Appointment Type */}
      <View style={S.typeRow}>
        {APPOINTMENT_TYPES.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[S.typeCard, appointmentType === t.id && [S.typeCardActive, { borderColor: t.color }]]}
            onPress={() => onTypeChange(t.id)}
            activeOpacity={0.8}
          >
            <View style={[S.typeIcon, { backgroundColor: appointmentType === t.id ? t.color : '#F1F5F9' }]}>
              <t.icon size={18} color={appointmentType === t.id ? '#fff' : t.color} />
            </View>
            <View style={{ flex: 1 }}>
              <SanctuaryText variant="label_lg" style={[S.typeName, appointmentType === t.id && { color: t.color }]}>
                {t.label}
              </SanctuaryText>
              <SanctuaryText variant="body_sm" style={S.typeDesc}>{t.desc}</SanctuaryText>
            </View>
            {appointmentType === t.id && <View style={[S.typeDot, { backgroundColor: t.color }]} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Specialty Filter */}
      {specialties.length > 0 && (
        <>
          <View style={S.filterHeader}>
            <Filter size={13} color="#64748B" />
            <SanctuaryText variant="label_sm" style={S.filterLabel}>FILTER BY SPECIALTY</SanctuaryText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.specialtyScroll}>
            <TouchableOpacity
              style={[S.specChip, !selectedSpecialty && S.specChipActive]}
              onPress={() => onSelectSpecialty('')}
            >
              <SanctuaryText variant="label_sm" style={[S.specChipTxt, !selectedSpecialty && { color: '#fff' }]}>
                All
              </SanctuaryText>
            </TouchableOpacity>
            {specialties.map((sp) => (
              <TouchableOpacity
                key={sp}
                style={[S.specChip, selectedSpecialty === sp && S.specChipActive]}
                onPress={() => onSelectSpecialty(sp === selectedSpecialty ? '' : sp)}
              >
                <SanctuaryText variant="label_sm" style={[S.specChipTxt, selectedSpecialty === sp && { color: '#fff' }]}>
                  {sp}
                </SanctuaryText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Search */}
      <View style={S.searchBox}>
        <Search size={16} color="#94A3B8" />
        <TextInput
          style={S.searchInput}
          placeholder="Search by name or specialty..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={onSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => onSearch('')}>
            <X size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={S.loadingBox}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : filteredByHospital.length === 0 ? (
        <View style={S.emptyCard}>
          <Stethoscope size={36} color="#CBD5E1" />
          <SanctuaryText variant="body_sm" style={S.emptyTxt}>
            No doctors found {selectedSpecialty ? `for ${selectedSpecialty}` : ''}
          </SanctuaryText>
          {(!!selectedSpecialty || !!selectedHospital) && (
            <TouchableOpacity onPress={() => { onSelectSpecialty(''); onSelectHospital(null); }} style={S.clearBtn}>
              <SanctuaryText variant="label_sm" style={{ color: COLORS.primary, fontWeight: '700' }}>
                Clear Filters
              </SanctuaryText>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        filteredByHospital.map((d) => {
          const name = getDoctorDisplayName(d);
          const spec = getDoctorSpecialty(d);
          const exp = getDoctorExperience(d);
          const isSelected = selected?._id === d._id;
          return (
            <TouchableOpacity
              key={d._id}
              style={[S.doctorCard, isSelected && S.doctorCardActive]}
              onPress={() => onSelect(isSelected ? null : d)}
              activeOpacity={0.8}
            >
              {/* Avatar */}
              <View style={[S.avatar, isSelected && { backgroundColor: COLORS.primary }]}>
                <SanctuaryText variant="label_lg" style={[S.avatarTxt, isSelected && { color: '#fff' }]}>
                  {name.replace('Dr. ', '').charAt(0)}
                </SanctuaryText>
              </View>

              <View style={S.doctorInfo}>
                <SanctuaryText variant="label_lg" style={S.doctorName}>{name}</SanctuaryText>
                <View style={S.specRow}>
                  <View style={S.specPill}>
                    <Stethoscope size={9} color={COLORS.primary} />
                    <SanctuaryText variant="label_sm" style={S.specTxt}>{spec.toUpperCase()}</SanctuaryText>
                  </View>
                  {exp > 0 && (
                    <View style={S.expPill}>
                      <Star size={9} color="#D97706" />
                      <SanctuaryText variant="label_sm" style={S.expTxt}>{exp}+ yrs</SanctuaryText>
                    </View>
                  )}
                </View>
                {d.hospital?.name && (
                  <View style={S.cardSubRow}>
                    <Building2 size={9} color="#94A3B8" />
                    <SanctuaryText variant="body_sm" style={S.doctorHospital} numberOfLines={1}>
                      {d.hospital.name}
                    </SanctuaryText>
                  </View>
                )}
              </View>

              <View style={S.doctorRight}>
                <SanctuaryText variant="label_sm" style={S.feeLabel}>FEE</SanctuaryText>
                <SanctuaryText variant="headline_sm" style={S.feeAmt}>
                  ₹{(d.consultationFee || 500).toLocaleString('en-IN')}
                </SanctuaryText>
                {isSelected && <CheckCircle2 size={18} color={COLORS.primary} />}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

// ── Step 3: Date & Time ───────────────────────────────────────────────────────

function StepDateTime({
  dates, selectedDate, onSelectDate,
  blocks, selectedBlock, onSelectBlock,
  selectedSubSlot, onSelectSubSlot,
  loading, message,
}: {
  dates: string[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
  blocks: HourBlock[];
  selectedBlock: HourBlock | null;
  onSelectBlock: (b: HourBlock) => void;
  selectedSubSlot: { startTime: string; endTime: string } | null;
  onSelectSubSlot: (s: { startTime: string; endTime: string }) => void;
  loading: boolean;
  message: string;
}) {
  const formatDateLabel = (iso: string) => {
    const d = new Date(iso);
    return {
      day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short' }),
    };
  };

  return (
    <View>
      <SanctuaryText variant="headline_sm" style={S.sectionTitle}>Select Date</SanctuaryText>

      {/* Date Picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.dateScroll}>
        {dates.map((iso) => {
          const { day, date, month } = formatDateLabel(iso);
          const isSelected = selectedDate === iso;
          return (
            <TouchableOpacity
              key={iso}
              style={[S.dateCard, isSelected && S.dateCardActive]}
              onPress={() => onSelectDate(iso)}
              activeOpacity={0.8}
            >
              <SanctuaryText variant="label_sm" style={[S.dateDay, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>{day}</SanctuaryText>
              <SanctuaryText variant="headline_sm" style={[S.dateNum, isSelected && { color: '#fff' }]}>{date}</SanctuaryText>
              <SanctuaryText variant="label_sm" style={[S.dateMon, isSelected && { color: 'rgba(255,255,255,0.7)' }]}>{month}</SanctuaryText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Time Slots */}
      {selectedDate && (
        <View style={{ marginTop: 24 }}>
          {/* Level 1: Select Hour */}
          <View style={S.slotHeader}>
            <Clock size={15} color={COLORS.primary} />
            <SanctuaryText variant="label_lg" style={S.slotTitle}>1. Select Hour Block</SanctuaryText>
          </View>

          {loading ? (
            <View style={S.loadingBox}><ActivityIndicator color={COLORS.primary} /></View>
          ) : message && blocks.length === 0 ? (
            <View style={S.infoBox}>
              <AlertCircle size={18} color="#D97706" />
              <SanctuaryText variant="body_sm" style={S.infoTxt}>{message}</SanctuaryText>
            </View>
          ) : blocks.length === 0 ? (
            <View style={S.emptyCard}>
              <Clock size={32} color="#CBD5E1" />
              <SanctuaryText variant="body_sm" style={S.emptyTxt}>No available slots for this date</SanctuaryText>
            </View>
          ) : (
            <View style={S.blockGrid}>
              {blocks.map((block) => {
                const isSelected = selectedBlock?.timeSlot === block.timeSlot;
                return (
                  <TouchableOpacity
                    key={block.timeSlot}
                    style={[S.blockCard, isSelected && S.blockCardActive, block.isFull && S.blockCardFull]}
                    onPress={() => !block.isFull && onSelectBlock(block)}
                    activeOpacity={block.isFull ? 1 : 0.8}
                    disabled={block.isFull}
                  >
                    <Clock size={13} color={isSelected ? '#fff' : block.isFull ? '#CBD5E1' : COLORS.primary} />
                    <SanctuaryText variant="label_lg" style={[S.blockTime, isSelected && { color: '#fff' }, block.isFull && S.blockTimeFull]}>
                      {block.timeSlot}
                    </SanctuaryText>
                    <View style={[S.blockBadge, isSelected && S.blockBadgeActive, block.isFull && S.blockBadgeFull]}>
                      <SanctuaryText variant="label_sm" style={[S.blockBadgeTxt, isSelected && { color: '#fff' }, block.isFull && { color: '#CBD5E1' }]}>
                        {block.isFull ? 'Full' : `${block.availableCount} left`}
                      </SanctuaryText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Level 2: Select 5-min Sub-slot */}
          {selectedBlock && (
            <View style={S.subSlotSection}>
              <View style={S.slotHeader}>
                <Clock size={16} color={COLORS.primary} />
                <SanctuaryText variant="label_lg" style={S.slotTitle}>2. Choose Exact Time</SanctuaryText>
              </View>
              <SanctuaryText variant="body_sm" style={S.subSlotInstruct}>
                Within the {selectedBlock.timeSlot} window
              </SanctuaryText>
              
              <View style={S.subSlotGrid}>
                {selectedBlock.subSlots?.map((sub, idx) => {
                  const isSelected = selectedSubSlot?.startTime === sub.startTime;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[S.subSlotCard, isSelected && S.subSlotCardActive, sub.isBooked && S.subSlotCardBooked]}
                      onPress={() => !sub.isBooked && onSelectSubSlot(sub)}
                      disabled={sub.isBooked}
                    >
                      <SanctuaryText variant="label_sm" style={[S.subSlotTxt, isSelected && { color: '#fff' }, sub.isBooked && { color: '#94A3B8' }]}>
                        {sub.startTime}
                      </SanctuaryText>
                      <SanctuaryText variant="label_xs" style={[S.subSlotEndTxt, isSelected && { color: 'rgba(255,255,255,0.7)' }, sub.isBooked && { color: '#CBD5E1' }]}>
                        to {sub.endTime}
                      </SanctuaryText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── Step 4: Symptoms ──────────────────────────────────────────────────────────

function StepSymptoms({
  selected, onToggle, custom, onCustomChange, notes, onNotesChange,
  appointmentType, onTypeChange, vitals, onVitalsChange
}: {
  selected: string[];
  onToggle: (s: string) => void;
  custom: string;
  onCustomChange: (t: string) => void;
  notes: string;
  onNotesChange: (t: string) => void;
  appointmentType: string;
  onTypeChange: (t: string) => void;
  vitals: any;
  onVitalsChange: (v: any) => void;
}) {
  const types = ['Consultation', 'Follow-up', 'Routine', 'Emergency'];

  return (
    <View>
      <SanctuaryText variant="label_lg" style={S.inputLabel}>Appointment Category</SanctuaryText>
      <View style={[S.chipWrap, { marginBottom: 24 }]}>
        {types.map(t => (
          <TouchableOpacity
            key={t}
            style={[S.typeChip, appointmentType === t && S.typeChipActive]}
            onPress={() => onTypeChange(t)}
          >
            <SanctuaryText variant="label_sm" style={[S.chipTxt, appointmentType === t && { color: '#fff' }]}>{t}</SanctuaryText>
          </TouchableOpacity>
        ))}
      </View>

      <SanctuaryText variant="headline_sm" style={S.sectionTitle}>Reason for Visit</SanctuaryText>
      <SanctuaryText variant="body_sm" style={S.sectionSub}>
        Briefly describe why you are booking this appointment
      </SanctuaryText>

      <View style={{ marginBottom: 12 }}>
        <TextInput
          style={S.input}
          placeholder="e.g. Regular checkup, Chronic pain, Follow-up..."
          placeholderTextColor="#94A3B8"
          value={custom}
          onChangeText={onCustomChange}
        />
      </View>

      {/* Vitals Section */}
      <View style={{ marginTop: 28 }}>
        <SanctuaryText variant="label_lg" style={S.inputLabel}>My Vitals (Optional)</SanctuaryText>
        <View style={S.vitalsRow}>
          <View style={S.vitalCol}>
            <SanctuaryText variant="label_sm" style={S.vitalLabel}>Weight (kg)</SanctuaryText>
            <TextInput
              style={S.vitalInput}
              keyboardType="decimal-pad"
              value={vitals.weight}
              onChangeText={(t) => onVitalsChange({ weight: t })}
              placeholder="0"
            />
          </View>
          <View style={S.vitalCol}>
            <SanctuaryText variant="label_sm" style={S.vitalLabel}>BP</SanctuaryText>
            <TextInput
              style={S.vitalInput}
              value={vitals.bp}
              onChangeText={(t) => onVitalsChange({ bp: t })}
              placeholder="120/80"
            />
          </View>
          <View style={S.vitalCol}>
            <SanctuaryText variant="label_sm" style={S.vitalLabel}>Temp (°F)</SanctuaryText>
            <TextInput
              style={S.vitalInput}
              keyboardType="decimal-pad"
              value={vitals.temp}
              onChangeText={(t) => onVitalsChange({ temp: t })}
              placeholder="98.6"
            />
          </View>
        </View>
      </View>

      <View style={{ marginTop: 24 }}>
        <SanctuaryText variant="label_lg" style={S.inputLabel}>Additional Notes</SanctuaryText>
        <TextInput
          style={[S.input, S.textarea]}
          placeholder="Describe your concern in detail..."
          placeholderTextColor="#94A3B8"
          value={notes}
          onChangeText={onNotesChange}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </View>
  );
}

// ── Step 5: Review ────────────────────────────────────────────────────────────

function StepReview({
  doctor, hospital, date, block, subSlot, reason, notes, appointmentType, vitals,
  hasAcceptedTerms, onToggleTerms
}: {
  doctor: Doctor;
  hospital: Hospital;
  date: string;
  block: HourBlock;
  subSlot: { startTime: string; endTime: string };
  reason: string;
  notes: string;
  appointmentType: string;
  vitals: any;
  hasAcceptedTerms: boolean;
  onToggleTerms: () => void;
}) {
  const navigation = useNavigation<any>();
  const rows = [
    { icon: Stethoscope, label: 'Doctor',   value: getDoctorDisplayName(doctor) },
    { icon: Activity,    label: 'Specialty', value: getDoctorSpecialty(doctor) },
    { icon: Building2,   label: 'Hospital',  value: hospital.name },
    { icon: Calendar,    label: 'Date',      value: formatDate(date) },
    { icon: Clock,       label: 'Time Slot', value: `${subSlot.startTime} (${block.timeSlot})` },
    { icon: Heart,       label: 'Type',      value: appointmentType },
    { icon: FileText,    label: 'Reason',    value: reason || 'General Consultation' },
  ];

  return (
    <View>
      <SanctuaryText variant="headline_sm" style={S.sectionTitle}>Review Booking</SanctuaryText>
      <SanctuaryText variant="body_sm" style={S.sectionSub}>
        Confirm all details before payment
      </SanctuaryText>

      <View style={S.summaryCard}>
        {rows.map(({ icon: Icon, label, value }) => (
          <View key={label} style={S.sumRow}>
            <View style={S.sumIconBox}><Icon size={14} color={COLORS.primary} /></View>
            <SanctuaryText variant="body_sm" style={S.sumLabel}>{label}</SanctuaryText>
            <SanctuaryText variant="label_lg" style={S.sumValue} numberOfLines={2}>{value}</SanctuaryText>
          </View>
        ))}
      </View>

      {/* Vitals Summary */}
      {(vitals.weight || vitals.bp || vitals.temp) && (
        <View style={S.notesCard}>
          <SanctuaryText variant="label_sm" style={S.notesLabel}>CLIENT VITALS</SanctuaryText>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            {vitals.weight && <SanctuaryText variant="body_sm">Weight: <SanctuaryText variant="label_sm">{vitals.weight}kg</SanctuaryText></SanctuaryText>}
            {vitals.bp && <SanctuaryText variant="body_sm">BP: <SanctuaryText variant="label_sm">{vitals.bp}</SanctuaryText></SanctuaryText>}
            {vitals.temp && <SanctuaryText variant="body_sm">Temp: <SanctuaryText variant="label_sm">{vitals.temp}°F</SanctuaryText></SanctuaryText>}
          </View>
        </View>
      )}
    
      {notes.trim().length > 0 && (
        <View style={S.notesCard}>
          <SanctuaryText variant="label_sm" style={S.notesLabel}>DOCTOR'S NOTES</SanctuaryText>
          <SanctuaryText variant="body_sm" style={S.notesTxt}>{notes}</SanctuaryText>
        </View>
      )}

      <LinearGradient colors={['#1E293B', '#0F172A']} style={S.payBand}>
        <View>
          <SanctuaryText variant="label_sm" style={S.payBandLabel}>CONSULTATION FEE</SanctuaryText>
          <SanctuaryText variant="headline_sm" style={S.payBandAmt}>
            {formatCurrency(doctor.consultationFee || 500)}
          </SanctuaryText>
        </View>
        <View style={S.payBandRight}>
          <CreditCard size={20} color="rgba(255,255,255,0.6)" />
          <SanctuaryText variant="label_sm" style={S.payBandNote}>UPI / Card / Net Banking</SanctuaryText>
        </View>
      </LinearGradient>

      <View style={S.disclaimer}>
        <AlertCircle size={14} color="#D97706" />
        <SanctuaryText variant="body_sm" style={S.disclaimerTxt}>
          Your appointment will be confirmed immediately after payment. You will receive a booking confirmation.
        </SanctuaryText>
      </View>

      {/* Terms & Conditions Box */}
      <TouchableOpacity 
        style={[S.tcBox, hasAcceptedTerms && S.tcBoxActive]} 
        onPress={onToggleTerms}
        activeOpacity={0.8}
      >
        <View style={[S.tcCheck, hasAcceptedTerms && S.tcCheckActive]}>
          {hasAcceptedTerms && <CheckCircle2 size={12} color="#fff" />}
        </View>
        <View style={{ flex: 1 }}>
          <SanctuaryText variant="body_sm" style={S.tcTxt}>
            I agree to the{' '}
            <SanctuaryText 
              variant="label_sm" 
              style={S.tcLink}
              onPress={(e: GestureResponderEvent) => {
                e.stopPropagation();
                navigation.navigate('TermsAndConditions');
              }}
            >
              Terms & Conditions
            </SanctuaryText>
            {' '}and sensitive data processing policies of MS CureChain.
          </SanctuaryText>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#1E293B', fontWeight: '900', fontSize: 18 },
  progressBar: { height: 3, backgroundColor: '#E2E8F0' },
  progressFill: { height: 3, backgroundColor: COLORS.primary },
  stepRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  stepActive: { backgroundColor: COLORS.primary },
  stepDone: { backgroundColor: '#059669' },
  stepNum: { fontSize: 11, fontWeight: '900', color: '#94A3B8' },
  stepLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', textAlign: 'center' },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingTop: 24 },
  footer: {
    backgroundColor: '#fff', paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  nextBtn: { borderRadius: 18, overflow: 'hidden' },
  payBtn: { borderRadius: 18, overflow: 'hidden' },
  nextBtnDisabled: { opacity: 0.45 },
  nextGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 10 },
  nextTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});

// Shared step styles
const S = StyleSheet.create({
  sectionTitle: { color: '#1E293B', fontWeight: '900', fontSize: 18, marginBottom: 6 },
  sectionSub: { color: '#64748B', fontSize: 13, fontWeight: '500', marginBottom: 18 },
  loadingBox: { padding: 48, alignItems: 'center' },
  emptyCard: { alignItems: 'center', padding: 40, backgroundColor: '#fff', borderRadius: 18, gap: 12 },
  emptyTxt: { color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
  clearBtn: { marginTop: 4, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#EAF1FF', borderRadius: 12 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginBottom: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, color: '#1E293B', fontSize: 14, fontWeight: '500' },

  // Hospital card
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: 'transparent',
  },
  cardActive: { borderColor: COLORS.primary, backgroundColor: '#EAF1FF' },
  cardIcon: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: '#EAF1FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  cardInfo: { flex: 1 },
  cardName: { color: '#1E293B', fontWeight: '800', fontSize: 14, marginBottom: 3 },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardSub: { color: '#94A3B8', fontSize: 11, flex: 1 },
  cardId: { color: '#CBD5E1', fontSize: 10, fontWeight: '700', marginTop: 2 },

  // Appointment type
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  typeCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 14, gap: 10, borderWidth: 2, borderColor: 'transparent',
  },
  typeCardActive: { backgroundColor: '#F8FAFF' },
  typeIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  typeName: { color: '#1E293B', fontWeight: '800', fontSize: 13 },
  typeDesc: { color: '#94A3B8', fontSize: 10, fontWeight: '500', marginTop: 2 },
  typeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },

  // Specialty filters
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  filterLabel: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  specialtyScroll: { marginBottom: 14 },
  specChip: {
    backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, borderWidth: 1, borderColor: 'transparent',
  },
  specChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  specChipTxt: { color: '#475569', fontSize: 12, fontWeight: '700' },

  // Doctor card
  doctorCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: 'transparent',
  },
  doctorCardActive: { borderColor: COLORS.primary, backgroundColor: '#EAF1FF' },
  avatar: {
    width: 52, height: 52, borderRadius: 18, backgroundColor: '#EAF1FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 14, flexShrink: 0,
  },
  avatarTxt: { color: COLORS.primary, fontWeight: '900', fontSize: 20 },
  doctorInfo: { flex: 1 },
  doctorName: { color: '#1E293B', fontWeight: '800', fontSize: 14, marginBottom: 5 },
  specRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  specPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EAF1FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  specTxt: { color: COLORS.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  expPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  expTxt: { color: '#D97706', fontSize: 9, fontWeight: '900' },
  doctorHospital: { color: '#94A3B8', fontSize: 10, flex: 1 },
  doctorRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  feeLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  feeAmt: { color: '#059669', fontWeight: '900', fontSize: 16 },

  // Date
  dateScroll: { marginBottom: 4 },
  dateCard: {
    width: 68, alignItems: 'center', backgroundColor: '#fff', borderRadius: 18,
    paddingVertical: 14, marginRight: 10, borderWidth: 2, borderColor: 'transparent',
  },
  dateCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateDay: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  dateNum: { color: '#1E293B', fontWeight: '900', fontSize: 22, marginVertical: 2 },
  dateMon: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },

  // Time blocks
  slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  slotTitle: { color: '#1E293B', fontWeight: '800', fontSize: 14 },
  infoBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14,
  },
  infoTxt: { color: '#92400E', fontSize: 13, fontWeight: '500', flex: 1 },
  blockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  blockCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 14,
    borderWidth: 2, borderColor: '#E2E8F0', width: (width - 56) / 2,
  },
  blockCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  blockCardFull: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9', opacity: 0.6 },
  blockTime: { color: '#1E293B', fontWeight: '800', fontSize: 12, flex: 1 },
  blockTimeFull: { color: '#CBD5E1' },
  blockBadge: {
    backgroundColor: '#EAF1FF', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2,
  },
  blockBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  blockBadgeFull: { backgroundColor: '#F1F5F9' },
  blockBadgeTxt: { color: COLORS.primary, fontSize: 9, fontWeight: '900' },

  // Symptoms
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: {
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipTxt: { color: '#475569', fontSize: 12, fontWeight: '700' },

  // Sub-slots
  subSlotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subSlotCard: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 10,
    borderWidth: 1.5, borderColor: '#E2E8F0', width: (width - 56) / 3, alignItems: 'center',
  },
  subSlotCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  subSlotCardBooked: { backgroundColor: '#F1F5F9', borderColor: '#F1F5F9', opacity: 0.5 },
  subSlotTxt: { color: '#475569', fontSize: 10, fontWeight: '800' },
  subSlotEndTxt: { color: '#94A3B8', fontSize: 8, fontWeight: '600' },
  subSlotSection: { marginTop: 20 },
  subSlotInstruct: { color: '#64748B', fontSize: 12, marginBottom: 12 },

  inputLabel: { color: '#475569', fontWeight: '800', fontSize: 12, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
    color: '#1E293B', fontSize: 14, borderWidth: 1.5, borderColor: '#E2E8F0', marginBottom: 16,
  },
  textarea: { minHeight: 100 },

  // Vitals
  vitalsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  vitalCol: { flex: 1 },
  vitalLabel: { color: '#64748B', marginBottom: 4, fontSize: 11, fontWeight: '700' },
  vitalInput: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0', color: '#1E293B', fontWeight: '900',
  },
  
  // Category Chips
  typeChip: {
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0', marginRight: 8,
  },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  // Review summary
  summaryCard: { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  sumRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 12,
  },
  sumIconBox: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#EAF1FF', justifyContent: 'center', alignItems: 'center' },
  sumLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', width: 80 },
  sumValue: { color: '#1E293B', fontWeight: '800', fontSize: 13, flex: 1, textAlign: 'right' },
  notesCard: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, marginBottom: 12 },
  notesLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 8 },
  notesTxt: { color: '#475569', fontSize: 13, fontWeight: '500', lineHeight: 20 },
  payBand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 18, padding: 20, marginBottom: 12 },
  payBandLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 },
  payBandAmt: { color: '#fff', fontWeight: '900', fontSize: 22 },
  payBandRight: { alignItems: 'flex-end', gap: 8 },
  payBandNote: { color: 'rgba(255,255,255,0.5)', fontSize: 10, textAlign: 'right' },
  disclaimer: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14,
  },
  disclaimerTxt: { color: '#92400E', fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 18 },

  tcBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  tcBoxActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EAF1FF',
  },
  tcCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tcCheckActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  tcTxt: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
  },
  tcLink: {
    color: COLORS.primary,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});
