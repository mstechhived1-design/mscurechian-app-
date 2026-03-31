import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { Portal, Modal } from 'react-native-paper';
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Plus,
  Activity,
  Stethoscope,
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
  pending:     { label: 'PENDING',     color: '#6B7280', bg: '#F9FAFB' },
  cancelled:   { label: 'CANCELLED',   color: '#DC2626', bg: '#FEF2F2' },
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

type FilterTab = 'upcoming' | 'past';

export default function AppointmentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [tab, setTab]               = useState<FilterTab>('upcoming');
  const [selected, setSelected]     = useState<any | null>(null);

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

  // ─ Upcoming = NOT finished. Past = completed or cancelled.
  const DONE_STATUSES = ['completed', 'cancelled'];
  const filtered = appointments.filter(apt => {
    const isDone = DONE_STATUSES.includes(apt.status?.toLowerCase());
    return tab === 'upcoming' ? !isDone : isDone;
  });

  if (loading && !refreshing) return <DigitalAtriumLoader />;

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <SanctuaryText variant="headline_sm" style={styles.headerTitle}>{t('appointments.title')}</SanctuaryText>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabs}>
        {(['upcoming', 'past'] as FilterTab[]).map(t => (
          <TouchableOpacity key={t} style={[styles.tabItem, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <SanctuaryText variant="label_lg" style={[styles.tabTxt, tab === t && styles.tabTxtActive]}>
              {t === 'upcoming' ? 'Upcoming' : 'Visit History'}
            </SanctuaryText>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >
        {filtered.length > 0 ? (
          filtered.map((apt) => {
            const sc   = statusCfg(apt.status);
            const doc  = getDocName(apt.doctor);
            const spec = getSpecialty(apt.doctor);
            return (
              <TouchableOpacity
                key={apt._id}
                style={styles.card}
                onPress={() => setSelected(apt)}
                activeOpacity={0.8}
              >
                {/* Left date bubble */}
                <View style={styles.dateBubble}>
                  <SanctuaryText variant="label_sm" style={styles.dateMon}>{safeFormat(apt.date, 'MMM').toUpperCase()}</SanctuaryText>
                  <SanctuaryText variant="headline_sm" style={styles.dateDay}>{safeFormat(apt.date, 'dd')}</SanctuaryText>
                </View>

                {/* Middle info */}
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

                {/* Status badge */}
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
            <SanctuaryText variant="body_md" style={styles.emptyTxt}>No {tab === 'upcoming' ? 'upcoming' : 'past'} visits</SanctuaryText>
            {tab === 'upcoming' && (
              <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate('BookAppointment')}>
                <SanctuaryText variant="label_lg" style={styles.bookBtnTxt}>+ Book a Consultation</SanctuaryText>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('BookAppointment')}
        activeOpacity={0.85}
      >
        <Plus size={26} color="#FFF" />
      </TouchableOpacity>

      {/* ── Appointment Detail Modal ── */}
      <Portal>
        <Modal
          visible={!!selected}
          onDismiss={() => setSelected(null)}
          contentContainerStyle={styles.modalWrap}
        >
          {selected && <AppointmentDetail apt={selected} onClose={() => setSelected(null)} />}
        </Modal>
      </Portal>
    </View>
  );
}

// ── Appointment Detail Sheet ───────────────────────────────────────────────────
function AppointmentDetail({ apt, onClose }: { apt: any; onClose: () => void }) {
  const sc      = statusCfg(apt.status);
  const doc     = getDocName(apt.doctor);
  const spec    = getSpecialty(apt.doctor);
  const vitals  = apt.vitals || {};
  const payment = apt.payment || {};
  const details = apt.patientDetails || {};

  const payStatus   = payment.paymentStatus || apt.paymentStatus || 'pending';
  const payMethod   = payment.paymentMethod || apt.paymentMethod || 'N/A';
  const payAmount   = payment.amount || apt.amount || apt.consultationFee || 0;

  return (
    <View style={detail.root}>
      {/* Top handle */}
      <View style={detail.handle} />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Card Header: Date + Doctor + Status ── */}
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

        {/* ── Info Grid: Appt ID, MRN, Case Type, Urgency ── */}
        <View style={detail.infoGrid}>
          <InfoCell label="APPT ID"   value={apt.appointmentId || apt._id.slice(-10).toUpperCase()} />
          <InfoCell label="MRN NUMBER" value={apt.mrn || 'N/A'} highlight />
          <InfoCell label="CASE TYPE" value={apt.type || 'Consultation'} />
          <InfoCell label="URGENCY"   value={(apt.urgency || 'non-urgent').replace(/-/g,' ').toUpperCase()} colored={apt.urgency !== 'urgent'} />
        </View>

        <View style={detail.divider} />

        {/* ── Patient Vitals ── full-width 3-column grid ── */}
        <View style={detail.sectionPad}>
          <View style={detail.colHeader}>
            <Activity size={13} color={COLORS.primary} />
            <SanctuaryText variant="label_lg" style={detail.colTitle}>PATIENT VITALS</SanctuaryText>
          </View>
          <View style={detail.vitalsGrid}>
            <VitalBox label="BP"      value={vitals.bloodPressure} unit="" />
            <VitalBox label="TEMP"    value={vitals.temperature}   unit="°F" />
            <VitalBox label="PULSE"   value={vitals.pulse}         unit="bpm" />
            <VitalBox label="SpO2"    value={vitals.spO2}          unit="%" />
            <VitalBox label="GLUCOSE" value={vitals.sugar}         unit="mg/dL" />
            <VitalBox label="WEIGHT"  value={vitals.weight}        unit="kg" />
          </View>
        </View>

        <View style={detail.divider} />

        {/* ── Consultation Details ── full-width below vitals ── */}
        <View style={detail.sectionPad}>
          <View style={detail.colHeader}>
            <Stethoscope size={13} color={COLORS.primary} />
            <SanctuaryText variant="label_lg" style={detail.colTitle}>CONSULTATION DETAILS</SanctuaryText>
          </View>
          <ConsultRow label="CLINICAL REASON" value={apt.reason || apt.symptoms?.join(', ') || '—'} bold />
          <ConsultRow label="AGE / GENDER"    value={`${details.age || '—'} / ${(details.gender || '—').toUpperCase()}`} />
          <ConsultRow label="EST. DURATION"   value={details.duration || '—'} />
          {!!apt.department && <ConsultRow label="DEPARTMENT" value={apt.department} />}
        </View>

        {/* ── Payment Footer Bar ── */}
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

      {/* Close */}
      <TouchableOpacity style={detail.closeBtn} onPress={onClose}>
        <SanctuaryText variant="label_lg" style={detail.closeTxt}>CLOSE</SanctuaryText>
      </TouchableOpacity>
    </View>
  );
}

// Small reusable sub-components
function InfoCell({ label, value, highlight, colored }: { label: string; value: string; highlight?: boolean; colored?: boolean }) {
  return (
    <View style={ic.cell}>
      <SanctuaryText variant="label_sm" style={ic.label}>{label}</SanctuaryText>
      <SanctuaryText
        variant="label_lg"
        style={[ic.value, highlight && { color: COLORS.primary }, colored && { color: '#059669' }]}
        numberOfLines={2}
      >
        {value}
      </SanctuaryText>
    </View>
  );
}

function VitalBox({ label, value, unit }: { label: string; value?: string; unit: string }) {
  return (
    <View style={vb.box}>
      <SanctuaryText variant="label_sm" style={vb.label}>{label}</SanctuaryText>
      <SanctuaryText variant="label_lg" style={vb.value}>{value || '—'}</SanctuaryText>
      {!!value && !!unit && <SanctuaryText variant="body_sm" style={vb.unit}>{unit}</SanctuaryText>}
    </View>
  );
}

function ConsultRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={cr.row}>
      <SanctuaryText variant="label_sm" style={cr.label}>{label}</SanctuaryText>
      <SanctuaryText variant="label_lg" style={[cr.value, bold && { fontStyle: 'italic' }]} numberOfLines={3}>{value}</SanctuaryText>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#1E293B', fontWeight: '900', fontSize: 18 },

  tabs: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabItem: { paddingVertical: 14, marginRight: 28, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabTxt: { color: '#94A3B8', fontWeight: '700', fontSize: 13 },
  tabTxtActive: { color: COLORS.primary, fontWeight: '900' },

  scroll: { padding: 16, paddingBottom: 100 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
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

  empty: { alignItems: 'center', paddingVertical: 60, backgroundColor: '#FFF', borderRadius: 22, marginTop: 20 },
  emptyTxt: { color: '#CBD5E1', marginTop: 12, fontWeight: '600' },
  bookBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#EAF1FF', borderRadius: 14 },
  bookBtnTxt: { color: COLORS.primary, fontWeight: '900', fontSize: 14 },

  fab: {
    position: 'absolute', right: 20, bottom: 40,
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 10,
  },

  modalWrap: { margin: 0, justifyContent: 'flex-end' },
});

// Detail component styles
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

  closeBtn: { backgroundColor: '#F1F5F9', marginHorizontal: 20, marginVertical: 14, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  closeTxt: { color: '#64748B', fontWeight: '900', letterSpacing: 1 },
});

const ic = StyleSheet.create({
  cell: { width: '50%', paddingVertical: 12, paddingHorizontal: 16, borderWidth: 0.5, borderColor: '#F1F5F9', backgroundColor: '#FAFBFC' },
  label: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 0.6, marginBottom: 4 },
  value: { color: '#1E293B', fontWeight: '800', fontSize: 12 },
});

const vb = StyleSheet.create({
  // 3 columns: subtract 20+20 padding and 2 gaps of 1px each, divide by 3
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
