import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { familyService } from '@/services/familyService';
import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '../constants/designSystem';
import { SanctuaryText, DigitalAtriumLoader } from '../components/SanctuaryComponents';
import GlassModal from '@/components/GlassModal';
import { safeFormat } from '@/utils/dateUtils';
import { notificationService } from '@/services/notificationService';

// ── Components — reuse logic from shared screen ───────────────────────────────
export default function UpcomingAppointmentsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selected, setSelected]     = useState<any | null>(null);

  const fetchData = async () => {
    try {
      const res = await apiClient.get(PATIENT_ENDPOINTS.APPOINTMENTS);
      const list = Array.isArray(res.data.data)
        ? res.data.data
        : (res.data?.data?.data || []);
      
      const DONE_STATUSES = ['completed', 'cancelled', 'rejected'];
      const filtered = list.filter((apt: any) => !DONE_STATUSES.includes(apt.status?.trim().toLowerCase()));
      setAppointments(filtered);
    } catch (e) {
      console.error('[UpcomingAppointments]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  useEffect(() => {
    fetchData();

    const unsub = familyService.onProfileChange(() => {
      fetchData();
    });
    return () => unsub();
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
                "Your appointment has been cancelled successfully. Amount will be refunded under 24 hours."
              );

              Alert.alert('Appointment Cancelled', 'Your appointment has been cancelled successfully. The amount will be refunded under 24 hours to your account.');
            } catch (err: any) {
              console.error('[CancelApt]', err);
              Alert.alert('Error', 'Could not cancel appointment.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) return <DigitalAtriumLoader />;

  const { height: scrH } = Dimensions.get('window');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <SanctuaryText variant="headline_sm" style={styles.headerTitle}>Upcoming Visits</SanctuaryText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={[COLORS.primary]} />}
      >
        {appointments.length > 0 ? (
          appointments.map((apt) => (
            <TouchableOpacity
              key={apt._id}
              style={styles.card}
              onPress={() => setSelected(apt)}
            >
              <View style={styles.dateBubble}>
                <SanctuaryText variant="label_sm" style={styles.dateMon}>{safeFormat(apt.date, 'MMM').toUpperCase()}</SanctuaryText>
                <SanctuaryText variant="headline_sm" style={styles.dateDay}>{safeFormat(apt.date, 'dd')}</SanctuaryText>
              </View>
              <View style={styles.info}>
                <SanctuaryText variant="label_lg" style={styles.docName}>{apt.doctor?.user?.name || apt.doctor?.name || 'Doctor'}</SanctuaryText>
                <View style={styles.meta}>
                  <Clock size={12} color="#94A3B8" />
                  <SanctuaryText variant="body_sm" style={styles.metaTxt}>{apt.appointmentTime || apt.time}</SanctuaryText>
                  <MapPin size={12} color="#94A3B8" style={{marginLeft: 8}} />
                  <SanctuaryText variant="body_sm" style={styles.metaTxt} numberOfLines={1}>{apt.hospital?.name}</SanctuaryText>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.empty}>
            <Calendar size={48} color="#CBD5E1" />
            <SanctuaryText variant="body_md" style={styles.emptyTxt}>No upcoming appointments scheduled</SanctuaryText>
            <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate('BookAppointment')}>
              <SanctuaryText variant="label_lg" style={styles.bookBtnTxt}>Book Now</SanctuaryText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('BookAppointment')}>
        <Plus size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Detail Modal */}
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
          />
        )}
      </GlassModal>
    </View>
  );
}

// ── Shared Logic Helper Components ───────────────────────────────────────────
const STATUS = {
  confirmed:   { label: 'CONFIRMED',   color: '#059669', bg: '#ECFDF5' },
  completed:   { label: 'COMPLETED',   color: '#059669', bg: '#ECFDF5' },
  'in-progress':{ label: 'IN-PROGRESS', color: '#D97706', bg: '#FFFBEB' },
  Booked:      { label: 'BOOKED',      color: '#2563EB', bg: '#EFF6FF' },
  booked:      { label: 'BOOKED',      color: '#2563EB', bg: '#EFF6FF' },
  pending:     { label: 'PENDING',     color: '#6B7280', bg: '#F9FAFB' },
  cancelled:   { label: 'CANCELLED',   color: '#DC2626', bg: '#FEF2F2' },
  rejected:    { label: 'REJECTED',    color: '#DC2626', bg: '#FEF2F2' },
};

function statusCfg(s: string) {
  return (STATUS as any)[s] || { label: (s||'').toUpperCase(), color: '#64748B', bg: '#F1F5F9' };
}

function AppointmentDetail({ apt, onClose, onCancel }: any) {
  const sc = statusCfg(apt.status);
  const vitals = apt.vitals || {};
  const details = apt.patientDetails || {};
  const payment = apt.payment || {};
  const { height: scrH } = Dimensions.get('window');

  return (
    <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: scrH * 0.92, overflow: 'hidden' }}>
      <View style={{ width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: 20 }}>
           <SanctuaryText variant="headline_sm" style={{ color: '#1E293B', fontWeight: '900', marginBottom: 4 }}>
             {apt.doctor?.user?.name || apt.doctor?.name || 'Physician'}
           </SanctuaryText>
           <SanctuaryText variant="body_sm" style={{ color: '#94A3B8', marginBottom: 12 }}>
             {apt.appointmentTime || apt.time} · {apt.hospital?.name}
           </SanctuaryText>
           <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: sc.bg, alignSelf: 'flex-start' }}>
             <SanctuaryText variant="label_sm" style={{ color: sc.color, fontWeight: '900' }}>{sc.label}</SanctuaryText>
           </View>
        </View>

        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <Stethoscope size={14} color={COLORS.primary} />
            <SanctuaryText variant="label_lg" style={{ color: COLORS.primary, fontWeight: '900' }}>CONSULTATION</SanctuaryText>
          </View>
          <SanctuaryText variant="label_sm" style={{ color: '#94A3B8', marginBottom: 4 }}>REASON</SanctuaryText>
          <SanctuaryText variant="body_md" style={{ color: '#1E293B', marginBottom: 12 }}>{apt.reason || 'Routine Checkup'}</SanctuaryText>
        </View>

        <LinearGradient colors={['#0F172A', '#1E293B']} style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <SanctuaryText variant="label_sm" style={{ color: 'rgba(255,255,255,0.5)' }}>STATUS</SanctuaryText>
            <SanctuaryText variant="label_lg" style={{ color: '#FFF', fontWeight: '900' }}>{(payment.paymentStatus || 'PENDING').toUpperCase()}</SanctuaryText>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <SanctuaryText variant="label_sm" style={{ color: 'rgba(255,255,255,0.5)' }}>FEE</SanctuaryText>
            <SanctuaryText variant="headline_sm" style={{ color: '#FFF' }}>₹{payment.amount || apt.consultationFee || 0}</SanctuaryText>
          </View>
        </LinearGradient>
      </ScrollView>

      <View style={{ padding: 20, gap: 10 }}>
        <TouchableOpacity style={{ backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FEE2E2' }} onPress={() => onCancel(apt._id)}>
          <SanctuaryText variant="label_lg" style={{ color: '#DC2626', fontWeight: '900' }}>CANCEL APPOINTMENT</SanctuaryText>
        </TouchableOpacity>
        <TouchableOpacity style={{ backgroundColor: '#F1F5F9', padding: 16, borderRadius: 16, alignItems: 'center' }} onPress={onClose}>
          <SanctuaryText variant="label_lg" style={{ color: '#64748B', fontWeight: '900' }}>CLOSE</SanctuaryText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function VitalItem({ label, val, unit }: any) {
  return (
    <View style={{ width: '30%', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' }}>
      <SanctuaryText variant="label_sm" style={{ color: '#94A3B8', marginBottom: 4 }}>{label}</SanctuaryText>
      <SanctuaryText variant="label_lg" style={{ color: '#1E293B', fontWeight: '900' }}>{val || '—'}{unit}</SanctuaryText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF', paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#1E293B', fontWeight: '900', fontSize: 18 },
  scroll: { padding: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 2 },
  dateBubble: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  dateMon: { color: COLORS.primary, fontSize: 10, fontWeight: '900' },
  dateDay: { color: '#1E293B', fontWeight: '900', fontSize: 18 },
  info: { flex: 1 },
  docName: { fontWeight: '800', fontSize: 15, color: '#1E293B', marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center' },
  metaTxt: { color: '#94A3B8', fontSize: 11, marginLeft: 4 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyTxt: { color: '#94A3B8', marginTop: 16, marginBottom: 20 },
  bookBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  bookBtnTxt: { color: '#FFF', fontWeight: '900' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 4 },
});
