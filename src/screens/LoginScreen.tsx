import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput as RNTextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  useWindowDimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StackNavigationProp } from '@react-navigation/stack';
import { Smartphone, Lock, Eye, EyeOff, FingerprintPattern, ScanFace, ShieldCheck } from 'lucide-react-native';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

import { apiClient, AUTH_ENDPOINTS, saveAuthTokens } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '../constants/designSystem';
import { SanctuaryText, PrimaryButton, DigitalAtriumLoader } from '../components/SanctuaryComponents';
import {
  checkBiometricAvailability,
  isBiometricLoginEnabled,
  performBiometricLogin,
  updateBiometricStoredTokens,
  getSavedBiometricIdentifier,
  BiometricStatus,
} from '@/services/biometricService';

const { width, height } = Dimensions.get('window');

// --- Proper HMS Validations ---
const loginSchema = z.object({
  identifier: z
    .string()
    .min(10, 'Please enter exactly 10 digits')
    .max(10, 'Please enter exactly 10 digits')
    .regex(/^[0-9]+$/, 'Mobile number must be only digits'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const scrollViewRef = useRef<ScrollView>(null);
  const mobileInputRef = useRef<RNTextInput>(null);
  const passwordInputRef = useRef<RNTextInput>(null);

  // Dynamic window dimensions & insets for responsive mobile layout
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch (_) {}
      setIsKeyboardVisible(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch (_) {}
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Screen height classifications
  const isSmallScreen = screenHeight < 720;
  const isMediumScreen = screenHeight >= 720 && screenHeight < 840;

  // Hero banner height:
  // - When keyboard is OPEN: Collapses to 0 so inputs and "Log In" button are 100% visible above keyboard!
  // - When keyboard is CLOSED: Dynamically scales with mobile phone height
  const defaultHeroHeight = Math.max(
    110,
    Math.min(
      Math.round(screenHeight * (isSmallScreen ? 0.17 : isMediumScreen ? 0.21 : 0.24)),
      210
    )
  );
  const heroHeight = isKeyboardVisible ? 0 : defaultHeroHeight;

  // Dynamic sizing based on screen height and keyboard state
  const logoSize = isKeyboardVisible ? 32 : isSmallScreen ? 38 : isMediumScreen ? 46 : 54;
  const logoMargin = isKeyboardVisible ? 2 : isSmallScreen ? 3 : isMediumScreen ? 5 : 6;
  const welcomeTitleSize = isKeyboardVisible ? 18 : isSmallScreen ? 19 : isMediumScreen ? 21 : 23;
  const welcomeSubMargin = isKeyboardVisible ? 4 : isSmallScreen ? 6 : isMediumScreen ? 10 : 14;
  const fieldSpacing = isKeyboardVisible ? 6 : isSmallScreen ? 8 : isMediumScreen ? 10 : 12;
  const inputHeight = isKeyboardVisible ? 42 : isSmallScreen ? 42 : isMediumScreen ? 45 : 46;
  const buttonHeight = isKeyboardVisible ? 44 : isSmallScreen ? 42 : isMediumScreen ? 46 : 48;
  const biometricButtonHeight = isSmallScreen ? 44 : isMediumScreen ? 48 : 52;
  const footerMarginTop = isSmallScreen ? 8 : isMediumScreen ? 12 : 16;
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Forgot Password / Account Recovery State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Biometric Authentication State
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>({
    isAvailable: false,
    hasHardware: false,
    isEnrolled: false,
    biometricType: 'None',
    label: 'Biometrics',
  });
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleRequestOtp = async () => {
    const cleanId = recoveryIdentifier.trim();
    if (!cleanId || cleanId.length < 5) {
      setRecoveryError('Please enter your registered mobile number or email');
      return;
    }
    setRecoveryLoading(true);
    setRecoveryError(null);
    setRecoverySuccess(null);
    try {
      const resp = await apiClient.post('/auth/forgot-password', { identifier: cleanId });
      setRecoverySuccess(resp.data?.message || 'Verification code sent to your registered email.');
      setRecoveryStep(2);
    } catch (err: any) {
      setRecoveryError(err?.response?.data?.message || err?.message || 'Failed to send OTP.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const cleanOtp = recoveryOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setRecoveryError('Please enter the 6-digit OTP code sent to your email');
      return;
    }
    if (!recoveryNewPassword || recoveryNewPassword.length < 8 || recoveryNewPassword.length > 10) {
      setRecoveryError('New password must be between 8 and 10 characters');
      return;
    }
    setRecoveryLoading(true);
    setRecoveryError(null);
    try {
      const resp = await apiClient.post('/auth/reset-password', {
        identifier: recoveryIdentifier.trim(),
        otp: cleanOtp,
        newPassword: recoveryNewPassword,
      });
      setRecoverySuccess(resp.data?.message || 'Password reset successfully! Returning to login...');
      setTimeout(() => {
        setIsForgotPassword(false);
        setRecoveryStep(1);
        setRecoverySuccess(null);
        setRecoveryOtp('');
        setRecoveryNewPassword('');
      }, 1500);
    } catch (err: any) {
      setRecoveryError(err?.response?.data?.message || err?.message || 'Failed to reset password.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  let [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur', // --- FIXED: No errors while the user is still typing ---
    defaultValues: { identifier: '', password: '' },
  });

  // Check and setup biometric authentication
  useEffect(() => {
    let isMounted = true;
    const initBiometrics = async () => {
      try {
        const [status, enabled, savedId] = await Promise.all([
          checkBiometricAvailability(),
          isBiometricLoginEnabled(),
          getSavedBiometricIdentifier(),
        ]);
        if (!isMounted) return;
        setBiometricStatus(status);
        setIsBiometricEnabled(enabled);

        if (savedId) {
          setValue('identifier', savedId);
        }

        // Auto-prompt biometrics if enabled and hardware is available
        if (enabled && status.isAvailable) {
          setTimeout(() => {
            if (isMounted) {
              handleBiometricLogin();
            }
          }, 350);
        }
      } catch (err) {
        console.warn('[LoginScreen] Biometric init error:', err);
      }
    };
    initBiometrics();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setServerError(null);
    try {
      const result = await performBiometricLogin();
      if (result.success) {
        navigation.replace('Dashboard');
      } else if (result.error && result.error !== 'Authentication cancelled') {
        setServerError(result.error);
      }
    } catch (err: any) {
      setServerError(err?.message || 'Biometric authentication failed.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const resp = await apiClient.post(AUTH_ENDPOINTS.LOGIN, {
        identifier: data.identifier,
        password: data.password,
      });
      const { tokens, user } = resp.data;

      // Only patients can log in to the patient app
      if (user.role !== 'patient') {
        setServerError('This account is not a patient account. Please use the correct portal.');
        return;
      }

      await saveAuthTokens(tokens.accessToken, tokens.refreshToken);
      // Synchronize biometric credentials if biometric login was activated
      await updateBiometricStoredTokens(tokens.accessToken, tokens.refreshToken);
      navigation.replace('Dashboard' as any, { screen: 'Profile', params: { openEdit: true } });
    } catch (e: any) {
      // Pick the most specific error message available
      const msg =
        e?.error?.message ||
        e?.response?.data?.message ||
        e?.message ||
        'Login failed. Please check your credentials.';

      // Clean up generic connectivity errors into something actionable
      if (msg.includes('Connectivity Error') || msg.includes('Network Error')) {
        setServerError('Cannot reach server. Make sure you are on the same Wi-Fi as the backend.');
      } else if (msg.includes('Invalid Date of Birth') || msg.includes('Invalid login') || msg.includes('Password is wrong')) {
        setServerError('Incorrect mobile number or password. Please try again.');
      } else {
        setServerError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) return <DigitalAtriumLoader />;

  const renderScrollContent = () => (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        isKeyboardVisible && { paddingBottom: 16 }
      ]}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      showsVerticalScrollIndicator={Platform.OS === 'web'}
    >
      {/* Top Compassion Header - smoothly collapses to 0 height when keyboard is open */}
      <View 
        style={[
          styles.heroWrapper, 
          { 
            height: heroHeight, 
            opacity: isKeyboardVisible ? 0 : 1,
            display: isKeyboardVisible ? 'none' : 'flex',
          }
        ]}
      >
        <Image 
          source={require('../../assets/patient_hero.jpg')} 
          style={styles.heroImg}
          resizeMode="cover"
        />
        <View style={styles.curvedOverlay} />
      </View>

      {/* Login Content Area */}
      <View 
        style={[
          styles.content,
          isKeyboardVisible && { 
            marginTop: 0, 
            paddingTop: Math.max(insets.top, 10),
          }
        ]}
      >
         <View style={[styles.logoBadge, { marginBottom: logoMargin }]}>
            <Image 
              source={require('../../assets/image.png')} 
              style={[styles.logo, { width: logoSize, height: logoSize }]} 
              resizeMode="contain" 
            />
         </View>
         
         {isForgotPassword ? (
            <View style={styles.form}>
              <SanctuaryText variant="headline_sm" style={[styles.welcomeTitle, { fontSize: welcomeTitleSize }]}>
                {recoveryStep === 1 ? 'Password Recovery' : 'Reset Password'}
              </SanctuaryText>
              <SanctuaryText variant="body_sm" style={[styles.welcomeSub, { marginBottom: welcomeSubMargin }]}>
                {recoveryStep === 1
                  ? 'Enter registered mobile or email to receive 6-digit OTP.'
                  : 'Enter the 6-digit OTP sent to your email and your new password.'}
              </SanctuaryText>

              {recoverySuccess && (
                <View style={{ backgroundColor: '#EDFDF5', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 10 }}>
                  <SanctuaryText variant="body_sm" style={{ color: '#065F46', textAlign: 'center', fontWeight: '600', fontSize: 11 }}>
                    {recoverySuccess}
                  </SanctuaryText>
                </View>
              )}

              {recoveryError && (
                <View style={{ backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', marginBottom: 10 }}>
                  <SanctuaryText variant="body_sm" style={{ color: '#B91C1C', textAlign: 'center', fontWeight: '600', fontSize: 11 }}>
                    {recoveryError}
                  </SanctuaryText>
                </View>
              )}

              {recoveryStep === 1 ? (
                <>
                  <View style={[styles.fieldItem, { marginBottom: fieldSpacing }]}>
                    <SanctuaryText variant="label_sm" style={styles.fieldLabel}>Registered Mobile or Email</SanctuaryText>
                    <View style={[styles.inputBox, { height: inputHeight }]}>
                      <Smartphone size={16} color="#005AB5" style={{ marginRight: 8 }} />
                      <RNTextInput
                        placeholder="Enter mobile number or email"
                        placeholderTextColor="#94A3B8"
                        value={recoveryIdentifier}
                        onChangeText={(val) => {
                          setRecoveryIdentifier(val);
                          if (recoveryError) setRecoveryError(null);
                        }}
                        style={styles.textInput}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <PrimaryButton
                    label="Send Verification Code"
                    onPress={handleRequestOtp}
                    loading={recoveryLoading}
                    style={[styles.signInBtn, { height: buttonHeight, marginTop: isKeyboardVisible ? 4 : 8 }]}
                  />
                </>
              ) : (
                <>
                  <View style={[styles.fieldItem, { marginBottom: fieldSpacing }]}>
                    <SanctuaryText variant="label_sm" style={styles.fieldLabel}>6-Digit OTP Code</SanctuaryText>
                    <View style={[styles.inputBox, { height: inputHeight }]}>
                      <Lock size={16} color="#005AB5" style={{ marginRight: 8 }} />
                      <RNTextInput
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor="#94A3B8"
                        value={recoveryOtp}
                        onChangeText={(val) => {
                          setRecoveryOtp(val.replace(/[^0-9]/g, ''));
                          if (recoveryError) setRecoveryError(null);
                        }}
                        style={styles.textInput}
                        keyboardType="numeric"
                        maxLength={6}
                      />
                    </View>
                  </View>

                  <View style={[styles.fieldItem, { marginBottom: fieldSpacing }]}>
                    <SanctuaryText variant="label_sm" style={styles.fieldLabel}>New Password (8-10 characters)</SanctuaryText>
                    <View style={[styles.inputBox, { height: inputHeight }]}>
                      <Lock size={16} color="#005AB5" style={{ marginRight: 8 }} />
                      <RNTextInput
                        placeholder="8 to 10 characters"
                        placeholderTextColor="#94A3B8"
                        value={recoveryNewPassword}
                        onChangeText={(val) => {
                          setRecoveryNewPassword(val.slice(0, 10));
                          if (recoveryError) setRecoveryError(null);
                        }}
                        style={styles.textInput}
                        secureTextEntry={!showRecoveryPassword}
                        maxLength={10}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity 
                        onPress={() => setShowRecoveryPassword(!showRecoveryPassword)} 
                        style={{ padding: 6 }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        {showRecoveryPassword ? (
                          <EyeOff size={16} color="#005AB5" />
                        ) : (
                          <Eye size={16} color="#94A3B8" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <PrimaryButton
                    label="Reset Password & Sign In"
                    onPress={handleResetPassword}
                    loading={recoveryLoading}
                    style={[styles.signInBtn, { height: buttonHeight, marginTop: isKeyboardVisible ? 4 : 8 }]}
                  />

                  <TouchableOpacity 
                    onPress={() => {
                      setRecoveryStep(1);
                      setRecoveryError(null);
                      setRecoverySuccess(null);
                    }}
                    style={{ marginTop: 8, alignItems: 'center' }}
                  >
                    <SanctuaryText variant="body_sm" style={{ color: '#005AB5', fontWeight: '700', fontSize: 12 }}>
                      Resend code / Change mobile or email
                    </SanctuaryText>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity 
                onPress={() => {
                  setIsForgotPassword(false);
                  setRecoveryStep(1);
                  setRecoverySuccess(null);
                  setRecoveryError(null);
                  setRecoveryOtp('');
                  setRecoveryNewPassword('');
                }}
                style={{ marginTop: 10, alignItems: 'center', padding: 6 }}
              >
                <SanctuaryText variant="label_sm" style={{ color: '#64748B', fontWeight: '800' }}>
                  ← Back to Login
                </SanctuaryText>
              </TouchableOpacity>
            </View>
          ) : (
           <>
             <SanctuaryText variant="headline_sm" style={[styles.welcomeTitle, { fontSize: welcomeTitleSize }]}>
               {t('login.welcome')}
             </SanctuaryText>
             <SanctuaryText variant="body_sm" style={[styles.welcomeSub, { marginBottom: welcomeSubMargin }]}>
                {t('login.sub')}
             </SanctuaryText>

             <View style={styles.form}>
                {/* Mobile Entry */}
                <View style={[styles.fieldItem, { marginBottom: fieldSpacing }]}>
                  <SanctuaryText variant="label_sm" style={styles.fieldLabel}>Mobile Number</SanctuaryText>
                  <Controller
                    control={control}
                    name="identifier"
                    render={({ field: { onChange, value, onBlur } }) => (
                      <TouchableOpacity 
                        activeOpacity={1}
                        onPress={() => mobileInputRef.current?.focus()}
                        style={[styles.inputBox, { height: inputHeight }, errors.identifier && styles.errorStroke]}
                      >
                        <Smartphone size={16} color="#005AB5" style={{ marginRight: 8 }} />
                        <RNTextInput
                          ref={mobileInputRef}
                          placeholder="10-digit mobile number"
                          placeholderTextColor="#94A3B8"
                          value={value}
                          onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, 10))}
                          onBlur={onBlur}
                          style={styles.textInput}
                          keyboardType="number-pad"
                          maxLength={10}
                        />
                      </TouchableOpacity>
                    )}
                  />
                  {errors.identifier && <SanctuaryText variant="body_sm" style={styles.errMsg}>{errors.identifier.message}</SanctuaryText>}
                </View>

                {/* Password Entry */}
                <View style={[styles.fieldItem, { marginBottom: fieldSpacing }]}>
                  <View style={styles.rowLabel}>
                     <SanctuaryText variant="label_sm" style={styles.fieldLabel}>Password</SanctuaryText>
                     <TouchableOpacity onPress={() => setIsForgotPassword(true)}>
                       <SanctuaryText variant="body_sm" style={styles.forgotPass}>Forgot Password?</SanctuaryText>
                     </TouchableOpacity>
                  </View>
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, value, onBlur } }) => (
                      <TouchableOpacity 
                        activeOpacity={1}
                        onPress={() => passwordInputRef.current?.focus()}
                        style={[styles.inputBox, { height: inputHeight }, errors.password && styles.errorStroke]}
                      >
                        <Lock size={16} color="#005AB5" style={{ marginRight: 8 }} />
                        <RNTextInput
                          ref={passwordInputRef}
                          placeholder="Enter your password"
                          placeholderTextColor="#94A3B8"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.textInput}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                           <SanctuaryText variant="label_sm" style={{ color: '#005AB5', fontWeight: '800' }}>
                             {showPassword ? t('login.hide') : t('login.show')}
                           </SanctuaryText>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    )}
                  />
                  {errors.password && <SanctuaryText variant="body_sm" style={styles.errMsg}>{errors.password.message}</SanctuaryText>}
                </View>

                {serverError && <SanctuaryText variant="body_sm" style={styles.serverAlert}>{serverError}</SanctuaryText>}

                <PrimaryButton
                  label="Log In"
                  onPress={handleSubmit(onLoginSubmit)}
                  loading={isLoading}
                  style={[styles.signInBtn, { height: buttonHeight, marginTop: isKeyboardVisible ? 4 : 8 }]}
                />

                {/* Biometric 1-Tap Login Option (hidden while keyboard is active) */}
                {isBiometricEnabled && !isKeyboardVisible && (
                  <View style={styles.biometricContainer}>
                    <View style={styles.biometricDividerRow}>
                      <View style={styles.biometricDividerLine} />
                      <SanctuaryText variant="body_sm" style={styles.biometricDividerText}>OR</SanctuaryText>
                      <View style={styles.biometricDividerLine} />
                    </View>

                    <TouchableOpacity
                      style={[styles.biometricBtn, { height: biometricButtonHeight }]}
                      onPress={handleBiometricLogin}
                      disabled={biometricLoading}
                      activeOpacity={0.8}
                    >
                      {biometricStatus.biometricType === 'FaceID' ? (
                        <ScanFace size={isSmallScreen ? 18 : 22} color="#005AB5" style={{ marginRight: 10 }} />
                      ) : (
                        <FingerprintPattern size={isSmallScreen ? 18 : 22} color="#005AB5" style={{ marginRight: 10 }} />
                      )}
                      <SanctuaryText variant="label_lg" style={[styles.biometricBtnText, { fontSize: isSmallScreen ? 13 : 15 }]}>
                        {biometricLoading ? 'Authenticating...' : `Sign in with ${biometricStatus.label}`}
                      </SanctuaryText>
                    </TouchableOpacity>
                  </View>
                )}
             </View>
           </>
         )}

         {/* Base Footer (hidden while typing to keep screen compact & accessible) */}
         {!isKeyboardVisible && (
           <View style={[styles.baseFooter, { marginTop: footerMarginTop, paddingBottom: Math.max(insets.bottom, 12) }]}>
              <View style={styles.registerRow}>
                <SanctuaryText variant="body_sm" style={styles.registerHint}>New patient? </SanctuaryText>
                <TouchableOpacity onPress={() => navigation.navigate('Register' as any)}>
                  <SanctuaryText variant="label_lg" style={styles.registerLink}>Register here</SanctuaryText>
                </TouchableOpacity>
              </View>
              <View style={styles.policyRow}>
                <TouchableOpacity onPress={() => navigation.navigate('TermsAndConditions', { initialTab: 'privacy' })}>
                  <SanctuaryText variant="body_sm" style={styles.policyLink}>Privacy Policy</SanctuaryText>
                </TouchableOpacity>
                <SanctuaryText variant="body_sm" style={styles.policyDivider}> • </SanctuaryText>
                <TouchableOpacity onPress={() => navigation.navigate('TermsAndConditions', { initialTab: 'terms' })}>
                  <SanctuaryText variant="body_sm" style={styles.policyLink}>Terms of Service</SanctuaryText>
                </TouchableOpacity>
              </View>
              <SanctuaryText variant="body_sm" style={{color: '#BBB', marginTop: 10}}>
                MSC-APP v1.2.1 • Encryption Secured
              </SanctuaryText>
           </View>
         )}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView 
      style={styles.base}
      edges={isKeyboardVisible ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}
    >
      <StatusBar 
        barStyle="dark-content" 
        translucent={!isKeyboardVisible} 
        backgroundColor={isKeyboardVisible ? "#FFF" : "transparent"} 
      />
      {Platform.OS === 'web' ? (
        <View style={styles.flex1}>
          {renderScrollContent()}
        </View>
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.flex1}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.flex1}
            >
              {renderScrollContent()}
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  base: { 
    flex: 1, 
    backgroundColor: '#FFF', 
    height: '100%', 
    minHeight: 0,
    ...(Platform.OS === 'web' ? { maxHeight: '100vh' as any, overflow: 'hidden' as any } : {}),
  },
  flex1: { flex: 1, height: '100%', minHeight: 0 },
  scrollView: { 
    flex: 1, 
    height: '100%', 
    minHeight: 0,
    ...(Platform.OS === 'web' ? { overflowY: 'auto' as any } : {}),
  },
  scrollContent: { flexGrow: 1, backgroundColor: '#FFF', paddingBottom: 28 },
  heroWrapper: { width: '100%', overflow: 'hidden' },
  heroImg: { width: '100%', height: '100%' },
  curvedOverlay: { position: 'absolute', bottom: 0, width: '100%', height: 24, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  content: { flex: 1, paddingHorizontal: 20, backgroundColor: '#FFF', alignItems: 'center', marginTop: -10 },
  logoBadge: { marginBottom: 6 },
  logo: { width: 56, height: 56 },
  welcomeTitle: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', color: '#1A1C1E', marginBottom: 2 },
  welcomeSub: { color: '#666', marginBottom: 14, fontSize: 12, textAlign: 'center' },
  form: { width: '100%' },
  fieldItem: { marginBottom: 12 },
  rowLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  fieldLabel: { color: '#1A1C1E', opacity: 0.85, fontSize: 11, fontWeight: '700' },
  forgotPass: { color: '#005AB5', fontWeight: '800', fontSize: 11 },
  inputBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    height: 46, 
    borderWidth: 1.5, 
    borderColor: '#EAECF0', 
    backgroundColor: '#FAFBFC', 
    paddingHorizontal: 12, 
    borderRadius: 10,
    ...(Platform.OS === 'web' ? { cursor: 'text' as any } : {}),
  },
  textInput: { 
    flex: 1, 
    fontSize: 13, 
    color: '#1A1C1E',
    height: '100%',
    minHeight: 40,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  errorStroke: { borderColor: '#BA1A1A' },
  errMsg: { color: '#BA1A1A', fontSize: 10, marginTop: 2, fontWeight: '600' },
  serverAlert: { color: '#BA1A1A', textAlign: 'center', marginVertical: 10, fontWeight: '700', fontSize: 12 },
  signInBtn: { height: 48, borderRadius: 10, marginTop: 8 },
  baseFooter: { paddingBottom: 20, alignItems: 'center' },
  registerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  registerHint: { color: '#888', fontSize: 12 },
  registerLink: { color: '#005AB5', fontSize: 12, fontWeight: '800' },
  policyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  policyLink: { color: '#888', fontSize: 11, textDecorationLine: 'underline' },
  policyDivider: { color: '#BBB', fontSize: 12, marginHorizontal: 4 },
  biometricContainer: {
    width: '100%',
    marginTop: 10,
  },
  biometricDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  biometricDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  biometricDividerText: {
    paddingHorizontal: 12,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  biometricBtnText: {
    color: '#005AB5',
    fontWeight: '800',
    fontSize: 15,
  },
});
