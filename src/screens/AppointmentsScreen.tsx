import React, { useState, useEffect, useRef } from 'react';
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
import * as Notifications from 'expo-notifications';
import { Portal, Modal } from 'react-native-paper';
import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Activity,
  Stethoscope,
  Navigation,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StackNavigationProp } from '@react-navigation/stack';

import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '../constants/designSystem';
import { SanctuaryText, DigitalAtriumLoader } from '../components/SanctuaryComponents';
import { safeFormat } from '@/utils/dateUtils';

const { width, height } = Dimensions.get('window');

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  confirmed:   { label: 'CONFIRMED',   color: '#059669', bg: '#ECFDF5' },
  completed:   { label: 'COMPLETED',   color: '#059669', bg: '#ECFDF5' },
  'in-progress':{ label: 'IN-PROGRESS', color: '#D97706', bg: '#FFFBEB' },
  Booked:      { label: 'BOOKED',      color: '#2563EB', bg: '#EFF6FF' },
  booked:      { label: 'BOOKED',      color: '#2563EB', bg: '#EFF6FF' },
  pending:     { label: 'PENDING',     color: '#6B7280', bg: '#F9FAFB' },
  cancelled:   { label: 'CANCELLED',   color: '#DC2626', bg: '#FEF2F2' },
  rejected:    { label: 'REJECTED',    color: '#DC2626', bg: '#FEF2F2' },
} as Record<string, { label: string; color: string; bg: string }>;

function statusCfg(s: string) {
  return STATUS[s] || { label: s.toUpperCase(), color: '#64748B', bg: '#F1F5F9' };
}

function getDocName(doc: any) {
  const n = doc?.user?.name || doc?.name || 'Physician';
  return n.startsWith('Dr.') ? n : `Dr. ${n}`;
}

function getSpecialty(doc: any): string {
  return doc?.specialties?.[0] || doc?.department || doc?.specialization || '';
}

export default function AppointmentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [tabIndex, setTabIndex]     = useState(0); // 0 = Upcoming, 1 = Past
  const [selected, setSelected]     = useState<any | null>(null);
  
  const scrollX = useRef(new Animated.Value(0)).current;
  const pagerRef = useRef<ScrollView>(null);

  const fetchData = async () => {
    try {
      const res = await apiClient.get(PATIENT_ENDPOINTS.APPOINTMENTS);
      const list = Array.isArray(res.data.data)
        ? res.data.data
        : (res.data?.data?.data || []);
      setAppointments(list);
    } catch (e) {
      console.error('[Appointments]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "Appointment Cancelled",
                  body: "Your appointment has been cancelled. The refund will be processed within 24 hours.",
                  data: { appointmentId: id },
                },
                trigger: null, // show immediately
              });

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
  const upcoming = appointments.filter(apt => !DONE_STATUSES.includes(apt.status?.trim().toLowerCase()));
  const past = appointments.filter(apt => DONE_STATUSES.includes(apt.status?.trim().toLowerCase()));

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <SanctuaryText variant="headline_sm" style={styles.headerTitle}>{t('appointments.title')}</SanctuaryText>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsRow}>
          <TouchableOpacity style={styles.tabButton} onPress={() => setPage(0)}>
            <SanctuaryText variant="label_lg" style={[styles.tabTxt, tabIndex === 0 && styles.tabTxtActive]}>Upcoming</SanctuaryText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton} onPress={() => setPage(1)}>
            <SanctuaryText variant="label_lg" style={[styles.tabTxt, tabIndex === 1 && styles.tabTxtActive]}>Visit History</SanctuaryText>
          </TouchableOpacity>
        </View>
        <View style={styles.tabIndicatorContainer}>
          <Animated.View 
            style={[
              styles.tabIndicator, 
              { 
                width: width / 2,
                transform: [{ translateX: scrollX.interpolate({
                  inputRange: [0, width],
                  outputRange: [0, width / 2]
                })}]
              }
            ]} 
          />
        </View>
      </View>

      {/* ── Pager (Swipeable Lists) ── */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        bounces={false}
      >
        <View style={{ width }}>
          <AppointmentList 
            data={upcoming} 
            type="upcoming" 
            onSelect={setSelected} 
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            navigation={navigation}
          />
        </View>
        <View style={{ width }}>
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
        <Plus size={26} color="#FFF" />
      </TouchableOpacity>

      {/* ── Detail Modal ── */}
      <Portal>
        <Modal
          visible={!!selected}
          onDismiss={() => setSelected(null)}
          contentContainerStyle={styles.modalWrap}
        >
          {selected && (
            <AppointmentDetail 
              apt={selected} 
              onClose={() => setSelected(null)} 
              onCancel={handleCancel}
            />
          )}
        </Modal>
      </Portal>
    </View>
  );
}

// ── Shared List Component ──────────────────────────────────────────────────────
function AppointmentList({ data, type, onSelect, refreshing, onRefresh, navigation }: any) {
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
    >
      {data.length > 0 ? (
        data.map((apt: any) => {
          const sc   = statusCfg(apt.status);
          const doc  = getDocName(apt.doctor);
          const spec = getSpecialty(apt.doctor);
          return (
            <TouchableOpacity
              key={apt._id}
              style={styles.card}
              onPress={() => onSelect(apt)}
              activeOpacity={0.8}
            >
              <View style={styles.dateBubble}>
                <SanctuaryText variant="label_sm" style={styles.dateMon}>{safeFormat(apt.date, 'MMM').toUpperCase()}</SanctuaryText>
                <SanctuaryText variant="headline_sm" style={styles.dateDay}>{safeFormat(apt.date, 'dd')}</SanctuaryText>
              </View>

              <View style={styles.cardInfo}>
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
      {/* Extra bottom space = tab bar height + FAB clearance */}
      <View style={{ height: 160 }} />
    </ScrollView>
  );
}

// ── Detail Sheet (Same as before but kept for completeness) ────────────────────
function AppointmentDetail({ apt, onClose, onCancel }: { apt: any; onClose: () => void; onCancel: (id: string) => void }) {
  const sc      = statusCfg(apt.status);
  const doc     = getDocName(apt.doctor);
  const spec    = getSpecialty(apt.doctor);
  const vitals  = apt.vitals || {};
  const payment = apt.payment || {};
  const details = apt.patientDetails || {};

  const payStatus   = payment.paymentStatus || apt.paymentStatus || 'pending';
  const payMethod   = payment.paymentMethod || apt.paymentMethod || 'N/A';
  const payAmount   = payment.amount || apt.amount || apt.consultationFee || 0;

  const isPast = ['completed', 'cancelled'].includes(apt.status?.toLowerCase());

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
      <View style={detail.handle} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={detail.topRow}>
          <View style={detail.dateBubble}>
            <SanctuaryText variant="label_sm" style={detail.dateMon}>{safeFormat(apt.date, 'MMM').toUpperCase()}</SanctuaryText>
            <SanctuaryText variant="headline_sm" style={detail.dateDay}>{safeFormat(apt.date, 'dd')}</SanctuaryText>
          </View>
          <View style={detail.topMid}>
            <SanctuaryText variant="headline_sm" style={detail.docName}>{doc}</SanctuaryText>
            {!!spec && <SanctuaryText variant="label_sm" style={detail.specLabel}>{spec.toUpperCase()}</SanctuaryText>}
            <View style={detail.metaRow}>
              <Clock size={12} color="#94A3B8" />
              <SanctuaryText variant="body_sm" style={detail.metaTxt}>{apt.appointmentTime || apt.time || 'Scheduled'}</SanctuaryText>
              <MapPin size={12} color="#94A3B8" style={{ marginLeft: 8 }} />
              <SanctuaryText variant="body_sm" style={detail.metaTxt} numberOfLines={1}>{apt.hospital?.name}</SanctuaryText>
            </View>
          </View>
          <View style={[detail.statusBadge, { backgroundColor: sc.bg }]}>
            <SanctuaryText variant="label_sm" style={[detail.statusTxt, { color: sc.color }]}>{sc.label}</SanctuaryText>
          </View>
        </View>
        <View style={detail.infoGrid}>
          <InfoCell label="APPT ID"   value={apt.appointmentId || apt._id.slice(-10).toUpperCase()} />
          <InfoCell label="MRN NUMBER" value={apt.mrn || 'N/A'} highlight />
          <InfoCell label="CASE TYPE" value={apt.type || 'Consultation'} />
          <InfoCell label="URGENCY"   value={(apt.urgency || 'non-urgent').replace(/-/g,' ').toUpperCase()} colored={apt.urgency !== 'urgent'} />
        </View>
        {/* ── Patient Vitals ── Only show for past appointments ── */}
        {isPast && (
          <>
            <View style={detail.divider} />
            <View style={detail.sectionPad}>
              <View style={detail.colHeader}>
                <Activity size={13} color={COLORS.primary} />
                <SanctuaryText variant="label_lg" style={detail.colTitle}>PATIENT VITALS</SanctuaryText>
              </View>
              <View style={detail.vitalsGrid}>
                <VitalBox label="BP" value={vitals.bloodPressure} unit="" />
                <VitalBox label="TEMP" value={vitals.temperature} unit="°F" />
                <VitalBox label="PULSE" value={vitals.pulse} unit="bpm" />
                <VitalBox label="SpO2" value={vitals.spO2} unit="%" />
                <VitalBox label="GLUCOSE" value={vitals.sugar} unit="mg/dL" />
                <VitalBox label="WEIGHT" value={vitals.weight} unit="kg" />
              </View>
            </View>
          </>
        )}
        <View style={detail.divider} />
        <View style={detail.sectionPad}>
          <View style={detail.colHeader}>
            <Stethoscope size={13} color={COLORS.primary} />
            <SanctuaryText variant="label_lg" style={detail.colTitle}>CONSULTATION DETAILS</SanctuaryText>
          </View>
          <ConsultRow label="CLINICAL REASON" value={apt.reason || apt.symptoms?.join(', ') || '—'} bold />
          <ConsultRow label="AGE / GENDER" value={`${details.age || '—'} / ${(details.gender || '—').toUpperCase()}`} />
          <ConsultRow label="EST. DURATION" value={details.duration || '—'} />
          {!!apt.department && <ConsultRow label="DEPARTMENT" value={apt.department} />}
        </View>
        <LinearGradient colors={['#0F172A', '#1E293B']} style={detail.payFooter}>
          <View style={detail.payLeft}>
            <View style={[detail.payDot, { backgroundColor: payStatus === 'paid' || payStatus === 'Paid' ? '#4ADE80' : '#FCD34D' }]} />
            <View>
              <SanctuaryText variant="label_sm" style={detail.payMethodLabel}>PAYMENT · {payMethod.toUpperCase()}</SanctuaryText>
              <SanctuaryText variant="label_lg" style={detail.payStatusLabel}>{(payStatus).toUpperCase()}</SanctuaryText>
            </View>
          </View>
          <View style={detail.payRight}>
            <SanctuaryText variant="label_sm" style={detail.payFeeLabel}>CONSULTATION FEE</SanctuaryText>
            <SanctuaryText variant="headline_sm" style={detail.payAmt}>₹{payAmount.toLocaleString()}</SanctuaryText>
          </View>
        </LinearGradient>
      </ScrollView>

      <View style={detail.actionArea}>
        {apt.hospital && !isPast && (
          <TouchableOpacity 
            style={[detail.actionBtn, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD', borderWidth: 1, flexDirection: 'row', gap: 8 }]} 
            onPress={handleGetDirections}
          >
            <Navigation size={18} color="#0369A1" />
            <SanctuaryText variant="label_lg" style={{ color: '#0369A1', fontWeight: '900' }}>GET DIRECTIONS</SanctuaryText>
          </TouchableOpacity>
        )}
        {apt.type === 'online' && !isPast && (
          <TouchableOpacity style={[detail.actionBtn, detail.joinBtn]} onPress={() => Alert.alert('Join Virtual Clinic', 'The virtual consultation link will be active 10 minutes before your appointment.')}>
            <SanctuaryText variant="label_lg" style={detail.joinTxt}>JOIN CONSULTATION</SanctuaryText>
          </TouchableOpacity>
        )}
        {!isPast && (
          <TouchableOpacity style={[detail.actionBtn, detail.cancelBtn]} onPress={() => onCancel(apt._id)}>
            <SanctuaryText variant="label_lg" style={detail.cancelTxt}>CANCEL APPOINTMENT</SanctuaryText>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={detail.closeBtn} onPress={onClose}>
          <SanctuaryText variant="label_lg" style={detail.closeTxt}>CLOSE</SanctuaryText>
        </TouchableOpacity>
      </View>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { color: '#1E293B', fontWeight: '900', fontSize: 22 },
  tabsContainer: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabsRow: { flexDirection: 'row' },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabTxt: { color: '#94A3B8', fontWeight: '700', fontSize: 13 },
  tabTxtActive: { color: COLORS.primary, fontWeight: '900' },
  tabIndicatorContainer: { height: 2, backgroundColor: '#F1F5F9' },
  tabIndicator: { height: 2, backgroundColor: COLORS.primary },
  scroll: { padding: 16, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 10 },
  dateBubble: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  dateMon: { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  dateDay: { color: '#1E293B', fontWeight: '900', fontSize: 18, marginTop: -2 },
  cardInfo: { flex: 1 },
  docName: { color: '#1E293B', fontWeight: '800', fontSize: 14, marginBottom: 2 },
  specLabel: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaTxt: { color: '#94A3B8', fontSize: 11, marginLeft: 4, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 10 },
  statusTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  empty: { alignItems: 'center', paddingVertical: 60, backgroundColor: '#FFF', borderRadius: 22, marginTop: 20, marginHorizontal: 16 },
  emptyTxt: { color: '#CBD5E1', marginTop: 12, fontWeight: '600' },
  bookBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#EAF1FF', borderRadius: 14 },
  bookBtnTxt: { color: COLORS.primary, fontWeight: '900', fontSize: 14 },
  fab: {
    position: 'absolute', right: 20,
    // 64px tab bar (Android) / 80px (iOS) + 14px gap above it
    bottom: Platform.OS === 'ios' ? 94 : 78,
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },
  modalWrap: { margin: 0, justifyContent: 'flex-end' },
});

const detail = StyleSheet.create({
  root: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: height * 0.92, overflow: 'hidden' },
  handle: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingBottom: 16, gap: 12 },
  dateBubble: { width: 52, height: 52, backgroundColor: '#F1F5F9', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dateMon: { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  dateDay: { color: '#1E293B', fontWeight: '900', fontSize: 18, marginTop: -2 },
  topMid: { flex: 1 },
  docName: { color: '#1E293B', fontWeight: '900', fontSize: 16, marginBottom: 2 },
  specLabel: { color: COLORS.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaTxt: { color: '#94A3B8', fontSize: 11, marginLeft: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 0 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 20, marginVertical: 16 },
  sectionPad: { paddingHorizontal: 20, paddingBottom: 16 },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  colTitle: { color: COLORS.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  payFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingHorizontal: 22 },
  payLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  payDot: { width: 8, height: 8, borderRadius: 4 },
  payMethodLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  payStatusLabel: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  payRight: { alignItems: 'flex-end' },
  payFeeLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  payAmt: { color: '#FFF', fontWeight: '900', fontSize: 20 },
  actionArea: { padding: 20, paddingTop: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actionBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  joinBtn: { backgroundColor: COLORS.primary },
  joinTxt: { color: '#FFF', fontWeight: '900', letterSpacing: 1 },
  cancelBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FEE2E2' },
  cancelTxt: { color: '#DC2626', fontWeight: '900', letterSpacing: 1 },
  closeBtn: { backgroundColor: '#F1F5F9', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  closeTxt: { color: '#64748B', fontWeight: '900', letterSpacing: 1 },
});

const ic = StyleSheet.create({
  cell: { width: '50%', paddingVertical: 12, paddingHorizontal: 16, borderWidth: 0.5, borderColor: '#F1F5F9', backgroundColor: '#FAFBFC' },
  label: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 0.6, marginBottom: 4 },
  value: { color: '#1E293B', fontWeight: '800', fontSize: 12 },
});

const vb = StyleSheet.create({
  box: { width: '33.33%', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', padding: 10 },
  label: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 3 },
  value: { color: '#1E293B', fontWeight: '900', fontSize: 15 },
  unit: { color: '#94A3B8', fontSize: 9, fontWeight: '600', marginTop: 1 },
});

const cr = StyleSheet.create({
  row: { marginBottom: 12 },
  label: { color: COLORS.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5, marginBottom: 3 },
  value: { color: '#1E293B', fontWeight: '700', fontSize: 12, lineHeight: 17 },
});
