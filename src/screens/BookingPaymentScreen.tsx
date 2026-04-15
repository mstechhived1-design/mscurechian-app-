/**
 * BookingPaymentScreen — Payment & Booking Confirmation
 *
 * Uses the LOCAL backend (Multitenant_MsCurechain_Backend) directly.
 * 
 * PAYMENT FLOW:
 *   1. Show booking summary + payment options
 *   2. Patient taps "Pay via UPI / Card / etc."
 *   3. App calls POST /bookings/book with type "online" + paymentStatus "Paid"
 *   4. Any successful backend response → navigate to BookingConfirmationScreen
 *
 * NOTE: Razorpay hosted checkout can be added once backend payment endpoints
 * are configured. This screen uses simulated/direct booking in the meantime,
 * which is what the current local backend supports.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  ChevronLeft,
  Smartphone,
  CreditCard,
  Building2,
  Wallet,
  Shield,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Calendar,
  Clock,
  Lock,
  ArrowRight,
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/designSystem';
import { SanctuaryText } from '@/components/SanctuaryComponents';
import {
  bookAppointment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  RAZORPAY_KEY_ID,
  formatCurrency,
  formatDate,
  BookingSlot,
} from '@/services/paymentService';

type PaymentRouteProp = RouteProp<RootStackParamList, 'BookingPayment'>;

// ─── Payment Methods ──────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  {
    id: 'upi',
    label: 'UPI',
    sub: 'Google Pay • PhonePe • BHIM • Paytm',
    icon: Smartphone,
    color: '#7C3AED',
    badge: 'POPULAR',
  },
  {
    id: 'card',
    label: 'Credit / Debit Card',
    sub: 'Visa • Mastercard • RuPay • Amex',
    icon: CreditCard,
    color: '#2563EB',
    badge: null,
  },
  {
    id: 'netbanking',
    label: 'Net Banking',
    sub: '100+ Indian banks supported',
    icon: Building2,
    color: '#059669',
    badge: null,
  },
  {
    id: 'wallet',
    label: 'Wallets',
    sub: 'Paytm • Amazon Pay • MobiKwik',
    icon: Wallet,
    color: '#D97706',
    badge: null,
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BookingPaymentScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<PaymentRouteProp>();
  const { booking } = route.params;

  const [selectedMethod, setSelectedMethod] = useState<string>('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Select Payment Method', 'Please choose a payment method to continue.');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create Razorpay Order on Backend
      console.log('[BookingPayment] Creating order for amount:', booking.consultationFee);
      const order = await createRazorpayOrder(booking.consultationFee);

      // 2. Open Hosted Checkout in WebBrowser
      const result = await WebBrowser.openAuthSessionAsync(
        order.checkoutUrl,
        Linking.createURL('/')
      );

      if (result.type === 'success' && result.url) {
        await handlePaymentRedirect(result.url);
      } else {
        setIsProcessing(false);
      }

    } catch (err: any) {
      console.error('[BookingPayment] Order Error:', err);
      Alert.alert('Booking Start Failed', err.message || 'Could not initiate payment.');
      setIsProcessing(false);
    }
  };

  const handlePaymentRedirect = async (url: string) => {
    console.log('[BookingPayment] Redirect URL:', url);
    const { path, queryParams } = Linking.parse(url);

    if (url.includes('payment-success')) {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = queryParams as any;
      
      try {
        // 3. Verify Payment on Backend
        await verifyRazorpayPayment({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        });

        // 4. Finalize Booking
        const confirmation = await bookAppointment({
          ...booking,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
        });

        navigation.replace('BookingConfirmation', { confirmation });
      } catch (err: any) {
        Alert.alert('Payment Verification Failed', err.message || 'Verification error.');
      }
    } else if (url.includes('payment-cancel')) {
      Alert.alert('Payment Cancelled', 'You cancelled the payment process.');
    } else if (url.includes('payment-error')) {
      Alert.alert('Payment Error', 'An error occurred during payment.');
    }
    setIsProcessing(false);
  };

  const DetailRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Icon size={13} color={COLORS.primary} />
      </View>
      <SanctuaryText variant="body_sm" style={styles.detailLabel}>{label}</SanctuaryText>
      <SanctuaryText variant="label_lg" style={styles.detailValue} numberOfLines={2}>{value}</SanctuaryText>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={isProcessing}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <SanctuaryText variant="headline_sm" style={styles.headerTitle}>Payment</SanctuaryText>
        <View style={styles.secBadge}>
          <Lock size={11} color="#059669" />
          <SanctuaryText variant="label_sm" style={styles.secTxt}>Secure</SanctuaryText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Booking Summary ── */}
        <LinearGradient colors={['#1E40AF', '#2563EB']} style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <SanctuaryText variant="label_sm" style={styles.summaryLabel}>CONSULTATION FEE</SanctuaryText>
              <SanctuaryText variant="headline_sm" style={styles.summaryAmt}>
                {formatCurrency(booking.consultationFee)}
              </SanctuaryText>
            </View>
            <View style={styles.summaryBadge}>
              <SanctuaryText variant="label_sm" style={styles.summaryBadgeTxt}>
                {booking.appointmentType}
              </SanctuaryText>
            </View>
          </View>

          <View style={styles.summaryInfo}>
            <View style={styles.summaryRow}>
              <Stethoscope size={14} color="rgba(255,255,255,0.7)" />
              <SanctuaryText variant="body_sm" style={styles.summaryInfoTxt}>
                {booking.doctorName.startsWith('Dr.') ? booking.doctorName : `Dr. ${booking.doctorName}`}
              </SanctuaryText>
            </View>
            <View style={styles.summaryRow}>
              <Calendar size={14} color="rgba(255,255,255,0.7)" />
              <SanctuaryText variant="body_sm" style={styles.summaryInfoTxt}>
                {formatDate(booking.date)}
              </SanctuaryText>
            </View>
            <View style={styles.summaryRow}>
              <Clock size={14} color="rgba(255,255,255,0.7)" />
              <SanctuaryText variant="body_sm" style={styles.summaryInfoTxt}>
                {booking.timeSlot || `${booking.startTime} - ${booking.endTime}`}
              </SanctuaryText>
            </View>
          </View>
        </LinearGradient>

        {/* ── Booking Details Card ── */}
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <SanctuaryText variant="label_lg" style={styles.detailTitle}>BOOKING DETAILS</SanctuaryText>
          </View>
          <DetailRow icon={Stethoscope} label="Doctor" value={booking.doctorName} />
          <DetailRow icon={Building2} label="Hospital" value={booking.hospitalName} />
          <DetailRow icon={Calendar} label="Date" value={formatDate(booking.date)} />
          <DetailRow icon={Clock} label="Slot" value={booking.timeSlot || `${booking.startTime} - ${booking.endTime}`} />
          {!!booking.symptoms && (
            <DetailRow icon={AlertCircle} label="Reason" value={booking.symptoms} />
          )}
        </View>

        {/* ── Payment Method Selection ── */}
        <SanctuaryText variant="label_lg" style={styles.sectionTitle}>Choose Payment Method</SanctuaryText>

        {PAYMENT_METHODS.map((method) => {
          const isSelected = selectedMethod === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodCard, isSelected && styles.methodCardActive]}
              onPress={() => setSelectedMethod(method.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.methodIcon, { backgroundColor: isSelected ? method.color : '#F1F5F9' }]}>
                <method.icon size={18} color={isSelected ? '#fff' : method.color} />
              </View>
              <View style={styles.methodInfo}>
                <View style={styles.methodTitleRow}>
                  <SanctuaryText variant="label_lg" style={[styles.methodLabel, isSelected && { color: method.color }]}>
                    {method.label}
                  </SanctuaryText>
                  {method.badge && (
                    <View style={[styles.popularBadge, { backgroundColor: method.color }]}>
                      <SanctuaryText variant="label_sm" style={styles.popularBadgeTxt}>{method.badge}</SanctuaryText>
                    </View>
                  )}
                </View>
                <SanctuaryText variant="body_sm" style={styles.methodSub}>{method.sub}</SanctuaryText>
              </View>
              <View style={[styles.radio, isSelected && { borderColor: method.color, backgroundColor: method.color }]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ── Security Note ── */}
        <View style={styles.securityBox}>
          <Shield size={16} color="#059669" />
          <SanctuaryText variant="body_sm" style={styles.securityTxt}>
            Your payment is 256-bit SSL encrypted and processed securely. We never store your card details.
          </SanctuaryText>
        </View>

        {/* ── DEV: Simulate button ── */}
        {__DEV__ && (
          <View style={styles.devBox}>
            <SanctuaryText variant="label_sm" style={styles.devLabel}>🛠 DEV MODE</SanctuaryText>
            <SanctuaryText variant="body_sm" style={styles.devSub}>
              Payment confirmation will book directly via local backend.
            </SanctuaryText>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Pay Button ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={handlePayment}
          disabled={isProcessing}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isProcessing ? ['#94A3B8', '#94A3B8'] : ['#15803D', '#16A34A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.payGrad}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <SanctuaryText variant="label_lg" style={styles.payTxt}>Processing...</SanctuaryText>
              </>
            ) : (
              <>
                <Lock size={18} color="#fff" />
                <SanctuaryText variant="label_lg" style={styles.payTxt}>
                  Pay {formatCurrency(booking.consultationFee)} Securely
                </SanctuaryText>
                <ArrowRight size={18} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <SanctuaryText variant="body_sm" style={styles.cancelHint}>
          Tap Pay to confirm your appointment
        </SanctuaryText>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#1E293B', fontWeight: '900', fontSize: 18 },
  secBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  secTxt: { color: '#059669', fontSize: 11, fontWeight: '800' },

  scroll: { padding: 20 },

  // Booking summary
  summaryCard: { borderRadius: 22, padding: 22, marginBottom: 16 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  summaryAmt: { color: '#fff', fontWeight: '900', fontSize: 28 },
  summaryBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  summaryBadgeTxt: { color: '#fff', fontWeight: '900', fontSize: 11 },
  summaryInfo: { gap: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryInfoTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', flex: 1 },

  // Booking details
  detailCard: { backgroundColor: '#fff', borderRadius: 18, marginBottom: 22, overflow: 'hidden' },
  detailHeader: { padding: 16, paddingBottom: 12, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailTitle: { color: '#94A3B8', fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 12 },
  detailIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#EAF1FF', justifyContent: 'center', alignItems: 'center' },
  detailLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', width: 70 },
  detailValue: { color: '#1E293B', fontWeight: '800', fontSize: 13, flex: 1, textAlign: 'right' },

  // Section title
  sectionTitle: { color: '#1E293B', fontWeight: '900', fontSize: 15, marginBottom: 14 },

  // Payment methods
  methodCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 2, borderColor: 'transparent',
    gap: 14,
  },
  methodCardActive: { borderColor: COLORS.primary, backgroundColor: '#EAF1FF' },
  methodIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  methodInfo: { flex: 1 },
  methodTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  methodLabel: { color: '#1E293B', fontWeight: '800', fontSize: 14 },
  methodSub: { color: '#94A3B8', fontSize: 11, fontWeight: '500' },
  popularBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  popularBadgeTxt: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },

  // Security
  securityBox: { flexDirection: 'row', gap: 12, backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, marginTop: 6, alignItems: 'flex-start' },
  securityTxt: { color: '#166534', fontSize: 11, fontWeight: '500', flex: 1, lineHeight: 17 },

  // Dev box
  devBox: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginTop: 12 },
  devLabel: { color: '#D97706', fontWeight: '900', fontSize: 11, marginBottom: 4 },
  devSub: { color: '#92400E', fontSize: 11, fontWeight: '500' },

  // Footer
  footer: {
    backgroundColor: '#fff', paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  payBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 10 },
  payGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 10 },
  payTxt: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cancelHint: { textAlign: 'center', color: '#94A3B8', fontSize: 11, fontWeight: '500' },
});
