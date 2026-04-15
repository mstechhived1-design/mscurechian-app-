/**
 * RegisterScreen — Patient Self-Registration
 *
 * New patients register here to create an account on the local backend.
 * Route: POST /api/auth/register
 *
 * Login options after registration:
 *   - Mobile + Password (set during registration)
 *   - Mobile + DOB in DDMMYYYY format (if profile DOB is set)
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Smartphone,
  Mail,
  Lock,
  ChevronLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react-native';

import { apiClient, AUTH_ENDPOINTS, saveAuthTokens } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/designSystem';
import { SanctuaryText } from '@/components/SanctuaryComponents';

type NavProp = StackNavigationProp<RootStackParamList>;

export default function RegisterScreen() {
  const navigation = useNavigation<NavProp>();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!name.trim() || name.trim().length < 2) return 'Please enter your full name';
    if (!/^[6-9]\d{9}$/.test(mobile)) return 'Enter a valid 10-digit Indian mobile number';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    if (!consent) return 'You must accept the Terms & Conditions to register';
    return null;
  };

  const handleRegister = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const resp = await apiClient.post(AUTH_ENDPOINTS.REGISTER || '/auth/register', {
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: 'patient',
        consentGiven: true,
      });

      const { tokens, user } = resp.data;

      // Auto-login after successful registration
      await saveAuthTokens(tokens.accessToken, tokens.refreshToken);

      Alert.alert(
        '✅ Registration Successful',
        `Welcome, ${user.name}! Your patient account has been created.`,
        [{ text: 'Continue', onPress: () => navigation.replace('Dashboard') }],
      );
    } catch (e: any) {
      const msg =
        e?.error?.message ||
        e?.response?.data?.message ||
        e?.message ||
        'Registration failed. Please try again.';

      if (msg.includes('Mobile already registered')) {
        setError('This mobile number is already registered. Please log in instead.');
      } else if (msg.includes('Email already registered')) {
        setError('This email is already registered. Try a different email address.');
      } else if (msg.includes('Connectivity') || msg.includes('Network')) {
        setError('Cannot reach server. Make sure you are on the same Wi-Fi as the backend.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const Field = ({
    icon: Icon,
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    secureTextEntry,
    rightElement,
    maxLength,
    autoCapitalize,
  }: any) => (
    <View style={styles.fieldGroup}>
      <SanctuaryText variant="label_lg" style={styles.fieldLabel}>{label}</SanctuaryText>
      <View style={styles.inputRow}>
        <View style={styles.inputIcon}>
          <Icon size={16} color={COLORS.primary} />
        </View>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#B0BAC9"
          keyboardType={keyboardType || 'default'}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize || 'none'}
          autoCorrect={false}
        />
        {rightElement}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={22} color="#1E293B" />
          </TouchableOpacity>
          <SanctuaryText variant="headline_sm" style={styles.headerTitle}>Create Account</SanctuaryText>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <LinearGradient colors={['#1E40AF', '#2563EB']} style={styles.hero}>
            <View style={styles.heroIcon}>
              <User size={32} color="#fff" />
            </View>
            <SanctuaryText variant="headline_sm" style={styles.heroTitle}>Patient Registration</SanctuaryText>
            <SanctuaryText variant="body_sm" style={styles.heroSub}>
              Register to book appointments and manage your health records
            </SanctuaryText>
          </LinearGradient>

          <View style={styles.form}>
            {/* Error banner */}
            {!!error && (
              <View style={styles.errorBox}>
                <Shield size={14} color="#B91C1C" />
                <SanctuaryText variant="body_sm" style={styles.errorMsg}>{error}</SanctuaryText>
              </View>
            )}

            <Field
              icon={User}
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Priya Sharma"
              autoCapitalize="words"
            />

            <Field
              icon={Smartphone}
              label="Mobile Number"
              value={mobile}
              onChangeText={(t: string) => setMobile(t.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
            />

            <Field
              icon={Mail}
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
            />

            <Field
              icon={Lock}
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 characters"
              secureTextEntry={!showPass}
              rightElement={
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  {showPass ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
                </TouchableOpacity>
              }
            />

            <Field
              icon={Lock}
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              secureTextEntry={!showConfirm}
              rightElement={
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                  {showConfirm ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
                </TouchableOpacity>
              }
            />

            {/* Consent */}
            <TouchableOpacity style={styles.consentRow} onPress={() => setConsent(!consent)} activeOpacity={0.7}>
              <View style={[styles.checkbox, consent && styles.checkboxActive]}>
                {consent && <CheckCircle2 size={14} color="#fff" />}
              </View>
              <SanctuaryText variant="body_sm" style={styles.consentTxt}>
                I agree to the{' '}
                <SanctuaryText variant="body_sm" style={styles.consentLink}>Terms of Service</SanctuaryText>
                {' '}and{' '}
                <SanctuaryText variant="body_sm" style={styles.consentLink}>Privacy Policy</SanctuaryText>
              </SanctuaryText>
            </TouchableOpacity>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isLoading ? ['#94A3B8', '#94A3B8'] : ['#1E40AF', '#2563EB']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.submitGrad}
              >
                <SanctuaryText variant="label_lg" style={styles.submitTxt}>
                  {isLoading ? 'Creating Account...' : 'Create My Account'}
                </SanctuaryText>
              </LinearGradient>
            </TouchableOpacity>

            {/* Already have account */}
            <View style={styles.loginRow}>
              <SanctuaryText variant="body_sm" style={styles.loginHint}>Already have an account? </SanctuaryText>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <SanctuaryText variant="label_lg" style={styles.loginLink}>Sign In</SanctuaryText>
              </TouchableOpacity>
            </View>

            {/* Info box */}
            <View style={styles.infoBox}>
              <Shield size={13} color="#2563EB" />
              <SanctuaryText variant="body_sm" style={styles.infoTxt}>
                After registering, you can log in with your mobile number and the password you set above.
              </SanctuaryText>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#1E293B', fontWeight: '900', fontSize: 18 },

  scroll: { flexGrow: 1 },

  hero: { padding: 28, alignItems: 'center', gap: 10 },
  heroIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  heroTitle: { color: '#fff', fontWeight: '900', fontSize: 20, textAlign: 'center' },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  form: { padding: 24, gap: 4 },

  errorBox: { flexDirection: 'row', gap: 10, backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 12, alignItems: 'flex-start' },
  errorMsg: { color: '#B91C1C', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 },

  fieldGroup: { marginBottom: 18 },
  fieldLabel: { color: '#475569', fontWeight: '800', fontSize: 12, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 4,
  },
  inputIcon: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  input: { flex: 1, color: '#1E293B', fontSize: 15, paddingVertical: 12 },
  eyeBtn: { padding: 8 },

  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 22, marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  consentTxt: { color: '#64748B', fontSize: 12, lineHeight: 20, flex: 1 },
  consentLink: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },

  submitBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  submitBtnDisabled: { opacity: 0.6 },
  submitGrad: { paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
  submitTxt: { color: '#fff', fontWeight: '900', fontSize: 16 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  loginHint: { color: '#94A3B8', fontSize: 13 },
  loginLink: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },

  infoBox: { flexDirection: 'row', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, alignItems: 'flex-start' },
  infoTxt: { color: '#1D4ED8', fontSize: 11, fontWeight: '500', flex: 1, lineHeight: 17 },
});
