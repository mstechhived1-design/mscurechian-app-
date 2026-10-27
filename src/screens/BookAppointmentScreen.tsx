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
 * API Base: https://www.mscurechain.com/api
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Animated,
  Easing,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Compass,
  Sparkles,
  ChevronDown,
  ArrowRight,
  ArrowUpDown,
} from 'lucide-react-native';

import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/designSystem';
import { SanctuaryText } from '@/components/SanctuaryComponents';
import { HospitalDiscoveryCard } from '@/components/HospitalDiscoveryCard';
import { DoctorDiscoveryCard } from '@/components/DoctorDiscoveryCard';
import { AttractiveDiscoveryLoader } from '@/components/AttractiveDiscoveryLoader';
import {
  fetchHospitals,
  fetchDoctors,
  fetchDoctorAvailability,
  extractSpecialties,
  getDoctorDisplayName,
  getDoctorSpecialty,
  getDoctorSpecialtiesList,
  getDoctorExperience,
  getDoctorImage,
  calculateDistance,
  formatDistance,
  resolveLocationName,
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

  // ── Two-stage Discovery (Step 1 Sub-step & Animation) ──
  const [subStep, setSubStep] = useState<'hospitals' | 'doctors'>('hospitals');
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── User Location (Zero hardcoded fallbacks, Rapido/BookMyShow text format) ──
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('Detecting location...');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // ── Hospital Discovery Filters ──
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalSort, setHospitalSort] = useState<'nearby' | 'relevance' | 'rating' | 'name'>('nearby');

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

  // ── Location Fetcher (Active GPS + Multi-layer Web/Native Geocoder) ──
  const handleGetLocation = useCallback(async (isUserInitiated: boolean = false) => {
    try {
      setIsLocating(true);
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const permissionReq = await Location.requestForegroundPermissionsAsync();
        status = permissionReq.status;
      }

      if (status !== 'granted') {
        setIsLocating(false);
        if (isUserInitiated) {
          Alert.alert(
            'Location Access Required',
            'Please enable location services in your phone settings to see distances to nearby hospitals.',
          );
        }
        setLocationName((prev) =>
          prev === 'Detecting location...' ? 'Tap to enable location' : prev
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: isUserInitiated ? Location.Accuracy.High : Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      setUserLocation({ latitude, longitude });
      AsyncStorage.setItem(
        'user_current_coords',
        JSON.stringify({ latitude, longitude })
      ).catch(() => {});

      // Resolve human-readable text format (e.g., "RTC Colony, Kadapa" or "Madhapur, Hyderabad")
      const resolvedAddress = await resolveLocationName(
        latitude,
        longitude,
        Location.reverseGeocodeAsync,
      );
      setLocationName(resolvedAddress);
      AsyncStorage.setItem('user_current_location', resolvedAddress).catch(() => {});
    } catch (err: any) {
      console.warn('[Location] fetch error:', err.message);
      if (isUserInitiated) {
        Alert.alert(
          'GPS Location',
          'Unable to fetch current GPS location. Please check your GPS and internet connection.'
        );
      }
      setLocationName((prev) =>
        prev === 'Detecting location...' ? 'Location unavailable' : prev
      );
    } finally {
      setIsLocating(false);
    }
  }, []);

  // On mount: check cached location first, then actively fetch live position
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const cachedLoc = await AsyncStorage.getItem('user_current_location');
        const cachedCoordsStr = await AsyncStorage.getItem('user_current_coords');
        if (cachedCoordsStr) {
          try {
            const parsed = JSON.parse(cachedCoordsStr);
            if (parsed?.latitude && parsed?.longitude && isMounted) {
              setUserLocation(parsed);
            }
          } catch {}
        }
        if (cachedLoc && isMounted) {
          setLocationName(cachedLoc);
        }
        // Actively request fresh live location
        await handleGetLocation(false);
      } catch (e) {
        console.warn('[Location] Mount error:', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [handleGetLocation]);

  // ── Processed Hospitals with Distance & Sorting ──
  const processedHospitals = useMemo(() => {
    let list = hospitals.map((h) => {
      let distanceKm: number | undefined = undefined;
      const lat = h.location?.lat ?? (h as any).latitude;
      const lng = h.location?.lng ?? (h as any).longitude;
      if (userLocation && typeof lat === 'number' && typeof lng === 'number') {
        distanceKm = calculateDistance(userLocation.latitude, userLocation.longitude, lat, lng);
      }
      return { ...h, distanceKm };
    });

    if (hospitalSearch.trim()) {
      const q = hospitalSearch.toLowerCase();
      list = list.filter((h) => {
        const name = (h.name || '').toLowerCase();
        const addr = (h.address || '').toLowerCase();
        const city = (h.city || '').toLowerCase();
        const state = (h.state || '').toLowerCase();
        const specs = (h.specialties || h.specialities || []).join(' ').toLowerCase();
        return (
          name.includes(q) ||
          addr.includes(q) ||
          city.includes(q) ||
          state.includes(q) ||
          specs.includes(q)
        );
      });
    }

    if (hospitalSort === 'nearby') {
      list.sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        if (a.distanceKm !== undefined) return -1;
        if (b.distanceKm !== undefined) return 1;
        return (b.rating || 4.5) - (a.rating || 4.5);
      });
    } else if (hospitalSort === 'rating') {
      list.sort((a, b) => (b.rating || 4.0) - (a.rating || 4.0));
    } else if (hospitalSort === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      // 'relevance'
      list.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    }

    return list;
  }, [hospitals, userLocation, hospitalSearch, hospitalSort]);

  // ── Scoped specialties based strictly on the selected hospital's doctors ──
  const hospitalSpecialties = useMemo(() => {
    let docs = allDoctors;
    if (selectedHospital) {
      docs = docs.filter((d) => {
        const hId = d.hospital?._id || (d.hospitals?.[0] as any)?._id;
        return hId === selectedHospital._id;
      });
    }
    return extractSpecialties(docs);
  }, [allDoctors, selectedHospital]);

  // ── Filtered doctors ──
  const filteredDoctors = useMemo(() => {
    let list = allDoctors;
    if (selectedHospital) {
      list = list.filter((d) => {
        const hId = d.hospital?._id || (d.hospitals?.[0] as any)?._id;
        return hId === selectedHospital._id;
      });
    }
    if (selectedSpecialty) {
      const target = selectedSpecialty.toLowerCase();
      list = list.filter((d) => {
        const specs = getDoctorSpecialtiesList(d);
        return specs.some((s) => s.toLowerCase() === target);
      });
    }
    if (doctorSearch.trim()) {
      const q = doctorSearch.toLowerCase();
      list = list.filter((d) => {
        const n = getDoctorDisplayName(d).toLowerCase();
        const sp = getDoctorSpecialty(d).toLowerCase();
        const specs = getDoctorSpecialtiesList(d).join(' ').toLowerCase();
        const bio = (d.bio || '').toLowerCase();
        return n.includes(q) || sp.includes(q) || specs.includes(q) || bio.includes(q);
      });
    }
    return list;
  }, [allDoctors, selectedHospital, selectedSpecialty, doctorSearch]);

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
        if (doc.hospital?._id) {
          const h = hospitals.find(x => x._id === doc.hospital?._id);
          if (h) setSelectedHospital(h);
        }
        setStep(2); // Jump to Step 2 (Date & Time)
      }
    }
  }, [qrParams, allDoctors, hospitals]);

  // Handle Hospital Auto-Selection from Navigation Params
  useEffect(() => {
    if (qrParams?.hospitalId && hospitals.length > 0 && subStep === 'hospitals') {
      console.log('[BookAppointment] Applying Hospital Params:', qrParams.hospitalId);
      const h = hospitals.find(x => x._id === qrParams.hospitalId);
      if (h) {
        setSelectedHospital(h);
        setSubStep('doctors');
        slideAnim.setValue(1);
      }
    }
  }, [qrParams, hospitals, subStep, slideAnim]);

  // ── Two-stage slide animations ──
  const slideToDoctors = useCallback((h: Hospital) => {
    setSelectedHospital(h);
    setSelectedSpecialty(''); // Reset specialty filter when selecting a hospital
    setDoctorSearch(''); // Reset search
    setSubStep('doctors');
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const slideToHospitals = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setSubStep('hospitals');
    });
  }, [slideAnim]);

  // ── Booking Doctor Directly moves to Step 2 ──
  const handleBookDoctor = useCallback((doc: Doctor) => {
    setSelectedDoctor(doc);
    if (!selectedHospital && doc.hospital?._id) {
      const h = hospitals.find((x) => x._id === doc.hospital?._id);
      if (h) setSelectedHospital(h);
    }
    setStep(2); // Jump to Step 2 (Date & Time slot picker)
  }, [selectedHospital, hospitals]);

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
    if (step === 1) {
      if (subStep === 'doctors') {
        slideToHospitals();
      } else {
        navigation.goBack();
      }
    } else if (step > 1) {
      setStep((s) => s - 1);
    }
  }, [step, subStep, slideToHospitals, navigation]);

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
          {step === 1 && subStep === 'doctors' ? 'Select Doctor' : 'Book Appointment'}
        </SanctuaryText>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Step Content ── */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {step === 1 && (
          <StepDoctor
            hospitals={processedHospitals}
            loadingHospitals={loadingDoctors}
            selectedHospital={selectedHospital}
            onSelectHospital={slideToDoctors}
            doctors={filteredDoctors}
            loadingDoctors={loadingDoctors}
            selectedDoctor={selectedDoctor}
            onBookDoctor={handleBookDoctor}
            subStep={subStep}
            slideAnim={slideAnim}
            onBackToHospitals={slideToHospitals}
            locationName={locationName}
            isLocating={isLocating}
            onGetLocation={handleGetLocation}
            hospitalSearch={hospitalSearch}
            onHospitalSearch={setHospitalSearch}
            hospitalSort={hospitalSort}
            onHospitalSort={setHospitalSort}
            doctorSearch={doctorSearch}
            onDoctorSearch={setDoctorSearch}
            specialties={hospitalSpecialties}
            selectedSpecialty={selectedSpecialty}
            onSelectSpecialty={setSelectedSpecialty}
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
      {!(step === 1 && subStep === 'hospitals') && (
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
      )}
    </View>
  );
}

// ─── STEP COMPONENTS ─────────────────────────────────────────────────────────

function StepDoctor({
  hospitals,
  loadingHospitals,
  selectedHospital,
  onSelectHospital,
  doctors,
  loadingDoctors,
  selectedDoctor,
  onBookDoctor,
  subStep,
  slideAnim,
  onBackToHospitals,
  locationName,
  isLocating,
  onGetLocation,
  hospitalSearch,
  onHospitalSearch,
  hospitalSort,
  onHospitalSort,
  doctorSearch,
  onDoctorSearch,
  specialties,
  selectedSpecialty,
  onSelectSpecialty,
}: {
  hospitals: Hospital[];
  loadingHospitals: boolean;
  selectedHospital: Hospital | null;
  onSelectHospital: (h: Hospital) => void;
  doctors: Doctor[];
  loadingDoctors: boolean;
  selectedDoctor: Doctor | null;
  onBookDoctor: (d: Doctor) => void;
  subStep: 'hospitals' | 'doctors';
  slideAnim: Animated.Value;
  onBackToHospitals: () => void;
  locationName: string;
  isLocating: boolean;
  onGetLocation: () => void;
  hospitalSearch: string;
  onHospitalSearch: (t: string) => void;
  hospitalSort: 'nearby' | 'relevance' | 'rating' | 'name';
  onHospitalSort: (s: 'nearby' | 'relevance' | 'rating' | 'name') => void;
  doctorSearch: string;
  onDoctorSearch: (t: string) => void;
  specialties: string[];
  selectedSpecialty: string;
  onSelectSpecialty: (s: string) => void;
}) {
  return (
    <View style={{ width: '100%', overflow: 'hidden' }}>
      {/* ── SCREEN 1: Hospital Discovery ── */}
      <Animated.View
        style={{
          width: '100%',
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -width],
              }),
            },
          ],
          opacity: slideAnim.interpolate({
            inputRange: [0, 0.7, 1],
            outputRange: [1, 0.2, 0],
          }),
          ...(subStep === 'doctors'
            ? { position: 'absolute', top: 0, left: 0, right: 0 }
            : { position: 'relative' }),
        }}
        pointerEvents={subStep === 'hospitals' ? 'auto' : 'none'}
      >
        {/* User Location Bar */}
        <View style={S.locationContainer}>
          <View style={S.locationLeft}>
            <MapPin size={16} color={COLORS.primary} />
            <View style={S.locationTextWrap}>
              <SanctuaryText variant="label_sm" style={S.locationLabel}>
                Your Location:
              </SanctuaryText>
              <TouchableOpacity activeOpacity={0.7} style={S.locationCityBtn} onPress={onGetLocation}>
                {isLocating ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <SanctuaryText
                      variant="label_md"
                      style={S.locationCityText}
                      numberOfLines={1}
                    >
                      Detecting location...
                    </SanctuaryText>
                  </View>
                ) : (
                  <>
                    <SanctuaryText
                      variant="label_md"
                      style={S.locationCityText}
                      numberOfLines={2}
                    >
                      {locationName}
                    </SanctuaryText>
                    <ChevronDown size={14} color="#64748B" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={S.getLocationBtn}
            onPress={onGetLocation}
            disabled={isLocating}
            activeOpacity={0.8}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Compass size={14} color={COLORS.primary} />
                <SanctuaryText variant="label_sm" style={S.getLocationText}>
                  Get Location
                </SanctuaryText>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Hospital Search */}
        <View style={S.hospitalSearchBox}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            style={S.searchInput}
            placeholder="Search hospital by name, area..."
            placeholderTextColor="#94A3B8"
            value={hospitalSearch}
            onChangeText={onHospitalSearch}
          />
          {!!hospitalSearch && (
            <TouchableOpacity
              onPress={() => onHospitalSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort Tabs — SINGLE ROW */}
        <View style={S.sortTabsRow}>
          <TouchableOpacity
            style={[S.sortTab, hospitalSort === 'nearby' && S.sortTabActive]}
            onPress={() => onHospitalSort('nearby')}
            activeOpacity={0.8}
          >
            <Compass
              size={12}
              color={hospitalSort === 'nearby' ? '#FFFFFF' : '#64748B'}
            />
            <SanctuaryText
              variant="label_sm"
              style={[
                S.sortTabText,
                hospitalSort === 'nearby' && S.sortTabTextActive,
              ]}
              numberOfLines={1}
            >
              Nearby
            </SanctuaryText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[S.sortTab, hospitalSort === 'relevance' && S.sortTabActive]}
            onPress={() => onHospitalSort('relevance')}
            activeOpacity={0.8}
          >
            <Sparkles
              size={12}
              color={hospitalSort === 'relevance' ? '#FFFFFF' : '#64748B'}
            />
            <SanctuaryText
              variant="label_sm"
              style={[
                S.sortTabText,
                hospitalSort === 'relevance' && S.sortTabTextActive,
              ]}
              numberOfLines={1}
            >
              Relevance
            </SanctuaryText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[S.sortTab, hospitalSort === 'rating' && S.sortTabActive]}
            onPress={() => onHospitalSort('rating')}
            activeOpacity={0.8}
          >
            <Star
              size={12}
              color={hospitalSort === 'rating' ? '#FFFFFF' : '#64748B'}
            />
            <SanctuaryText
              variant="label_sm"
              style={[
                S.sortTabText,
                hospitalSort === 'rating' && S.sortTabTextActive,
              ]}
              numberOfLines={1}
            >
              Rating
            </SanctuaryText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[S.sortTab, hospitalSort === 'name' && S.sortTabActive]}
            onPress={() => onHospitalSort('name')}
            activeOpacity={0.8}
          >
            <ArrowUpDown
              size={12}
              color={hospitalSort === 'name' ? '#FFFFFF' : '#64748B'}
            />
            <SanctuaryText
              variant="label_sm"
              style={[
                S.sortTabText,
                hospitalSort === 'name' && S.sortTabTextActive,
              ]}
              numberOfLines={1}
            >
              Name (A-Z)
            </SanctuaryText>
          </TouchableOpacity>
        </View>

        {/* Hospital Cards List */}
        {loadingHospitals ? (
          <AttractiveDiscoveryLoader
            type="hospitals"
            title="Finding Trusted Hospitals"
            subtitle="Loading your hospitals and doctors to book appointment for your favorite hospital..."
          />
        ) : hospitals.length === 0 ? (
          <View style={S.emptyCard}>
            <Building2 size={38} color="#CBD5E1" />
            <SanctuaryText variant="headline_sm" style={{ color: '#1E293B', marginTop: 8 }}>
              No Hospitals Found
            </SanctuaryText>
            <SanctuaryText variant="body_sm" style={S.emptyTxt}>
              {hospitalSearch
                ? `No hospitals match "${hospitalSearch}"`
                : 'No partner hospitals available in this area.'}
            </SanctuaryText>
            {!!hospitalSearch && (
              <TouchableOpacity
                onPress={() => onHospitalSearch('')}
                style={S.clearBtn}
              >
                <SanctuaryText
                  variant="label_sm"
                  style={{ color: COLORS.primary, fontWeight: '700' }}
                >
                  Clear Search
                </SanctuaryText>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={S.hospitalsList}>
            {hospitals.map((h) => (
              <HospitalDiscoveryCard
                key={h._id}
                hospital={h}
                distanceKm={h.distanceKm}
                isSelected={selectedHospital?._id === h._id}
                onSelect={() => onSelectHospital(h)}
              />
            ))}
          </View>
        )}
      </Animated.View>

      {/* ── SCREEN 2: Selected Hospital & Doctor Listing ── */}
      <Animated.View
        style={{
          width: '100%',
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [width, 0],
              }),
            },
          ],
          opacity: slideAnim.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0, 0.5, 1],
          }),
          ...(subStep === 'hospitals'
            ? { position: 'absolute', top: 0, left: 0, right: 0 }
            : { position: 'relative' }),
        }}
        pointerEvents={subStep === 'doctors' ? 'auto' : 'none'}
      >
        {/* Pinned Selected Hospital Header */}
        {selectedHospital && (
          <View style={S.pinnedHospitalCard}>
            <View style={S.pinnedTopRow}>
              <View style={S.pinnedLogoBox}>
                {selectedHospital.logo ? (
                  <Image
                    source={{ uri: selectedHospital.logo }}
                    style={S.pinnedLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <Building2 size={22} color={COLORS.primary} />
                )}
              </View>
              <View style={S.pinnedInfo}>
                <SanctuaryText
                  variant="label_lg"
                  style={S.pinnedName}
                  numberOfLines={2}
                >
                  {selectedHospital.name}
                </SanctuaryText>
                <View style={S.pinnedRatingRow}>
                  <Star size={12} color="#F59E0B" fill="#F59E0B" />
                  <SanctuaryText variant="label_sm" style={S.pinnedRating}>
                    {(selectedHospital.rating || 4.8).toFixed(1)}
                  </SanctuaryText>
                  <SanctuaryText variant="body_sm" style={S.pinnedDot}>
                    •
                  </SanctuaryText>
                  <SanctuaryText
                    variant="body_sm"
                    style={S.pinnedCategory}
                    numberOfLines={1}
                  >
                    {selectedHospital.city || 'Multi-Speciality'}
                  </SanctuaryText>
                </View>
              </View>
              <TouchableOpacity
                style={S.changeHospitalBtn}
                onPress={onBackToHospitals}
                activeOpacity={0.7}
              >
                <SanctuaryText variant="label_sm" style={S.changeHospitalText}>
                  Change
                </SanctuaryText>
              </TouchableOpacity>
            </View>

            {selectedHospital.address && (
              <View style={S.pinnedAddressRow}>
                <MapPin size={12} color="#64748B" style={{ marginTop: 2 }} />
                <SanctuaryText
                  variant="body_sm"
                  style={S.pinnedAddress}
                  numberOfLines={2}
                >
                  {selectedHospital.address}
                </SanctuaryText>
              </View>
            )}
          </View>
        )}

        {/* Section Header */}
        <View style={S.doctorsSectionHeader}>
          <SanctuaryText variant="headline_sm" style={S.doctorsTitle}>
            Our Doctors
          </SanctuaryText>
          <SanctuaryText variant="body_sm" style={S.doctorsSubtitle}>
            {doctors.length} qualified specialists available
          </SanctuaryText>
        </View>

        {/* Doctor Search */}
        <View style={S.doctorSearchBox}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            style={S.searchInput}
            placeholder="Search doctor by name or specialty..."
            placeholderTextColor="#94A3B8"
            value={doctorSearch}
            onChangeText={onDoctorSearch}
          />
          {!!doctorSearch && (
            <TouchableOpacity
              onPress={() => onDoctorSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal Specialty Chips */}
        {specialties.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={S.specialtyScroll}
            contentContainerStyle={S.specialtyScrollContent}
          >
            <TouchableOpacity
              style={[S.specialtyChip, !selectedSpecialty && S.specialtyChipActive]}
              onPress={() => onSelectSpecialty('')}
              activeOpacity={0.8}
            >
              <SanctuaryText
                variant="label_sm"
                style={[
                  S.specialtyChipText,
                  !selectedSpecialty && S.specialtyChipTextActive,
                ]}
              >
                All
              </SanctuaryText>
            </TouchableOpacity>
            {specialties.map((sp) => {
              const active = selectedSpecialty.toLowerCase() === sp.toLowerCase();
              return (
                <TouchableOpacity
                  key={sp}
                  style={[S.specialtyChip, active && S.specialtyChipActive]}
                  onPress={() => onSelectSpecialty(active ? '' : sp)}
                  activeOpacity={0.8}
                >
                  <SanctuaryText
                    variant="label_sm"
                    style={[
                      S.specialtyChipText,
                      active && S.specialtyChipTextActive,
                    ]}
                  >
                    {sp}
                  </SanctuaryText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Doctor Cards List */}
        {loadingDoctors ? (
          <AttractiveDiscoveryLoader
            type="doctors"
            title="Finding Specialist Doctors"
            subtitle="Loading your doctors and available consultation schedules for your favorite hospital..."
          />
        ) : doctors.length === 0 ? (
          <View style={S.emptyCard}>
            <Stethoscope size={38} color="#CBD5E1" />
            <SanctuaryText variant="headline_sm" style={{ color: '#1E293B', marginTop: 8 }}>
              No Doctors Available
            </SanctuaryText>
            <SanctuaryText variant="body_sm" style={S.emptyTxt}>
              {doctorSearch || selectedSpecialty
                ? 'No doctors found matching your search or specialty filter.'
                : 'No doctors are currently listed for this hospital.'}
            </SanctuaryText>
            {(!!doctorSearch || !!selectedSpecialty) && (
              <TouchableOpacity
                onPress={() => {
                  onDoctorSearch('');
                  onSelectSpecialty('');
                }}
                style={S.clearBtn}
              >
                <SanctuaryText
                  variant="label_sm"
                  style={{ color: COLORS.primary, fontWeight: '700' }}
                >
                  Clear Filters
                </SanctuaryText>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={S.doctorsList}>
            {doctors.map((d) => (
              <DoctorDiscoveryCard
                key={d._id}
                doctor={d}
                isSelected={selectedDoctor?._id === d._id}
                onBook={() => onBookDoctor(d)}
              />
            ))}
          </View>
        )}
      </Animated.View>
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
              onPress={(e: any) => {
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
    backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 48 : 28,
    paddingHorizontal: 14, paddingBottom: 8,
  },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#1E293B', fontWeight: '900', fontSize: 16 },
  progressBar: { height: 2.5, backgroundColor: '#E2E8F0' },
  progressFill: { height: 2.5, backgroundColor: COLORS.primary },
  stepRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#fff', paddingVertical: 7, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginBottom: 2,
  },
  stepActive: { backgroundColor: COLORS.primary },
  stepDone: { backgroundColor: '#059669' },
  stepNum: { fontSize: 9.5, fontWeight: '900', color: '#94A3B8' },
  stepLabel: { fontSize: 8, fontWeight: '700', color: '#94A3B8', textAlign: 'center' },
  body: { flex: 1 },
  bodyContent: { padding: 12, paddingTop: 14 },
  footer: {
    backgroundColor: '#fff', paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  nextBtn: { borderRadius: 14, overflow: 'hidden' },
  payBtn: { borderRadius: 14, overflow: 'hidden' },
  nextBtnDisabled: { opacity: 0.45 },
  nextGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  nextTxt: { color: '#fff', fontWeight: '900', fontSize: 13 },
});

// Shared step styles
const S = StyleSheet.create({
  sectionTitle: { color: '#1E293B', fontWeight: '900', fontSize: 15, marginBottom: 4 },
  sectionSub: { color: '#64748B', fontSize: 11, fontWeight: '500', marginBottom: 12 },
  loadingBox: { padding: 32, alignItems: 'center' },
  emptyCard: { alignItems: 'center', padding: 24, backgroundColor: '#fff', borderRadius: 14, gap: 8 },
  emptyTxt: { color: '#94A3B8', fontWeight: '600', textAlign: 'center', fontSize: 12 },
  clearBtn: { marginTop: 4, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#EAF1FF', borderRadius: 10 },

  // Location bar
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationCityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  locationCityText: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '800',
  },
  getLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  getLocationText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '800',
  },

  // Hospital search & sort
  hospitalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    gap: 8,
  },
  sortTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    marginBottom: 16,
    width: '100%',
  },
  sortTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 2,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortTabActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  sortTabText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  sortTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  hospitalsList: {
    paddingBottom: 20,
  },

  // Pinned Selected Hospital Header (Screen 2)
  pinnedHospitalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  pinnedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pinnedLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  pinnedLogo: {
    width: 44,
    height: 44,
  },
  pinnedInfo: {
    flex: 1,
  },
  pinnedName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 19,
  },
  pinnedRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  pinnedRating: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  pinnedDot: {
    fontSize: 11,
    color: '#94A3B8',
  },
  pinnedCategory: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  changeHospitalBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 2,
  },
  changeHospitalText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '800',
  },
  pinnedAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pinnedAddress: {
    fontSize: 11,
    lineHeight: 16,
    color: '#64748B',
    flex: 1,
  },

  // Doctors Section in Screen 2
  doctorsSectionHeader: {
    marginBottom: 12,
  },
  doctorsTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  doctorsSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  doctorSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    gap: 8,
  },
  specialtyScrollContent: {
    gap: 6,
    paddingBottom: 2,
  },
  specialtyChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  specialtyChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  specialtyChipText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '700',
  },
  specialtyChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  doctorsList: {
    paddingBottom: 20,
  },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, color: '#1E293B', fontSize: 12.5, fontWeight: '500' },

  // Hospital card
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  cardActive: { borderColor: COLORS.primary, backgroundColor: '#EAF1FF' },
  cardIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#EAF1FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  cardInfo: { flex: 1 },
  cardName: { color: '#1E293B', fontWeight: '800', fontSize: 13, marginBottom: 2 },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardSub: { color: '#94A3B8', fontSize: 10, flex: 1 },
  cardId: { color: '#CBD5E1', fontSize: 9, fontWeight: '700', marginTop: 1 },

  // Appointment type
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 10, gap: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  typeCardActive: { backgroundColor: '#F8FAFF' },
  typeIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  typeName: { color: '#1E293B', fontWeight: '800', fontSize: 12 },
  typeDesc: { color: '#94A3B8', fontSize: 9.5, fontWeight: '500', marginTop: 1 },
  typeDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },

  // Specialty filters
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  filterLabel: { color: '#64748B', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.6 },
  specialtyScroll: { marginBottom: 10 },
  specChip: {
    backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5,
    marginRight: 6, borderWidth: 1, borderColor: 'transparent',
  },
  specChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  specChipTxt: { color: '#475569', fontSize: 11, fontWeight: '700' },

  // Doctor card
  doctorCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 10, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  doctorCardActive: { borderColor: COLORS.primary, backgroundColor: '#EAF1FF' },
  avatar: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#EAF1FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 10, flexShrink: 0,
  },
  avatarTxt: { color: COLORS.primary, fontWeight: '900', fontSize: 16 },
  doctorInfo: { flex: 1 },
  doctorName: { color: '#1E293B', fontWeight: '800', fontSize: 13, marginBottom: 3 },
  specRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 2 },
  specPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#EAF1FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  specTxt: { color: COLORS.primary, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.4 },
  expPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  expTxt: { color: '#D97706', fontSize: 8.5, fontWeight: '900' },
  doctorHospital: { color: '#94A3B8', fontSize: 9.5, flex: 1 },
  doctorRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  feeLabel: { color: '#94A3B8', fontSize: 8.5, fontWeight: '800', letterSpacing: 0.4 },
  feeAmt: { color: '#059669', fontWeight: '900', fontSize: 14 },

  // Date
  dateScroll: { marginBottom: 4 },
  dateCard: {
    width: 54, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 8, marginRight: 8, borderWidth: 1.5, borderColor: 'transparent',
  },
  dateCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateDay: { color: '#64748B', fontSize: 9, fontWeight: '700' },
  dateNum: { color: '#1E293B', fontWeight: '900', fontSize: 16, marginVertical: 1 },
  dateMon: { color: '#94A3B8', fontSize: 9, fontWeight: '600' },

  // Time blocks
  slotHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  slotTitle: { color: '#1E293B', fontWeight: '800', fontSize: 12.5 },
  infoBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10,
  },
  infoTxt: { color: '#92400E', fontSize: 11, fontWeight: '500', flex: 1 },
  blockGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  blockCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9,
    borderWidth: 1.5, borderColor: '#E2E8F0', width: (width - 48) / 2,
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
