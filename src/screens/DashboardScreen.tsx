import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Alert,
} from 'react-native';
import { Avatar, Portal, Modal, Button } from 'react-native-paper';
import {
  MapPin,
  Calendar,
  Activity,
  CreditCard,
  ClipboardList,
  ShieldAlert,
  ChevronRight,
  QrCode,
  Building2,
  Clock,
  Stethoscope,
  Scale,
  Brain,
  Utensils,
  Droplet,
  Pill,
  Bell,
  Bed,
  X,
  Users,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { socketService } from '@/services/socketService';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { useSocket } from '@/context/SocketContext';
import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '../constants/designSystem';
import { SanctuaryText, DigitalAtriumLoader } from '../components/SanctuaryComponents';
import { safeFormat } from '@/utils/dateUtils';
import LanguageSelector from '@/components/LanguageSelector';
import { streakService } from '@/services/streakService';
import OfflineBanner from '@/components/OfflineBanner';
import { offlineVaultService } from '@/services/offlineVaultService';
import ProfileSwitcherModal from '@/components/ProfileSwitcherModal';
import { familyService } from '@/services/familyService';
import GlassModal from '@/components/GlassModal';
import AnimatedServiceIcon, { ServiceItemConfig } from '@/components/AnimatedServiceIcon';
import FamilyIcon3D from '@/components/FamilyIcon3D';

// 3D PhonePe Style Service Icons
const IconVisit = require('../../assets/service-icons/visit.jpg');
const IconQueue = require('../../assets/service-icons/live_queue.jpg');
const IconRecords = require('../../assets/service-icons/records.jpg');
const IconBilling = require('../../assets/service-icons/billing.jpg');
const IconVitals = require('../../assets/service-icons/vitals.jpg');
const IconBmi = require('../../assets/service-icons/bmi.jpg');
const IconDiet = require('../../assets/service-icons/diet.jpg');
const IconWater = require('../../assets/service-icons/water.jpg');
const IconAi = require('../../assets/service-icons/ai_symptoms.jpg');
const IconMedicines = require('../../assets/service-icons/medicines.jpg');
const IconEmergencyId = require('../../assets/service-icons/emergency_id.jpg');
const IconVault = require('../../assets/service-icons/vault.jpg');

const { width } = Dimensions.get('window');
const CARD_GAP = 10;
// Width changes based on how many cards exist — computed inside component, stored here as a helper
const PEEK_CARD_W = width - 48;  // Peek mode: shows edge of next card (multiple cards)
const FULL_CARD_W = width - 32;  // Full mode: single card takes all space

// Rotate between these gradient pairs for different hospitals
const CARD_GRADIENTS: [string, string][] = [
  ['#1E3A6E', '#2B5DB8'],
  ['#0F4C3A', '#1A7A5E'],
  ['#3D1A6E', '#6B35B8'],
  ['#6E1A1A', '#B83535'],
  ['#1A3D6E', '#357DB8'],
];



interface HospitalReg {
  // ── Nested shape (most common): { hospital: { _id, name }, mrn, status }
  hospital?: { _id: string; name: string; address?: string };
  // ── Flat shapes some backends return
  hospitalName?: string;
  hospitalId?: string;
  name?: string;          // some APIs put hospital name at root level
  patientMrn?: string;          // alternate MRN key variants
  mrnNumber?: string;
  medicalRecordNumber?: string;
  mrn?: string;
  status?: string;
  registeredAt?: string;
}

/** Safely extract hospital display name regardless of API shape */
function getHospitalName(item: HospitalReg): string {
  return (
    item.hospital?.name ||
    item.hospitalName ||
    item.name ||
    'Unknown Hospital'
  );
}

/** Safely extract MRN regardless of API shape */
function getMRN(item: HospitalReg, fallback: string): string {
  return (
    item.mrn ||
    item.patientMrn ||
    item.mrnNumber ||
    item.medicalRecordNumber ||
    fallback
  );
}

export default function DashboardScreen() {
  const { t } = useTranslation();

  const SERVICES: ServiceItemConfig[] = [
    // 🩺 Clinical Care & Appointments (PhonePe 3D Style)
    {
      id: 'app',
      label: t('dashboard.quickActions.app'),
      sub: t('dashboard.quickActions.appSub'),
      imageSource: IconVisit,
      route: 'Appointments',
      category: 'clinical',
      gradient: ['#EFF6FF', '#DBEAFE'],
      iconColor: '#1D4ED8',
    },
    {
      id: 'queue',
      label: 'Live Queue',
      sub: 'Doctor Token Tracker',
      imageSource: IconQueue,
      route: 'LiveQueue',
      category: 'clinical',
      gradient: ['#EFF6FF', '#BFDBFE'],
      iconColor: '#2563EB',
      badge: 'LIVE',
    },
    {
      id: 'rec',
      label: t('dashboard.quickActions.rec'),
      sub: t('dashboard.quickActions.recSub'),
      imageSource: IconRecords,
      route: 'HealthRecords',
      category: 'clinical',
      gradient: ['#F5F3FF', '#EDE9FE'],
      iconColor: '#7C3AED',
    },
    {
      id: 'pay',
      label: t('dashboard.quickActions.pay'),
      sub: t('dashboard.quickActions.paySub'),
      imageSource: IconBilling,
      route: 'Payments',
      category: 'clinical',
      gradient: ['#FFFBEB', '#FEF3C7'],
      iconColor: '#D97706',
    },

    // ❤️ Health & Wellness Trackers (PhonePe 3D Style)
    {
      id: 'vit',
      label: t('dashboard.quickActions.vit'),
      sub: t('dashboard.quickActions.vitSub'),
      imageSource: IconVitals,
      route: 'Vitals',
      category: 'tracker',
      gradient: ['#ECFDF5', '#D1FAE5'],
      iconColor: '#059669',
      badge: 'ECG',
    },
    {
      id: 'bmi',
      label: t('dashboard.quickActions.bmi'),
      sub: t('dashboard.quickActions.bmiSub'),
      imageSource: IconBmi,
      route: 'BMICalculator',
      category: 'tracker',
      gradient: ['#FFF1F2', '#FFE4E6'],
      iconColor: '#E11D48',
    },
    {
      id: 'diet',
      label: 'Diet Plan',
      sub: 'Personalized food advice',
      imageSource: IconDiet,
      route: 'FoodRecommendation',
      category: 'tracker',
      gradient: ['#FFFBEB', '#FDE68A'],
      iconColor: '#D97706',
    },
    {
      id: 'water',
      label: 'Water Tracker',
      sub: 'Track daily hydration',
      imageSource: IconWater,
      route: 'WaterReminder',
      category: 'tracker',
      gradient: ['#F0F9FF', '#BAE6FD'],
      iconColor: '#0284C7',
    },

    // 🧠 Smart AI & Rx (PhonePe 3D Style)
    {
      id: 'ai',
      label: t('dashboard.quickActions.ai'),
      sub: t('dashboard.quickActions.aiSub'),
      imageSource: IconAi,
      route: 'AISymptomChecker',
      category: 'smart',
      gradient: ['#ECFDF5', '#A7F3D0'],
      iconColor: '#047857',
      badge: 'AI',
    },
    {
      id: 'med',
      label: 'Medicines',
      sub: 'Track medications',
      imageSource: IconMedicines,
      route: 'MedicineReminder',
      category: 'smart',
      gradient: ['#FAF5FF', '#E9D5FF'],
      iconColor: '#9333EA',
    },

    // 🛡️ Safety & Family (PhonePe 3D Style)
    {
      id: 'emid',
      label: 'Emergency ID',
      sub: 'Offline Medical Card',
      imageSource: IconEmergencyId,
      route: 'EmergencyMedicalId',
      category: 'safety',
      gradient: ['#FEF2F2', '#FECACA'],
      iconColor: '#DC2626',
      badge: 'SOS',
    },
    {
      id: 'vault',
      label: 'Emergency Vault',
      sub: 'Zero-signal records',
      imageSource: IconVault,
      route: 'OfflineVault',
      category: 'safety',
      gradient: ['#FEFCE8', '#FEF08A'],
      iconColor: '#CA8A04',
    },
    {
      id: 'fam',
      label: 'Family Profiles',
      sub: 'Switch & manage dependents',
      icon: FamilyIcon3D,
      route: 'FamilyMembers',
      category: 'safety',
      gradient: ['#EFF6FF', '#BFDBFE'],
      iconColor: '#1D4ED8',
    },
  ];

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('Fetching location...');
  const [profile, setProfile] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [hospitalCards, setHospitalCards] = useState<HospitalReg[]>([]);
  const [activeCard, setActiveCard] = useState(0);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<HospitalReg | null>(null);
  const [selectedApt, setSelectedApt] = useState<any | null>(null);
  const [streak, setStreak] = useState(0);
  const [switcherModalVisible, setSwitcherModalVisible] = useState(false);

  const { notifications, unreadCount, markAllRead, markNotificationRead } = useSocket();
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [activeAdmission, setActiveAdmission] = useState<any | null>(null);
  const carouselRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchRef = useRef<number>(0);

  // ── Location ────────────────────────────────────────────────────────────────
  const getPosition = async (forcePrompt: boolean = false) => {
    try {
      // 1. Immediately load cached location from AsyncStorage so UI displays instantly
      const cachedLoc = await AsyncStorage.getItem('user_current_location');
      if (cachedLoc) {
        setCurrentLocation(cachedLoc);
      }

      // 2. Check stored permission and current device permission status
      const storedPermission = await AsyncStorage.getItem('location_permission_granted');
      const { status: deviceStatus } = await Location.getForegroundPermissionsAsync();

      // If already granted on device or recorded in localStorage, fetch silently without alert
      if (deviceStatus === 'granted' || storedPermission === 'true') {
        if (storedPermission !== 'true') {
          await AsyncStorage.setItem('location_permission_granted', 'true');
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const geocode = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geocode && geocode.length > 0) {
          const p = geocode[0];
          const txt = [p.district || p.city || p.subregion, p.region, p.country].filter(Boolean).join(', ');
          const finalLoc = txt || 'Medical District';
          setCurrentLocation(finalLoc);
          await AsyncStorage.setItem('user_current_location', finalLoc);
        }
        return;
      }

      // If user previously declined and not explicitly forced, do not pop up on refresh
      if (storedPermission === 'declined' && !forcePrompt) {
        if (!cachedLoc) setCurrentLocation('Medical District');
        return;
      }

      // 3. Only show disclosure dialog on the very first time (or explicit tap)
      Alert.alert(
        'Location Access',
        'MS CureChain collects location data to find nearby healthcare providers and emergency hospitals, even when the app is in use.',
        [
          {
            text: 'OK',
            onPress: async () => {
              try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                  await AsyncStorage.setItem('location_permission_granted', 'true');
                  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                  const geocode = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                  });
                  if (geocode && geocode.length > 0) {
                    const p = geocode[0];
                    const txt = [p.district || p.city || p.subregion, p.region, p.country].filter(Boolean).join(', ');
                    const finalLoc = txt || 'Medical District';
                    setCurrentLocation(finalLoc);
                    await AsyncStorage.setItem('user_current_location', finalLoc);
                  }
                } else {
                  await AsyncStorage.setItem('location_permission_granted', 'declined');
                  setCurrentLocation('Sanctuary Medical Center');
                }
              } catch {
                setCurrentLocation('Medical District');
              }
            },
          },
          {
            text: 'Cancel',
            onPress: async () => {
              await AsyncStorage.setItem('location_permission_granted', 'declined');
              setCurrentLocation('Medical District');
            },
            style: 'cancel',
          },
        ]
      );
    } catch {
      setCurrentLocation('Medical District');
    }
  };

  // ── Data ────────────────────────────────────────────────────────────────────
  const fetchData = async (force: boolean = false) => {
    const now = Date.now();
    if (!force && (isFetchingRef.current || now - lastFetchRef.current < 2500)) {
      return;
    }
    isFetchingRef.current = true;
    lastFetchRef.current = now;

    try {
      // Dashboard data contains the patient's own appointments with:
      //   apt.hospital  : populated Hospital document ({ _id, name, ... })
      //   apt.mrn       : the per-appointment MRN assigned by that hospital
      // NOTE: /patients/hospitals returns ALL hospitals (not patient registrations),
      //       so we do NOT use it here — it has no patient-specific MRN.
      const dashRes = await apiClient.get(PATIENT_ENDPOINTS.DASHBOARD_DATA);
      const data = dashRes.data.data || dashRes.data;

      const prof = data.profile;
      setProfile(prof);

      // Opportunistically cache into offline emergency records vault
      offlineVaultService.cacheOpportunistically({
        profile: prof,
        prescriptions: data.prescriptions,
        labRecords: data.labRecords,
      });

      const apts: any[] = Array.isArray(data.appointments)
        ? data.appointments
        : (data.appointments?.data || []);

      console.log(`[Dashboard] Received ${apts.length} appointments.`, apts.map(a => `${a._id} (${a.status})`));
      setAppointments(apts);

      // Check for active admission
      const discharges = Array.isArray(data.dischargeRecords) ? data.dischargeRecords : (data.dischargeRecords?.data || []);
      const activeStay = discharges.find((d: any) => d.status === 'admitted' || (!d.dischargeDate && d.admissionDate));
      if (activeStay) {
        setActiveAdmission(activeStay);
      }

      // ── Build hospital ID cards from patient's appointments ────────────────
      // Group appointments by hospital._id to get unique hospitals.
      // Use the FIRST occurrence of apt.mrn for each hospital as the
      // hospital-specific MRN (this is the MRN field on the Appointment model).
      const seenHospitals = new Map<string, HospitalReg>();

      apts.forEach((apt: any) => {
        const hospId = apt.hospital?._id;
        const hospName = apt.hospital?.name;
        const aptMRN = apt.mrn; // Appointment.mrn — the hospital-specific MRN

        if (hospId && hospName && !seenHospitals.has(hospId)) {
          seenHospitals.set(hospId, {
            hospital: { _id: hospId, name: hospName },
            mrn: aptMRN || prof?.mrn || 'N/A',
            status: apt.status || 'active',
          });
        }
      });

      let cards: HospitalReg[] = Array.from(seenHospitals.values());

      // Fallback: if patient has no appointments yet, show a single card
      // from the profile's registered hospital with the profile-level MRN.
      if (cards.length === 0) {
        const hospName =
          prof?.hospital?.name ||
          prof?.hospitalName ||
          'MSCureChain Medical Center';
        cards = [{
          hospital: { _id: prof?.hospital?._id || 'global', name: hospName },
          mrn: prof?.mrn || 'N/A',
          status: 'active',
        }];
      }

      setHospitalCards(cards);
      console.log('[Dashboard] 🏥 Hospital cards built:', cards.map(c => `${c.hospital?.name} → ${c.mrn}`));

      // Persist primary hospital ID for tenant middleware access (chat, prescriptions, lab records)
      const primaryHospId = cards[0]?.hospital?._id;
      if (primaryHospId && primaryHospId !== 'global') {
        await AsyncStorage.setItem('activeHospitalId', primaryHospId);
      }

    } catch (err: any) {
      console.warn('[Dashboard] Data fetch notice:', err?.message || err);
      try {
        const cachedVault = await offlineVaultService.getVaultData();
        if (cachedVault?.profile?.fullName && !profile) {
          setProfile(cachedVault.profile as any);
        }
      } catch (cacheErr) { }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStreak = async () => {
    try {
      const data = await streakService.getStreakData();
      setStreak(data.currentStreak);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    getPosition();
    // Record activity once on dashboard mount to maintain streak
    streakService.recordActivity().then(data => setStreak(data.currentStreak));

    const unsubProfile = familyService.onProfileChange(() => {
      console.log('[Dashboard] Profile change detected, force reloading...');
      fetchData(true);
    });

    return () => {
      unsubProfile();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchData(true);
    }, [])
  );

  useEffect(() => {
    const handleUpdate = () => {
      console.log('[Dashboard] Real-time appointment/queue update received');
      fetchData();
    };

    const unsub1 = socketService.on('consultation_started', handleUpdate);
    const unsub2 = socketService.on('consultation_paused', handleUpdate);
    const unsub3 = socketService.on('consultation_resumed', handleUpdate);
    const unsub4 = socketService.on('appointment_status_changed', handleUpdate);
    const unsub5 = socketService.on('appointment:status_change', handleUpdate);
    const unsub6 = socketService.on('queue_update', handleUpdate);
    const unsub7 = socketService.on('dashboard:update', handleUpdate);

    const interval = setInterval(fetchData, 8000);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
      clearInterval(interval);
    };
  }, []);

  // ── Auto-rotate every 6 s (only when more than one card) ────────────────────
  const startRotation = () => {
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    if (hospitalCards.length <= 1) return;
    autoScrollTimer.current = setInterval(() => {
      setActiveCard(prev => {
        if (hospitalCards.length <= 1) return 0;
        const next = (prev + 1) % hospitalCards.length;
        carouselRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 6000);
  };

  useEffect(() => {
    startRotation();
    return () => { if (autoScrollTimer.current) clearInterval(autoScrollTimer.current); };
  }, [hospitalCards.length]);

  // ── Pause auto-rotate on manual swipe, resume after 6 s ────────────────────
  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const listLen = hospitalCards.length;
    if (listLen === 0) return;
    const contentX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(contentX / (CARD_WIDTH + CARD_GAP));
    setActiveCard(Math.max(0, Math.min(idx, listLen - 1)));
    startRotation(); // Restart timer after manual interaction
  };

  if (loading && !refreshing) return <DigitalAtriumLoader />;

  const userName = profile?.user?.name || 'Patient';
  const globalID = profile?.mrn || 'N/A';
  const bloodGroup = profile?.user?.bloodGroup || profile?.bloodGroup || 'O+';

  // ── The carousel uses hospitalCards (built from appointments) ─────────────────
  const cardList = hospitalCards;

  // ── Carousel width: full for single card, peek for multiple ─────────────────
  const CARD_WIDTH = cardList.length > 1 ? PEEK_CARD_W : FULL_CARD_W;

  // ── Render single ID card ────────────────────────────────────────────────────
  const renderIDCard = ({ item, index }: { item: HospitalReg; index: number }) => {
    const gradColors = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
    const hospName = getHospitalName(item);
    const cardMRN = getMRN(item, globalID);

    const activeConsultation = appointments.find(a =>
      (a.hospital?._id === item.hospital?._id || !item.hospital?._id || item.hospital?._id === 'global') &&
      ['in-progress', 'in_progress', 'in consultation'].includes(a.status?.toLowerCase())
    );
    const nextApt = appointments.find(a =>
      (a.hospital?._id === item.hospital?._id || !item.hospital?._id || item.hospital?._id === 'global') &&
      ['confirmed', 'booked', 'arrived'].includes(a.status?.toLowerCase())
    );

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          setSelectedHospital(item);
          setQrModalVisible(true);
        }}
        style={[styles.cardSlide, { width: CARD_WIDTH }]}
      >
        <LinearGradient colors={gradColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.idCard}>
          {/* Top: hospital name + status */}
          <View style={styles.idTopRow}>
            <View style={styles.idTopLeft}>
              <Building2 size={11} color="rgba(255,255,255,0.65)" />
              <SanctuaryText variant="label_sm" style={styles.idCardLabel} numberOfLines={1}>
                {hospName.toUpperCase()}
              </SanctuaryText>
            </View>
            {activeConsultation ? (
              <View style={[styles.activeChip, { backgroundColor: '#10B981' }]}>
                <View style={[styles.activeDot, { backgroundColor: '#FFFFFF' }]} />
                <SanctuaryText variant="label_sm" style={[styles.activeChipText, { color: '#FFFFFF', fontWeight: '700' }]}>
                  IN CONSULTATION
                </SanctuaryText>
              </View>
            ) : (
              <View style={styles.activeChip}>
                <View style={styles.activeDot} />
                <SanctuaryText variant="label_sm" style={styles.activeChipText}>
                  ACTIVE
                </SanctuaryText>
              </View>
            )}
          </View>

          {/* Patient Name */}
          <SanctuaryText variant="label_lg" style={styles.patientName} numberOfLines={1}>{userName}</SanctuaryText>

          {/* MRN (hospital-specific) + Blood Group */}
          <View style={styles.idMidRow}>
            <View>
              <SanctuaryText variant="body_xs" style={styles.idSubLabel}>{t('dashboard.mrn')}</SanctuaryText>
              <SanctuaryText variant="label_sm" style={styles.idMRN}>{cardMRN}</SanctuaryText>
            </View>
            <View style={styles.idRight}>
              <SanctuaryText variant="body_xs" style={styles.idSubLabel}>{t('dashboard.bloodGroup')}</SanctuaryText>
              <SanctuaryText variant="label_sm" style={styles.idMRN}>{bloodGroup}</SanctuaryText>
            </View>
          </View>

          {/* Registered Facility / Next Appointment */}
          <View style={styles.idDivider} />
          {(() => {
            if (activeConsultation) {
              return (
                <View style={styles.facilityRow}>
                  <Activity size={12} color="#34D399" />
                  <SanctuaryText variant="body_xs" style={[styles.facilityTxt, { color: '#34D399', fontWeight: '700' }]} numberOfLines={1}>
                    🔴 In Consultation • Dr. {activeConsultation.doctor?.name || activeConsultation.doctorName || 'Doctor'}
                  </SanctuaryText>
                  <QrCode size={12} color="rgba(255,255,255,0.4)" />
                </View>
              );
            }
            return nextApt ? (
              <View style={styles.facilityRow}>
                <Calendar size={10} color="#4ADE80" />
                <SanctuaryText variant="body_xs" style={[styles.facilityTxt, { color: '#4ADE80' }]} numberOfLines={1}>
                  Next: {safeFormat(nextApt.date, 'MMM dd')} @ {nextApt.appointmentTime || nextApt.time || nextApt.startTime}
                </SanctuaryText>
                <QrCode size={12} color="rgba(255,255,255,0.4)" />
              </View>
            ) : (
              <View style={styles.facilityRow}>
                <MapPin size={10} color="rgba(255,255,255,0.5)" />
                <SanctuaryText variant="body_xs" style={styles.facilityTxt} numberOfLines={1}>
                  {hospName}
                </SanctuaryText>
                <QrCode size={12} color="rgba(255,255,255,0.4)" />
              </View>
            );
          })()}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.avatarWrap} onPress={() => navigation.navigate('Profile')}>
            <Avatar.Image
              size={46}
              source={profile?.user?.avatar ? { uri: profile.user.avatar } : require('../../assets/image.png')}
              style={styles.avatar}
            />
          </TouchableOpacity>
          <View style={styles.brandBlock}>
            <SanctuaryText variant="label_lg" style={styles.brandName} numberOfLines={1}>{t('brand.name')}</SanctuaryText>
            <SanctuaryText variant="body_xs" style={styles.brandSub} numberOfLines={1}>{t('brand.sub')}</SanctuaryText>
          </View>
          <View style={styles.headerRight}>
            <LanguageSelector />
            <TouchableOpacity style={styles.headerBtn} onPress={() => setNotifModalVisible(true)}>
              <Bell size={16} color="#1E293B" />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('QRScanner')}>
              <QrCode size={16} color="#1E293B" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.topSubBarRow}>
          <TouchableOpacity
            style={styles.locationPill}
            onPress={() => getPosition(true)}
            activeOpacity={0.7}
          >
            <MapPin size={10} color={COLORS.primary} fill={COLORS.primary} />
            <SanctuaryText variant="body_xs" style={styles.locationTxt} numberOfLines={1}>{currentLocation}</SanctuaryText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileSwitcherPill}
            onPress={() => setSwitcherModalVisible(true)}
            activeOpacity={0.8}
          >
            <Users size={11} color="#2563EB" />
            <SanctuaryText variant="body_xs" style={styles.profileSwitcherTxt} numberOfLines={1}>
              {profile?.user?.name || 'Family'} (Switch)
            </SanctuaryText>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scroll, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={true}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); getPosition(); }} colors={[COLORS.primary]} tintColor={COLORS.primary} />
          ) : undefined
        }
      >
        {/* Offline Zero-Network Mode Banner */}
        <OfflineBanner />

        {/* MEDICAL DISCLAIMER BANNER */}
        <View style={styles.disclaimerBanner}>
          <ShieldAlert size={12} color="#B91C1C" />
          <SanctuaryText style={styles.disclaimerText}>
            Notice: MS CureChain is for information management and is NOT a medical device. Always consult a doctor for diagnosis.
          </SanctuaryText>
        </View>

        {/* ── Active Inpatient Stay Banner (if admitted) ── */}
        {activeAdmission && (
          <View style={styles.inpatientBanner}>
            <View style={styles.inpatientLeft}>
              <View style={styles.inpatientIconBox}>
                <Bed size={18} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <SanctuaryText variant="label_md" style={styles.inpatientTitle}>
                  Currently Admitted: {activeAdmission.hospital?.name || 'Hospital'}
                </SanctuaryText>
                <SanctuaryText variant="body_xs" style={styles.inpatientSub}>
                  Ward: {activeAdmission.ward || 'General'} · Room {activeAdmission.room || '304'} (Bed {activeAdmission.bed || 'B'})
                </SanctuaryText>
              </View>
            </View>
          </View>
        )}

        {/* ── SOS Banner ── */}
        <TouchableOpacity style={styles.sosBanner} onPress={() => navigation.navigate('SOS')} activeOpacity={0.85}>
          <View style={styles.sosLeft}>
            <View style={styles.sosIconWrap}>
              <ShieldAlert size={18} color="#FFF" />
            </View>
            <View style={styles.sosTexts}>
              <SanctuaryText variant="label_md" style={styles.sosTitle}>{t('sos.title')}</SanctuaryText>
              <SanctuaryText variant="body_xs" style={styles.sosSub}>{t('sos.sub')}</SanctuaryText>
            </View>
          </View>
          <ChevronRight size={16} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        {/* ── Patient ID Cards Carousel ── */}
        <View style={styles.carouselSection}>
          <View style={styles.carouselHeader}>
            <SanctuaryText variant="label_md" style={styles.carouselTitle}>
              {hospitalCards.length > 1 ? `${hospitalCards.length} Registered Hospitals` : 'Patient Access Card'}
            </SanctuaryText>
            <SanctuaryText variant="body_xs" style={styles.carouselHint}>Tap card to view QR</SanctuaryText>
          </View>

          <FlatList
            ref={carouselRef}
            data={cardList}
            renderItem={renderIDCard}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={[
              styles.carouselList,
              cardList.length <= 1 && { paddingRight: 16 },
            ]}
            getItemLayout={(_, index) => ({ length: CARD_WIDTH + CARD_GAP, offset: (CARD_WIDTH + CARD_GAP) * index, index })}
          />

          {/* Dot indicators */}
          {cardList.length > 1 && (
            <View style={styles.dotRow}>
              {cardList.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => { carouselRef.current?.scrollToIndex({ index: i, animated: true }); setActiveCard(i); }}
                >
                  <View style={[styles.dot, i === activeCard && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Digital Services Launcher (Modern 4-Column High-Density Grid) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SanctuaryText variant="label_lg" style={styles.sectionTitle}>{t('dashboard.digitalServices')}</SanctuaryText>
            <View style={styles.servicesCountBadge}>
              <SanctuaryText style={styles.servicesCountText}>{SERVICES.length} Apps</SanctuaryText>
            </View>
          </View>
          <View style={styles.servicesGrid}>
            {SERVICES.map((item) => (
              <AnimatedServiceIcon
                key={item.id}
                item={item}
                onPress={() => navigation.navigate(item.route as any)}
              />
            ))}
          </View>
        </View>

        {/* ── Priority Visits ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SanctuaryText variant="label_lg" style={styles.sectionTitle}>{t('dashboard.priorityVisit')}</SanctuaryText>
            <TouchableOpacity onPress={() => navigation.navigate('UpcomingAppointments')}>
              <SanctuaryText variant="label_sm" style={{ color: COLORS.primary, fontWeight: '800' }}>See All</SanctuaryText>
            </TouchableOpacity>
          </View>

          {/* ── Priority Visits — active upcoming first, recent completed fallback — */}
          {(() => {
            const CONFIRMED_STATUSES = ['confirmed', 'booked', 'in-progress', 'in_progress', 'in consultation', 'arrived'];
            let priorityApts = appointments
              .filter(a => {
                const status = (a.status || '').trim().toLowerCase();
                return CONFIRMED_STATUSES.includes(status);
              })
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 3);

            // If no active upcoming visits, display the most recent completed visits so the user always sees their consultation
            if (priorityApts.length === 0) {
              priorityApts = appointments
                .filter(a => (a.status || '').trim().toLowerCase() === 'completed')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 2);
            }

            return priorityApts.length > 0 ? (
              priorityApts.map((apt, idx) => {
                const raw = apt.doctor?.user?.name || apt.doctor?.name || 'Physician';
                const displayDoc = raw.startsWith('Dr.') ? raw : `Dr. ${raw}`;
                const dept = apt.type === 'OPD' ? 'OUTPATIENT' : (apt.department || apt.type || 'CONSULTATION');
                const timeStr = apt.appointmentTime || apt.time || safeFormat(apt.date, 'hh:mm a');
                const hospName = apt.hospital?.name || 'Hospital';
                const statusLower = (apt.status || '').toLowerCase();
                const isInProg = ['in-progress', 'in_progress', 'in consultation'].includes(statusLower);
                const isCompleted = statusLower === 'completed';
                return (
                  <TouchableOpacity
                    key={apt._id || idx}
                    style={[
                      styles.aptRow,
                      isInProg && { borderColor: '#10B981', borderWidth: 1.5, backgroundColor: '#F0FDF4' },
                      isCompleted && { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }
                    ]}
                    onPress={() => setSelectedApt(apt)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.dateBubble, isInProg && { backgroundColor: '#10B981' }, isCompleted && { backgroundColor: '#F8FAFC' }]}>
                      <SanctuaryText variant="label_sm" style={[styles.dateMon, isInProg && { color: '#FFF' }, isCompleted && { color: '#006AF5' }]}>
                        {safeFormat(apt.date, 'MMM').toUpperCase()}
                      </SanctuaryText>
                      <SanctuaryText variant="headline_sm" style={[styles.dateDay, isInProg && { color: '#FFF' }, isCompleted && { color: '#0F172A' }]}>
                        {safeFormat(apt.date, 'dd')}
                      </SanctuaryText>
                    </View>
                    <View style={styles.aptInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <SanctuaryText variant="label_sm" style={styles.deptLabel}>{dept.toUpperCase()}</SanctuaryText>
                        {isInProg && (
                          <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#166534' }}>IN CONSULTATION</Text>
                          </View>
                        )}
                        {isCompleted && (
                          <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#15803D' }}>COMPLETED</Text>
                          </View>
                        )}
                      </View>
                      <SanctuaryText variant="label_lg" style={styles.docName} numberOfLines={1}>{displayDoc}</SanctuaryText>
                      <SanctuaryText variant="body_sm" style={styles.aptMeta}>{timeStr} · {hospName}</SanctuaryText>
                    </View>
                    <ChevronRight size={18} color="#CBD5E1" />
                  </TouchableOpacity>
                );
              })
            ) : (
              <TouchableOpacity style={styles.emptyCard}>
                <Calendar size={36} color="#CBD5E1" />
                <SanctuaryText variant="body_md" style={styles.emptyTxt}>{t('dashboard.noConfirmedVisits')}</SanctuaryText>
              </TouchableOpacity>
            );
          })()}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── QR Modal ── */}
      <GlassModal
        visible={qrModalVisible}
        onDismiss={() => setQrModalVisible(false)}
        contentContainerStyle={{ width: '88%', maxWidth: 330, borderRadius: 24, padding: 0 }}
      >
        <View style={styles.qrBox}>
          {selectedHospital && (
            <View style={styles.qrHospTag}>
              <Building2 size={12} color={COLORS.primary} />
              <SanctuaryText variant="label_sm" style={styles.qrHospName} numberOfLines={1}>
                {getHospitalName(selectedHospital)}
              </SanctuaryText>
            </View>
          )}
          <SanctuaryText variant="headline_sm" style={styles.qrTitle}>{userName}</SanctuaryText>

          {/* Quick Next Appointment Info in Modal */}
          {(() => {
            const nextApt = appointments.find(a =>
              a.hospital?._id === selectedHospital?.hospital?._id &&
              ['confirmed', 'booked'].includes(a.status?.toLowerCase())
            );
            if (!nextApt) return null;
            const raw = nextApt.doctor?.user?.name || nextApt.doctor?.name || 'Physician';
            const doc = raw.startsWith('Dr.') ? raw : `Dr. ${raw}`;
            return (
              <View style={{ backgroundColor: '#F1F5F9', borderRadius: 10, padding: 8, width: '100%', marginBottom: 10 }}>
                <SanctuaryText variant="label_sm" style={{ color: '#64748B', fontSize: 9, marginBottom: 2 }}>UPCOMING APPOINTMENT</SanctuaryText>
                <SanctuaryText variant="label_lg" style={{ color: COLORS.primary, fontSize: 12 }}>{doc}</SanctuaryText>
                <SanctuaryText variant="body_sm" style={{ color: '#1E293B', fontSize: 10.5 }}>
                  {safeFormat(nextApt.date, 'PPPP')} · {nextApt.appointmentTime || nextApt.time || nextApt.startTime}
                </SanctuaryText>
              </View>
            );
          })()}

          <View style={styles.qrWrap}>
            <QRCode value={selectedHospital ? getMRN(selectedHospital, globalID) : globalID} size={155} />
          </View>
          <SanctuaryText variant="label_lg" style={styles.qrId}>
            {t('dashboard.mrn')}: {selectedHospital ? getMRN(selectedHospital, globalID) : globalID}
          </SanctuaryText>
          <SanctuaryText variant="body_sm" style={styles.qrBlood}>{t('dashboard.bloodGroup')}: {bloodGroup}</SanctuaryText>
          <Button
            mode="contained"
            onPress={() => setQrModalVisible(false)}
            style={styles.qrClose}
            labelStyle={{ fontWeight: '800', letterSpacing: 0.8, fontSize: 12 }}
          >
            {t('common.close')}
          </Button>
        </View>
      </GlassModal>

      {/* ── Live Notifications Dropdown Modal ── */}
      <GlassModal
        visible={notifModalVisible}
        onDismiss={() => setNotifModalVisible(false)}
        contentContainerStyle={{ width: '92%', maxWidth: 420, maxHeight: '82%', borderRadius: 24, padding: 0 }}
      >
        <View style={styles.notifModalBox}>
          <View style={styles.notifHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Bell size={17} color={COLORS.primary} />
              <SanctuaryText variant="headline_sm" style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>
                Notifications
              </SanctuaryText>
              {unreadCount > 0 && (
                <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                  <SanctuaryText variant="label_sm" style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>
                    {unreadCount} new
                  </SanctuaryText>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllRead} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
                  <SanctuaryText variant="label_sm" style={{ color: COLORS.primary, fontWeight: '800', fontSize: 11 }}>
                    Mark all read
                  </SanctuaryText>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setNotifModalVisible(false)} style={{ padding: 4 }}>
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <View style={styles.notifEmptyState}>
                <View style={styles.notifEmptyIconBox}>
                  <Bell size={24} color="#94A3B8" />
                </View>
                <SanctuaryText variant="body_sm" style={styles.notifEmptyTitle}>
                  You're all caught up!
                </SanctuaryText>
                <SanctuaryText variant="body_xs" style={styles.notifEmptySub}>
                  No notifications yet. Any appointment reminders, doctor prescriptions, or lab results will appear right here.
                </SanctuaryText>
              </View>
            ) : (
              notifications.slice(0, 6).map((item) => (
                <TouchableOpacity
                  key={item._id}
                  style={[styles.notifItem, !item.isRead && styles.notifItemUnread]}
                  onPress={() => markNotificationRead(item._id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    {item.type ? (
                      <SanctuaryText
                        variant="label_sm"
                        style={{
                          color: COLORS.primary,
                          fontWeight: '800',
                          fontSize: 10.5,
                          textTransform: 'uppercase',
                          marginBottom: 2,
                        }}
                      >
                        {item.type}
                      </SanctuaryText>
                    ) : null}
                    <SanctuaryText
                      variant="body_xs"
                      style={{
                        color: item.isRead ? '#64748B' : '#1E293B',
                        fontWeight: item.isRead ? '400' : '600',
                        fontSize: 12,
                        lineHeight: 16,
                      }}
                      numberOfLines={2}
                    >
                      {item.message}
                    </SanctuaryText>
                    {item.createdAt && (
                      <SanctuaryText variant="label_sm" style={{ color: '#94A3B8', fontSize: 10, marginTop: 4 }}>
                        {safeFormat(item.createdAt, 'MMM dd, hh:mm a')}
                      </SanctuaryText>
                    )}
                  </View>
                  {!item.isRead && <View style={styles.notifDot} />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Bottom View Full Link */}
          <TouchableOpacity
            style={styles.notifFooterBtn}
            onPress={() => {
              setNotifModalVisible(false);
              navigation.navigate('NotificationCenter');
            }}
            activeOpacity={0.7}
          >
            <SanctuaryText variant="label_md" style={styles.notifFooterBtnText}>
              View Full Notifications
            </SanctuaryText>
            <ChevronRight size={15} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </GlassModal>

      {/* ── Appointment Detail Modal ── */}
      <GlassModal
        visible={!!selectedApt}
        onDismiss={() => setSelectedApt(null)}
        animationType="slide"
        contentContainerStyle={{ width: '100%', maxWidth: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, alignSelf: 'flex-end', marginTop: 'auto' }}
      >
        {selectedApt && <DashAptDetail apt={selectedApt} onClose={() => setSelectedApt(null)} />}
      </GlassModal>

      {/* ── Family Profile Switcher Modal ── */}
      <ProfileSwitcherModal
        visible={switcherModalVisible}
        onClose={() => setSwitcherModalVisible(false)}
        onSwitched={() => {
          fetchData(true);
        }}
      />
    </View>
  );
}

// ── Appointment Detail Sheet (inline for Dashboard) ───────────────────────────
const APT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'CONFIRMED', color: '#059669', bg: '#ECFDF5' },
  completed: { label: 'COMPLETED', color: '#059669', bg: '#ECFDF5' },
  'in-progress': { label: 'IN-PROGRESS', color: '#D97706', bg: '#FFFBEB' },
  Booked: { label: 'BOOKED', color: '#2563EB', bg: '#EFF6FF' },
  booked: { label: 'BOOKED', color: '#2563EB', bg: '#EFF6FF' },
  pending: { label: 'PENDING', color: '#6B7280', bg: '#F9FAFB' },
  cancelled: { label: 'CANCELLED', color: '#DC2626', bg: '#FEF2F2' },
  rejected: { label: 'REJECTED', color: '#DC2626', bg: '#FEF2F2' },
};
function aptStatusCfg(s: string) {
  return APT_STATUS[s] || { label: s.toUpperCase(), color: '#64748B', bg: '#F1F5F9' };
}

function getPatientAgeGender(apt: any) {
  const pDetails = apt?.patientDetails || {};
  const patient = apt?.patient || {};
  const user = patient?.user || {};

  const rawGender =
    pDetails.gender ||
    patient.gender ||
    user.gender ||
    apt.gender ||
    '';
  const gender = rawGender ? String(rawGender).trim().toUpperCase() : null;

  let age: string | number | null =
    pDetails.age ??
    patient.age ??
    user.age ??
    apt.age ??
    null;

  if (age === '' || age === undefined || age === null || age === 'N/A' || age === '-') {
    age = null;
  }

  if (!age) {
    const rawDob =
      pDetails.dob ||
      pDetails.dateOfBirth ||
      patient.dob ||
      patient.dateOfBirth ||
      user.dob ||
      user.dateOfBirth ||
      apt.dob;

    if (rawDob) {
      const birthDate = new Date(rawDob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        if (calculatedAge >= 0) {
          age = calculatedAge;
        }
      }
    }
  }

  return {
    age: age !== null ? String(age) : null,
    gender: gender || null,
  };
}

function DashAptDetail({ apt, onClose }: { apt: any; onClose: () => void }) {
  const sc = aptStatusCfg(apt.status);
  const raw = apt.doctor?.user?.name || apt.doctor?.name || 'Physician';
  const doc = raw.startsWith('Dr.') ? raw : `Dr. ${raw}`;
  const spec = apt.doctor?.specialties?.[0] || apt.doctor?.department || '';
  const vitals = apt.vitals || {};
  const payment = apt.payment || {};
  const details = apt.patientDetails || {};
  const patientInfo = getPatientAgeGender(apt);
  const payStatus = payment.paymentStatus || apt.paymentStatus || 'pending';
  const payMethod = payment.paymentMethod || apt.paymentMethod || 'N/A';
  const payAmount = payment.amount || apt.amount || apt.consultationFee || 0;
  const { height: scrH } = Dimensions.get('window');

  return (
    <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: scrH * 0.92, overflow: 'hidden' }}>
      <View style={{ width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingBottom: 16, gap: 12 }}>
          <View style={{ width: 52, height: 52, backgroundColor: '#F1F5F9', borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
            <SanctuaryText variant="label_sm" style={{ color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>{safeFormat(apt.date, 'MMM').toUpperCase()}</SanctuaryText>
            <SanctuaryText variant="headline_sm" style={{ color: '#1E293B', fontWeight: '900', fontSize: 18, marginTop: -2 }}>{safeFormat(apt.date, 'dd')}</SanctuaryText>
          </View>
          <View style={{ flex: 1 }}>
            <SanctuaryText variant="headline_sm" style={{ color: '#1E293B', fontWeight: '900', fontSize: 16, marginBottom: 2 }}>{doc}</SanctuaryText>
            {!!spec && <SanctuaryText variant="label_sm" style={{ color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 }}>{spec.toUpperCase()}</SanctuaryText>}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Clock size={12} color="#94A3B8" />
              <SanctuaryText variant="body_sm" style={{ color: '#94A3B8', fontSize: 11, marginLeft: 2 }}>{apt.appointmentTime || apt.time || 'Scheduled'}</SanctuaryText>
              <MapPin size={12} color="#94A3B8" style={{ marginLeft: 6 }} />
              <SanctuaryText variant="body_sm" style={{ color: '#94A3B8', fontSize: 11, flex: 1 }} numberOfLines={1}>{apt.hospital?.name}</SanctuaryText>
            </View>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: sc.bg }}>
            <SanctuaryText variant="label_sm" style={{ fontSize: 9, fontWeight: '900', letterSpacing: 0.4, color: sc.color }}>{sc.label}</SanctuaryText>
          </View>
        </View>

        {/* Info grid: Appt ID / MRN / Case Type / Urgency */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {[
            { label: 'APPT ID', value: apt.appointmentId || apt._id.slice(-10).toUpperCase(), hi: false },
            { label: 'MRN NUMBER', value: apt.mrn || 'N/A', hi: true },
            { label: 'CASE TYPE', value: apt.type || 'Consultation', hi: false },
            { label: 'URGENCY', value: (apt.urgency || 'non-urgent').replace(/-/g, ' ').toUpperCase(), hi: false },
          ].map(cell => (
            <View key={cell.label} style={{ width: '50%', paddingVertical: 12, paddingHorizontal: 16, borderWidth: 0.5, borderColor: '#F1F5F9', backgroundColor: '#FAFBFC' }}>
              <SanctuaryText variant="label_sm" style={{ color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 0.6, marginBottom: 4 }}>{cell.label}</SanctuaryText>
              <SanctuaryText variant="label_lg" style={{ color: cell.hi ? COLORS.primary : '#1E293B', fontWeight: '800', fontSize: 12 }} numberOfLines={2}>{cell.value}</SanctuaryText>
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 20, marginVertical: 16 }} />

        {/* Vitals — 3-col grid */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Activity size={13} color={COLORS.primary} />
            <SanctuaryText variant="label_lg" style={{ color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>PATIENT VITALS</SanctuaryText>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[
              { label: 'BP', val: vitals.bloodPressure, unit: '' },
              { label: 'TEMP', val: vitals.temperature, unit: '°F' },
              { label: 'PULSE', val: vitals.pulse, unit: 'bpm' },
              { label: 'SpO2', val: vitals.spO2, unit: '%' },
              { label: 'GLUCOSE', val: vitals.sugar, unit: 'mg/dL' },
              { label: 'WEIGHT', val: vitals.weight, unit: 'kg' },
            ].map(v => (
              <View key={v.label} style={{ width: '33.33%', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', padding: 10 }}>
                <SanctuaryText variant="label_sm" style={{ color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 3 }}>{v.label}</SanctuaryText>
                <SanctuaryText variant="label_lg" style={{ color: '#1E293B', fontWeight: '900', fontSize: 15 }}>{v.val || '—'}</SanctuaryText>
                {!!v.val && !!v.unit && <SanctuaryText variant="body_sm" style={{ color: '#94A3B8', fontSize: 9, fontWeight: '600', marginTop: 1 }}>{v.unit}</SanctuaryText>}
              </View>
            ))}
          </View>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 20, marginVertical: 16 }} />

        {/* Consultation details */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Stethoscope size={13} color={COLORS.primary} />
            <SanctuaryText variant="label_lg" style={{ color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>CONSULTATION DETAILS</SanctuaryText>
          </View>
          {[
            { label: 'CLINICAL REASON', value: apt.reason || apt.symptoms?.join(', ') || '—', bold: true },
            { label: 'AGE / GENDER', value: `${patientInfo.age ? `${patientInfo.age} yrs` : '—'} / ${patientInfo.gender || '—'}`, bold: false },
            { label: 'EST. DURATION', value: details.duration || '—', bold: false },
            ...(apt.department ? [{ label: 'DEPARTMENT', value: apt.department, bold: false }] : []),
          ].map(row => (
            <View key={row.label} style={{ marginBottom: 12 }}>
              <SanctuaryText variant="label_sm" style={{ color: COLORS.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 3 }}>{row.label}</SanctuaryText>
              <SanctuaryText variant="label_lg" style={{ color: '#1E293B', fontWeight: '700', fontSize: 12, lineHeight: 17, fontStyle: row.bold ? 'italic' : 'normal' }} numberOfLines={3}>{row.value}</SanctuaryText>
            </View>
          ))}
        </View>

        {/* Payment footer */}
        <LinearGradient colors={['#0F172A', '#1E293B']} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingHorizontal: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ['paid', 'Paid'].includes(payStatus) ? '#4ADE80' : '#FCD34D' }} />
            <View>
              <SanctuaryText variant="label_sm" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 }}>PAYMENT · {payMethod.toUpperCase()}</SanctuaryText>
              <SanctuaryText variant="label_lg" style={{ color: '#FFF', fontWeight: '900', fontSize: 13 }}>{payStatus.toUpperCase()}</SanctuaryText>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <SanctuaryText variant="label_sm" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 }}>CONSULTATION FEE</SanctuaryText>
            <SanctuaryText variant="headline_sm" style={{ color: '#FFF', fontWeight: '900', fontSize: 20 }}>₹{payAmount.toLocaleString()}</SanctuaryText>
          </View>
        </LinearGradient>
      </ScrollView>

      {/* Close */}
      <TouchableOpacity
        style={{ backgroundColor: '#F1F5F9', marginHorizontal: 20, marginVertical: 14, borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
        onPress={onClose}
      >
        <SanctuaryText variant="label_lg" style={{ color: '#64748B', fontWeight: '900', letterSpacing: 1 }}>CLOSE</SanctuaryText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', height: '100%', minHeight: 0 },
  scrollView: { flex: 1 },

  /* Header */
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatarWrap: { marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  avatar: { backgroundColor: 'transparent' },
  brandBlock: { flex: 1, justifyContent: 'center' },
  brandName: { color: '#0F172A', fontWeight: '900', fontSize: 16, letterSpacing: 0.4 },
  brandSub: { color: '#64748B', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topSubBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  locationPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 4.5,
    paddingHorizontal: 8,
  },
  locationTxt: { marginLeft: 4, color: '#475569', fontSize: 9.5, fontWeight: '700', flex: 1 },
  profileSwitcherPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 4.5,
    paddingHorizontal: 8,
  },
  profileSwitcherTxt: {
    marginLeft: 4,
    color: '#2563EB',
    fontSize: 9.5,
    fontWeight: '800',
    flex: 1,
  },

  scroll: { paddingTop: 12 },

  /* SOS */
  sosBanner: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  disclaimerBanner: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 9,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 8.5,
    color: '#991B1B',
    fontWeight: '700',
    lineHeight: 12,
  },
  sosLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sosIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sosTexts: { flex: 1 },
  sosTitle: { color: '#FFF', fontWeight: '900', fontSize: 11, letterSpacing: 0.4 },
  sosSub: { color: 'rgba(255,255,255,0.85)', fontSize: 9, marginTop: 1, fontWeight: '600' },

  /* Carousel */
  carouselSection: { marginBottom: 14 },
  carouselHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  carouselTitle: { color: '#1E293B', fontWeight: '800', fontSize: 13 },
  carouselHint: { color: '#94A3B8', fontSize: 10 },
  carouselList: { paddingLeft: 16, paddingRight: 24 },
  cardSlide: { marginRight: CARD_GAP },

  /* ID Card */
  idCard: { borderRadius: 16, padding: 14 },
  idTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  idTopLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 5, marginRight: 8 },
  idCardLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: 9, letterSpacing: 0.4, flexShrink: 1 },
  activeChip: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 2.5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#4ADE80' },
  activeChipText: { color: '#FFF', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.4 },
  patientName: { color: '#FFF', fontSize: 16.5, fontWeight: '900', letterSpacing: 0.2, marginBottom: 8 },
  idMidRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  idRight: { alignItems: 'flex-end' },
  idSubLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '800', letterSpacing: 0.8, marginBottom: 1 },
  idMRN: { color: '#FFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  idDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 7 },
  facilityRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  facilityTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600', flex: 1 },
  qrHint: { padding: 2 },

  /* Dots */
  dotRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8, gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#CBD5E1' },
  dotActive: { width: 14, backgroundColor: COLORS.primary, borderRadius: 3 },

  /* Sections */
  section: { paddingHorizontal: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { color: '#1E293B', fontWeight: '900', fontSize: 14 },
  servicesCountBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  servicesCountText: { color: '#64748B', fontSize: 9.5, fontWeight: '700' },

  /* Service Grid (4-Column Modern Micro-Launcher) */
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  serviceColItem: { width: '25%', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 2 },
  serviceIconSquircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  serviceColLabel: { color: '#334155', fontWeight: '700', fontSize: 10, textAlign: 'center', lineHeight: 13, paddingHorizontal: 2 },

  /* Appointments */
  aptRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  dateBubble: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  dateMon: { color: COLORS.primary, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.5 },
  dateDay: { color: '#1E293B', fontWeight: '900', fontSize: 15, marginTop: -2 },
  aptInfo: { flex: 1 },
  deptLabel: { color: COLORS.primary, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.5, marginBottom: 1 },
  docName: { color: '#1E293B', fontWeight: '800', fontSize: 13, marginBottom: 2 },
  aptMeta: { color: '#94A3B8', fontSize: 10.5, fontWeight: '500' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyTxt: { color: '#94A3B8', marginTop: 8, fontWeight: '600', fontSize: 12 },
  emptyAction: { color: COLORS.primary, marginTop: 6, fontWeight: '900', fontSize: 12 },

  /* QR Modal */
  modal: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 70 : 50,
  },
  qrBox: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrHospTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EFF6FF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3.5, marginBottom: 8 },
  qrHospName: { color: COLORS.primary, fontWeight: '800', fontSize: 10 },
  qrTitle: { color: '#0F172A', fontWeight: '900', fontSize: 16, marginBottom: 10 },
  qrWrap: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  qrId: { color: '#0F172A', fontWeight: '800', marginBottom: 2, letterSpacing: 0.8, fontSize: 12 },
  qrBlood: { color: '#64748B', marginBottom: 12, fontWeight: '600', fontSize: 11 },
  qrClose: { width: '100%', borderRadius: 10, backgroundColor: COLORS.primary, height: 38, justifyContent: 'center' },
  streakSummaryCard: { borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: '#FF5F6D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  streakSummaryGrad: { paddingVertical: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakSummaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakSummaryIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  streakSummaryTitle: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  streakSummarySub: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 9.5, marginTop: 1 },

  /* Notification Bell & Drawer Styles */
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 12,
  },
  notifModalOverlay: {
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingHorizontal: 0,
    margin: 0,
  },
  notifModalBox: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginHorizontal: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  notifEmptyState: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  notifEmptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  notifEmptyTitle: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  notifEmptySub: {
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    fontSize: 12,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  notifItemUnread: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.primary,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  notifFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  notifFooterBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },

  /* Inpatient Stay Banner */
  inpatientBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#F0F9FF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  inpatientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inpatientIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inpatientTitle: {
    color: '#0369A1',
    fontWeight: '800',
    fontSize: 13,
  },
  inpatientSub: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
