import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Portal, Modal, Button } from 'react-native-paper';
import {
  ChevronLeft,
  Banknote,
  Receipt,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  CalendarDays,
  Wallet,
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

const { width } = Dimensions.get('window');

interface Bill {
  _id: string;
  appointmentId?: string;
  doctor: any;
  hospital: any;
  date: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'Paid' | 'pending' | 'failed' | 'not_required';
  type: string;
  mrn?: string;
}

type FilterTab = 'all' | 'paid' | 'pending';

const STATUS_CONFIG = {
  paid:         { label: 'PAID',        color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  Paid:         { label: 'PAID',        color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  pending:      { label: 'PENDING',     color: '#D97706', bg: '#FFFBEB', icon: Clock },
  failed:       { label: 'FAILED',      color: '#DC2626', bg: '#FEF2F2', icon: AlertCircle },
  not_required: { label: 'WAIVED',      color: '#64748B', bg: '#F8FAFC', icon: CheckCircle2 },
};

function getStatus(apt: any): Bill['paymentStatus'] {
  return apt.payment?.paymentStatus || apt.paymentStatus || 'pending';
}

function getAmount(apt: any): number {
  return apt.payment?.amount || apt.amount || apt.consultationFee || 0;
}

function getPaymentMethod(apt: any): string {
  return apt.payment?.paymentMethod || apt.paymentMethod || 'N/A';
}

export default function PaymentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bills, setBills]           = useState<Bill[]>([]);
  const [filter, setFilter]         = useState<FilterTab>('all');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const fetchData = async () => {
    try {
      const res = await apiClient.get(PATIENT_ENDPOINTS.APPOINTMENTS);
      const apts: any[] = Array.isArray(res.data.data)
        ? res.data.data
        : (res.data?.data?.data || []);

      const mapped: Bill[] = apts.map(apt => ({
        _id:           apt._id,
        appointmentId: apt.appointmentId,
        doctor:        apt.doctor,
        hospital:      apt.hospital,
        date:          apt.date,
        amount:        getAmount(apt),
        paymentMethod: getPaymentMethod(apt),
        paymentStatus: getStatus(apt),
        type:          apt.type || 'Consultation',
        mrn:           apt.mrn,
      }));

      setBills(mapped);
    } catch (err) {
      console.error('[Payments]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading && !refreshing) return <DigitalAtriumLoader />;

  const filtered = filter === 'all' ? bills
    : bills.filter(b => {
        const s = b.paymentStatus?.toLowerCase();
        return filter === 'paid' ? (s === 'paid') : (s === 'pending' || s === 'failed');
      });

  const totalPaid    = bills.filter(b => ['paid','Paid'].includes(b.paymentStatus)).reduce((s, b) => s + b.amount, 0);
  const totalPending = bills.filter(b => b.paymentStatus === 'pending').reduce((s, b) => s + b.amount, 0);

  const getDocName = (doc: any) => {
    const name = doc?.user?.name || doc?.name || 'Physician';
    return name.startsWith('Dr.') ? name : `Dr. ${name}`;
  };

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <SanctuaryText variant="headline_sm" style={styles.headerTitle}>{t('payments.title')}</SanctuaryText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
      >

        {/* ── Summary Cards ── */}
        <View style={styles.summaryRow}>
          {/* Total Paid */}
          <LinearGradient colors={['#1E3A6E', '#2B5DB8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
            <View style={styles.summaryIconBox}>
              <CheckCircle2 size={18} color="rgba(255,255,255,0.8)" />
            </View>
            <SanctuaryText variant="label_lg" style={styles.summaryLabel}>TOTAL PAID</SanctuaryText>
            <SanctuaryText variant="headline_sm" style={styles.summaryAmt}>₹{totalPaid.toLocaleString()}</SanctuaryText>
          </LinearGradient>

          {/* Outstanding */}
          <LinearGradient colors={['#7C1F1F', '#B91C1C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
            <View style={styles.summaryIconBox}>
              <Clock size={18} color="rgba(255,255,255,0.8)" />
            </View>
            <SanctuaryText variant="label_lg" style={styles.summaryLabel}>OUTSTANDING</SanctuaryText>
            <SanctuaryText variant="headline_sm" style={styles.summaryAmt}>₹{totalPending.toLocaleString()}</SanctuaryText>
          </LinearGradient>
        </View>

        {/* Pay Now CTA — only if there's a balance */}
        {totalPending > 0 && (
          <TouchableOpacity
            style={styles.payNowBtn}
            onPress={() => Alert.alert('Payment Gateway', 'Connecting to secure hospital payment gateway...')}
            activeOpacity={0.85}
          >
            <Wallet size={18} color="#FFF" />
            <SanctuaryText variant="label_lg" style={styles.payNowTxt}>
              Pay Outstanding ₹{totalPending.toLocaleString()}
            </SanctuaryText>
          </TouchableOpacity>
        )}

        {/* ── Filter Tabs ── */}
        <View style={styles.tabRow}>
          {(['all', 'paid', 'pending'] as FilterTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, filter === tab && styles.tabActive]}
              onPress={() => setFilter(tab)}
            >
              <SanctuaryText
                variant="label_lg"
                style={[styles.tabTxt, filter === tab && styles.tabTxtActive]}
              >
                {tab === 'all' ? `All (${bills.length})` : tab === 'paid' ? `Paid (${bills.filter(b=>['paid','Paid'].includes(b.paymentStatus)).length})` : `Pending (${bills.filter(b=>b.paymentStatus==='pending').length})`}
              </SanctuaryText>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Bill List ── */}
        <View style={styles.listSection}>
          {filtered.length > 0 ? (
            filtered.map((bill) => {
              const st = STATUS_CONFIG[bill.paymentStatus] || STATUS_CONFIG.pending;
              const StatusIcon = st.icon;
              return (
                <TouchableOpacity
                  key={bill._id}
                  style={styles.billCard}
                  onPress={() => setSelectedBill(bill)}
                  activeOpacity={0.8}
                >
                  {/* Left: Status icon */}
                  <View style={[styles.billIconBox, { backgroundColor: st.bg }]}>
                    <StatusIcon size={22} color={st.color} />
                  </View>

                  {/* Middle: Info */}
                  <View style={styles.billInfo}>
                    <SanctuaryText variant="label_lg" style={styles.billDoc} numberOfLines={1}>
                      {getDocName(bill.doctor)}
                    </SanctuaryText>
                    <View style={styles.billMetaRow}>
                      <Building2 size={11} color="#94A3B8" />
                      <SanctuaryText variant="body_sm" style={styles.billMeta} numberOfLines={1}>
                        {bill.hospital?.name || 'Hospital'}
                      </SanctuaryText>
                    </View>
                    <View style={styles.billMetaRow}>
                      <CalendarDays size={11} color="#94A3B8" />
                      <SanctuaryText variant="body_sm" style={styles.billMeta}>
                        {safeFormat(bill.date, 'dd MMM yyyy')} · {bill.type}
                      </SanctuaryText>
                    </View>

                    {/* Status pill */}
                    <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                      <SanctuaryText variant="label_sm" style={[styles.statusTxt, { color: st.color }]}>
                        {st.label}
                      </SanctuaryText>
                    </View>
                  </View>

                  {/* Right: Amount */}
                  <View style={styles.billRight}>
                    <SanctuaryText variant="headline_sm" style={[styles.billAmt, { color: st.color }]}>
                      ₹{bill.amount.toLocaleString()}
                    </SanctuaryText>
                    <View style={styles.invoiceBtn}>
                      <FileText size={14} color={COLORS.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyBox}>
              <Receipt size={44} color="#CBD5E1" />
              <SanctuaryText variant="body_md" style={styles.emptyTxt}>No records found</SanctuaryText>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Bill Detail Modal ── */}
      <Portal>
        <Modal
          visible={!!selectedBill}
          onDismiss={() => setSelectedBill(null)}
          contentContainerStyle={styles.modal}
        >
          {selectedBill && (() => {
            const st = STATUS_CONFIG[selectedBill.paymentStatus] || STATUS_CONFIG.pending;
            return (
              <View style={styles.modalBox}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={[styles.modalIconBox, { backgroundColor: st.bg }]}>
                    <Receipt size={24} color={st.color} />
                  </View>
                  <SanctuaryText variant="headline_sm" style={styles.modalTitle}>Invoice Detail</SanctuaryText>
                  <TouchableOpacity onPress={() => setSelectedBill(null)} style={styles.modalClose}>
                    <SanctuaryText variant="label_lg" style={{ color: '#94A3B8', fontSize: 18 }}>✕</SanctuaryText>
                  </TouchableOpacity>
                </View>

                {/* Amount hero */}
                <LinearGradient colors={['#1E3A6E', '#2B5DB8']} style={styles.amtBand}>
                  <SanctuaryText variant="body_sm" style={styles.amtLabel}>CONSULTATION FEE</SanctuaryText>
                  <SanctuaryText variant="headline_sm" style={styles.amtValue}>₹{selectedBill.amount.toLocaleString()}</SanctuaryText>
                  <View style={[styles.amtStatus, { backgroundColor: st.bg }]}>
                    <SanctuaryText variant="label_sm" style={{ color: st.color, fontWeight: '900', fontSize: 10 }}>{st.label}</SanctuaryText>
                  </View>
                </LinearGradient>

                {/* Details rows */}
                {[
                  { label: 'Doctor',       value: getDocName(selectedBill.doctor) },
                  { label: 'Hospital',     value: selectedBill.hospital?.name || 'N/A' },
                  { label: 'Date',         value: safeFormat(selectedBill.date, 'dd MMM yyyy') },
                  { label: 'Visit Type',   value: selectedBill.type },
                  { label: 'Payment Via',  value: selectedBill.paymentMethod },
                  { label: 'MRN',          value: selectedBill.mrn || 'N/A' },
                  { label: 'Appt ID',      value: selectedBill.appointmentId || selectedBill._id.slice(-8).toUpperCase() },
                ].map(row => (
                  <View key={row.label} style={styles.detailRow}>
                    <SanctuaryText variant="body_sm" style={styles.detailLabel}>{row.label}</SanctuaryText>
                    <SanctuaryText variant="label_lg" style={styles.detailValue} numberOfLines={1}>{row.value}</SanctuaryText>
                  </View>
                ))}

                <Button
                  mode="contained"
                  onPress={() => setSelectedBill(null)}
                  style={styles.modalBtn}
                  labelStyle={{ fontWeight: '800', letterSpacing: 0.5 }}
                >
                  CLOSE
                </Button>
              </View>
            );
          })()}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#1E293B', fontWeight: '900', fontSize: 18 },

  scroll: { paddingTop: 20, paddingHorizontal: 20 },

  /* Summary Row */
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 20, padding: 18 },
  summaryIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  summaryLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  summaryAmt: { color: '#FFF', fontWeight: '900', fontSize: 22 },

  /* Pay Now */
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#B91C1C',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  payNowTxt: { color: '#FFF', fontWeight: '900', fontSize: 14 },

  /* Filter Tabs */
  tabRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabTxt: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  tabTxtActive: { color: '#1E293B', fontWeight: '900' },

  /* Bill List */
  listSection: {},
  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  billIconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  billInfo: { flex: 1 },
  billDoc: { color: '#1E293B', fontWeight: '800', fontSize: 14, marginBottom: 4 },
  billMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  billMeta: { color: '#94A3B8', fontSize: 11, fontWeight: '500', flex: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginTop: 6 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  billRight: { alignItems: 'flex-end', marginLeft: 10 },
  billAmt: { fontWeight: '900', fontSize: 18, marginBottom: 8 },
  invoiceBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EAF1FF', justifyContent: 'center', alignItems: 'center' },

  /* Empty */
  emptyBox: { alignItems: 'center', paddingVertical: 60, backgroundColor: '#FFFFFF', borderRadius: 22 },
  emptyTxt: { color: '#CBD5E1', marginTop: 12, fontWeight: '600' },

  /* Modal */
  modal: { paddingHorizontal: 20 },
  modalBox: { backgroundColor: '#FFF', borderRadius: 28, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 0, gap: 12 },
  modalIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { flex: 1, color: '#1E293B', fontWeight: '900', fontSize: 17 },
  modalClose: { padding: 8 },
  amtBand: { margin: 16, borderRadius: 18, padding: 20, alignItems: 'center' },
  amtLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  amtValue: { color: '#FFF', fontSize: 36, fontWeight: '900', marginBottom: 12 },
  amtStatus: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  detailLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  detailValue: { color: '#1E293B', fontWeight: '800', fontSize: 13, maxWidth: '60%', textAlign: 'right' },
  modalBtn: { margin: 20, marginTop: 16, borderRadius: 14, backgroundColor: COLORS.primary },
});
