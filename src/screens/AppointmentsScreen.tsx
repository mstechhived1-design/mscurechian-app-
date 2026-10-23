import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Dimensions,
  Alert,
  Animated,
  Linking,
} from 'react-native';
import { Portal, Modal } from 'react-native-paper';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Activity,
  Stethoscope,
  Navigation,
  X,
  ChevronDown,
  Video,
  XCircle,
  Building2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StackNavigationProp } from '@react-navigation/stack';

import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '../constants/designSystem';
import { SanctuaryText, DigitalAtriumLoader } from '../components/SanctuaryComponents';
import GlassModal from '@/components/GlassModal';
import { safeFormat } from '@/utils/dateUtils';
import { notificationService } from '@/services/notificationService';
import { socketService } from '@/services/socketService';
import { familyService } from '@/services/familyService';
import dayjs from 'dayjs';

const { width, height } = Dimensions.get('window');

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  confirmed:         { label: 'CONFIRMED',       color: '#059669', bg: '#ECFDF5' },
  completed:         { label: 'COMPLETED',       color: '#059669', bg: '#ECFDF5' },
  'in-progress':     { label: 'IN CONSULTATION', color: '#059669', bg: '#ECFDF5' },
  'in_progress':     { label: 'IN CONSULTATION', color: '#059669', bg: '#ECFDF5' },
  'in consultation': { label: 'IN CONSULTATION', color: '#059669', bg: '#ECFDF5' },
  paused:            { label: 'PAUSED',          color: '#D97706', bg: '#FEF3C7' },
  arrived:           { label: 'ARRIVED',         color: '#0284C7', bg: '#E0F2FE' },
  Booked:            { label: 'BOOKED',          color: '#2563EB', bg: '#EFF6FF' },
  booked:            { label: 'BOOKED',          color: '#2563EB', bg: '#EFF6FF' },
  pending:           { label: 'PENDING',         color: '#6B7280', bg: '#F9FAFB' },
  cancelled:         { label: 'CANCELLED',       color: '#DC2626', bg: '#FEF2F2' },
  rejected:          { label: 'REJECTED',        color: '#DC2626', bg: '#FEF2F2' },
} as Record<string, { label: string; color: string; bg: string }>;

function statusCfg(s: string) {
  const norm = (s || '').trim().toLowerCase();
  if (['in-progress', 'in_progress', 'in consultation'].includes(norm)) {
    return { label: 'IN CONSULTATION', color: '#059669', bg: '#ECFDF5' };
  }
  return STATUS[norm] || STATUS[s] || { label: (s || 'BOOKED').toUpperCase(), color: '#64748B', bg: '#F1F5F9' };
}

function getDocName(doc: any) {
  const n = doc?.user?.name || doc?.name || 'Physician';
  return n.startsWith('Dr.') ? n : `Dr. ${n}`;
}

function getSpecialty(doc: any): string {
  return doc?.specialties?.[0] || doc?.department || doc?.specialization || '';
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

export default function AppointmentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [tabIndex, setTabIndex]     = useState(0); // 0 = Upcoming, 1 = Past
  const [selected, setSelected]     = useState<any | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  
  const scrollX = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<ScrollView>(null);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchRef = useRef<number>(0);

  const fetchData = async (force: boolean = false) => {
    const now = Date.now();
    if (!force && (isFetchingRef.current || now - lastFetchRef.current < 2500)) {
      return;
    }
    isFetchingRef.current = true;
    lastFetchRef.current = now;

    try {
      const res = await apiClient.get(PATIENT_ENDPOINTS.APPOINTMENTS);
      const list = Array.isArray(res.data.data)
        ? res.data.data
        : (res.data?.data?.data || []);
      setAppointments(list);
    } catch (e) {
      console.error('[Appointments]', e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(true);
    }, [])
  );

  useEffect(() => {
    const handleUpdate = () => {
      fetchData();
    };

    const unsub1 = socketService.on('queue_update', handleUpdate);
    const unsub2 = socketService.on('queue_updated', handleUpdate);
    const unsub3 = socketService.on('consultation_started', handleUpdate);
    const unsub4 = socketService.on('consultation_paused', handleUpdate);
    const unsub5 = socketService.on('consultation_resumed', handleUpdate);
    const unsub6 = socketService.on('appointment_completed', handleUpdate);
    const unsub7 = socketService.on('appointment:status_change', handleUpdate);
    const unsub8 = socketService.on('appointment_status_changed', handleUpdate);
    const unsub9 = socketService.on('dashboard:update', handleUpdate);
    const unsubProfile = familyService.onProfileChange(() => fetchData(true));

    const interval = setInterval(fetchData, 8000);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
      unsub8();
      unsub9();
      unsubProfile();
      clearInterval(interval);
    };
  }, []);

  const handleCancel = async (id: string) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await apiClient.patch(`/bookings/${id}/status`, { status: 'cancelled' });
              setSelected(null);
              fetchData();
              
              // Trigger a proper system notification
              await notificationService.scheduleInstantNotification(
                "Appointment Cancelled",
                "Your appointment has been cancelled. The refund will be processed within 24 hours."
              );

              Alert.alert('Appointment Cancelled', 'Your appointment has been cancelled successfully. The amount will be refunded under 24 hours to your account.');
            } catch (err: any) {
              console.error('[CancelApt]', err);
              Alert.alert('Error', err.response?.data?.message || 'Could not cancel appointment.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReschedule = (apt: any) => {
    setSelected(null);
    const doctorId = apt.doctor?._id || apt.doctor?.user?._id;
    const hospitalId = apt.hospital?._id;
    Alert.alert(
      'Reschedule Appointment',
      'Please select your preferred new date and timeslot. Your current booking will be adjusted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Choose Slot', 
          onPress: () => navigation.navigate('BookAppointment', { doctorId, hospitalId }) 
        }
      ]
    );
  };

  const setPage = (index: number) => {
    setTabIndex(index);
    pagerRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onMomentumScrollEnd = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setTabIndex(index);
  };

  if (loading && !refreshing) return <DigitalAtriumLoader />;

  const DONE_STATUSES = ['completed', 'cancelled', 'rejected'];

  // Unique hospitals from all appointments
  const availableHospitals: { id: string; name: string }[] = [];
  const seenHospitalIds = new Set<string>();
  appointments.forEach(apt => {
    const name = apt.hospital?.name;
    const id   = apt.hospital?._id || apt.hospital?.id || name;
    if (name && id && !seenHospitalIds.has(id)) {
      seenHospitalIds.add(id);
      availableHospitals.push({ id, name });
    }
  });

  const applyHospitalFilter = (list: any[]) => {
    if (!selectedHospital) return list;
    return list.filter(apt => {
      const id   = apt.hospital?._id || apt.hospital?.id || apt.hospital?.name;
      const name = apt.hospital?.name || '';
      return id === selectedHospital || name === selectedHospital;
    });
  };

  const upcoming = applyHospitalFilter(appointments.filter(apt => !DONE_STATUSES.includes(apt.status?.trim().toLowerCase())));
  const past     = applyHospitalFilter(appointments.filter(apt =>  DONE_STATUSES.includes(apt.status?.trim().toLowerCase())));

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <SanctuaryText variant="headline_sm" style={styles.headerTitle}>{t('appointments.title')}</SanctuaryText>
          <SanctuaryText variant="body_xs" style={styles.headerSub}>Manage consultations & visit tokens</SanctuaryText>
        </View>
        <TouchableOpacity
          style={styles.headerBookBtn}
          onPress={() => navigation.navigate('BookAppointment')}
          activeOpacity={0.8}
        >
          <Plus size={13} color="#FFF" />
          <SanctuaryText variant="label_sm" style={styles.headerBookBtnTxt}>Book New</SanctuaryText>
        </TouchableOpacity>
      </View>

      {/* ── Tabs (Pill Segmented) ── */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsPillBg}>
          <TouchableOpacity 
            style={[styles.tabButton, tabIndex === 0 && styles.tabButtonActive]} 
            onPress={() => setPage(0)}
            activeOpacity={0.8}
          >
            <SanctuaryText variant="label_sm" style={[styles.tabTxt, tabIndex === 0 && styles.tabTxtActive]}>
              Upcoming ({upcoming.length})
            </SanctuaryText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, tabIndex === 1 && styles.tabButtonActive]} 
            onPress={() => setPage(1)}
            activeOpacity={0.8}
          >
            <SanctuaryText variant="label_sm" style={[styles.tabTxt, tabIndex === 1 && styles.tabTxtActive]}>
              Visit History ({past.length})
            </SanctuaryText>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Hospital Filter Chips ── */}
      {availableHospitals.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.hospitalFilterBar}
          contentContainerStyle={styles.hospitalFilterBarContent}
        >
          <TouchableOpacity
            style={[styles.hospitalChip, !selectedHospital && styles.hospitalChipActive]}
            onPress={() => setSelectedHospital(null)}
            activeOpacity={0.8}
          >
            <SanctuaryText
              variant="label_sm"
              style={[styles.hospitalChipTxt, !selectedHospital && styles.hospitalChipTxtActive]}
            >
              All Hospitals
            </SanctuaryText>
          </TouchableOpacity>
          {availableHospitals.map(h => (
            <TouchableOpacity
              key={h.id}
              style={[styles.hospitalChip, selectedHospital === h.id && styles.hospitalChipActive]}
              onPress={() => setSelectedHospital(prev => prev === h.id ? null : h.id)}
              activeOpacity={0.8}
            >
              <Building2 size={10} color={selectedHospital === h.id ? '#FFF' : '#64748B'} />
              <SanctuaryText
                variant="label_sm"
                style={[styles.hospitalChipTxt, selectedHospital === h.id && styles.hospitalChipTxtActive]}
                numberOfLines={1}
              >
                {h.name}
              </SanctuaryText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Pager (Swipeable Lists) ── */}
      <ScrollView
        ref={pagerRef}
        style={{ flex: 1 }}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        bounces={false}
      >
        <View style={{ width, flex: 1 }}>
          <AppointmentList 
            data={upcoming} 
            type="upcoming" 
            onSelect={setSelected} 
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            navigation={navigation}
          />
        </View>
        <View style={{ width, flex: 1 }}>
          <AppointmentList 
            data={past} 
            type="past" 
            onSelect={setSelected} 
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            navigation={navigation}
          />
        </View>
      </ScrollView>

      {/* ── FAB – sits above the bottom tab bar ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('BookAppointment')}
        activeOpacity={0.85}
      >
        <Plus size={22} color="#FFF" />
      </TouchableOpacity>

      {/* ── Detail Modal ── */}
      <GlassModal
        visible={!!selected}
        onDismiss={() => setSelected(null)}
        animationType="slide"
        contentContainerStyle={{ width: '100%', maxWidth: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, alignSelf: 'flex-end', marginTop: 'auto' }}
      >
        {selected && (
          <AppointmentDetail 
            apt={selected} 
            onClose={() => setSelected(null)} 
            onCancel={handleCancel}
            onReschedule={handleReschedule}
            navigation={navigation}
          />
        )}
      </GlassModal>
    </View>
  );
}

// ── Shared List Component ──────────────────────────────────────────────────────
function AppointmentList({ data, type, onSelect, refreshing, onRefresh, navigation }: any) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scroll, { flexGrow: 1 }]}
      showsVerticalScrollIndicator={true}
      refreshControl={
        Platform.OS !== 'web' ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        ) : undefined
      }
    >
      {data.length > 0 ? (
        data.map((apt: any) => {
          const sc   = statusCfg(apt.status);
          const doc  = getDocName(apt.doctor);
          const spec = getSpecialty(apt.doctor);
          const isToday = dayjs(apt.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD');
          const tokenNum = apt.tokenNumber || apt.queueNumber || apt.token || (apt._id ? apt._id.slice(-3).toUpperCase() : '01');

          return (
            <TouchableOpacity
              key={apt._id}
              style={[styles.card, isToday && type === 'upcoming' && styles.cardToday]}
              onPress={() => onSelect(apt)}
              activeOpacity={0.8}
            >
              <View style={[styles.dateBubble, isToday && type === 'upcoming' && styles.dateBubbleToday]}>
                <SanctuaryText variant="label_sm" style={[styles.dateMon, isToday && type === 'upcoming' && { color: '#FFF' }]}>
                  {safeFormat(apt.date, 'MMM').toUpperCase()}
                </SanctuaryText>
                <SanctuaryText variant="headline_sm" style={[styles.dateDay, isToday && type === 'upcoming' && { color: '#FFF' }]}>
                  {safeFormat(apt.date, 'dd')}
                </SanctuaryText>
              </View>

              <View style={styles.cardInfo}>
                {isToday && type === 'upcoming' && (
                  <View style={styles.tokenPill}>
                    <View style={styles.liveGreenDot} />
                    <SanctuaryText variant="label_sm" style={styles.tokenPillText}>TODAY · TOKEN #{tokenNum}</SanctuaryText>
                  </View>
                )}
                <SanctuaryText variant="label_lg" style={styles.docName} numberOfLines={1}>{doc}</SanctuaryText>
                {!!spec && <SanctuaryText variant="label_sm" style={styles.specLabel}>{spec.toUpperCase()}</SanctuaryText>}
                <View style={styles.metaRow}>
                  <Clock size={11} color="#94A3B8" />
                  <SanctuaryText variant="body_sm" style={styles.metaTxt}>
                    {apt.appointmentTime || apt.time || 'Scheduled'}
                  </SanctuaryText>
                  <MapPin size={11} color="#94A3B8" style={{ marginLeft: 10 }} />
                  <SanctuaryText variant="body_sm" style={styles.metaTxt} numberOfLines={1}>
                    {apt.hospital?.name || 'Hospital'}
                  </SanctuaryText>
                </View>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                <SanctuaryText variant="label_sm" style={[styles.statusTxt, { color: sc.color }]}>
                  {sc.label}
                </SanctuaryText>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.empty}>
          <Calendar size={44} color="#CBD5E1" />
          <SanctuaryText variant="body_md" style={styles.emptyTxt}>No {type} visits</SanctuaryText>
          {type === 'upcoming' && (
            <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate('BookAppointment')}>
              <SanctuaryText variant="label_lg" style={styles.bookBtnTxt}>+ Book a Consultation</SanctuaryText>
            </TouchableOpacity>
          )}
        </View>
      )}
      {/* Extra bottom space for tab bar */}
      <View style={{ height: Platform.OS === 'ios' ? 85 : 70 }} />
    </ScrollView>
  );
}

// ── Detail Sheet (Same as before but kept for completeness) ────────────────────
function AppointmentDetail({ 
  apt, 
  onClose, 
  onCancel, 
  onReschedule,
  navigation,
}: { 
  apt: any; 
  onClose: () => void; 
  onCancel: (id: string) => void; 
  onReschedule: (apt: any) => void; 
  navigation?: any;
}) {
  const sc      = statusCfg(apt.status);
  const doc     = getDocName(apt.doctor);
  const spec    = getSpecialty(apt.doctor);
  const vitals  = apt.vitals || {};
  const payment = apt.payment || {};
  const details = apt.patientDetails || {};
  const patientInfo = getPatientAgeGender(apt);

  const payStatus   = payment.paymentStatus || apt.paymentStatus || 'pending';
  const payMethod   = payment.paymentMethod || apt.paymentMethod || 'N/A';
  const payAmount   = payment.amount || apt.amount || apt.consultationFee || 0;

  const isPast = ['completed', 'cancelled'].includes(apt.status?.toLowerCase());

  const isInConsultationOrPaused = Boolean(
    apt.status === 'in-progress' ||
    apt.isPaused ||
    apt.consultationStartTime ||
    apt.queue_status === 'CURRENT' ||
    apt.queue_status === 'IN_CONSULTATION' ||
    apt.queue_status === 'PAUSED'
  );

  const canCancelOrReschedule = !isPast && !isInConsultationOrPaused;

  const hasAnyVital = Boolean(
    (vitals.bloodPressure && vitals.bloodPressure !== '—' && vitals.bloodPressure !== '--') ||
    (vitals.temperature && vitals.temperature !== '—' && vitals.temperature !== '--') ||
    (vitals.pulse && vitals.pulse !== '—' && vitals.pulse !== '--') ||
    (vitals.spO2 && vitals.spO2 !== '—' && vitals.spO2 !== '--') ||
    (vitals.sugar && vitals.sugar !== '—' && vitals.sugar !== '--') ||
    (vitals.weight && vitals.weight !== '—' && vitals.weight !== '--')
  );

  const handleGetDirections = () => {
    const hospital = apt.hospital;
    if (!hospital) return;
    
    const query = encodeURIComponent(`${hospital.name}, ${hospital.address || ''}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`
    });

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
      }
    });
  };

  return (
    <View style={detail.root}>
      {/* Top Bar with Handle & Top-Right Close Button */}
      <View style={detail.modalTopRow}>
        <View style={detail.handle} />
        <TouchableOpacity
          style={detail.closeIconBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Close"
          activeOpacity={0.7}
        >
          <ChevronDown size={18} color="#64748B" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Doctor & Status Header */}
        <View style={detail.topRow}>
          <View style={detail.dateBubble}>
            <SanctuaryText variant="label_sm" style={detail.dateMon}>{safeFormat(apt.date, 'MMM').toUpperCase()}</SanctuaryText>
            <SanctuaryText variant="headline_sm" style={detail.dateDay}>{safeFormat(apt.date, 'dd')}</SanctuaryText>
          </View>
          <View style={detail.topMid}>
            <SanctuaryText variant="headline_sm" style={detail.docName} numberOfLines={1}>{doc}</SanctuaryText>
            {!!spec && <SanctuaryText variant="label_sm" style={detail.specLabel}>{spec.toUpperCase()}</SanctuaryText>}
            <View style={detail.metaRow}>
              <Clock size={11} color="#64748B" />
              <SanctuaryText variant="body_sm" style={detail.metaTxt}>{apt.appointmentTime || apt.time || 'Scheduled'}</SanctuaryText>
              <SanctuaryText variant="body_sm" style={[detail.metaTxt, { marginHorizontal: 2 }]}>•</SanctuaryText>
              <MapPin size={11} color="#64748B" />
              <SanctuaryText variant="body_sm" style={detail.metaTxt} numberOfLines={1}>{apt.hospital?.name}</SanctuaryText>
            </View>
          </View>
          <View style={[detail.statusBadge, { backgroundColor: sc.bg }]}>
            <SanctuaryText variant="label_sm" style={[detail.statusTxt, { color: sc.color }]}>{sc.label}</SanctuaryText>
          </View>
        </View>

        {/* 2x2 Info Grid */}
        <View style={detail.infoGrid}>
          <InfoCell label="APPT ID"    value={apt.appointmentId || apt._id.slice(-10).toUpperCase()} />
          <InfoCell label="MRN NUMBER" value={apt.mrn || 'N/A'} highlight />
          <InfoCell label="CASE TYPE"  value={apt.type || 'Consultation'} />
          <InfoCell label="URGENCY"    value={(apt.urgency || 'non-urgent').replace(/-/g,' ').toUpperCase()} colored={apt.urgency !== 'urgent'} />
        </View>

        {/* Patient Vitals (Only for past/completed appointments) */}
        {isPast && (
          <>
            <View style={detail.divider} />
            <View style={detail.sectionPad}>
              <View style={detail.colHeader}>
                <Activity size={12} color={COLORS.primary} />
                <SanctuaryText variant="label_sm" style={detail.colTitle}>PATIENT VITALS</SanctuaryText>
              </View>
              {hasAnyVital ? (
                <View style={detail.vitalsGrid}>
                  {!!vitals.bloodPressure && vitals.bloodPressure !== '—' && <VitalBox label="BP" value={vitals.bloodPressure} unit="" />}
                  {!!vitals.temperature && vitals.temperature !== '—' && <VitalBox label="TEMP" value={vitals.temperature} unit="°F" />}
                  {!!vitals.pulse && vitals.pulse !== '—' && <VitalBox label="PULSE" value={vitals.pulse} unit="bpm" />}
                  {!!vitals.spO2 && vitals.spO2 !== '—' && <VitalBox label="SpO2" value={vitals.spO2} unit="%" />}
                  {!!vitals.sugar && vitals.sugar !== '—' && <VitalBox label="GLUCOSE" value={vitals.sugar} unit="mg/dL" />}
                  {!!vitals.weight && vitals.weight !== '—' && <VitalBox label="WEIGHT" value={vitals.weight} unit="kg" />}
                </View>
              ) : (
                <View style={detail.vitalsEmptyRow}>
                  <Activity size={12} color="#94A3B8" />
                  <SanctuaryText variant="body_xs" style={detail.vitalsEmptyTxt}>No clinical vitals recorded for this visit</SanctuaryText>
                </View>
              )}
            </View>
          </>
        )}

        <View style={detail.divider} />

        {/* Consultation Details */}
        <View style={detail.sectionPad}>
          <View style={detail.colHeader}>
            <Stethoscope size={12} color={COLORS.primary} />
            <SanctuaryText variant="label_sm" style={detail.colTitle}>CONSULTATION DETAILS</SanctuaryText>
          </View>
          <View style={detail.consultGrid}>
            <View style={[detail.consultCell, { flex: 1.2 }]}>
              <SanctuaryText variant="label_sm" style={cr.label}>CLINICAL REASON</SanctuaryText>
              <SanctuaryText variant="body_sm" style={cr.value} numberOfLines={2}>
                {apt.reason || apt.symptoms?.join(', ') || 'General Consultation'}
              </SanctuaryText>
            </View>
            <View style={[detail.consultCell, { flex: 0.9 }]}>
              <SanctuaryText variant="label_sm" style={cr.label}>PATIENT / GENDER</SanctuaryText>
              <SanctuaryText variant="body_sm" style={cr.value}>
                {patientInfo.age ? `${patientInfo.age} yrs` : '—'} • {patientInfo.gender || '—'}
              </SanctuaryText>
            </View>
            {(!!details.duration || !!apt.department) && (
              <View style={[detail.consultCell, { flex: 0.8 }]}>
                <SanctuaryText variant="label_sm" style={cr.label}>{apt.department ? 'DEPARTMENT' : 'EST. DURATION'}</SanctuaryText>
                <SanctuaryText variant="body_sm" style={cr.value} numberOfLines={1}>
                  {apt.department || details.duration || '—'}
                </SanctuaryText>
              </View>
            )}
          </View>
        </View>

        {/* Payment Summary */}
        <LinearGradient colors={['#0F172A', '#1E293B']} style={detail.payFooter}>
          <View style={detail.payLeft}>
            <View style={[detail.payDot, { backgroundColor: payStatus === 'paid' || payStatus === 'Paid' ? '#4ADE80' : '#FCD34D' }]} />
            <View>
              <SanctuaryText variant="label_sm" style={detail.payMethodLabel}>PAYMENT · {payMethod.toUpperCase()}</SanctuaryText>
              <SanctuaryText variant="label_md" style={detail.payStatusLabel}>{(payStatus).toUpperCase()}</SanctuaryText>
            </View>
          </View>
          <View style={detail.payRight}>
            <SanctuaryText variant="label_sm" style={detail.payFeeLabel}>CONSULTATION FEE</SanctuaryText>
            <SanctuaryText variant="headline_sm" style={detail.payAmt}>₹{payAmount.toLocaleString()}</SanctuaryText>
          </View>
        </LinearGradient>
      </ScrollView>

      {/* Action Buttons Area - Full width, zero dead space */}
      {(!isPast || canCancelOrReschedule) && (
        <View style={detail.actionArea}>
          {!isPast && (
            <View style={detail.actionRow}>
              {/* Action 1: Directions */}
              {apt.hospital && (
                <TouchableOpacity 
                  style={[detail.actionBtn, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]} 
                  onPress={handleGetDirections}
                >
                  <Navigation size={15} color="#0284C7" />
                  <SanctuaryText variant="label_sm" style={[detail.actionBtnTxt, { color: '#0284C7' }]}>
                    Directions
                  </SanctuaryText>
                </TouchableOpacity>
              )}

              {/* Action 2: Live Queue Tracker */}
              {navigation && (
                <TouchableOpacity 
                  style={[detail.actionBtn, { backgroundColor: '#2563EB', borderColor: '#1D4ED8' }]} 
                  onPress={() => {
                    onClose();
                    navigation.navigate('LiveQueue', { appointmentId: apt._id });
                  }}
                >
                  <Clock size={15} color="#FFFFFF" />
                  <SanctuaryText variant="label_sm" style={[detail.actionBtnTxt, { color: '#FFFFFF' }]}>
                    Live Queue
                  </SanctuaryText>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Secondary Actions: Reschedule / Cancel */}
          {canCancelOrReschedule && (
          <View style={[detail.actionRow, { marginTop: 8 }]}>
            <TouchableOpacity 
              style={[detail.actionBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]} 
              onPress={() => onReschedule(apt)}
            >
              <Calendar size={15} color="#16A34A" />
              <SanctuaryText variant="label_sm" style={[detail.actionBtnTxt, { color: '#16A34A' }]}>
                Reschedule
              </SanctuaryText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[detail.actionBtn, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]} 
              onPress={() => onCancel(apt._id)}
            >
              <XCircle size={15} color="#DC2626" />
              <SanctuaryText variant="label_sm" style={[detail.actionBtnTxt, { color: '#DC2626' }]}>
                Cancel
              </SanctuaryText>
            </TouchableOpacity>
          </View>
          )}
        </View>
      )}
    </View>
  );
}

// Helper components
function InfoCell({ label, value, highlight, colored }: any) {
  return (
    <View style={ic.cell}>
      <SanctuaryText variant="label_sm" style={ic.label}>{label}</SanctuaryText>
      <SanctuaryText variant="label_lg" style={[ic.value, highlight && { color: COLORS.primary }, colored && { color: '#059669' }]} numberOfLines={2}>{value}</SanctuaryText>
    </View>
  );
}

function VitalBox({ label, value, unit }: any) {
  return (
    <View style={vb.box}>
      <SanctuaryText variant="label_sm" style={vb.label}>{label}</SanctuaryText>
      <SanctuaryText variant="label_lg" style={vb.value}>{value || '—'}</SanctuaryText>
      {!!value && !!unit && <SanctuaryText variant="body_sm" style={vb.unit}>{unit}</SanctuaryText>}
    </View>
  );
}

function ConsultRow({ label, value, bold }: any) {
  return (
    <View style={cr.row}>
      <SanctuaryText variant="label_sm" style={cr.label}>{label}</SanctuaryText>
      <SanctuaryText variant="label_lg" style={[cr.value, bold && { fontStyle: 'italic' }]} numberOfLines={3}>{value}</SanctuaryText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', height: '100%', minHeight: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: { color: '#0F172A', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 },
  headerSub: { color: '#64748B', fontSize: 8.5, fontWeight: '700', letterSpacing: 0.5, marginTop: 1 },
  headerBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    gap: 4,
  },
  headerBookBtnTxt: { color: '#FFF', fontSize: 10.5, fontWeight: '800' },
  tabsContainer: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabsPillBg: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 3 },
  tabButton: { flex: 1, paddingVertical: 6.5, alignItems: 'center', borderRadius: 8 },
  tabButtonActive: { backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  tabTxt: { color: '#64748B', fontWeight: '700', fontSize: 11 },
  tabTxtActive: { color: COLORS.primary, fontWeight: '800' },
  scroll: { padding: 12, paddingBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  cardToday: { borderColor: '#93C5FD', borderWidth: 1.5, backgroundColor: '#FAFCFF' },
  dateBubble: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  dateBubbleToday: { backgroundColor: COLORS.primary },
  tokenPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, alignSelf: 'flex-start', marginBottom: 2, gap: 4 },
  liveGreenDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981' },
  tokenPillText: { color: '#059669', fontSize: 8.5, fontWeight: '800' },
  dateMon: { color: COLORS.primary, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.5 },
  dateDay: { color: '#1E293B', fontWeight: '900', fontSize: 15, marginTop: -2 },
  cardInfo: { flex: 1 },
  docName: { color: '#1E293B', fontWeight: '800', fontSize: 13, marginBottom: 1 },
  specLabel: { color: COLORS.primary, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.4, marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaTxt: { color: '#94A3B8', fontSize: 10, marginLeft: 3, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, marginLeft: 8 },
  statusTxt: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.3 },
  empty: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#FFF', borderRadius: 18, marginTop: 12, marginHorizontal: 8 },
  emptyTxt: { color: '#94A3B8', marginTop: 10, fontWeight: '600', fontSize: 12 },
  bookBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#EAF1FF', borderRadius: 10 },
  bookBtnTxt: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
  fab: {
    position: 'absolute', right: 16,
    bottom: Platform.OS === 'ios' ? 95 : 82,
    width: 46, height: 46, borderRadius: 15,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  modalWrap: { margin: 0, justifyContent: 'flex-end' },
  hospitalFilterBar: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', maxHeight: 48 },
  hospitalFilterBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, alignItems: 'center', flexDirection: 'row' },
  hospitalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  hospitalChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  hospitalChipTxt: { color: '#64748B', fontWeight: '700', fontSize: 10, letterSpacing: 0.2 },
  hospitalChipTxtActive: { color: '#FFF' },
});

const detail = StyleSheet.create({
  root: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.86,
    overflow: 'hidden',
  },
  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 6,
    paddingHorizontal: 20,
    position: 'relative',
    minHeight: 42,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
  },
  closeIconBtn: {
    position: 'absolute',
    right: 18,
    top: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 10,
  },
  dateBubble: {
    width: 44,
    height: 44,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateMon: { color: COLORS.primary, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.5 },
  dateDay: { color: '#1E293B', fontWeight: '900', fontSize: 16, marginTop: -2 },
  topMid: { flex: 1 },
  docName: { color: '#1E293B', fontWeight: '800', fontSize: 15, marginBottom: 1 },
  specLabel: { color: COLORS.primary, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.4, marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  metaTxt: { color: '#64748B', fontSize: 10, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3.5, borderRadius: 6, alignSelf: 'flex-start' },
  statusTxt: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.3 },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16, marginVertical: 6 },
  sectionPad: { paddingHorizontal: 16, paddingBottom: 4 },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  colTitle: { color: COLORS.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  vitalsEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  vitalsEmptyTxt: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  consultGrid: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  consultCell: { justifyContent: 'center' },
  payFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  payLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payDot: { width: 6, height: 6, borderRadius: 3 },
  payMethodLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  payStatusLabel: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  payRight: { alignItems: 'flex-end' },
  payFeeLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  payAmt: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  actionArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 40,
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnTxt: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

const ic = StyleSheet.create({
  cell: {
    width: '50%',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 0.5,
    borderColor: '#F1F5F9',
    backgroundColor: '#FAFBFC',
  },
  label: { color: '#94A3B8', fontSize: 8, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  value: { color: '#1E293B', fontWeight: '800', fontSize: 11.5 },
});

const vb = StyleSheet.create({
  box: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
  },
  label: { color: '#94A3B8', fontSize: 8, fontWeight: '800', letterSpacing: 0.4, marginBottom: 2 },
  value: { color: '#1E293B', fontWeight: '900', fontSize: 12 },
  unit: { color: '#94A3B8', fontSize: 8, fontWeight: '600' },
});

const cr = StyleSheet.create({
  row: { marginBottom: 6 },
  label: { color: COLORS.primary, fontSize: 8, fontWeight: '800', letterSpacing: 0.4, marginBottom: 1 },
  value: { color: '#1E293B', fontWeight: '700', fontSize: 11, lineHeight: 15 },
});
