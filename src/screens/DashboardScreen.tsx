import React, { useState, useEffect, useRef } from 'react';
import {
  View,
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
  Flame,
  Utensils,
  Droplet,
  Pill,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
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

const { width } = Dimensions.get('window');
const CARD_GAP      = 14;
// Width changes based on how many cards exist — computed inside component, stored here as a helper
const PEEK_CARD_W   = width - 56;  // Peek mode: shows edge of next card (multiple cards)
const FULL_CARD_W   = width - 40;  // Full mode: single card takes all space

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
  hospitalId?:   string;
  name?:         string;          // some APIs put hospital name at root level
  patientMrn?:   string;          // alternate MRN key variants
  mrnNumber?:    string;
  medicalRecordNumber?: string;
  mrn?:          string;
  status?: string;
  registeredAt?: string;
}

/** Safely extract hospital display name regardless of API shape */
function getHospitalName(item: HospitalReg): string {
  return (
    item.hospital?.name ||
    item.hospitalName   ||
    item.name           ||
    'Unknown Hospital'
  );
}

/** Safely extract MRN regardless of API shape */
function getMRN(item: HospitalReg, fallback: string): string {
  return (
    item.mrn                 ||
    item.patientMrn          ||
    item.mrnNumber           ||
    item.medicalRecordNumber ||
    fallback
  );
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  
  const SERVICES = [
    { id: 'app', label: t('dashboard.quickActions.app'), sub: t('dashboard.quickActions.appSub'), icon: Calendar,      route: 'Appointments',    bgColor: '#EAF1FF', iconColor: '#2563EB' },
    { id: 'vit', label: t('dashboard.quickActions.vit'), sub: t('dashboard.quickActions.vitSub'), icon: Activity,      route: 'Vitals',          bgColor: '#EDFFF6', iconColor: '#059669' },
    { id: 'pay', label: t('dashboard.quickActions.pay'), sub: t('dashboard.quickActions.paySub'), icon: CreditCard,    route: 'Payments',        bgColor: '#FFF7ED', iconColor: '#D97706' },
    { id: 'rec', label: t('dashboard.quickActions.rec'), sub: t('dashboard.quickActions.recSub'), icon: ClipboardList,  route: 'HealthRecords',   bgColor: '#F3F0FF', iconColor: '#7C3AED' },
    { id: 'bmi', label: t('dashboard.quickActions.bmi'), sub: t('dashboard.quickActions.bmiSub'), icon: Scale,          route: 'BMICalculator',   bgColor: '#FFF0F3', iconColor: '#E11D48' },
    { id: 'ai',  label: t('dashboard.quickActions.ai'),  sub: t('dashboard.quickActions.aiSub'),  icon: Brain,          route: 'AISymptomChecker',bgColor: '#F0FFF4', iconColor: '#059669' },
    { id: 'diet', label: 'Diet Plan', sub: 'Personalized food advice', icon: Utensils, route: 'FoodRecommendation', bgColor: '#FFFBEB', iconColor: '#F59E0B' },
    { id: 'water',label: 'Water Tracker',sub: 'Track daily hydration', icon: Droplet,        route: 'WaterReminder',   bgColor: '#E0F2FE', iconColor: '#3B82F6' },
    { id: 'med', label: 'Medicines',    sub: 'Track medications',     icon: Pill,           route: 'MedicineReminder',bgColor: '#F3F0FF', iconColor: '#7C3AED' },
  ];

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [currentLocation, setCurrentLocation] = useState('Fetching location...');
  const [profile, setProfile]               = useState<any>(null);
  const [appointments, setAppointments]     = useState<any[]>([]);
  const [hospitalCards, setHospitalCards]   = useState<HospitalReg[]>([]);
  const [activeCard, setActiveCard]         = useState(0);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<HospitalReg | null>(null);
  const [selectedApt, setSelectedApt]       = useState<any | null>(null);
  const [streak, setStreak]               = useState(0);

  const { unreadCount, markAllRead } = useSocket();
  const carouselRef = useRef<FlatList>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Location ────────────────────────────────────────────────────────────────
  const getPosition = async () => {
    try {
      // Prominent Disclosure for Google Play Policy
      Alert.alert(
        'Location Access',
        'MS CureChain collects location data to find nearby healthcare providers and emergency hospitals, even when the app is in use.',
        [
          {
            text: 'OK',
            onPress: async () => {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') {
                setCurrentLocation('Sanctuary Medical Center');
                return;
              }
              const loc = await Location.getCurrentPositionAsync({});
              const geocode = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
              if (geocode.length > 0) {
                const p = geocode[0];
                const txt = [p.district || p.city || p.subregion, p.region, p.country].filter(Boolean).join(', ');
                setCurrentLocation(txt || 'Medical District');
              }
            },
          },
          {
            text: 'Cancel',
            onPress: () => setCurrentLocation('Medical District'),
            style: 'cancel',
          },
        ]
      );
    } catch {
      setCurrentLocation('Medical District');
    }
  };

  // ── Data ────────────────────────────────────────────────────────────────────
  const fetchData = async () => {
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

      const apts: any[] = Array.isArray(data.appointments)
        ? data.appointments
        : (data.appointments?.data || []);
      
      console.log(`[Dashboard] Received ${apts.length} appointments.`, apts.map(a => `${a._id} (${a.status})`));
      setAppointments(apts);

      // ── Build hospital ID cards from patient's appointments ────────────────
      // Group appointments by hospital._id to get unique hospitals.
      // Use the FIRST occurrence of apt.mrn for each hospital as the
      // hospital-specific MRN (this is the MRN field on the Appointment model).
      const seenHospitals = new Map<string, HospitalReg>();

      apts.forEach((apt: any) => {
        const hospId   = apt.hospital?._id;
        const hospName = apt.hospital?.name;
        const aptMRN   = apt.mrn; // Appointment.mrn — the hospital-specific MRN

        if (hospId && hospName && !seenHospitals.has(hospId)) {
          seenHospitals.set(hospId, {
            hospital: { _id: hospId, name: hospName },
            mrn:      aptMRN || prof?.mrn || 'N/A',
            status:   apt.status || 'active',
          });
        }
      });

      let cards: HospitalReg[] = Array.from(seenHospitals.values());

      // Fallback: if patient has no appointments yet, show a single card
      // from the profile's registered hospital with the profile-level MRN.
      if (cards.length === 0) {
        const hospName =
          prof?.hospital?.name ||
          prof?.hospitalName   ||
          'MSCureChain Medical Center';
        cards = [{
          hospital: { _id: prof?.hospital?._id || 'global', name: hospName },
          mrn:      prof?.mrn || 'N/A',
          status:   'active',
        }];
      }

      setHospitalCards(cards);
      console.log('[Dashboard] 🏥 Hospital cards built:', cards.map(c => `${c.hospital?.name} → ${c.mrn}`));

    } catch (err) {
      console.error('[Dashboard]', err);
    } finally {
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
    fetchData(); 
    // Record activity once on dashboard mount to maintain streak
    streakService.recordActivity().then(data => setStreak(data.currentStreak));
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
    // DIAGNOSTIC ALERT: If you see this, the code has updated correctly!
    // If you do NOT see this alert, please run 'npx expo start --clear' 
    // and uninstall/reinstall the app on your phone.
    Alert.alert('System Update', 'Navigation fix and data logs are now active.');
    
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

  const userName   = profile?.user?.name || 'Patient';
  const globalID   = profile?.mrn || 'N/A';
  const bloodGroup  = profile?.user?.bloodGroup || profile?.bloodGroup || 'O+';

  // ── The carousel uses hospitalCards (built from appointments) ─────────────────
  const cardList = hospitalCards;

  // ── Carousel width: full for single card, peek for multiple ─────────────────
  const CARD_WIDTH = cardList.length > 1 ? PEEK_CARD_W : FULL_CARD_W;

  // ── Render single ID card ────────────────────────────────────────────────────
  const renderIDCard = ({ item, index }: { item: HospitalReg; index: number }) => {
    const gradColors = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
    const hospName   = getHospitalName(item);
    const cardMRN    = getMRN(item, globalID);
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
              <Building2 size={12} color="rgba(255,255,255,0.55)" />
              <SanctuaryText variant="label_lg" style={styles.idCardLabel} numberOfLines={2}>
                {hospName.toUpperCase()}
              </SanctuaryText>
            </View>
            <View style={styles.activeChip}>
              <View style={styles.activeDot} />
              <SanctuaryText variant="label_sm" style={styles.activeChipText}>
                {(item.status || 'ACTIVE').toUpperCase()}
              </SanctuaryText>
            </View>
          </View>

          {/* Patient Name */}
          <SanctuaryText variant="headline_sm" style={styles.patientName} numberOfLines={1}>{userName}</SanctuaryText>

          {/* MRN (hospital-specific) + Blood Group */}
          <View style={styles.idMidRow}>
            <View>
              <SanctuaryText variant="body_sm" style={styles.idSubLabel}>{t('dashboard.mrn')}</SanctuaryText>
              <SanctuaryText variant="label_lg" style={styles.idMRN}>{cardMRN}</SanctuaryText>
            </View>
            <View style={styles.idRight}>
              <SanctuaryText variant="body_sm" style={styles.idSubLabel}>{t('dashboard.bloodGroup')}</SanctuaryText>
              <SanctuaryText variant="label_lg" style={styles.idMRN}>{bloodGroup}</SanctuaryText>
            </View>
          </View>

          {/* Registered Facility / Next Appointment */}
          <View style={styles.idDivider} />
          {(() => {
            const nextApt = appointments.find(a => 
              a.hospital?._id === item.hospital?._id && 
              ['confirmed', 'booked'].includes(a.status?.toLowerCase())
            );
            return nextApt ? (
              <View style={styles.facilityRow}>
                <Calendar size={11} color="#4ADE80" />
                <SanctuaryText variant="body_sm" style={[styles.facilityTxt, { color: '#4ADE80' }]} numberOfLines={1}>
                  Next: {safeFormat(nextApt.date, 'MMM dd')} @ {nextApt.appointmentTime || nextApt.time || nextApt.startTime}
                </SanctuaryText>
                <QrCode size={14} color="rgba(255,255,255,0.4)" />
              </View>
            ) : (
              <View style={styles.facilityRow}>
                <MapPin size={11} color="rgba(255,255,255,0.5)" />
                <SanctuaryText variant="body_sm" style={styles.facilityTxt} numberOfLines={1}>
                  {hospName}
                </SanctuaryText>
                <QrCode size={14} color="rgba(255,255,255,0.4)" />
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
              size={44}
              source={profile?.user?.avatar ? { uri: profile.user.avatar } : require('../../assets/image.png')}
              style={styles.avatar}
            />
          </TouchableOpacity>
          <View style={styles.brandBlock}>
            <SanctuaryText variant="headline_sm" style={styles.brandName}>{t('brand.name')}</SanctuaryText>
            <SanctuaryText variant="body_sm" style={styles.brandSub}>{t('brand.sub')}</SanctuaryText>
          </View>
          <View style={styles.headerRight}>
            <LanguageSelector />
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('QRScanner')}>
              <QrCode size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.locationPill}>
          <MapPin size={11} color={COLORS.primary} fill={COLORS.primary} />
          <SanctuaryText variant="label_lg" style={styles.locationTxt} numberOfLines={1}>{currentLocation}</SanctuaryText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); getPosition(); }} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {/* MEDICAL DISCLAIMER BANNER */}
        <View style={styles.disclaimerBanner}>
          <ShieldAlert size={14} color="#B91C1C" />
          <SanctuaryText style={styles.disclaimerText}>
            Notice: MS CureChain is for information management and is NOT a medical device. Always consult a doctor for diagnosis.
          </SanctuaryText>
        </View>

        {/* ── SOS Banner ── */}
        <TouchableOpacity style={styles.sosBanner} onPress={() => navigation.navigate('SOS')} activeOpacity={0.85}>
          <View style={styles.sosLeft}>
            <View style={styles.sosIconWrap}>
              <ShieldAlert size={22} color="#FFF" />
            </View>
            <View style={styles.sosTexts}>
              <SanctuaryText variant="label_lg" style={styles.sosTitle}>{t('sos.title')}</SanctuaryText>
              <SanctuaryText variant="body_sm" style={styles.sosSub}>{t('sos.sub')}</SanctuaryText>
            </View>
          </View>
          <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* ── Patient ID Cards Carousel ── */}
        <View style={styles.carouselSection}>
          <View style={styles.carouselHeader}>
            <SanctuaryText variant="label_lg" style={styles.carouselTitle}>
              {hospitalCards.length > 1 ? `${hospitalCards.length} Registered Hospitals` : 'Patient Access Card'}
            </SanctuaryText>
            <SanctuaryText variant="body_sm" style={styles.carouselHint}>Tap card to view QR</SanctuaryText>
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
              // No extra paddingRight needed when single card
              cardList.length <= 1 && { paddingRight: 20 },
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

        {/* ── Fitness Streak Summary ── */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.streakSummaryCard} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Achievements')}
          >
            <LinearGradient colors={['#FF5F6D', '#FFC371']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.streakSummaryGrad}>
              <View style={styles.streakSummaryLeft}>
                <View style={styles.streakSummaryIcon}>
                  <Flame size={24} color="#FFF" fill="#FFF" />
                </View>
                <View>
                  <SanctuaryText variant="label_lg" style={styles.streakSummaryTitle}>{streak} Day Fitness Streak!</SanctuaryText>
                  <SanctuaryText variant="body_sm" style={styles.streakSummarySub}>Keep pushing your limits!</SanctuaryText>
                </View>
              </View>
              <ChevronRight size={20} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Digital Services ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SanctuaryText variant="headline_sm" style={styles.sectionTitle}>{t('dashboard.digitalServices')}</SanctuaryText>
          </View>
          <View style={styles.servicesGrid}>
            {SERVICES.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.serviceCard}
                onPress={() => navigation.navigate(item.route as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.serviceIconBox, { backgroundColor: item.bgColor }]}>
                  <item.icon size={24} color={item.iconColor} />
                </View>
                <SanctuaryText variant="label_lg" style={styles.serviceLabel}>{item.label}</SanctuaryText>
                <SanctuaryText variant="body_sm" style={styles.serviceSub}>{item.sub}</SanctuaryText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Priority Visits ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SanctuaryText variant="headline_sm" style={styles.sectionTitle}>{t('dashboard.priorityVisit')}</SanctuaryText>
            <TouchableOpacity onPress={() => navigation.navigate('UpcomingAppointments')}>
              <SanctuaryText variant="label_lg" style={{ color: COLORS.primary, fontWeight: '800' }}>See All</SanctuaryText>
            </TouchableOpacity>
          </View>

          {/* ── Priority Visits — only confirmed/Booked/in-progress — */}
          {(() => {
            const CONFIRMED_STATUSES = ['confirmed', 'booked'];
            const priorityApts = appointments
              .filter(a => {
                const status = (a.status || '').trim().toLowerCase();
                return CONFIRMED_STATUSES.includes(status) || status === 'booked';
              })
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 3);
            return priorityApts.length > 0 ? (
              priorityApts.map((apt, idx) => {
                const raw = apt.doctor?.user?.name || apt.doctor?.name || 'Physician';
                const displayDoc = raw.startsWith('Dr.') ? raw : `Dr. ${raw}`;
                const dept = apt.type === 'OPD' ? 'OUTPATIENT' : (apt.department || apt.type || 'CONSULTATION');
                const timeStr = apt.appointmentTime || apt.time || safeFormat(apt.date, 'hh:mm a');
                const hospName = apt.hospital?.name || 'Hospital';
                return (
                  <TouchableOpacity
                    key={apt._id || idx}
                    style={styles.aptRow}
                    onPress={() => setSelectedApt(apt)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dateBubble}>
                      <SanctuaryText variant="label_sm" style={styles.dateMon}>{safeFormat(apt.date, 'MMM').toUpperCase()}</SanctuaryText>
                      <SanctuaryText variant="headline_sm" style={styles.dateDay}>{safeFormat(apt.date, 'dd')}</SanctuaryText>
                    </View>
                    <View style={styles.aptInfo}>
                      <SanctuaryText variant="label_sm" style={styles.deptLabel}>{dept.toUpperCase()}</SanctuaryText>
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
      <Portal>
        <Modal visible={qrModalVisible} onDismiss={() => setQrModalVisible(false)} contentContainerStyle={styles.modal}>
          <View style={styles.qrBox}>
            {selectedHospital && (
              <>
            <View style={styles.qrHospTag}>
                  <Building2 size={13} color={COLORS.primary} />
                  <SanctuaryText variant="label_sm" style={styles.qrHospName} numberOfLines={1}>
                    {getHospitalName(selectedHospital)}
                  </SanctuaryText>
                </View>
              </>
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
                <View style={{ backgroundColor: '#F1F5F9', borderRadius: 12, padding: 12, width: '100%', marginBottom: 16 }}>
                  <SanctuaryText variant="label_sm" style={{ color: '#64748B', marginBottom: 4 }}>UPCOMING APPOINTMENT</SanctuaryText>
                  <SanctuaryText variant="label_lg" style={{ color: COLORS.primary }}>{doc}</SanctuaryText>
                  <SanctuaryText variant="body_sm" style={{ color: '#1E293B' }}>
                    {safeFormat(nextApt.date, 'PPPP')}
                  </SanctuaryText>
                  <SanctuaryText variant="label_lg" style={{ color: '#1E293B', marginTop: 2 }}>
                    Time: {nextApt.appointmentTime || nextApt.time || nextApt.startTime}
                  </SanctuaryText>
                </View>
              );
            })()}

            <View style={styles.qrWrap}>
              <QRCode value={selectedHospital ? getMRN(selectedHospital, globalID) : globalID} size={200} />
            </View>
            <SanctuaryText variant="label_lg" style={styles.qrId}>
              {t('dashboard.mrn')}: {selectedHospital ? getMRN(selectedHospital, globalID) : globalID}
            </SanctuaryText>
            <SanctuaryText variant="body_sm" style={styles.qrBlood}>{t('dashboard.bloodGroup')}: {bloodGroup}</SanctuaryText>
            <Button
              mode="contained"
              onPress={() => setQrModalVisible(false)}
              style={styles.qrClose}
              labelStyle={{ fontWeight: '800', letterSpacing: 1 }}
            >
              {t('common.close')}
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* ── Appointment Detail Modal ── */}
      <Portal>
        <Modal
          visible={!!selectedApt}
          onDismiss={() => setSelectedApt(null)}
          contentContainerStyle={{ margin: 0, justifyContent: 'flex-end' }}
        >
          {selectedApt && <DashAptDetail apt={selectedApt} onClose={() => setSelectedApt(null)} />}
        </Modal>
      </Portal>
    </View>
  );
}

// ── Appointment Detail Sheet (inline for Dashboard) ───────────────────────────
const APT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  confirmed:    { label: 'CONFIRMED',   color: '#059669', bg: '#ECFDF5' },
  completed:    { label: 'COMPLETED',   color: '#059669', bg: '#ECFDF5' },
  'in-progress':{ label: 'IN-PROGRESS', color: '#D97706', bg: '#FFFBEB' },
  Booked:       { label: 'BOOKED',      color: '#2563EB', bg: '#EFF6FF' },
  booked:       { label: 'BOOKED',      color: '#2563EB', bg: '#EFF6FF' },
  pending:      { label: 'PENDING',     color: '#6B7280', bg: '#F9FAFB' },
  cancelled:    { label: 'CANCELLED',   color: '#DC2626', bg: '#FEF2F2' },
  rejected:     { label: 'REJECTED',    color: '#DC2626', bg: '#FEF2F2' },
};
function aptStatusCfg(s: string) {
  return APT_STATUS[s] || { label: s.toUpperCase(), color: '#64748B', bg: '#F1F5F9' };
}

function DashAptDetail({ apt, onClose }: { apt: any; onClose: () => void }) {
  const sc      = aptStatusCfg(apt.status);
  const raw     = apt.doctor?.user?.name || apt.doctor?.name || 'Physician';
  const doc     = raw.startsWith('Dr.') ? raw : `Dr. ${raw}`;
  const spec    = apt.doctor?.specialties?.[0] || apt.doctor?.department || '';
  const vitals  = apt.vitals || {};
  const payment = apt.payment || {};
  const details = apt.patientDetails || {};
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
            { label: 'APPT ID',    value: apt.appointmentId || apt._id.slice(-10).toUpperCase(),                 hi: false },
            { label: 'MRN NUMBER', value: apt.mrn || 'N/A',                                                      hi: true  },
            { label: 'CASE TYPE',  value: apt.type || 'Consultation',                                            hi: false },
            { label: 'URGENCY',    value: (apt.urgency || 'non-urgent').replace(/-/g,' ').toUpperCase(),         hi: false },
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
              { label: 'BP',      val: vitals.bloodPressure, unit: '' },
              { label: 'TEMP',    val: vitals.temperature,   unit: '°F' },
              { label: 'PULSE',   val: vitals.pulse,         unit: 'bpm' },
              { label: 'SpO2',    val: vitals.spO2,          unit: '%' },
              { label: 'GLUCOSE', val: vitals.sugar,         unit: 'mg/dL' },
              { label: 'WEIGHT',  val: vitals.weight,        unit: 'kg' },
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
            { label: 'AGE / GENDER',    value: `${details.age || '—'} / ${(details.gender || '—').toUpperCase()}`,  bold: false },
            { label: 'EST. DURATION',   value: details.duration || '—',                                              bold: false },
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
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ['paid','Paid'].includes(payStatus) ? '#4ADE80' : '#FCD34D' }} />
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  /* Header */
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarWrap: { marginRight: 12 },
  avatar: { backgroundColor: '#E2E8F0' },
  brandBlock: { flex: 1 },
  brandName: { color: '#1E293B', fontWeight: '900', fontSize: 17, lineHeight: 20 },
  brandSub: { color: '#94A3B8', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: { padding: 12, marginRight: -8 },
  locationPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start', maxWidth: '90%' },
  locationTxt: { marginLeft: 6, color: COLORS.primary, fontSize: 11, fontWeight: '700' },

  scroll: { paddingTop: 20 },

  /* SOS */
  sosBanner: {
    backgroundColor: '#B91C1C',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  disclaimerBanner: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    color: '#991B1B',
    fontWeight: '700',
    lineHeight: 14,
  },
  sosLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sosIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  sosTexts: { flex: 1 },
  sosTitle: { color: '#FFF', fontWeight: '900', fontSize: 13, letterSpacing: 0.3 },
  sosSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2, fontWeight: '700', letterSpacing: 0.5 },

  /* Carousel */
  carouselSection: { marginBottom: 24 },
  carouselHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  carouselTitle: { color: '#1E293B', fontWeight: '800', fontSize: 15 },
  carouselHint: { color: '#94A3B8', fontSize: 11 },
  carouselList: { paddingLeft: 20, paddingRight: 36 },
  cardSlide: { marginRight: CARD_GAP },  // width set dynamically in renderIDCard

  /* ID Card */
  idCard: { borderRadius: 22, padding: 22 },
  idTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  idTopLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6, marginRight: 10 },
  idCardLabel: { color: 'rgba(255,255,255,0.6)', fontWeight: '800', fontSize: 10, letterSpacing: 0.5, flexShrink: 1 },
  activeChip: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  activeChipText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  patientName: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.2, marginBottom: 18 },
  idMidRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  idRight: { alignItems: 'flex-end' },
  idSubLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 3 },
  idMRN: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  idDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 14 },
  facilityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  facilityTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', flex: 1 },
  qrHint: { padding: 4 },

  /* Dots */
  dotRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14, gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#CBD5E1' },
  dotActive: { width: 18, backgroundColor: COLORS.primary, borderRadius: 4 },

  /* Sections */
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#1E293B', fontWeight: '900', fontSize: 18 },

  /* Service Grid */
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceCard: { width: (width - 52) / 2, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18 },
  serviceIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  serviceLabel: { color: '#1E293B', fontWeight: '800', fontSize: 15, marginBottom: 3 },
  serviceSub: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },

  /* Appointments */
  aptRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10 },
  dateBubble: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  dateMon: { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  dateDay: { color: '#1E293B', fontWeight: '900', fontSize: 18, marginTop: -2 },
  aptInfo: { flex: 1 },
  deptLabel: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  docName: { color: '#1E293B', fontWeight: '800', fontSize: 15, marginBottom: 3 },
  aptMeta: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 36, alignItems: 'center' },
  emptyTxt: { color: '#94A3B8', marginTop: 12, fontWeight: '600' },
  emptyAction: { color: COLORS.primary, marginTop: 8, fontWeight: '900', fontSize: 14 },

  /* QR Modal */
  modal: { padding: 24 },
  qrBox: { backgroundColor: '#FFF', borderRadius: 32, padding: 32, alignItems: 'center' },
  qrHospTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EAF1FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  qrHospName: { color: COLORS.primary, fontWeight: '800', fontSize: 11 },
  qrTitle: { color: '#1E293B', fontWeight: '900', fontSize: 20, marginBottom: 20 },
  qrWrap: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 24, marginBottom: 16 },
  qrId: { color: '#1E293B', fontWeight: '800', marginBottom: 6, letterSpacing: 1 },
  qrBlood: { color: '#64748B', marginBottom: 24, fontWeight: '600' },
  qrClose: { width: '100%', borderRadius: 16, backgroundColor: COLORS.primary },
  streakSummaryCard: { borderRadius: 20, overflow: 'hidden', elevation: 4, shadowColor: '#FF5F6D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  streakSummaryGrad: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakSummaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  streakSummaryIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  streakSummaryTitle: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  streakSummarySub: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 11, marginTop: 2 },
});
