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
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Button } from 'react-native-paper';
import {
  MapPin,
  Calendar,
  Activity,
  CreditCard,
  ShieldAlert,
  ChevronRight,
  QrCode,
  Building2,
  Clock,
  Bell,
  Bed,
  X,
  FileText,
  LayoutGrid,
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

// User Provided Banner Images
const BannerHealthPriority = require('../../assets/banner/banner_health_priority.png');
const BannerHealthJourney = require('../../assets/banner/banner_health_journey.png');
const BannerDhruva = require('../../assets/banner/banner_dhruva.png');
const BannerEcosystem = require('../../assets/banner/banner_ecosystem.png');

const { width } = Dimensions.get('window');
const CARD_GAP = 10;
const PEEK_CARD_W = width - 48; // Peek mode: shows edge of next card (multiple cards)
const FULL_CARD_W = width - 32; // Full mode: single card takes all space

// Full-width edge-to-edge banner resized based on mobile width
const HERO_WIDTH = width;
const HERO_HEIGHT = Math.round(width * (738 / 1920));

// Solid Vibrant Royal Blue for Patient Health Card (matching reference mockup, no gradients)
const CARD_BG_COLOR = '#1769E0';



interface HospitalReg {
  hospital?: { _id: string; name: string; address?: string };
  hospitalName?: string;
  hospitalId?: string;
  name?: string;
  patientMrn?: string;
  mrnNumber?: string;
  medicalRecordNumber?: string;
  mrn?: string;
  status?: string;
  registeredAt?: string;
}

interface HeroBannerItem {
  id: string;
  image: any;
  title: string;
  route: keyof RootStackParamList;
  params?: any;
}

const HERO_SLIDES: HeroBannerItem[] = [
  {
    id: 'health_priority',
    image: BannerHealthPriority,
    title: 'Your Health, Our Priority',
    route: 'Appointments',
  },
  {
    id: 'health_journey',
    image: BannerHealthJourney,
    title: 'Your Complete Health Journey',
    route: 'HealthRecords',
  },
  {
    id: 'dhruva_hospitals',
    image: BannerDhruva,
    title: 'Dhruva Hospitals',
    route: 'Hospitals',
  },
  {
    id: 'ecosystem',
    image: BannerEcosystem,
    title: 'MSCureChain Healthcare Ecosystem',
    route: 'Vitals',
  },
];

function getHospitalName(item: HospitalReg): string {
  return (
    item.hospital?.name ||
    item.hospitalName ||
    item.name ||
    'Horizin Hospital'
  );
}

function getMRN(item: HospitalReg, fallback: string): string {
  return (
    item.mrn ||
    item.patientMrn ||
    item.mrnNumber ||
    item.medicalRecordNumber ||
    fallback
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  if (hour >= 17 && hour < 21) return 'Good Evening';
  return 'Good Night';
}

export default function DashboardScreen() {
  const { t } = useTranslation();

  const SERVICES: ServiceItemConfig[] = [
    // 1. Visit
    {
      id: 'app',
      label: 'Visit',
      sub: t('dashboard.quickActions.appSub'),
      imageSource: IconVisit,
      route: 'Appointments',
      category: 'clinical',
      gradient: ['#EFF6FF', '#DBEAFE'],
      iconColor: '#1D4ED8',
    },
    // 2. Live Queue
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
    // 3. Billing
    {
      id: 'pay',
      label: 'Billing',
      sub: t('dashboard.quickActions.paySub'),
      imageSource: IconBilling,
      route: 'Payments',
      category: 'clinical',
      gradient: ['#FFFBEB', '#FEF3C7'],
      iconColor: '#D97706',
    },
    // 4. Records
    {
      id: 'rec',
      label: 'Records',
      sub: t('dashboard.quickActions.recSub'),
      imageSource: IconRecords,
      route: 'HealthRecords',
      category: 'clinical',
      gradient: ['#F5F3FF', '#EDE9FE'],
      iconColor: '#7C3AED',
    },

    // 5. Vitals
    {
      id: 'vit',
      label: 'Vitals',
      sub: t('dashboard.quickActions.vitSub'),
      imageSource: IconVitals,
      route: 'Vitals',
      category: 'tracker',
      gradient: ['#ECFDF5', '#D1FAE5'],
      iconColor: '#059669',
      badge: 'ECG',
    },
    // 6. BMI Index
    {
      id: 'bmi',
      label: 'BMI Index',
      sub: t('dashboard.quickActions.bmiSub'),
      imageSource: IconBmi,
      route: 'BMICalculator',
      category: 'tracker',
      gradient: ['#FFF1F2', '#FFE4E6'],
      iconColor: '#E11D48',
    },
    // 7. Diet Plan
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
    // 8. Water Tracker
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
    // 9. AI Symptoms
    {
      id: 'ai',
      label: 'AI Symptoms',
      sub: t('dashboard.quickActions.aiSub'),
      imageSource: IconAi,
      route: 'AISymptomChecker',
      category: 'smart',
      gradient: ['#ECFDF5', '#A7F3D0'],
      iconColor: '#047857',
      badge: 'AI',
    },
    // 10. Medicines
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
    // 11. Emergency ID
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
    // 12. Emergency Vault
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
    // 13. Family Profiles
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
  const insets = useSafeAreaInsets();
  const dynamicTopPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44
  ) + 6;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('Medical District');
  const [profile, setProfile] = useState<any>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null); // from AsyncStorage
  const [appointments, setAppointments] = useState<any[]>([]);
  const [hospitalCards, setHospitalCards] = useState<HospitalReg[]>([]);
  const [activeCard, setActiveCard] = useState(0);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<HospitalReg | null>(null);
  const [selectedApt, setSelectedApt] = useState<any | null>(null);
  const [streak, setStreak] = useState(0);
  const [switcherModalVisible, setSwitcherModalVisible] = useState(false);
  const [showAllServices, setShowAllServices] = useState(false);

  const { notifications, unreadCount, markAllRead, markNotificationRead } = useSocket();
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [activeAdmission, setActiveAdmission] = useState<any | null>(null);

  // Hero carousel ref & auto-scroll
  const heroRef = useRef<FlatList>(null);
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const heroTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hospital ID cards carousel ref & auto-scroll
  const carouselRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const isFetchingRef = useRef<boolean>(false);
  const lastFetchRef = useRef<number>(0);

  // ── Hero Banner Auto-Scroll ──────────────────────────────────────────────
  const startHeroAutoScroll = () => {
    if (heroTimer.current) clearInterval(heroTimer.current);
    heroTimer.current = setInterval(() => {
      setActiveHeroSlide(prev => {
        const next = (prev + 1) % HERO_SLIDES.length;
        heroRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 5000);
  };

  useEffect(() => {
    startHeroAutoScroll();
    return () => {
      if (heroTimer.current) clearInterval(heroTimer.current);
    };
  }, []);

  const handleHeroScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(contentX / HERO_WIDTH);
    setActiveHeroSlide(Math.max(0, Math.min(idx, HERO_SLIDES.length - 1)));
    startHeroAutoScroll();
  };

  // ── Location ─────────────────────────────────────────────────────────────
  const getPosition = async (forcePrompt: boolean = false) => {
    try {
      const cachedLoc = await AsyncStorage.getItem('user_current_location');
      if (cachedLoc) {
        setCurrentLocation(cachedLoc);
      }

      const storedPermission = await AsyncStorage.getItem('location_permission_granted');
      const { status: deviceStatus } = await Location.getForegroundPermissionsAsync();

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

      if (storedPermission === 'declined' && !forcePrompt) {
        if (!cachedLoc) setCurrentLocation('Medical District');
        return;
      }
    } catch {
      setCurrentLocation('Medical District');
    }
  };

  // ── Data Fetching ────────────────────────────────────────────────────────
  const fetchData = async (force: boolean = false) => {
    const now = Date.now();
    if (!force && (isFetchingRef.current || now - lastFetchRef.current < 2500)) {
      return;
    }
    isFetchingRef.current = true;
    lastFetchRef.current = now;

    try {
      const dashRes = await apiClient.get(PATIENT_ENDPOINTS.DASHBOARD_DATA);
      const data = dashRes.data.data || dashRes.data;

      const prof = data.profile;
      setProfile(prof);

      offlineVaultService.cacheOpportunistically({
        profile: prof,
        prescriptions: data.prescriptions,
        labRecords: data.labRecords,
      });

      const apts: any[] = Array.isArray(data.appointments)
        ? data.appointments
        : (data.appointments?.data || []);

      setAppointments(apts);

      // Check active inpatient admission
      const discharges = Array.isArray(data.dischargeRecords) ? data.dischargeRecords : (data.dischargeRecords?.data || []);
      const activeStay = discharges.find((d: any) => d.status === 'admitted' || (!d.dischargeDate && d.admissionDate));
      if (activeStay) {
        setActiveAdmission(activeStay);
      }

      // Group appointments by hospital
      const seenHospitals = new Map<string, HospitalReg>();
      apts.forEach((apt: any) => {
        const hospId = apt.hospital?._id;
        const hospName = apt.hospital?.name;
        const aptMRN = apt.mrn;

        if (hospId && hospName && !seenHospitals.has(hospId)) {
          seenHospitals.set(hospId, {
            hospital: { _id: hospId, name: hospName },
            mrn: aptMRN || prof?.mrn || 'N/A',
            status: apt.status || 'active',
          });
        }
      });

      let cards: HospitalReg[] = Array.from(seenHospitals.values());

      if (cards.length === 0) {
        const hospName =
          prof?.hospital?.name ||
          prof?.hospitalName ||
          'Horizin Hospital';
        cards = [{
          hospital: { _id: prof?.hospital?._id || 'global', name: hospName },
          mrn: prof?.mrn || 'HHO620000153',
          status: 'active',
        }];
      }

      setHospitalCards(cards);

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
      } catch (cacheErr) {}
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    getPosition();
    streakService.recordActivity().then(data => setStreak(data.currentStreak));

    const unsubProfile = familyService.onProfileChange(() => {
      fetchData(true);
    });

    return () => {
      unsubProfile();
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchData(true);
      // Sync locally saved avatar every time this screen gains focus
      AsyncStorage.getItem('patient_profile_avatar')
        .then(saved => { if (saved) setLocalAvatar(saved); })
        .catch(() => {});
    }, [])
  );

  useEffect(() => {
    const handleUpdate = () => {
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

  // ── Auto-rotate Hospital Cards ───────────────────────────────────────────
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
    return () => {
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, [hospitalCards.length]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const listLen = hospitalCards.length;
    if (listLen === 0) return;
    const contentX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(contentX / (CARD_WIDTH + CARD_GAP));
    setActiveCard(Math.max(0, Math.min(idx, listLen - 1)));
    startRotation();
  };

  if (loading && !refreshing) return <DigitalAtriumLoader />;

  const userName = profile?.user?.name || profile?.fullName || 'Tutipati Anand Kumar';
  // localAvatar (from AsyncStorage) takes priority over the API-returned avatar
  const apiAvatar = profile?.user?.avatar || profile?.avatar || profile?.profilePic || profile?.user?.profilePic || null;
  const patientAvatar = localAvatar || apiAvatar;
  const globalID = profile?.mrn || 'HHO620000153';
  const bloodGroup = profile?.user?.bloodGroup || profile?.bloodGroup || 'O+';
  const cardList = hospitalCards;
  const CARD_WIDTH = cardList.length > 1 ? PEEK_CARD_W : FULL_CARD_W;

  // ── Render Patient Health Card (Solid Vibrant Royal Blue, No Gradients) ─
  const renderIDCard = ({ item }: { item: HospitalReg; index: number }) => {
    const hospName = getHospitalName(item);
    const cardMRN = getMRN(item, globalID);

    const activeConsultation = appointments.find(a =>
      (a.hospital?._id === item.hospital?._id || !item.hospital?._id || item.hospital?._id === 'global') &&
      ['in-progress', 'in_progress', 'in consultation'].includes(a.status?.toLowerCase())
    );

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => {
          setSelectedHospital(item);
          setQrModalVisible(true);
        }}
        style={[styles.cardSlide, { width: CARD_WIDTH }]}
      >
        <View style={styles.idCard}>
          {/* Top: hospital name + status */}
          <View style={styles.idTopRow}>
            <View style={styles.idTopLeft}>
              <Building2 size={14} color="#FFFFFF" />
              <SanctuaryText variant="label_sm" style={styles.idCardLabel} numberOfLines={1}>
                {hospName.toUpperCase()}
              </SanctuaryText>
            </View>
            <View style={styles.activeChip}>
              <View style={[styles.activeDot, activeConsultation && { backgroundColor: '#FDE047' }]} />
              <SanctuaryText variant="label_sm" style={styles.activeChipText}>
                {activeConsultation ? 'IN CONSULTATION' : 'ACTIVE'}
              </SanctuaryText>
            </View>
          </View>

          {/* Patient Name */}
          <SanctuaryText variant="headline_sm" style={styles.patientName} numberOfLines={1}>
            {userName}
          </SanctuaryText>

          {/* MRN Number + Blood Group */}
          <View style={styles.idMidRow}>
            <View style={styles.idInfoBlock}>
              <Text style={styles.idSubLabel}>MRN Number</Text>
              <Text style={styles.idMRN}>{cardMRN}</Text>
            </View>
            {bloodGroup ? (
              <View style={[styles.idInfoBlock, { alignItems: 'flex-end' }]}>
                <Text style={styles.idSubLabel}>Blood Group</Text>
                <Text style={styles.idBloodGroup}>{bloodGroup}</Text>
              </View>
            ) : null}
          </View>

          {/* Two Action Buttons Inside Card */}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => navigation.navigate('BookAppointment')}
              activeOpacity={0.8}
            >
              <Calendar size={14} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.cardActionBtnText} numberOfLines={1}>Book Appointment</Text>
              <ChevronRight size={13} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardActionBtn}
              onPress={() => navigation.navigate('HealthRecords')}
              activeOpacity={0.8}
            >
              <FileText size={14} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.cardActionBtnText} numberOfLines={1}>View Records</Text>
              <ChevronRight size={13} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44
  ) + 4;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── 1. Top Navigation Bar (Avatar, Dynamic Patient Name, Bell & QR) ── */}
      <View style={[styles.topHeader, { paddingTop: topInset }]}>
        <View style={styles.topHeaderRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.85}
            >
              <Avatar.Image
                size={42}
                source={patientAvatar ? { uri: patientAvatar } : require('../../assets/image.png')}
                style={styles.avatar}
              />
            </TouchableOpacity>

            <View style={styles.patientInfoBlock}>
              <Text style={styles.headerPatientName} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={styles.headerGreeting}>
                {getGreeting()}
              </Text>
            </View>
          </View>

          {/* Bell & QR Code on Right (High Visibility) */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setNotifModalVisible(true)}
              activeOpacity={0.7}
            >
              <Bell size={20} color="#0F172A" />
              {unreadCount > 0 && <View style={styles.notifBadge} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => navigation.navigate('QRScanner')}
              activeOpacity={0.7}
            >
              <QrCode size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scroll, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchData(true);
                getPosition();
              }}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          ) : undefined
        }
      >
        {/* ── 2. Full-Width Promotional Banner Carousel (Resized by Mobile Width) ── */}
        <View style={styles.heroSection}>
          <FlatList
            ref={heroRef}
            data={HERO_SLIDES}
            keyExtractor={item => item.id}
            horizontal
            pagingEnabled={true}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleHeroScrollEnd}
            snapToInterval={HERO_WIDTH}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={styles.heroList}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => navigation.navigate(item.route as any, item.params)}
                style={[styles.heroCardSlide, { width: HERO_WIDTH }]}
              >
                <Image
                  source={item.image}
                  style={[styles.heroBannerImage, { width: HERO_WIDTH, height: HERO_HEIGHT }]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
          />

          {/* Hero Carousel Dots */}
          <View style={styles.heroDotRow}>
            {HERO_SLIDES.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  heroRef.current?.scrollToIndex({ index: i, animated: true });
                  setActiveHeroSlide(i);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.heroDot, i === activeHeroSlide && styles.heroDotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Offline Zero-Network Mode Banner */}
        <OfflineBanner />

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

        {/* ── 3. Patient Health Card ── */}
        <View style={styles.healthCardSection}>
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
            getItemLayout={(_, index) => ({
              length: CARD_WIDTH + CARD_GAP,
              offset: (CARD_WIDTH + CARD_GAP) * index,
              index,
            })}
          />

          {/* Dots for multiple hospital cards */}
          {cardList.length > 1 && (
            <View style={styles.dotRow}>
              {cardList.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    carouselRef.current?.scrollToIndex({ index: i, animated: true });
                    setActiveCard(i);
                  }}
                >
                  <View style={[styles.dot, i === activeCard && styles.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── 4. Digital Services (4 Columns, 1 Row Initial + View More) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SanctuaryText variant="label_lg" style={styles.sectionTitle}>
              Digital Services
            </SanctuaryText>
            <TouchableOpacity
              style={styles.viewMoreBtn}
              onPress={() => setShowAllServices(prev => !prev)}
              activeOpacity={0.7}
            >
              <LayoutGrid size={13} color="#1769E0" />
              <Text style={styles.viewMoreText}>
                {showAllServices ? 'Show Less' : 'View More'}
              </Text>
              <ChevronRight
                size={13}
                color="#1769E0"
                style={showAllServices ? { transform: [{ rotate: '90deg' }] } : undefined}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.servicesGrid}>
            {(showAllServices ? SERVICES : SERVICES.slice(0, 4)).map((item) => (
              <AnimatedServiceIcon
                key={item.id}
                item={item}
                onPress={() => navigation.navigate(item.route as any)}
              />
            ))}
          </View>
        </View>

        {/* ── 5. Emergency SOS (Positioned Below Digital Services) ── */}
        <TouchableOpacity
          style={styles.sosBanner}
          onPress={() => navigation.navigate('SOS')}
          activeOpacity={0.85}
        >
          <View style={styles.sosLeft}>
            <View style={styles.sosIconWrap}>
              <ShieldAlert size={22} color="#FFFFFF" />
            </View>
            <View style={styles.sosTexts}>
              <Text style={styles.sosTitle}>EMERGENCY SOS</Text>
              <Text style={styles.sosSub}>Get immediate assistance in case of emergency</Text>
            </View>
          </View>
          <View style={styles.sosArrowWrap}>
            <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
          </View>
        </TouchableOpacity>

        {/* ── 6. Priority Visit Section ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SanctuaryText variant="label_lg" style={styles.sectionTitle}>
              Priority Visit
            </SanctuaryText>
            <TouchableOpacity onPress={() => navigation.navigate('UpcomingAppointments')}>
              <SanctuaryText variant="label_sm" style={{ color: '#1769E0', fontWeight: '800' }}>
                See All
              </SanctuaryText>
            </TouchableOpacity>
          </View>

          {(() => {
            const CONFIRMED_STATUSES = ['confirmed', 'booked', 'in-progress', 'in_progress', 'in consultation', 'arrived'];
            let priorityApts = appointments
              .filter(a => {
                const status = (a.status || '').trim().toLowerCase();
                return CONFIRMED_STATUSES.includes(status);
              })
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 3);

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
                const dept = apt.type === 'OPD' ? 'OUTPATIENT' : (apt.department || apt.type || 'ONLINE');
                const timeStr = apt.appointmentTime || apt.time || safeFormat(apt.date, 'hh:mm a');
                const hospName = apt.hospital?.name || 'Horizin Hospital';
                const statusLower = (apt.status || '').toLowerCase();
                const isInProg = ['in-progress', 'in_progress', 'in consultation'].includes(statusLower);
                const isCompleted = statusLower === 'completed';

                return (
                  <TouchableOpacity
                    key={apt._id || idx}
                    style={styles.priorityAptCard}
                    onPress={() => setSelectedApt(apt)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.priorityDateBubble}>
                      <Text style={styles.priorityDateMon}>
                        {safeFormat(apt.date, 'MMM').toUpperCase()}
                      </Text>
                      <Text style={styles.priorityDateDay}>
                        {safeFormat(apt.date, 'dd')}
                      </Text>
                    </View>
                    <View style={styles.priorityAptInfo}>
                      <View style={styles.priorityBadgeRow}>
                        <Text style={styles.priorityTypeBadge}>{dept.toUpperCase()}</Text>
                        {isInProg && (
                          <View style={styles.inProgBadge}>
                            <Text style={styles.inProgBadgeText}>IN CONSULTATION</Text>
                          </View>
                        )}
                        {isCompleted && (
                          <View style={styles.completedBadge}>
                            <Text style={styles.completedBadgeText}>COMPLETED</Text>
                          </View>
                        )}
                        {!isInProg && !isCompleted && (
                          <View style={styles.bookedBadge}>
                            <Text style={styles.bookedBadgeText}>{(apt.status || 'CONFIRMED').toUpperCase()}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.priorityDocName} numberOfLines={1}>{displayDoc}</Text>
                      <Text style={styles.priorityAptMeta} numberOfLines={1}>
                        {timeStr} · {hospName}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#CBD5E1" />
                  </TouchableOpacity>
                );
              })
            ) : (
              <TouchableOpacity
                style={styles.emptyCard}
                onPress={() => navigation.navigate('BookAppointment')}
                activeOpacity={0.8}
              >
                <Calendar size={32} color="#94A3B8" />
                <SanctuaryText variant="body_md" style={styles.emptyTxt}>
                  No scheduled visits at this time
                </SanctuaryText>
                <SanctuaryText variant="label_sm" style={styles.emptyAction}>
                  Book an Appointment →
                </SanctuaryText>
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* MEDICAL DISCLAIMER BANNER */}
        <View style={styles.disclaimerBanner}>
          <ShieldAlert size={12} color="#B91C1C" />
          <SanctuaryText style={styles.disclaimerText}>
            Notice: MS CureChain is for information management and is NOT a medical device. Always consult a doctor for diagnosis.
          </SanctuaryText>
        </View>

        <View style={{ height: 32 }} />
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
            </View>
          </View>
          <View style={{ backgroundColor: sc.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <SanctuaryText variant="label_sm" style={{ color: sc.color, fontWeight: '900', fontSize: 10 }}>{sc.label}</SanctuaryText>
          </View>
        </View>

        {/* Hospital info banner */}
        {apt.hospital && (
          <View style={{ marginHorizontal: 20, marginBottom: 16, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Building2 size={16} color={COLORS.primary} />
            <SanctuaryText variant="label_sm" style={{ color: '#1E293B', fontWeight: '700', flex: 1 }}>{apt.hospital.name}</SanctuaryText>
          </View>
        )}

        {/* Close Button */}
        <View style={{ padding: 20 }}>
          <Button
            mode="contained"
            onPress={onClose}
            style={{ borderRadius: 14, backgroundColor: COLORS.primary, height: 46, justifyContent: 'center' }}
            labelStyle={{ fontWeight: '800', fontSize: 13 }}
          >
            Close Details
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FC',
    height: '100%',
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
  },
  scroll: {
    paddingTop: 0,
  },

  /* ── 1. Top Navigation Bar ── */
  topHeader: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarWrap: {
    marginRight: 10,
    borderRadius: 22,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  avatar: {
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  patientInfoBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  headerPatientName: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 16.5,
    letterSpacing: -0.2,
  },
  headerGreeting: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  /* ── 2. Full-Width Hero Section Resized by Device Width ── */
  heroSection: {
    width: '100%',
    marginTop: 0,
    marginBottom: 6,
  },
  heroList: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  heroCardSlide: {
    marginRight: 0,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  heroBannerImage: {
    borderRadius: 0,
  },
  heroDotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
    gap: 5,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  heroDotActive: {
    width: 18,
    backgroundColor: '#1769E0',
    borderRadius: 3,
  },

  /* ── 3. Patient Health Card (Solid Royal Blue, No Gradients) ── */
  healthCardSection: {
    marginBottom: 16,
  },
  carouselList: {
    paddingLeft: 16,
    paddingRight: 24,
  },
  cardSlide: {
    marginRight: CARD_GAP,
  },
  idCard: {
    backgroundColor: CARD_BG_COLOR,
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#1769E0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  decoBuildingWrap: {
    position: 'absolute',
    right: -10,
    bottom: -15,
    opacity: 0.10,
  },
  idTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  idTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
    marginRight: 8,
  },
  idCardLabel: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  activeChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  activeChipText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  patientName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.2,
    marginTop: 6,
    marginBottom: 12,
  },
  idMidRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  idInfoBlock: {
    flex: 1,
  },
  idSubLabel: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  idMRN: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  idBloodGroup: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 5,
  },
  cardActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.1,
  },

  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },

  /* ── 4. Digital Services ── */
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#1E293B',
    fontWeight: '900',
    fontSize: 14.5,
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 12,
  },
  viewMoreText: {
    color: '#1769E0',
    fontSize: 11,
    fontWeight: '800',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },

  /* ── 5. Emergency SOS ── */
  sosBanner: {
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECDD3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    elevation: 1,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  sosLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  sosIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sosTexts: {
    flex: 1,
  },
  sosTitle: {
    color: '#DC2626',
    fontWeight: '900',
    fontSize: 12.5,
    letterSpacing: 0.5,
  },
  sosSub: {
    color: '#64748B',
    fontSize: 10.5,
    marginTop: 2,
    fontWeight: '500',
  },
  sosArrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── 6. Priority Visit ── */
  priorityAptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  priorityDateBubble: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  priorityDateMon: {
    color: '#1769E0',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  priorityDateDay: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 16,
    marginTop: -2,
  },
  priorityAptInfo: {
    flex: 1,
    marginRight: 6,
  },
  priorityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  priorityTypeBadge: {
    color: '#1769E0',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  inProgBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inProgBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#B45309',
  },
  completedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  completedBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#15803D',
  },
  bookedBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bookedBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  priorityDocName: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13.5,
    marginBottom: 2,
  },
  priorityAptMeta: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyTxt: {
    color: '#94A3B8',
    marginTop: 8,
    fontWeight: '600',
    fontSize: 12,
  },
  emptyAction: {
    color: '#1769E0',
    marginTop: 6,
    fontWeight: '800',
    fontSize: 12,
  },

  /* Medical Disclaimer Banner */
  disclaimerBanner: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 8.5,
    color: '#991B1B',
    fontWeight: '600',
    lineHeight: 12,
  },

  /* Inpatient Stay Banner */
  inpatientBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  inpatientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inpatientIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inpatientTitle: {
    color: '#0369A1',
    fontWeight: '800',
    fontSize: 12.5,
  },
  inpatientSub: {
    color: '#0284C7',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 2,
  },

  /* QR Modal */
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
  qrHospTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    marginBottom: 8,
  },
  qrHospName: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 10,
  },
  qrTitle: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 10,
  },
  qrWrap: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  qrId: {
    color: '#0F172A',
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: 0.8,
    fontSize: 12,
  },
  qrBlood: {
    color: '#64748B',
    marginBottom: 12,
    fontWeight: '600',
    fontSize: 11,
  },
  qrClose: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    height: 38,
    justifyContent: 'center',
  },

  /* Notifications Modal */
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
});
