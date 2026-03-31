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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StackNavigationProp } from '@react-navigation/stack';
import { Smartphone, Lock } from 'lucide-react-native';
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
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Handling Keyboard Height for unblocked scrolling
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      // Auto-focus the focused input area by scrolling to end
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
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
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur', // --- FIXED: No errors while the user is still typing ---
    defaultValues: { identifier: '', password: '' },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const resp = await apiClient.post(AUTH_ENDPOINTS.LOGIN, {
        identifier: data.identifier,
        password: data.password,
      });
      const { tokens, user } = resp.data;
      if (user.role !== 'patient') throw new Error('Unrecognized Account Type');
      await saveAuthTokens(tokens.accessToken, tokens.refreshToken);
      navigation.replace('Dashboard');
    } catch (e: any) {
      setServerError(e.response?.data?.message || 'Login failed. Please check your credentials.');
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
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: keyboardHeight > 0 ? keyboardHeight : 40 }
            ]}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Compassion Header */}
            <View style={styles.heroWrapper}>
              <Image 
                source={require('../../assets/patient_hero.png')} 
                style={styles.heroImg}
                resizeMode="cover"
              />
              <View style={styles.curvedOverlay} />
            </View>

            {/* Login Content Area */}
            <View style={styles.content}>
               <View style={styles.logoBadge}>
                  <Image source={require('../../assets/Logo.jpeg')} style={styles.logo} resizeMode="contain" />
               </View>
               
               <SanctuaryText variant="headline_md" style={styles.welcomeTitle}>{t('login.welcome')}</SanctuaryText>
               <SanctuaryText variant="body_md" style={styles.welcomeSub}>
                  {t('login.sub')}
               </SanctuaryText>

               <View style={styles.form}>
                  {/* Mobile Entry */}
                  <View style={styles.fieldItem}>
                    <SanctuaryText variant="label_lg" style={styles.fieldLabel}>Mobile Number</SanctuaryText>
                    <Controller
                      control={control}
                      name="identifier"
                      render={({ field: { onChange, value, onBlur } }) => (
                        <View style={[styles.inputBox, errors.identifier && styles.errorStroke]}>
                          <Smartphone size={18} color="#005AB5" style={{ marginRight: 12 }} />
                          <RNTextInput
                            placeholder="" // --- FIXED: Placeholder removed for privacy ---
                            value={value}
                            onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, 10))}
                            onBlur={onBlur}
                            style={styles.textInput}
                            keyboardType="number-pad"
                            maxLength={10}
                          />
                        </View>
                      )}
                    />
                    {errors.identifier && <SanctuaryText variant="body_sm" style={styles.errMsg}>{errors.identifier.message}</SanctuaryText>}
                  </View>

                  {/* Password Entry */}
                  <View style={styles.fieldItem}>
                    <View style={styles.rowLabel}>
                       <SanctuaryText variant="label_lg" style={styles.fieldLabel}>Password</SanctuaryText>
                       <TouchableOpacity><SanctuaryText variant="body_sm" style={styles.forgotPass}>Forgot Password?</SanctuaryText></TouchableOpacity>
                    </View>
                    <Controller
                      control={control}
                      name="password"
                      render={({ field: { onChange, value, onBlur } }) => (
                        <View style={[styles.inputBox, errors.password && styles.errorStroke]}>
                          <Lock size={18} color="#005AB5" style={{ marginRight: 12 }} />
                          <RNTextInput
                            placeholder="" // --- FIXED: Placeholder removed for privacy ---
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            style={styles.textInput}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                          />
                          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                             <SanctuaryText variant="label_lg" style={{ color: '#005AB5', fontWeight: '800' }}>
                               {showPassword ? t('login.hide') : t('login.show')}
                             </SanctuaryText>
                          </TouchableOpacity>
                        </View>
                      )}
                    />
                    {errors.password && <SanctuaryText variant="body_sm" style={styles.errMsg}>{errors.password.message}</SanctuaryText>}
                  </View>

                  {serverError && <SanctuaryText variant="body_sm" style={styles.serverAlert}>{serverError}</SanctuaryText>}

                  <PrimaryButton
                    label="Log In"
                    onPress={handleSubmit(onLoginSubmit)}
                    loading={isLoading}
                    style={styles.signInBtn}
                  />
               </View>

               <View style={styles.baseFooter}>
                  <SanctuaryText variant="body_sm" style={{color: '#BBB', marginTop: 40}}>
                    MSC-APP v1.2.1 • Encryption Secured
                  </SanctuaryText>
               </View>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: '#FFF' },
  flex1: { flex: 1 },
  scrollContent: { flexGrow: 1, backgroundColor: '#FFF' },
  heroWrapper: { height: height * 0.28, width: '100%' },
  heroImg: { width: '100%', height: '100%' },
  curvedOverlay: { position: 'absolute', bottom: 0, width: '100%', height: 32, backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  content: { flex: 1, paddingHorizontal: 32, backgroundColor: '#FFF', alignItems: 'center', marginTop: -15 },
  logoBadge: { marginBottom: 12 },
  logo: { width: 95, height: 95 },
  welcomeTitle: { fontSize: 28, fontFamily: 'Manrope_800ExtraBold', color: '#1A1C1E', marginBottom: 8 },
  welcomeSub: { color: '#666', marginBottom: 32 },
  form: { width: '100%' },
  fieldItem: { marginBottom: 20 },
  rowLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  fieldLabel: { color: '#1A1C1E', opacity: 0.8 },
  forgotPass: { color: '#005AB5', fontWeight: '800' },
  inputBox: { flexDirection: 'row', alignItems: 'center', height: 58, borderWidth: 1.5, borderColor: '#EAECF0', backgroundColor: '#FAFBFC', paddingHorizontal: 16, borderRadius: 8 },
  textInput: { flex: 1, fontSize: 16, color: '#1A1C1E' },
  errorStroke: { borderColor: '#BA1A1A' },
  errMsg: { color: '#BA1A1A', fontSize: 12, marginTop: 4 },
  serverAlert: { color: '#BA1A1A', textAlign: 'center', marginVertical: 16, fontWeight: '700' },
  signInBtn: { height: 60, borderRadius: 8, marginTop: 12 },
  baseFooter: { paddingBottom: 20, alignItems: 'center' },
});
