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
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { 
  User, 
  Smartphone, 
  Mail, 
  Lock, 
  Shield, 
  ChevronLeft,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { 
  useFonts,
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';

import { apiClient, AUTH_ENDPOINTS, saveAuthTokens } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/designSystem';
import { SanctuaryText, PrimaryButton, DigitalAtriumLoader } from '@/components/SanctuaryComponents';

const { width, height } = Dimensions.get('window');

// --- Proper HMS Validations (Synced with Backend Policy) ---
const registerSchema = z.object({
  name: z.string()
    .min(2, 'Name is too short')
    .max(50, 'Name is too long')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters'),
  mobile: z
    .string()
    .min(10, 'Mobile number must be 10 digits')
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Needs at least one uppercase letter')
    .regex(/[a-z]/, 'Needs at least one lowercase letter')
    .regex(/[0-9]/, 'Needs at least one digit')
    .regex(/[@$!%*?&#^()_+\-=]/, 'Needs at least one special character'),
  confirmPassword: z.string(),
  consent: z.boolean().refine((val) => val === true, {
    message: 'Agreement is mandatory',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  let [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', mobile: '', email: '', password: '', confirmPassword: '', consent: false },
  });

  const consentValue = watch('consent');

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const resp = await apiClient.post(AUTH_ENDPOINTS.REGISTER || '/auth/register', {
        name: data.name.trim(),
        mobile: data.mobile.trim(),
        email: data.email?.trim().toLowerCase() || "",
        password: data.password,
        role: 'patient',
        consentGiven: true,
        platform: 'mobile',
      });

      const { tokens, user } = resp.data;
      await saveAuthTokens(tokens.accessToken, tokens.refreshToken);

      Alert.alert(
        '✅ Welcome to MS CureChain',
        `Hey ${user.name}, your patient account has been successfully created.`,
        [{ text: 'Start Journey', onPress: () => navigation.replace('ProfileSetup') }]
      );
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Registration failed.';
      setServerError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) return <DigitalAtriumLoader />;

  return (
    <SafeAreaView style={styles.base}>
      <StatusBar barStyle="dark-content" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.flex1}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.flex1}
          >
            <ScrollView 
              ref={scrollViewRef}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: keyboardHeight > 0 ? keyboardHeight / 2 : 40 }
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
            {/* Header / Back */}
            <TouchableOpacity style={styles.stickyBack} onPress={() => navigation.goBack()}>
              <ChevronLeft size={24} color="#1A1C1E" />
            </TouchableOpacity>

            <View style={styles.heroWrapper}>
              <Image 
                source={require('../../assets/login_hero.jpg')} 
                style={styles.heroImg}
                resizeMode="cover"
              />
              <View style={styles.curvedOverlay} />
            </View>

            <View style={styles.content}>
               <SanctuaryText variant="headline_md" style={styles.mainTitle}>Create Account</SanctuaryText>
               <SanctuaryText variant="body_md" style={styles.subTitle}>
                  Join the most trusted digital healthcare network.
               </SanctuaryText>

               <View style={styles.form}>
                  {/* Name */}
                  <View style={styles.fieldItem}>
                    <SanctuaryText variant="label_lg" style={styles.fieldLabel}>Full Name</SanctuaryText>
                    <Controller
                      control={control}
                      name="name"
                      render={({ field: { onChange, value } }) => (
                        <View style={[styles.inputBox, errors.name && styles.errorStroke]}>
                          <User size={18} color="#005AB5" style={styles.iconSp} />
                          <RNTextInput
                            value={value}
                            onChangeText={onChange}
                            style={styles.textInput}
                            placeholder="e.g. Rahul Verma"
                            placeholderTextColor="#AAA"
                          />
                        </View>
                      )}
                    />
                    {errors.name && <SanctuaryText variant="body_sm" style={styles.errMsg}>{errors.name.message}</SanctuaryText>}
                  </View>

                  {/* Mobile */}
                  <View style={styles.fieldItem}>
                    <SanctuaryText variant="label_lg" style={styles.fieldLabel}>Mobile Number</SanctuaryText>
                    <Controller
                      control={control}
                      name="mobile"
                      render={({ field: { onChange, value } }) => (
                        <View style={[styles.inputBox, errors.mobile && styles.errorStroke]}>
                          <Smartphone size={18} color="#005AB5" style={styles.iconSp} />
                          <RNTextInput
                            value={value}
                            onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
                            style={styles.textInput}
                            placeholder="10 digit number"
                            placeholderTextColor="#AAA"
                            keyboardType="number-pad"
                            maxLength={10}
                          />
                        </View>
                      )}
                    />
                    {errors.mobile && <SanctuaryText variant="body_sm" style={styles.errMsg}>{errors.mobile.message}</SanctuaryText>}
                  </View>

                  {/* Email */}
                  <View style={styles.fieldItem}>
                    <SanctuaryText variant="label_lg" style={styles.fieldLabel}>Email Address</SanctuaryText>
                    <Controller
                      control={control}
                      name="email"
                      render={({ field: { onChange, value } }) => (
                        <View style={[styles.inputBox, errors.email && styles.errorStroke]}>
                          <Mail size={18} color="#005AB5" style={styles.iconSp} />
                          <RNTextInput
                            value={value}
                            onChangeText={onChange}
                            style={styles.textInput}
                            placeholder="name@example.com"
                            placeholderTextColor="#AAA"
                            keyboardType="email-address"
                            autoCapitalize="none"
                          />
                        </View>
                      )}
                    />
                    {errors.email && <SanctuaryText variant="body_sm" style={styles.errMsg}>{errors.email.message}</SanctuaryText>}
                  </View>

                  {/* Password */}
                  <View style={styles.fieldItem}>
                    <SanctuaryText variant="label_lg" style={styles.fieldLabel}>Password</SanctuaryText>
                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onChange, value } }) => (
                        <View style={[styles.inputBox, errors.password && styles.errorStroke]}>
                          <Lock size={18} color="#005AB5" style={styles.iconSp} />
                          <RNTextInput
                            value={value}
                            onChangeText={onChange}
                            style={styles.textInput}
                            placeholder="••••••••"
                            placeholderTextColor="#AAA"
                            secureTextEntry={!showPass}
                          />
                          <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                            {showPass ? <EyeOff size={20} color="#005AB5" /> : <Eye size={20} color="#005AB5" />}
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                    {errors.password && <SanctuaryText variant="body_sm" style={styles.errMsg}>{errors.password.message}</SanctuaryText>}
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.fieldItem}>
                    <SanctuaryText variant="label_lg" style={styles.fieldLabel}>Confirm Password</SanctuaryText>
                    <Controller
                      control={control}
                      name="confirmPassword"
                      render={({ field: { onChange, value } }) => (
                        <View style={[styles.inputBox, errors.confirmPassword && styles.errorStroke]}>
                          <Shield size={18} color="#005AB5" style={styles.iconSp} />
                          <RNTextInput
                            value={value}
                            onChangeText={onChange}
                            style={styles.textInput}
                            placeholder="••••••••"
                            placeholderTextColor="#AAA"
                            secureTextEntry={!showConfirm}
                          />
                          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                            {showConfirm ? <EyeOff size={20} color="#005AB5" /> : <Eye size={20} color="#005AB5" />}
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                    {errors.confirmPassword && <SanctuaryText variant="body_sm" style={styles.errMsg}>{errors.confirmPassword.message}</SanctuaryText>}
                  </View>

                  {/* Consent */}
                  <TouchableOpacity 
                    style={styles.consentRow} 
                    onPress={() => setValue('consent', !consentValue)} 
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkOuter, consentValue && styles.checkActive]}>
                      {consentValue && <Check size={14} color="#fff" strokeWidth={3} />}
                    </View>
                    <View style={styles.consentTxtBlock}>
                       <SanctuaryText variant="body_sm" style={styles.consentBase}>
                          I agree to MS CureChain's 
                          <SanctuaryText 
                             variant="label_sm" 
                             style={styles.legalLink}
                             onPress={(e: any) => {
                               e.stopPropagation();
                               navigation.navigate('TermsAndConditions', { initialTab: 'terms' });
                             }}
                          > Terms </SanctuaryText>
                          &
                          <SanctuaryText 
                             variant="label_sm" 
                             style={styles.legalLink}
                             onPress={(e: any) => {
                               e.stopPropagation();
                               navigation.navigate('TermsAndConditions', { initialTab: 'privacy' });
                             }}
                          > Privacy Policy</SanctuaryText>
                       </SanctuaryText>
                    </View>
                  </TouchableOpacity>
                  {errors.consent && <SanctuaryText variant="body_sm" style={[styles.errMsg, { marginTop: -12, marginBottom: 12 }]}>{errors.consent.message}</SanctuaryText>}

                  {serverError && <SanctuaryText variant="body_sm" style={styles.serverAlert}>{serverError}</SanctuaryText>}

                  <PrimaryButton
                    label="Register Now"
                    onPress={handleSubmit(onRegisterSubmit)}
                    loading={isLoading}
                    disabled={!consentValue || isLoading}
                    style={[styles.submitBtn, !consentValue && { opacity: 0.5 }]}
                  />

                  <View style={styles.loginHintRow}>
                    <SanctuaryText variant="body_sm" style={{color: '#888'}}>Already with us? </SanctuaryText>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                      <SanctuaryText variant="label_lg" style={styles.loginLink}>Sign In</SanctuaryText>
                    </TouchableOpacity>
                  </View>
               </View>
            </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: '#FFF' },
  flex1: { flex: 1 },
  scrollContent: { flexGrow: 1, backgroundColor: '#FFF' },
  stickyBack: { position: 'absolute', top: 16, left: 16, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  heroWrapper: { height: height * 0.22, width: '100%' },
  heroImg: { width: '100%', height: '100%' },
  curvedOverlay: { position: 'absolute', bottom: 0, width: '100%', height: 32, backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  content: { flex: 1, paddingHorizontal: 32, backgroundColor: '#FFF', marginTop: -10 },
  mainTitle: { fontSize: 28, fontFamily: 'Manrope_800ExtraBold', color: '#1A1C1E', marginBottom: 4 },
  subTitle: { color: '#666', marginBottom: 24, fontSize: 13 },
  form: { width: '100%' },
  fieldItem: { marginBottom: 16 },
  fieldLabel: { color: '#1A1C1E', opacity: 0.8, marginBottom: 8, fontSize: 12 },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 58, borderWidth: 1.5, borderColor: '#EAECF0', backgroundColor: '#FAFBFC', paddingHorizontal: 16, borderRadius: 12 },
  iconSp: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 15, color: '#1A1C1E', fontWeight: '500' },
  eyeBtn: { padding: 8, marginLeft: 4 },
  errorStroke: { borderColor: '#BA1A1A' },
  errMsg: { color: '#BA1A1A', fontSize: 11, marginTop: 4, fontWeight: '600' },
  serverAlert: { color: '#BA1A1A', textAlign: 'center', marginBottom: 16, fontWeight: '700' },
  submitBtn: { height: 60, borderRadius: 12, marginTop: 8 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 16 },
  checkOuter: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#EAECF0', backgroundColor: '#FAFBFC', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkActive: { backgroundColor: '#005AB5', borderColor: '#005AB5' },
  consentTxtBlock: { flex: 1, marginLeft: 12 },
  consentBase: { color: '#666', fontSize: 12, lineHeight: 18 },
  legalLink: { color: '#005AB5', fontWeight: '800' },
  loginHintRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, paddingBottom: 40 },
  loginLink: { color: '#005AB5', fontWeight: '800' },
});
