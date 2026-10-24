/**
 * BookingPaymentScreen — In-App Razorpay Payment (LIVE)
 *
 * Flow:
 *   1. Patient selects payment method & taps Pay
 *   2. App calls POST /api/mobile/create-order  → gets orderId from Razorpay
 *   3. App builds checkout URL → opens backend's HTML checkout page in a
 *      WebView MODAL (fully inside the app, no external browser)
 *   4. Patient completes payment on the WebView
 *   5. WebView posts a message back to the app via window.ReactNativeWebView.postMessage
 *   6. App verifies signature: POST /api/mobile/verify-payment
 *   7. App creates appointment: POST /api/mobile/book
 *   8. Navigate to BookingConfirmationScreen
 */

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  ChevronLeft,
  X,
  Smartphone,
  CreditCard,
  Building2,
  Wallet,
  Shield,
  AlertCircle,
  Stethoscope,
  Calendar,
  Clock,
  Lock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react-native';

import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/designSystem';
import { SanctuaryText } from '@/components/SanctuaryComponents';
import apiClient from '@/api/axiosConfig';
import {
  bookAppointment,
  createRazorpayOrder,
  verifyRazorpayPayment,
  buildCheckoutUrl,
  formatCurrency,
  formatDate,
  BookingSlot,
} from '@/services/paymentService';

type PaymentRouteProp = RouteProp<RootStackParamList, 'BookingPayment'>;

// ─── Payment Methods ───────────────────────────────────────────────────────────

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

// ─── Main Component ────────────────────────────────────────────────────────────

export default function BookingPaymentScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<PaymentRouteProp>();
  const { booking } = route.params;

  const [selectedMethod, setSelectedMethod] = useState<string>('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  // ─── Coupon State ───
  const [couponCode, setCouponCode] = useState('');
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [appliedCode, setAppliedCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalFee, setFinalFee] = useState(booking.consultationFee);

  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'SAVE15') {
      const discount = Math.round(booking.consultationFee * 0.15);
      setDiscountAmount(discount);
      setFinalFee(booking.consultationFee - discount);
      setIsCouponApplied(true);
      setAppliedCode(couponCode.toUpperCase());
      Alert.alert('Coupon Applied', 'You saved 15% on your booking fee!');
    } else {
      Alert.alert('Invalid Coupon', 'This coupon code does not exist or is expired.');
    }
  };

  const removeCoupon = () => {
    setIsCouponApplied(false);
    setAppliedCode('');
    setDiscountAmount(0);
    setFinalFee(booking.consultationFee);
    setCouponCode('');
  };

  // WebView modal state
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [isWebViewLoading, setIsWebViewLoading] = useState(true);
  const webViewRef = useRef<any>(null);

  // ─── Step 1: Create Razorpay order & open WebView ─────────────────────────
  const handlePayment = async () => {
    if (!selectedMethod) {
      Alert.alert('Select Payment Method', 'Please choose a payment method to continue.');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('[BookingPayment] Creating Razorpay order for ₹', finalFee);
      const [order, profileRes] = await Promise.all([
        createRazorpayOrder(finalFee),
        apiClient.get('/patients/profile').catch(() => ({ data: null }))
      ]);

      const patientData = profileRes?.data?.user || profileRes?.data || {};
      const patientName = patientData.name || 'Valued Patient';
      const patientContact = patientData.mobile || patientData.contactNumber || patientData.phone || '';
      const patientEmail = patientData.email || '';
      const rawDob = patientData.dateOfBirth || patientData.dob || profileRes?.data?.dob || '';
      
      let formattedDob = '';
      if (rawDob) {
        try {
          const d = new Date(rawDob);
          if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = d.toLocaleString('en-US', { month: 'short' });
            const year = d.getFullYear();
            formattedDob = `${day} ${month} ${year}`;
          }
        } catch (e) {
          formattedDob = String(rawDob);
        }
      }

      // order = { orderId, amount (paise), currency, receipt }
      const orderId = order.orderId || order.id;
      const amountPaise = order.amount; // Already in paise from backend

      if (!orderId || !amountPaise) {
        throw new Error('Invalid order response from server.');
      }

      setCurrentOrderId(orderId);

      // Build the URL pointing to our backend's checkout HTML page
      const url = buildCheckoutUrl(orderId, amountPaise, {
        name: patientName,
        contact: patientContact,
        email: patientEmail,
        dob: formattedDob,
        description: `${booking.appointmentType} with ${booking.doctorName}`,
      });

      console.log('[BookingPayment] Checkout URL:', url);
      setCheckoutUrl(url);
      setIsWebViewLoading(true);
      setWebViewVisible(true);
      setIsProcessing(false);
    } catch (err: any) {
      console.error('[BookingPayment] Failed to create order:', err);
      Alert.alert(
        'Payment Failed to Start',
        err?.response?.data?.message || err.message || 'Could not initiate payment. Please try again.',
      );
      setIsProcessing(false);
    }
  };

  // ─── Step 2: Handle messages from the WebView (Razorpay result) ───────────
  const handleWebViewMessage = async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'DEBUG_LOG') {
        console.log('[WebView LOG]', data.message);
        return;
      }
      if (data.type === 'DEBUG_ERROR') {
        console.error('[WebView ERROR]', data.message);
        return;
      }

      console.log('[BookingPayment] WebView message arrived:', data.type);
      
      if (data.type === 'PAYMENT_SUCCESS') {
        setWebViewVisible(false);
        setIsProcessing(true);
        await handlePaymentSuccess(
          data.razorpay_order_id,
          data.razorpay_payment_id,
          data.razorpay_signature,
        );
      } else if (data.type === 'PAYMENT_CANCELLED') {
        setWebViewVisible(false);
        Alert.alert('Payment Cancelled', 'You cancelled the payment. Your slot is not booked yet.');
      } else if (data.type === 'PAYMENT_FAILED') {
        setWebViewVisible(false);
        Alert.alert('Payment Failed', data.error || 'The payment could not be processed. Please try again.');
      }
    } catch (err) {
      console.error('[BookingPayment] Failed to parse WebView message:', err);
    }
  };

  // ─── Step 3: Verify payment + create appointment ──────────────────────────
  const handlePaymentSuccess = async (
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string,
  ) => {
    try {
      console.log('[BookingPayment] Verifying payment signature...');
      await verifyRazorpayPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      console.log('[BookingPayment] Signature verified. Creating appointment...');
      const confirmation = await bookAppointment({
        ...booking,
        consultationFee: finalFee,
        selectedPaymentMethod: selectedMethod,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      });

      navigation.replace('BookingConfirmation', { confirmation });
    } catch (err: any) {
      console.error('[BookingPayment] Post-payment error:', err);
      Alert.alert(
        'Booking Failed',
        err?.response?.data?.message ||
          err.message ||
          'Payment was received but appointment could not be created. Please contact support.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Detail Row Component ─────────────────────────────────────────────────
  const DetailRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Icon size={13} color={COLORS.primary} />
      </View>
      <SanctuaryText variant="body_sm" style={styles.detailLabel}>{label}</SanctuaryText>
      <SanctuaryText variant="label_lg" style={styles.detailValue} numberOfLines={2}>{value}</SanctuaryText>
    </View>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
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
              <SanctuaryText variant="label_sm" style={styles.summaryLabel}>PAYABLE AMOUNT</SanctuaryText>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                <SanctuaryText variant="headline_sm" style={styles.summaryAmt}>
                  {formatCurrency(finalFee)}
                </SanctuaryText>
                {isCouponApplied && (
                  <SanctuaryText variant="body_sm" style={styles.originalFeeStrikethrough}>
                    {formatCurrency(booking.consultationFee)}
                  </SanctuaryText>
                )}
              </View>
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

        {/* ── Coupon Code ── */}
        <View style={styles.couponCard}>
          <View style={styles.couponHeader}>
            <SanctuaryText variant="label_lg" style={styles.couponTitle}>PROMO CODE</SanctuaryText>
            {isCouponApplied && (
              <View style={styles.appliedBadge}>
                <CheckCircle2 size={10} color="#059669" />
                <SanctuaryText variant="label_sm" style={styles.appliedBadgeTxt}>APPLIED</SanctuaryText>
              </View>
            )}
          </View>
          
          <View style={styles.couponInputRow}>
            <View style={styles.couponInputBox}>
              <Smartphone size={16} color="#94A3B8" />
              <TextInput
                style={styles.couponInput}
                placeholder="Enter Coupon Code"
                placeholderTextColor="#94A3B8"
                value={couponCode}
                onChangeText={(t) => setCouponCode(t.toUpperCase())}
                autoCapitalize="characters"
                editable={!isCouponApplied}
              />
            </View>
            <TouchableOpacity 
              style={[styles.applyBtn, isCouponApplied && styles.removeBtn]} 
              onPress={isCouponApplied ? removeCoupon : applyCoupon}
            >
              <SanctuaryText variant="label_sm" style={styles.applyBtnTxt}>
                {isCouponApplied ? 'REMOVE' : 'APPLY'}
              </SanctuaryText>
            </TouchableOpacity>
          </View>
          
          {!isCouponApplied && (
            <SanctuaryText variant="body_sm" style={styles.couponHint}>
              Try <SanctuaryText variant="label_sm" style={{color: COLORS.primary}}>SAVE15</SanctuaryText> for 15% off
            </SanctuaryText>
          )}

          {isCouponApplied && (
            <View style={styles.discountRow}>
              <View style={styles.discountInfo}>
                <SanctuaryText variant="body_sm" style={styles.discountLabel}>Coupon "{appliedCode}" discount (15%)</SanctuaryText>
                <SanctuaryText variant="label_lg" style={styles.discountAmt}>- {formatCurrency(discountAmount)}</SanctuaryText>
              </View>
            </View>
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
            Your payment is processed securely by Razorpay with 256-bit SSL encryption. We never store your card details.
          </SanctuaryText>
        </View>

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
                  Pay {formatCurrency(finalFee)} Securely
                </SanctuaryText>
                <ArrowRight size={18} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <SanctuaryText variant="body_sm" style={styles.cancelHint}>
          Powered by Razorpay · Tap Pay to open payment gateway
        </SanctuaryText>
      </View>

      {/* ── In-App Razorpay WebView Modal ── */}
      <Modal
        visible={webViewVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          Alert.alert(
            'Cancel Payment?',
            'Are you sure you want to cancel this payment?',
            [
              { text: 'Continue Paying', style: 'cancel' },
              {
                text: 'Cancel',
                style: 'destructive',
                onPress: () => setWebViewVisible(false),
              },
            ],
          );
        }}
      >
        <SafeAreaView style={styles.webViewContainer}>
          {/* WebView Header */}
          <View style={styles.webViewHeader}>
            <View style={styles.webViewHeaderLeft}>
              <Lock size={14} color="#059669" />
              <SanctuaryText variant="label_sm" style={styles.webViewSecureTxt}>
                Secure Payment
              </SanctuaryText>
            </View>
            <SanctuaryText variant="label_lg" style={styles.webViewTitle}>
              Razorpay Checkout
            </SanctuaryText>
            <TouchableOpacity
              style={styles.webViewClose}
              onPress={() => {
                Alert.alert(
                  'Cancel Payment?',
                  'Going back will cancel the current payment.',
                  [
                    { text: 'Continue', style: 'cancel' },
                    {
                      text: 'Cancel Payment',
                      style: 'destructive',
                      onPress: () => setWebViewVisible(false),
                    },
                  ],
                );
              }}
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* WebView */}
          <WebView
            ref={webViewRef}
            source={{ uri: checkoutUrl }}
            style={styles.webView}
            onMessage={handleWebViewMessage}
            onNavigationStateChange={(navState) => {
              if (navState.url && navState.url.startsWith('mscurechain-patient://payment-result')) {
                try {
                  const urlObj = new URL(navState.url);
                  const status = urlObj.searchParams.get('status');
                  if (status === 'success') {
                    const paymentId = urlObj.searchParams.get('payment_id') || `pay_sim_${Date.now()}`;
                    const orderId = urlObj.searchParams.get('order_id') || currentOrderId;
                    const signature = urlObj.searchParams.get('signature') || 'sig_test_verified';
                    setWebViewVisible(false);
                    setIsProcessing(true);
                    handlePaymentSuccess(orderId, paymentId, signature);
                  } else if (status === 'cancelled') {
                    setWebViewVisible(false);
                    Alert.alert('Payment Cancelled', 'You cancelled the payment. Your slot is not booked yet.');
                  }
                } catch (e) {
                  console.warn('[WebView Nav] URL parse err:', e);
                }
              }
            }}
            onLoadStart={() => setIsWebViewLoading(true)}
            onLoadEnd={() => setIsWebViewLoading(false)}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            mixedContentMode="always"
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('[WebView] Load error (non-fatal):', nativeEvent.description);
            }}
          />

          {/* Loading overlay */}
          {isWebViewLoading && (
            <View style={styles.webViewLoader}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <SanctuaryText variant="body_sm" style={styles.webViewLoaderTxt}>
                Loading secure payment gateway...
              </SanctuaryText>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

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

  summaryCard: { borderRadius: 22, padding: 22, marginBottom: 16 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  summaryAmt: { color: '#fff', fontWeight: '900', fontSize: 28 },
  summaryBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  summaryBadgeTxt: { color: '#fff', fontWeight: '900', fontSize: 11 },
  summaryInfo: { gap: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryInfoTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', flex: 1 },

  detailCard: { backgroundColor: '#fff', borderRadius: 18, marginBottom: 22, overflow: 'hidden' },
  detailHeader: { padding: 16, paddingBottom: 12, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailTitle: { color: '#94A3B8', fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 12 },
  detailIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#EAF1FF', justifyContent: 'center', alignItems: 'center' },
  detailLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', width: 70 },
  detailValue: { color: '#1E293B', fontWeight: '800', fontSize: 13, flex: 1, textAlign: 'right' },

  sectionTitle: { color: '#1E293B', fontWeight: '900', fontSize: 15, marginBottom: 14 },

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

  securityBox: { flexDirection: 'row', gap: 12, backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, marginTop: 6, alignItems: 'flex-start' },
  securityTxt: { color: '#166534', fontSize: 11, fontWeight: '500', flex: 1, lineHeight: 17 },

  footer: {
    backgroundColor: '#fff', paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  payBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 10 },
  payGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 10 },
  payTxt: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cancelHint: { textAlign: 'center', color: '#94A3B8', fontSize: 11, fontWeight: '500' },

  // Coupon styles
  couponCard: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 22 },
  couponHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  couponTitle: { color: '#94A3B8', fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
  appliedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  appliedBadgeTxt: { color: '#059669', fontSize: 9, fontWeight: '800' },
  couponInputRow: { flexDirection: 'row', gap: 10 },
  couponInputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  couponInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: '#1E293B', fontWeight: '700', fontSize: 14 },
  applyBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  removeBtn: { backgroundColor: '#EF4444' },
  applyBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 12 },
  couponHint: { color: '#94A3B8', fontSize: 11, marginTop: 8, fontWeight: '500' },
  discountRow: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  discountInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  discountLabel: { color: '#059669', fontSize: 12, fontWeight: '600' },
  discountAmt: { color: '#059669', fontWeight: '800', fontSize: 14 },
  originalFeeStrikethrough: { color: 'rgba(255,255,255,0.5)', textDecorationLine: 'line-through', fontSize: 16, fontWeight: '600' },

  // WebView Modal styles
  webViewContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  webViewHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  webViewSecureTxt: { color: '#059669', fontSize: 12, fontWeight: '700' },
  webViewTitle: { color: '#1E293B', fontWeight: '800', fontSize: 15, flex: 1, textAlign: 'center' },
  webViewClose: {
    flex: 1,
    alignItems: 'flex-end',
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  webView: { flex: 1 },
  webViewLoader: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  webViewLoaderTxt: { color: '#64748B', fontSize: 13, fontWeight: '500' },
});
