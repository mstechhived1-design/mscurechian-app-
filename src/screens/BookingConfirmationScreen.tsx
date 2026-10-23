/**
 * BookingConfirmationScreen — Post-Payment Booking Success
 *
 * Shown after:
 *   - Payment is verified by backend (HMAC-SHA256 Razorpay signature)
 *   - Appointment record is created in the database
 *
 * Features:
 *   - Animated success celebration
 *   - Full booking receipt display
 *   - Add to calendar prompt
 *   - Navigate to Appointments list
 *   - Navigate to Home dashboard
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Share,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  CreditCard,
  Share2,
  Home,
  ArrowRight,
  FileText,
  Shield,
  Download,
} from 'lucide-react-native';

import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/designSystem';
import { SanctuaryText } from '@/components/SanctuaryComponents';
import { BookingConfirmation, formatCurrency, formatDate } from '@/services/paymentService';
import { exportAppointmentReceiptPdf } from '@/utils/pdfExportUtil';

const { width } = Dimensions.get('window');
type ConfirmRouteProp = RouteProp<RootStackParamList, 'BookingConfirmation'>;

export default function BookingConfirmationScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<ConfirmRouteProp>();
  const { confirmation } = route.params;

  // ── Animations ──
  const checkScale = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ── Share receipt ──
  const handleShare = async () => {
    try {
      await Share.share({
        message:
          `🏥 MSCureChain Appointment Confirmed!\n\n` +
          `📋 Booking Ref: ${confirmation.bookingReference}\n` +
          `👨‍⚕️ Doctor: ${confirmation.doctorName}\n` +
          `🏥 Hospital: ${confirmation.hospitalName}\n` +
          `📅 Date: ${formatDate(confirmation.date)}\n` +
          `⏰ Time: ${confirmation.time}\n` +
          `💰 Paid: ${formatCurrency(confirmation.amount)}\n\n` +
          `Powered by MSCureChain — Your Digital Health Partner`,
      });
    } catch (err) {
      console.error('[BookingConfirmation] Share error:', err);
    }
  };

  // ── Export official PDF receipt ──
  const handleDownloadPdf = async () => {
    try {
      await exportAppointmentReceiptPdf({
        bookingReference: confirmation.bookingReference || confirmation.appointmentId,
        patientMrn: confirmation.mrn,
        doctorName: confirmation.doctorName,
        hospitalName: confirmation.hospitalName,
        date: formatDate(confirmation.date),
        time: confirmation.time,
        amount: formatCurrency(confirmation.amount),
        paymentMethod: confirmation.paymentMethod,
        paymentStatus: 'PAID',
      });
    } catch (err: any) {
      console.warn('[BookingConfirmation] PDF error:', err?.message);
    }
  };

  // ── Navigate home (reset stack) ──
  const goHome = () => {
    console.log('[BookingConfirmation] Resetting stack to Dashboard (Home)');
    navigation.dispatch(
      CommonActions.reset({ 
        index: 0, 
        routes: [{ name: 'Dashboard' }] 
      })
    );
  };

  const goToAppointments = () => {
    console.log('[BookingConfirmation] Resetting stack to Dashboard -> Appointments');
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          { 
            name: 'Dashboard', 
            params: { screen: 'Appointments' } 
          }
        ],
      })
    );
  };

  const detailRows = [
    { icon: FileText,    label: 'Booking Ref',  value: confirmation.bookingReference || confirmation.appointmentId },
    { icon: Stethoscope, label: 'Doctor',        value: confirmation.doctorName.startsWith('Dr.') ? confirmation.doctorName : `Dr. ${confirmation.doctorName}` },
    { icon: Building2,   label: 'Hospital',      value: confirmation.hospitalName },
    { icon: Calendar,    label: 'Date',          value: formatDate(confirmation.date) },
    { icon: Clock,       label: 'Time',          value: confirmation.time },
    { icon: CreditCard,  label: 'Payment',       value: `${formatCurrency(confirmation.amount)} · ${confirmation.paymentMethod}` },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Success Hero ── */}
        <LinearGradient colors={['#14532D', '#166534', '#15803D']} style={styles.hero}>
          {/* Animated checkmark */}
          <Animated.View style={[styles.checkWrap, { transform: [{ scale: checkScale }] }]}>
            <View style={styles.checkOuter}>
              <CheckCircle2 size={56} color="#fff" />
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
            <SanctuaryText variant="headline_sm" style={styles.heroTitle}>Appointment Confirmed!</SanctuaryText>
            <SanctuaryText variant="body_sm" style={styles.heroSub}>
              Your consultation has been booked and payment received successfully.
            </SanctuaryText>
          </Animated.View>

          {/* Booking Reference Badge */}
          <Animated.View style={[styles.refBadge, { opacity: fadeIn }]}>
            <SanctuaryText variant="label_sm" style={styles.refLabel}>BOOKING REFERENCE</SanctuaryText>
            <SanctuaryText variant="headline_sm" style={styles.refCode}>
              {(confirmation.bookingReference || confirmation.appointmentId || '').slice(-12).toUpperCase()}
            </SanctuaryText>
          </Animated.View>
        </LinearGradient>

        {/* ── Quick Summary Pills ── */}
        <Animated.View style={[styles.pillRow, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <SummaryPill icon={Calendar} label={formatDate(confirmation.date)} />
          <SummaryPill icon={Clock} label={confirmation.time} />
          <SummaryPill icon={CreditCard} label={formatCurrency(confirmation.amount) + ' Paid'} green />
        </Animated.View>

        {/* ── Booking Details Card ── */}
        <Animated.View style={[styles.detailCard, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <View style={styles.detailHeader}>
            <FileText size={16} color={COLORS.primary} />
            <SanctuaryText variant="label_lg" style={styles.detailTitle}>BOOKING DETAILS</SanctuaryText>
          </View>

          {detailRows.map(({ icon: Icon, label, value }) => (
            <View key={label} style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Icon size={13} color={COLORS.primary} />
              </View>
              <SanctuaryText variant="body_sm" style={styles.detailLabel}>{label}</SanctuaryText>
              <SanctuaryText variant="label_lg" style={styles.detailValue} numberOfLines={2}>{value}</SanctuaryText>
            </View>
          ))}
        </Animated.View>

        {/* ── Payment Verified Badge ── */}
        <View style={styles.verifiedBox}>
          <Shield size={16} color="#059669" />
          <SanctuaryText variant="body_sm" style={styles.verifiedTxt}>
            Payment verified and secured by Razorpay PCI-DSS Level 1 gateway.
          </SanctuaryText>
        </View>

        {/* ── What's Next ── */}
        <View style={styles.nextBox}>
          <SanctuaryText variant="label_lg" style={styles.nextTitle}>WHAT'S NEXT</SanctuaryText>
          {[
            'You\'ll receive an SMS & push notification with appointment details',
            'Arrive 15 minutes before your scheduled time',
            'Carry your MRN card or show your booking reference',
          ].map((item, i) => (
            <View key={i} style={styles.nextRow}>
              <View style={styles.nextNum}>
                <SanctuaryText variant="label_sm" style={styles.nextNumTxt}>{i + 1}</SanctuaryText>
              </View>
              <SanctuaryText variant="body_sm" style={styles.nextItemTxt}>{item}</SanctuaryText>
            </View>
          ))}
        </View>

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* ── Bottom Actions ── */}
      <View style={styles.footer}>
        <View style={styles.actionRow}>
          {/* Download PDF Receipt */}
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]} onPress={handleDownloadPdf} activeOpacity={0.8}>
            <Download size={18} color="#006AF5" />
            <SanctuaryText variant="label_lg" style={[styles.shareTxt, { color: '#006AF5' }]}>PDF Slip</SanctuaryText>
          </TouchableOpacity>

          {/* Share Receipt */}
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Share2 size={18} color={COLORS.primary} />
            <SanctuaryText variant="label_lg" style={styles.shareTxt}>Share</SanctuaryText>
          </TouchableOpacity>

          {/* View Appointments */}
          <TouchableOpacity style={styles.apptBtn} onPress={goToAppointments} activeOpacity={0.85}>
            <LinearGradient
              colors={['#1E40AF', '#2563EB']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.apptGrad}
            >
              <Calendar size={15} color="#fff" />
              <SanctuaryText variant="label_lg" style={styles.apptTxt}>Appointments</SanctuaryText>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Go Home */}
        <TouchableOpacity style={styles.homeBtn} onPress={goHome} activeOpacity={0.8}>
          <Home size={16} color="#64748B" />
          <SanctuaryText variant="label_lg" style={styles.homeTxt}>Back to Dashboard</SanctuaryText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Sub-Components ────────────────────────────────────────────────────────────

function SummaryPill({ icon: Icon, label, green }: { icon: any; label: string; green?: boolean }) {
  return (
    <View style={[pill.wrap, green && pill.green]}>
      <Icon size={13} color={green ? '#059669' : COLORS.primary} />
      <SanctuaryText variant="label_sm" style={[pill.txt, green && { color: '#059669' }]} numberOfLines={1}>{label}</SanctuaryText>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingBottom: 20 },

  // Hero
  hero: {
    padding: 28,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 36,
    alignItems: 'center',
  },
  checkWrap: { marginBottom: 20 },
  checkOuter: {
    width: 96, height: 96, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroTitle: { color: '#fff', fontWeight: '900', fontSize: 24, textAlign: 'center', marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', fontWeight: '500', lineHeight: 19, marginBottom: 20 },
  refBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  refLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  refCode: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 2 },

  // Pills row
  pillRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },

  // Detail card
  detailCard: { backgroundColor: '#fff', borderRadius: 22, marginHorizontal: 20, marginTop: 16, overflow: 'hidden' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 18, paddingBottom: 12, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailTitle: { color: COLORS.primary, fontWeight: '900', fontSize: 11, letterSpacing: 0.8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 12 },
  detailIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#EAF1FF', justifyContent: 'center', alignItems: 'center' },
  detailLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', width: 90 },
  detailValue: { color: '#1E293B', fontWeight: '800', fontSize: 13, flex: 1, textAlign: 'right' },

  // Verified
  verifiedBox: { flexDirection: 'row', gap: 10, backgroundColor: '#F0FDF4', borderRadius: 14, marginHorizontal: 20, marginTop: 12, padding: 14, alignItems: 'center' },
  verifiedTxt: { color: '#166534', fontSize: 11, fontWeight: '500', flex: 1, lineHeight: 16 },

  // What's next
  nextBox: { backgroundColor: '#fff', borderRadius: 22, marginHorizontal: 20, marginTop: 12, padding: 20 },
  nextTitle: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 14 },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  nextNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EAF1FF', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  nextNumTxt: { color: COLORS.primary, fontWeight: '900', fontSize: 11 },
  nextItemTxt: { color: '#475569', fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 18 },

  // Footer
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#EAF1FF', borderRadius: 16,
  },
  shareTxt: { color: COLORS.primary, fontWeight: '800', fontSize: 14 },

  apptBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  apptGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  apptTxt: { color: '#fff', fontWeight: '900', fontSize: 14 },

  homeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: '#F8FAFC', borderRadius: 14 },
  homeTxt: { color: '#64748B', fontWeight: '700', fontSize: 14 },
});

const pill = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#EAF1FF', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8 },
  green: { backgroundColor: '#ECFDF5' },
  txt: { color: COLORS.primary, fontSize: 10, fontWeight: '800', textAlign: 'center' },
});
