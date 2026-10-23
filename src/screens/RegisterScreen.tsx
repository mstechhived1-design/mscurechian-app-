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
  Modal,
  useWindowDimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import { 
  User, 
  Smartphone, 
  Mail, 
  Lock, 
  Shield, 
  ChevronLeft,
  ChevronDown,
  Check,
  Eye,
  EyeOff,
  Calendar,
  Upload,
  Camera,
  Scan,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  Users,
  X,
  Trash2,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import { checkImageClarity, extractTextFromAadhaar, parseAadhaarText } from '@/utils/aadhaarParser';
import { HONORIFIC_OPTION_ITEMS, getHospitalHonorificOptions, normalizeHonorific } from '@/utils/nameUtils';
import ImageCropperModal from '../components/ImageCropperModal';

const { width, height } = Dimensions.get('window');

// --- Proper HMS Validations (Synced with Backend Policy) ---
const registerSchema = z.object({
  name: z.string()
    .min(2, 'Name is too short')
    .max(50, 'Name is too long')
    .regex(/^[a-zA-Z\s.]+$/, 'Name can only contain letters'),
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

  const isSmallScreen = screenHeight < 720;
  const isMediumScreen = screenHeight >= 720 && screenHeight < 840;
  const defaultHeroHeight = Math.max(
    110,
    Math.min(
      Math.round(screenHeight * (isSmallScreen ? 0.17 : isMediumScreen ? 0.20 : 0.23)),
      205
    )
  );
  const heroHeight = isKeyboardVisible ? 0 : defaultHeroHeight;

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [dob, setDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');

  // Dynamic Honorific State (Matching MS CureChain Frontend)
  const [honorific, setHonorific] = useState<string>('Mr.');
  const [showHonorificModal, setShowHonorificModal] = useState(false);
  const [availableHonorifics, setAvailableHonorifics] = useState<string[]>([]);

  // Aadhaar OCR & Additional Patient Info State
  const [fatherName, setFatherName] = useState('');
  const [address, setAddress] = useState('');
  const [isScanningAadhaar, setIsScanningAadhaar] = useState(false);
  const [cropperUri, setCropperUri] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [aadhaarScanStatus, setAadhaarScanStatus] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    // Load dynamic honorific list from MS CureChain Frontend nameUtils
    const options = getHospitalHonorificOptions();
    if (options && options.length > 0) {
      setAvailableHonorifics(options);
    } else {
      setAvailableHonorifics(HONORIFIC_OPTION_ITEMS.map((item) => item.value));
    }
  }, []);

  const onDobChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      applyDobDate(selectedDate);
    }
  };

  const applyDobDate = (selectedDate: Date) => {
    setDob(selectedDate);
    const now = new Date();
    let age = now.getFullYear() - selectedDate.getFullYear();
    const m = now.getMonth() - selectedDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < selectedDate.getDate())) {
      age--;
    }
    setCalculatedAge(age >= 0 ? age : 0);
  };

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
    reset,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', mobile: '', email: '', password: '', confirmPassword: '', consent: false },
  });

  const handleClearAll = () => {
    reset({ name: '', mobile: '', email: '', password: '', confirmPassword: '', consent: false });
    setFatherName('');
    setAddress('');
    setDob(null);
    setCalculatedAge(null);
    setGender('Male');
    setHonorific('Mr.');
    setAadhaarScanStatus(null);
    setCropperUri(null);
  };

  const consentValue = watch('consent');

  // Process Aadhaar Card Image with OCR & QR Parse (Exactly matching Dhruva logic)
  const processAadhaarFile = async (asset: { uri: string; file?: any; type?: string | null }) => {
    try {
      setIsScanningAadhaar(true);
      setAadhaarScanStatus(null);

      // 1. Check Clarity & Blur (Canvas Edge Variance)
      const clarity = await checkImageClarity(asset.file || asset.uri);
      if (!clarity.isClear && clarity.warning) {
        Alert.alert('Blurry Image', clarity.warning);
        setAadhaarScanStatus({ type: 'warning', message: clarity.warning });
        setIsScanningAadhaar(false);
        return;
      }

      // 2. Perform OCR & QR Decode via Server-side processing
      const { text: rawText, qrData, extractedData } = await extractTextFromAadhaar(asset.file || asset.uri);
      if (!extractedData && (!rawText || rawText.trim().length < 15) && !qrData) {
        Alert.alert('Scan Failed', 'Could not detect readable text from document. Please ensure photo is clear and well-lit.');
        setAadhaarScanStatus({ type: 'error', message: 'Could not extract text. Ensure document is sharp and clear.' });
        setIsScanningAadhaar(false);
        return;
      }

      // 3. Parse Fields using server extracted data or fallback parser
      const parsed = extractedData || qrData || parseAadhaarText(rawText);

      let filledCount = 0;
      if (parsed.fullName) {
        setValue('name', parsed.fullName, { shouldValidate: true });
        filledCount++;
      }
      if (parsed.dob) {
        const parts = parsed.dob.split('-');
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
          const parsedDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          if (!isNaN(parsedDate.getTime())) {
            applyDobDate(parsedDate);
            filledCount++;
          }
        }
      }
      if (parsed.gender) {
        setGender(parsed.gender);
        // Sync honorific dynamically based on detected gender
        if (parsed.gender === 'Female') {
          setHonorific('Mrs.');
        } else if (parsed.gender === 'Male') {
          setHonorific('Mr.');
        }
        filledCount++;
      }
      if (parsed.fatherName) {
        setFatherName(parsed.fatherName);
        filledCount++;
      }
      if (parsed.phone) {
        setValue('mobile', parsed.phone, { shouldValidate: true });
        filledCount++;
      }
      if (parsed.address) {
        setAddress(parsed.address);
        filledCount++;
      }

      if (filledCount > 0) {
        setAadhaarScanStatus({
          type: 'success',
          message: `Aadhaar verified! ${filledCount} fields autofilled (Name, DOB, Gender, Father's Name & Address).`,
        });
      } else {
        setAadhaarScanStatus({
          type: 'warning',
          message: 'Details could not be fully identified. You can enter them manually.',
        });
      }
    } catch (err: any) {
      console.error('[Aadhaar OCR Error]:', err);
      Alert.alert('Document Scan Error', 'Failed to process document. Please ensure the image is clear or fill details manually.');
      setAadhaarScanStatus({ type: 'error', message: 'Failed to process document. Please upload a clear photo.' });
    } finally {
      setIsScanningAadhaar(false);
    }
  };

  // Upload Aadhaar from Gallery with Interactive Image Cropper (Dhruva Parity)
  const handlePickAadhaar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Don't restrict to system fixed crop; open our customizable cropper
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setCropperUri(result.assets[0].uri);
        setIsCropperOpen(true);
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  // Capture Aadhaar from Camera with Interactive Image Cropper (Dhruva Parity)
  const handleCameraAadhaar = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to take a photo of your Aadhaar card.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false, // Don't restrict to system fixed crop; open our customizable cropper
        quality: 1,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setCropperUri(result.assets[0].uri);
        setIsCropperOpen(true);
      }
    } catch (e) {
      console.warn('Camera error:', e);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setServerError(null);
    try {
      const resp = await apiClient.post(AUTH_ENDPOINTS.REGISTER || '/auth/register', {
        name: data.name.trim(),
        mobile: data.mobile.trim(),
        ...(data.email?.trim() ? { email: data.email.trim().toLowerCase() } : {}),
        password: data.password,
        role: 'patient',
        honorific: normalizeHonorific(honorific),
        gender: gender,
        fatherName: fatherName.trim(),
        address: address.trim(),
        consentGiven: true,
        platform: 'mobile',
        ...(dob ? { dob: dob.toISOString().split('T')[0], age: calculatedAge } : {}),
      });

      const { tokens, user } = resp.data;
      if (tokens?.accessToken) {
        await saveAuthTokens(tokens.accessToken, tokens.refreshToken);
      }

      if (Platform.OS === 'web') {
        navigation.replace('Dashboard' as any, { screen: 'Profile', params: { openEdit: true } });
      } else {
        Alert.alert(
          '✅ Welcome to MS CureChain',
          `Hey ${user?.name || 'there'}, your patient account has been successfully created.`,
          [{ text: 'Continue to Profile', onPress: () => navigation.replace('Dashboard' as any, { screen: 'Profile', params: { openEdit: true } }) }]
        );
      }
    } catch (e: any) {
      console.error('[RegisterScreen] Registration error:', e?.response?.data || e);
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Registration failed.';
      setServerError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsLoading(false);
    }
  };

  if (!fontsLoaded) return <DigitalAtriumLoader />;

  const renderScrollContent = () => (
    <ScrollView 
      ref={scrollViewRef}
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={Platform.OS === 'web'}
      bounces={false}
    >
      {/* Header / Back */}
      <TouchableOpacity style={styles.stickyBack} onPress={() => navigation.goBack()}>
        <ChevronLeft size={24} color="#1A1C1E" />
      </TouchableOpacity>

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
          source={require('../../assets/login_hero.jpg')} 
          style={styles.heroImg}
          resizeMode="cover"
        />
        <View style={styles.curvedOverlay} />
      </View>

      <View 
        style={[
          styles.content,
          isKeyboardVisible && { marginTop: 0, paddingTop: Math.max(insets.top, 10) }
        ]}
      >
        <SanctuaryText variant="headline_md" style={styles.mainTitle}>Create Account</SanctuaryText>
        <SanctuaryText variant="body_md" style={styles.subTitle}>
          Join the most trusted digital healthcare network.
        </SanctuaryText>

        {/* ── Aadhaar Card Auto-Fetch Banner (Dhruva Parity) ── */}
        <View style={styles.aadhaarCard}>
          <View style={styles.aadhaarHeader}>
            <View style={styles.aadhaarIconWrap}>
              <Sparkles size={16} color="#005AB5" />
            </View>
            <View style={{ flex: 1 }}>
              <SanctuaryText variant="label_md" style={styles.aadhaarTitle}>
                Instant Aadhaar Autofill
              </SanctuaryText>
              <SanctuaryText variant="body_sm" style={styles.aadhaarDesc}>
                Upload or scan Aadhaar to auto-fill patient details instantly.
              </SanctuaryText>
            </View>
            <TouchableOpacity 
              onPress={handleClearAll} 
              style={styles.clearMiniBtn}
              activeOpacity={0.7}
            >
              <Trash2 size={11} color="#DC2626" />
              <SanctuaryText style={styles.clearMiniBtnText}>Clear</SanctuaryText>
            </TouchableOpacity>
          </View>

          <View style={styles.aadhaarActions}>
            <TouchableOpacity 
              style={[styles.aadhaarBtn, styles.aadhaarBtnPrimary]} 
              onPress={handlePickAadhaar}
              disabled={isScanningAadhaar}
              activeOpacity={0.8}
            >
              <Upload size={14} color="#FFF" />
              <SanctuaryText variant="label_sm" style={styles.aadhaarBtnPrimaryTxt}>
                Upload Aadhaar
              </SanctuaryText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.aadhaarBtn, styles.aadhaarBtnSecondary]} 
              onPress={handleCameraAadhaar}
              disabled={isScanningAadhaar}
              activeOpacity={0.8}
            >
              <Camera size={14} color="#005AB5" />
              <SanctuaryText variant="label_sm" style={styles.aadhaarBtnSecondaryTxt}>
                Camera Scan
              </SanctuaryText>
            </TouchableOpacity>
          </View>

          {isScanningAadhaar && (
            <View style={styles.scanningIndicator}>
              <ActivityIndicator size="small" color="#005AB5" />
              <SanctuaryText variant="body_sm" style={styles.scanningText}>
                Analyzing Aadhaar with OCR & QR decode...
              </SanctuaryText>
            </View>
          )}

          {aadhaarScanStatus && (
            <View style={[
              styles.statusBanner,
              aadhaarScanStatus.type === 'success' && styles.statusSuccess,
              aadhaarScanStatus.type === 'warning' && styles.statusWarning,
              aadhaarScanStatus.type === 'error' && styles.statusError,
            ]}>
              {aadhaarScanStatus.type === 'success' && <CheckCircle2 size={14} color="#15803D" />}
              {aadhaarScanStatus.type !== 'success' && <AlertCircle size={14} color="#B45309" />}
              <SanctuaryText variant="body_sm" style={[
                styles.statusText,
                aadhaarScanStatus.type === 'success' && styles.statusSuccessText,
                aadhaarScanStatus.type !== 'success' && styles.statusWarningText,
              ]}>
                {aadhaarScanStatus.message}
              </SanctuaryText>
            </View>
          )}
        </View>

        <View style={styles.form}>
          {/* Honorific & Full Name */}
          <View style={styles.fieldItem}>
            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>Honorific & Full Name</SanctuaryText>
            <View style={styles.nameRow}>
              {/* Dynamic Honorific Dropdown Button */}
              <TouchableOpacity
                style={styles.honorificBox}
                onPress={() => setShowHonorificModal(true)}
                activeOpacity={0.8}
              >
                <SanctuaryText variant="label_md" style={styles.honorificText}>
                  {honorific}
                </SanctuaryText>
                <ChevronDown size={14} color="#005AB5" />
              </TouchableOpacity>

              {/* Name Input */}
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.inputBox, styles.flexNameInput, errors.name && styles.errorStroke]}>
                    <User size={16} color="#005AB5" style={styles.iconSp} />
                    <RNTextInput
                      value={value}
                      onChangeText={onChange}
                      style={styles.textInput}
                      placeholder="e.g. Rahul Verma"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                )}
              />
            </View>
            {errors.name && <SanctuaryText variant="body_sm" style={styles.errMsg}>{errors.name.message}</SanctuaryText>}
          </View>

          {/* Father's / Guardian Name */}
          <View style={styles.fieldItem}>
            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>Father's / Guardian's Name</SanctuaryText>
            <View style={styles.inputBox}>
              <Users size={16} color="#005AB5" style={styles.iconSp} />
              <RNTextInput
                value={fatherName}
                onChangeText={setFatherName}
                style={styles.textInput}
                placeholder="e.g. Ramesh Verma"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Date of Birth and Gender in the SAME ROW */}
          <View style={styles.twoColRow}>
            {/* Left Col: Date of Birth */}
            <View style={styles.colLeft}>
              <View style={styles.colLabelRow}>
                <SanctuaryText variant="label_sm" style={styles.fieldLabel}>Date of Birth</SanctuaryText>
                {calculatedAge !== null && (
                  <SanctuaryText variant="label_sm" style={styles.ageBadge}>
                    {calculatedAge}y
                  </SanctuaryText>
                )}
              </View>
              <TouchableOpacity
                style={styles.inputBox}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Calendar size={16} color="#005AB5" style={styles.iconSp} />
                <SanctuaryText 
                  variant="body_sm" 
                  style={{ color: dob ? '#1A1C1E' : '#94A3B8', fontSize: 13, flex: 1 }}
                  numberOfLines={1}
                >
                  {dob ? dob.toLocaleDateString('en-GB') : 'DD/MM/YYYY'}
                </SanctuaryText>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dob || new Date(2000, 0, 1)}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={onDobChange}
                />
              )}
            </View>

            {/* Right Col: Gender */}
            <View style={styles.colRight}>
              <SanctuaryText variant="label_sm" style={styles.fieldLabel}>Gender</SanctuaryText>
              <View style={styles.compactGenderRow}>
                {(['Male', 'Female', 'Other'] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.compactGenderBtn,
                      gender === g && styles.compactGenderBtnActive,
                    ]}
                    onPress={() => {
                      setGender(g);
                      if (g === 'Male' && honorific === 'Mrs.') setHonorific('Mr.');
                      if (g === 'Female' && honorific === 'Mr.') setHonorific('Mrs.');
                    }}
                    activeOpacity={0.7}
                  >
                    <SanctuaryText
                      variant="label_sm"
                      style={[
                        styles.compactGenderText,
                        gender === g && styles.compactGenderTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {g}
                    </SanctuaryText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Residential Address (from Aadhaar) */}
          <View style={styles.fieldItem}>
            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>Residential Address & PIN</SanctuaryText>
            <View style={[styles.inputBox, styles.addressInputBox]}>
              <MapPin size={16} color="#005AB5" style={[styles.iconSp, { marginTop: 2 }]} />
              <RNTextInput
                value={address}
                onChangeText={setAddress}
                style={[styles.textInput, styles.addressTextInput]}
                placeholder="House No, Street, City, State - PIN"
                placeholderTextColor="#94A3B8"
                multiline
              />
            </View>
          </View>

          {/* Mobile Number */}
          <View style={styles.fieldItem}>
            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>Mobile Number</SanctuaryText>
            <Controller
              control={control}
              name="mobile"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputBox, errors.mobile && styles.errorStroke]}>
                  <Smartphone size={16} color="#005AB5" style={styles.iconSp} />
                  <RNTextInput
                    value={value}
                    onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
                    style={styles.textInput}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#94A3B8"
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
            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>Email Address (Optional)</SanctuaryText>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputBox, errors.email && styles.errorStroke]}>
                  <Mail size={16} color="#005AB5" style={styles.iconSp} />
                  <RNTextInput
                    value={value}
                    onChangeText={onChange}
                    style={styles.textInput}
                    placeholder="name@example.com"
                    placeholderTextColor="#94A3B8"
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
            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>Password</SanctuaryText>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputBox, errors.password && styles.errorStroke]}>
                  <Lock size={16} color="#005AB5" style={styles.iconSp} />
                  <RNTextInput
                    value={value}
                    onChangeText={onChange}
                    style={styles.textInput}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPass}
                  />
                  <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                    {showPass ? <EyeOff size={18} color="#005AB5" /> : <Eye size={18} color="#94A3B8" />}
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.password && <SanctuaryText variant="body_sm" style={styles.errMsg}>{errors.password.message}</SanctuaryText>}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldItem}>
            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>Confirm Password</SanctuaryText>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.inputBox, errors.confirmPassword && styles.errorStroke]}>
                  <Shield size={16} color="#005AB5" style={styles.iconSp} />
                  <RNTextInput
                    value={value}
                    onChangeText={onChange}
                    style={styles.textInput}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showConfirm}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                    {showConfirm ? <EyeOff size={18} color="#005AB5" /> : <Eye size={18} color="#94A3B8" />}
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

      {/* ── Dynamic Honorific Picker Modal ── */}
      <Modal
        visible={showHonorificModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHonorificModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowHonorificModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <SanctuaryText variant="headline_sm" style={styles.modalTitle}>
                Select Honorific
              </SanctuaryText>
              <TouchableOpacity onPress={() => setShowHonorificModal(false)}>
                <X size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <View style={styles.modalGrid}>
                {availableHonorifics.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.modalOptionBtn,
                      honorific === item && styles.modalOptionBtnActive,
                    ]}
                    onPress={() => {
                      setHonorific(item);
                      setShowHonorificModal(false);
                    }}
                  >
                    <SanctuaryText
                      variant="label_md"
                      style={[
                        styles.modalOptionTxt,
                        honorific === item && styles.modalOptionTxtActive,
                      ]}
                    >
                      {item}
                    </SanctuaryText>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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

      {/* Customizable Dynamic Image Cropper (Dhruva Parity) */}
      <ImageCropperModal
        imageUri={cropperUri}
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        onCropComplete={async (croppedUri) => {
          setIsCropperOpen(false);
          await processAadhaarFile({ uri: croppedUri });
        }}
        onChangeImage={() => {
          setIsCropperOpen(false);
          handlePickAadhaar();
        }}
      />
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
  stickyBack: { position: 'absolute', top: 16, left: 16, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  heroWrapper: { width: '100%', overflow: 'hidden' },
  heroImg: { width: '100%', height: '100%' },
  curvedOverlay: { position: 'absolute', bottom: 0, width: '100%', height: 24, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  content: { flex: 1, paddingHorizontal: 20, backgroundColor: '#FFF', marginTop: -10 },
  mainTitle: { fontSize: 22, fontFamily: 'Manrope_800ExtraBold', color: '#1A1C1E', marginBottom: 2 },
  subTitle: { color: '#666', marginBottom: 12, fontSize: 12 },
  
  // Aadhaar Auto-Fetch Card (Compact)
  aadhaarCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#BAE0FD',
    padding: 12,
    marginBottom: 14,
  },
  aadhaarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  clearMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  clearMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  aadhaarIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#E0F0FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aadhaarTitle: {
    fontSize: 13,
    color: '#00356B',
    fontWeight: '800',
    marginBottom: 1,
  },
  aadhaarDesc: {
    fontSize: 11,
    color: '#3B6A99',
    lineHeight: 14,
  },
  aadhaarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  aadhaarBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  aadhaarBtnPrimary: {
    backgroundColor: '#005AB5',
  },
  aadhaarBtnPrimaryTxt: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 11,
  },
  aadhaarBtnSecondary: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#005AB5',
  },
  aadhaarBtnSecondaryTxt: {
    color: '#005AB5',
    fontWeight: '700',
    fontSize: 11,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#BAE0FD',
  },
  scanningText: {
    color: '#005AB5',
    fontSize: 11,
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusSuccess: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  statusWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  statusError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  statusText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  statusSuccessText: {
    color: '#15803D',
  },
  statusWarningText: {
    color: '#B45309',
  },

  form: { width: '100%' },
  fieldItem: { marginBottom: 11 },
  fieldLabel: { color: '#1A1C1E', opacity: 0.85, marginBottom: 5, fontSize: 11, fontWeight: '700' },
  
  // Two Column Row for Date of Birth & Gender in SAME ROW
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 11,
    alignItems: 'flex-start',
  },
  colLeft: {
    flex: 1.1,
  },
  colRight: {
    flex: 1.25,
  },
  colLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ageBadge: {
    color: '#005AB5',
    fontWeight: '800',
    fontSize: 11,
  },
  compactGenderRow: {
    flexDirection: 'row',
    height: 46,
    backgroundColor: '#FAFBFC',
    borderWidth: 1.5,
    borderColor: '#EAECF0',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  compactGenderBtn: {
    flex: 1,
    height: '100%',
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactGenderBtnActive: {
    backgroundColor: '#005AB5',
  },
  compactGenderText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  compactGenderTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },

  // Name row with honorific
  nameRow: {
    flexDirection: 'row',
    gap: 8,
  },
  honorificBox: {
    width: 76,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#EAECF0',
    backgroundColor: '#FAFBFC',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  honorificText: {
    fontSize: 14,
    color: '#005AB5',
    fontWeight: '800',
  },
  flexNameInput: {
    flex: 1,
  },

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
  addressInputBox: {
    height: 56,
    alignItems: 'flex-start',
    paddingTop: 8,
    paddingBottom: 8,
  },
  addressTextInput: {
    height: 40,
    textAlignVertical: 'top',
    fontSize: 12,
    lineHeight: 16,
  },
  iconSp: { marginRight: 8 },
  textInput: { 
    flex: 1, 
    fontSize: 13, 
    color: '#1A1C1E', 
    fontWeight: '500',
    height: '100%',
    minHeight: 40,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  eyeBtn: { padding: 6, marginLeft: 2 },
  errorStroke: { borderColor: '#BA1A1A' },
  errMsg: { color: '#BA1A1A', fontSize: 10, marginTop: 2, fontWeight: '600' },
  serverAlert: { color: '#BA1A1A', textAlign: 'center', marginBottom: 10, fontWeight: '700', fontSize: 12 },
  submitBtn: { height: 48, borderRadius: 10, marginTop: 6 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 10 },
  checkOuter: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#EAECF0', backgroundColor: '#FAFBFC', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  checkActive: { backgroundColor: '#005AB5', borderColor: '#005AB5' },
  consentTxtBlock: { flex: 1, marginLeft: 10 },
  consentBase: { color: '#666', fontSize: 11, lineHeight: 16 },
  legalLink: { color: '#005AB5', fontWeight: '800' },
  loginHintRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 14, paddingBottom: 24 },
  loginLink: { color: '#005AB5', fontWeight: '800' },

  // Modal styles for Honorific Selector
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1C1E',
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalOptionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EAECF0',
    backgroundColor: '#FAFBFC',
  },
  modalOptionBtnActive: {
    borderColor: '#005AB5',
    backgroundColor: '#005AB5',
  },
  modalOptionTxt: {
    color: '#1A1C1E',
    fontWeight: '700',
    fontSize: 13,
  },
  modalOptionTxtActive: {
    color: '#FFF',
  },
});
