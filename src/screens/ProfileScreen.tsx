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
  Linking,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  Text,
  Card,
  IconButton,
  Surface,
  Divider,
  Button,
  TextInput as PaperInput,
} from 'react-native-paper';
import {
  User,
  Phone,
  Activity,
  FileText,
  Droplets,
  LogOut,
  Edit3,
  Mail,
  MapPin,
  Heart,
  QrCode,
  Shield,
  ShieldCheck,
  PhoneCall,
  Camera,
  Upload,
  Check,
  Sparkles,
  ShieldAlert,
  FingerprintPattern,
  ScanFace,
  Lock,
  Users,
  ChevronRight,
  HelpCircle,
  CreditCard,
  Clock,
  Globe,
  Info,
  CheckCircle2,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { familyService } from '@/services/familyService';

import { apiClient, PATIENT_ENDPOINTS, clearAuthTokens, getAccessToken } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import LanguageSelector from '@/components/LanguageSelector';
import { DigitalAtriumLoader } from '@/components/SanctuaryComponents';
import GlassModal from '@/components/GlassModal';
import ImageCropperModal from '../components/ImageCropperModal';
import {
  checkBiometricAvailability,
  isBiometricLoginEnabled,
  enableBiometricLogin,
  disableBiometricLogin,
  BiometricStatus,
} from '@/services/biometricService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PRESET_AVATARS = [
  { id: 'av_1', emoji: '🧑‍⚕️', label: 'Medic', bg: '#EFF6FF', border: '#93C5FD' },
  { id: 'av_2', emoji: '🏃‍♂️', label: 'Active', bg: '#ECFDF5', border: '#6EE7B7' },
  { id: 'av_3', emoji: '🧘‍♀️', label: 'Zen', bg: '#F5F3FF', border: '#C4B5FD' },
  { id: 'av_4', emoji: '🛡️', label: 'Immune', bg: '#FEF3C7', border: '#FCD34D' },
  { id: 'av_5', emoji: '🌟', label: 'Champion', bg: '#FFF1F2', border: '#FDA4AF' },
  { id: 'av_6', emoji: '🧬', label: 'Bio', bg: '#E0F2FE', border: '#7DD3FC' },
  { id: 'av_7', emoji: '🌿', label: 'Natural', bg: '#F0FDF4', border: '#86EFAC' },
  { id: 'av_8', emoji: '⚡', label: 'Vital', bg: '#FEF9C3', border: '#FDE047' },
];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  // Avatar & Image Cropper State
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [cropperUri, setCropperUri] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  // Transient file-info shown briefly inside avatar modal before cropper opens
  const [pendingFileInfo, setPendingFileInfo] = useState<{
    name: string;
    size: string;
  } | null>(null);

  useEffect(() => {
    if (route.params?.openEdit) {
      setEditModalVisible(true);
    }
  }, [route.params?.openEdit]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('patient_profile_avatar');
        if (saved) setSelectedAvatar(saved);
      } catch (e) {
        console.warn('Could not read saved avatar:', e);
      }
    })();
  }, []);

  const handleSelectPreset = async (avatarId: string) => {
    setSelectedAvatar(avatarId);
    await AsyncStorage.setItem('patient_profile_avatar', avatarId);
    setAvatarModalVisible(false);
  };

  // Image Selection with <= 5MB Validation & Cropper Launch
  const processSelectedImage = (asset: ImagePicker.ImagePickerAsset) => {
    // Validate: must be less than 5MB
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('File Size Exceeded', 'Please choose a file below 5MB.');
      return;
    }

    // Build brief file info
    const bytes = asset.fileSize || 0;
    const sizeLabel =
      bytes > 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.round(bytes / 1024)} KB`;
    const fileName = asset.uri.split('/').pop() || 'image';

    // Show file info briefly inside the avatar modal, then open cropper
    setPendingFileInfo({ name: fileName, size: sizeLabel });
    setTimeout(() => {
      setPendingFileInfo(null);
      setAvatarModalVisible(false);
      setCropperUri(asset.uri);
      setIsCropperOpen(true);
    }, 2000);
  };

  const handlePickFromGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Cropping handled by our integrated ImageCropperModal
        quality: 1,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        processSelectedImage(res.assets[0]);
      }
    } catch (e: any) {
      Alert.alert('Notice', 'Could not open photo library: ' + e.message);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: false, // Cropping handled by our integrated ImageCropperModal
        quality: 1,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        processSelectedImage(res.assets[0]);
      }
    } catch (e: any) {
      Alert.alert('Notice', 'Could not open camera: ' + e.message);
    }
  };

  // On Crop Complete: Compress & Save to Database
  const handleCropComplete = async (croppedUri: string) => {
    setIsCropperOpen(false);
    setIsPhotoUploading(true);

    try {
      // Manipulate image to square profile dimensions
      const manipResult = await ImageManipulator.manipulateAsync(
        croppedUri,
        [{ resize: { width: 480, height: 480 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const base64Data = manipResult.base64 ? `data:image/jpeg;base64,${manipResult.base64}` : croppedUri;
      const finalUri = manipResult.uri || croppedUri;

      // Update local storage and component state immediately
      setSelectedAvatar(finalUri);
      await AsyncStorage.setItem('patient_profile_avatar', finalUri);

      if (profile?.user) {
        setProfile((prev: any) => ({
          ...prev,
          user: {
            ...prev?.user,
            avatar: finalUri,
          },
        }));
      }

      // Persist avatar to MongoDB backend
      await apiClient.patch(PATIENT_ENDPOINTS.UPDATE_PROFILE, {
        avatar: base64Data,
      });

      Alert.alert('Success', 'Profile photo updated and saved to your account!');
      fetchProfile();
    } catch (err: any) {
      console.error('Photo upload failed:', err);
      Alert.alert('Upload Error', err?.response?.data?.message || err?.message || 'Could not update profile photo');
    } finally {
      setIsPhotoUploading(false);
    }
  };

  // Edit Form Fields
  const [editData, setEditData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    fatherName: '',
    bloodGroup: '',
    allergies: '',
    gender: '',
    height: '',
    weight: '',
    age: '',
    dob: '',
    conditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
  });

  const BLOOD_GROUPS = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const [bloodModalVisible, setBloodModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const d = selectedDate.getDate().toString().padStart(2, '0');
      const m = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const y = selectedDate.getFullYear();
      setEditData({ ...editData, dob: `${d}-${m}-${y}` });
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get(PATIENT_ENDPOINTS.PROFILE);
      const data = response.data;
      setProfile(data);

      if (data?.user?.avatar && !selectedAvatar) {
        setSelectedAvatar(data.user.avatar);
      }

      // Initialize edit form
      setEditData({
        name: data.user?.name || '',
        mobile: data.user?.mobile || '',
        email: data.user?.email || '',
        address: data.user?.address || data.address || '',
        fatherName: data.user?.fatherName || data.user?.GuardianName || data.GuardianName || data.fatherName || '',
        bloodGroup: data.user?.bloodGroup || data.bloodGroup || '',
        allergies: data.user?.allergies || data.allergies || '',
        gender: data.user?.gender || data.gender || '',
        height: String(data.user?.height || data.height || ''),
        weight: String(data.user?.weight || data.weight || ''),
        age: String(data.user?.age || data.age || ''),
        dob: (() => {
          const rawDob = data.user?.dateOfBirth || data.user?.dob || data.dob;
          if (!rawDob) return '';
          if (typeof rawDob === 'string' && rawDob.includes('-') && rawDob.length === 10) {
            const parts = rawDob.split('-');
            if (parts[0].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
            return rawDob;
          }
          const d = new Date(rawDob);
          if (isNaN(d.getTime())) return typeof rawDob === 'string' ? rawDob : '';
          const cell = (n: number) => String(n).padStart(2, '0');
          return `${cell(d.getUTCDate())}-${cell(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
        })(),
        conditions: data.user?.conditions || data.conditions || '',
        emergencyContactName: data.user?.emergencyContactName || data.emergencyContactName || '',
        emergencyContactPhone: data.user?.emergencyContactPhone || data.emergencyContactPhone || '',
        emergencyContactRelation: data.user?.emergencyContactRelation || data.emergencyContactRelation || '',
      });
    } catch (err) {
      console.error('Fetch Profile Error:', err);
      Alert.alert('Error', 'Could not load your medical profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Biometric Authentication State
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>({
    isAvailable: false,
    hasHardware: false,
    isEnrolled: false,
    biometricType: 'None',
    label: 'Biometrics',
  });
  const [biometricToggling, setBiometricToggling] = useState(false);

  const loadBiometricSettings = async () => {
    try {
      const status = await checkBiometricAvailability();
      setBiometricStatus(status);
      const enabled = await isBiometricLoginEnabled();
      setBiometricEnabled(enabled);
    } catch (e) {
      console.warn('[ProfileScreen] Biometric check failed:', e);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (biometricToggling) return;
    setBiometricToggling(true);
    try {
      if (value) {
        const token = (await getAccessToken()) || '';
        const success = await enableBiometricLogin({
          accessToken: token,
          identifier: profile?.user?.mobile || profile?.mobile || '',
        });
        if (success) {
          setBiometricEnabled(true);
          Alert.alert(
            'Biometric Lock Enabled',
            `You can now use ${biometricStatus.label} to log in without retyping your password.`
          );
        } else {
          setBiometricEnabled(false);
          Alert.alert(
            'Verification Failed',
            `Could not authenticate with ${biometricStatus.label}. Biometric unlock was not enabled.`
          );
        }
      } else {
        await disableBiometricLogin();
        setBiometricEnabled(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not change biometric settings');
    } finally {
      setBiometricToggling(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    loadBiometricSettings();

    const unsub = familyService.onProfileChange(() => {
      fetchProfile();
    });
    return () => unsub();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
    loadBiometricSettings();
  };

  const handleUpdate = async () => {
    const dobRegex = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;
    const phoneRegex = /^\d{10}$/;

    if (editData.dob && !dobRegex.test(editData.dob)) {
      Alert.alert('Invalid Date', 'Date should be DD-MM-YYYY or DD/MM/YYYY');
      return;
    }

    if (editData.emergencyContactPhone && !phoneRegex.test(editData.emergencyContactPhone)) {
      Alert.alert('Invalid Phone', 'Emergency phone should be 10 digits');
      return;
    }

    try {
      setLoading(true);
      let formattedDob = editData.dob;
      if (editData.dob && dobRegex.test(editData.dob)) {
        const parts = editData.dob.split(/[-/]/);
        const [d, m, y] = parts;
        formattedDob = `${y}-${m}-${d}`;
      }

      const updatePayload = {
        ...editData,
        dob: formattedDob,
        height: editData.height ? Number(editData.height) : undefined,
        weight: editData.weight ? Number(editData.weight) : undefined,
        age: editData.age ? Number(editData.age) : undefined,
      };
      await apiClient.patch(PATIENT_ENDPOINTS.UPDATE_PROFILE, updatePayload);
      Alert.alert('Success', 'Profile updated successfully');
      setEditModalVisible(false);
      fetchProfile();
    } catch (err: any) {
      console.error('Update Error:', err);
      Alert.alert('Update Failed', err.response?.data?.message || err.message || 'Could not update profile.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      await clearAuthTokens();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to log out?') : true;
      if (confirmed) {
        await doLogout();
      }
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to exit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: doLogout,
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAccount = () => {
    const doDelete = async () => {
      try {
        setLoading(true);
        const response = await apiClient.delete(PATIENT_ENDPOINTS.DELETE_ACCOUNT);
        if (response.data.success) {
          await AsyncStorage.clear();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
      } catch (err: any) {
        console.error('Delete Account Error:', err);
        const msg = err.response?.data?.message || 'Could not delete account. Please contact support.';
        Alert.alert('Deletion Failed', msg);
      } finally {
        setLoading(false);
      }
    };

    Alert.alert(
      'Delete Account Permanently',
      'Are you absolutely sure? This action is permanent and will delete your identity, clinical profile, and all medical records.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Permanently', onPress: doDelete, style: 'destructive' },
      ],
      { cancelable: true }
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#006AF5" />
      </View>
    );
  }

  // Active avatar display resolution
  const displayAvatar =
    selectedAvatar ||
    profile?.user?.avatar ||
    profile?.avatar ||
    profile?.profilePic ||
    profile?.user?.profilePic ||
    null;

  const selectedPreset = PRESET_AVATARS.find((p) => p.id === displayAvatar);
  const isCustomPhoto =
    displayAvatar &&
    (displayAvatar.startsWith('file:') ||
      displayAvatar.startsWith('http') ||
      displayAvatar.startsWith('data:'));

  const patientFullName = (profile?.user?.name || profile?.fullName || 'Tutipati Anand Kumar').toUpperCase();
  const patientMobile = profile?.user?.mobile || profile?.mobile || '8328470402';
  const patientMRN = profile?.mrn || 'HHO620000153';

  return (
    <View style={styles.container}>
      {/* ── Top Header: Clean Rapido Style ── */}
      <View style={styles.rapidoHeader}>
        <Text style={styles.rapidoHeaderTitle}>Profile</Text>
        <View style={styles.headerRightActions}>
          <LanguageSelector />
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.headerLogoutBtn}
            accessibilityLabel="Logout"
            activeOpacity={0.7}
          >
            <LogOut size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006AF5']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Rapido Top Profile Card ── */}
        <View style={styles.rapidoProfileCard}>
          {/* Top Row: Avatar + Name + Phone + Chevron */}
          <TouchableOpacity
            style={styles.rapidoUserRow}
            onPress={() => setEditModalVisible(true)}
            activeOpacity={0.8}
          >
            {/* Avatar with Camera badge */}
            <TouchableOpacity
              onPress={() => setAvatarModalVisible(true)}
              style={styles.rapidoAvatarWrap}
              activeOpacity={0.85}
            >
              {isCustomPhoto ? (
                <Image source={{ uri: displayAvatar! }} style={styles.rapidoAvatarImg} />
              ) : selectedPreset ? (
                <View style={[styles.rapidoAvatarPreset, { backgroundColor: selectedPreset.bg }]}>
                  <Text style={styles.rapidoAvatarEmoji}>{selectedPreset.emoji}</Text>
                </View>
              ) : (
                <View style={styles.rapidoAvatarPlaceholder}>
                  <User size={30} color="#006AF5" />
                </View>
              )}
              <View style={styles.rapidoCameraBadge}>
                {isPhotoUploading ? (
                  <ActivityIndicator size={10} color="#FFFFFF" />
                ) : (
                  <Camera size={11} color="#FFFFFF" strokeWidth={2.5} />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.rapidoUserMeta}>
              <Text style={styles.rapidoUserName} numberOfLines={1}>
                {patientFullName}
              </Text>
              <Text style={styles.rapidoUserPhone}>{patientMobile}</Text>
            </View>

            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.rapidoDivider} />

          {/* MRN Row only */}
          <TouchableOpacity
            style={styles.rapidoRatingRow}
            onPress={() => setQrModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.rapidoRatingLeft}>
              <Text style={styles.rapidoRatingSub}>MRN: #{patientMRN}</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* File info box removed — shown transiently inside avatar modal only */}

        {/* ── 2. Rapido Categorized Menu Items List ── */}
        <View style={styles.rapidoMenuList}>
          {/* Help */}
          <TouchableOpacity
            style={styles.rapidoMenuItem}
            onPress={() => navigation.navigate('Chat')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <HelpCircle size={22} color="#4B5563" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Help & Support</Text>
              </View>
            </View>
            <ChevronRight size={19} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Payment */}
          <TouchableOpacity
            style={styles.rapidoMenuItem}
            onPress={() => navigation.navigate('Payments')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <CreditCard size={22} color="#4B5563" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Payment & Billing History</Text>
              </View>
            </View>
            <ChevronRight size={19} color="#9CA3AF" />
          </TouchableOpacity>

          {/* My Visits (Parity with 'My Rides') */}
          <TouchableOpacity
            style={styles.rapidoMenuItem}
            onPress={() => navigation.navigate('Appointments')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Clock size={22} color="#4B5563" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>My Visits & Appointments</Text>
              </View>
            </View>
            <ChevronRight size={19} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Safety */}
          <TouchableOpacity
            style={styles.rapidoMenuItem}
            onPress={() => navigation.navigate('EmergencyMedicalId')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <ShieldCheck size={22} color="#4B5563" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Safety & Emergency Contacts</Text>
              </View>
            </View>
            <ChevronRight size={19} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Family Profiles */}
          <TouchableOpacity
            style={styles.rapidoMenuItem}
            onPress={() => navigation.navigate('FamilyMembers')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Users size={22} color="#4B5563" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Family Profiles & Dependents</Text>
                <Text style={styles.menuItemSub}>Switch or add family members</Text>
              </View>
            </View>
            <ChevronRight size={19} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Medical Records */}
          <TouchableOpacity
            style={styles.rapidoMenuItem}
            onPress={() => navigation.navigate('HealthRecords')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <FileText size={22} color="#4B5563" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Medical Records & Prescriptions</Text>
              </View>
            </View>
            <ChevronRight size={19} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Offline Medical Vault */}
          <TouchableOpacity
            style={styles.rapidoMenuItem}
            onPress={() => navigation.navigate('OfflineVault')}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                <Lock size={22} color="#4B5563" />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>Offline Medical Vault</Text>
                <Text style={styles.menuItemSub}>Zero-signal emergency access</Text>
              </View>
            </View>
            <ChevronRight size={19} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Biometric Security */}
          <View style={styles.rapidoMenuItem}>
            <View style={styles.menuItemLeft}>
              <View style={styles.menuIconWrap}>
                {biometricStatus.biometricType === 'FaceID' ? (
                  <ScanFace size={22} color="#4B5563" />
                ) : (
                  <FingerprintPattern size={22} color="#4B5563" />
                )}
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuItemTitle}>
                  {biometricStatus.label || 'Biometric Quick Unlock'}
                </Text>
                <Text style={styles.menuItemSub}>
                  {biometricEnabled ? 'Active 1-tap authentication' : 'Instant biometric access'}
                </Text>
              </View>
            </View>
            {biometricToggling ? (
              <ActivityIndicator size="small" color="#006AF5" />
            ) : (
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                disabled={!biometricStatus.hasHardware && !biometricEnabled}
                trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                thumbColor={biometricEnabled ? '#006AF5' : '#F1F5F9'}
              />
            )}
          </View>
        </View>

        {/* ── Logout Button ── */}
        <TouchableOpacity
          style={styles.rapidoLogoutRow}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={20} color="#DC2626" />
          <Text style={styles.rapidoLogoutTxt}>Log Out</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity
          style={styles.deleteLink}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteLinkTxt}>Delete Account Permanently</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Exact Image Cropper Modal (Parity with Doctor/Nurse Portals) ── */}
      <ImageCropperModal
        imageUri={cropperUri}
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        onCropComplete={handleCropComplete}
        onChangeImage={handlePickFromGallery}
      />

      {/* ── Avatar Picker Modal (Gallery, Camera & Presets) ── */}
      <GlassModal
        visible={avatarModalVisible}
        onDismiss={() => setAvatarModalVisible(false)}
        contentContainerStyle={{ width: '92%', maxWidth: 420, maxHeight: '82%', borderRadius: 28, padding: 0 }}
      >
        <Surface style={styles.avatarModalContent}>
          <View style={styles.avatarModalHeader}>
            <View>
              <Text variant="titleMedium" style={styles.avatarModalTitle}>Change Profile Picture</Text>
              <Text variant="bodySmall" style={styles.avatarModalSub}>Upload photo (Max 5MB) or select persona</Text>
            </View>
            <IconButton icon="close" size={20} onPress={() => { setAvatarModalVisible(false); setPendingFileInfo(null); }} />
          </View>

          {/* 5MB hint banner — shown when no file is selected yet */}
          {!pendingFileInfo && (
            <View style={styles.fileSizeHintBox}>
              <Info size={14} color="#2563EB" />
              <Text style={styles.fileSizeHintTxt}>Please upload images less than 5MB</Text>
            </View>
          )}

          {/* Transient file info — shown briefly after file is selected, before cropper opens */}
          {pendingFileInfo && (
            <View style={styles.pendingFileInfoBox}>
              <CheckCircle2 size={15} color="#16A34A" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.pendingFileName} numberOfLines={1}>{pendingFileInfo.name}</Text>
                <Text style={styles.pendingFileSize}>{pendingFileInfo.size} · Opening cropper…</Text>
              </View>
            </View>
          )}

          {/* Custom Photo Upload Actions with Cropper */}
          <View style={styles.photoActionsBox}>
            <TouchableOpacity
              style={styles.photoActionBtn}
              onPress={handlePickFromGallery}
              activeOpacity={0.8}
            >
              <Upload size={18} color="#006AF5" />
              <Text style={styles.photoActionTxt}>Gallery (Crop & Resize)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.photoActionBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
              onPress={handleTakePhoto}
              activeOpacity={0.8}
            >
              <Camera size={18} color="#059669" />
              <Text style={[styles.photoActionTxt, { color: '#059669' }]}>Take Photo</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.presetSectionLabel}>HEALTHCARE PERSONAS</Text>
          <View style={styles.presetsGrid}>
            {PRESET_AVATARS.map((av) => {
              const isSelected = selectedAvatar === av.id;
              return (
                <TouchableOpacity
                  key={av.id}
                  style={[
                    styles.presetCard,
                    { backgroundColor: av.bg, borderColor: isSelected ? '#006AF5' : av.border },
                    isSelected && styles.presetCardSelected,
                  ]}
                  onPress={() => handleSelectPreset(av.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetEmoji}>{av.emoji}</Text>
                  <Text style={[styles.presetLabel, isSelected && { color: '#006AF5', fontWeight: 'bold' }]}>
                    {av.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.presetCheck}>
                      <Check size={10} color="#FFF" strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Surface>
      </GlassModal>

      {/* ── Edit Profile Modal (Identity & Bio) ── */}
      <GlassModal
        visible={editModalVisible}
        onDismiss={() => setEditModalVisible(false)}
        contentContainerStyle={{
          width: '92%',
          maxWidth: 440,
          height: Math.min(SCREEN_HEIGHT * 0.85, 680),
          borderRadius: 24,
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
        }}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={styles.modalTitle}>{t('profile.updateProfile')}</Text>
            <IconButton icon="close" onPress={() => setEditModalVisible(false)} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <PaperInput
              label="Full Name"
              value={editData.name}
              onChangeText={(t) => setEditData({ ...editData, name: t })}
              mode="outlined"
              style={styles.input}
            />
            <PaperInput
              label="Father's / Guardian's Name"
              value={editData.fatherName}
              onChangeText={(t) => setEditData({ ...editData, fatherName: t })}
              mode="outlined"
              style={styles.input}
            />

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8, marginLeft: 2 }}>
                Gender
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {['Male', 'Female', 'Other'].map((g) => {
                  const isSelected = editData.gender?.toLowerCase() === g.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={g}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        backgroundColor: isSelected ? '#006AF5' : '#F8FAFC',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#006AF5' : '#E2E8F0',
                      }}
                      onPress={() => setEditData({ ...editData, gender: g })}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontWeight: '800', fontSize: 14, color: isSelected ? '#FFFFFF' : '#475569' }}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <PaperInput
              label="Birth Date (DD-MM-YYYY)"
              value={editData.dob}
              onChangeText={(t) => setEditData({ ...editData, dob: t })}
              mode="outlined"
              style={styles.input}
              right={<PaperInput.Icon icon="calendar" onPress={() => setShowDatePicker(true)} />}
            />

            {showDatePicker && (
              <DateTimePicker
                value={(() => {
                  if (editData.dob) {
                    const parts = editData.dob.split(/[-/]/);
                    if (parts.length === 3) {
                      const d = parseInt(parts[0]);
                      const m = parseInt(parts[1]) - 1;
                      const y = parseInt(parts[2]);
                      const date = new Date(y, m, d);
                      if (!isNaN(date.getTime())) return date;
                    }
                  }
                  return new Date();
                })()}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}

            <View style={[styles.row, { marginBottom: 16 }]}>
              <PaperInput
                label="Age"
                value={editData.age}
                onChangeText={(t) => setEditData({ ...editData, age: t })}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]}
              />
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 56,
                  borderWidth: 1,
                  borderColor: '#ccc',
                  borderRadius: 4,
                  justifyContent: 'center',
                  paddingHorizontal: 10,
                  marginTop: 6,
                }}
                onPress={() => setBloodModalVisible(true)}
              >
                <Text style={{ color: editData.bloodGroup ? '#000' : '#666' }}>
                  {editData.bloodGroup || 'Blood Group'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <PaperInput
                label="Height (cm)"
                value={editData.height}
                onChangeText={(t) => setEditData({ ...editData, height: t })}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, { flex: 1, marginRight: 8 }]}
              />
              <PaperInput
                label="Weight (kg)"
                value={editData.weight}
                onChangeText={(t) => setEditData({ ...editData, weight: t })}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, { flex: 1 }]}
              />
            </View>

            <Text style={styles.formSubHeader}>{t('profile.contactAddress')}</Text>
            <PaperInput
              label="Email Address"
              value={editData.email}
              onChangeText={(t) => setEditData({ ...editData, email: t })}
              mode="outlined"
              keyboardType="email-address"
              style={styles.input}
            />
            <PaperInput
              label="Home Address"
              value={editData.address}
              onChangeText={(t) => setEditData({ ...editData, address: t })}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />

            <Text style={styles.formSubHeader}>{t('profile.emergencySOSContact')}</Text>
            <PaperInput
              label="Contact Person Name"
              value={editData.emergencyContactName}
              onChangeText={(t) => setEditData({ ...editData, emergencyContactName: t })}
              mode="outlined"
              style={styles.input}
            />
            <PaperInput
              label="Relationship"
              value={editData.emergencyContactRelation}
              onChangeText={(t) => setEditData({ ...editData, emergencyContactRelation: t })}
              mode="outlined"
              style={styles.input}
              placeholder="Spouse, Parent, Friend..."
            />
            <PaperInput
              label="Contact Phone"
              value={editData.emergencyContactPhone}
              onChangeText={(t) => setEditData({ ...editData, emergencyContactPhone: t })}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />

            <PaperInput
              label="Medical Allergies"
              value={editData.allergies}
              onChangeText={(t) => setEditData({ ...editData, allergies: t })}
              mode="outlined"
              style={styles.input}
            />

            <PaperInput
              label="Chronic Conditions"
              value={editData.conditions}
              onChangeText={(t) => setEditData({ ...editData, conditions: t })}
              mode="outlined"
              style={styles.input}
            />

            <PaperInput
              label="Mobile Number"
              value={editData.mobile}
              onChangeText={(t) => setEditData({ ...editData, mobile: t })}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
              disabled
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button onPress={() => setEditModalVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleUpdate} style={styles.saveBtn}>
              {t('profile.saveChanges')}
            </Button>
          </View>
        </View>
      </GlassModal>

      {/* ── Blood Group Modal ── */}
      <GlassModal
        visible={bloodModalVisible}
        onDismiss={() => setBloodModalVisible(false)}
        contentContainerStyle={{ width: '88%', maxWidth: 360, borderRadius: 28, padding: 24, backgroundColor: '#FFF' }}
      >
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1E293B', textAlign: 'center', marginBottom: 24 }}>
          Select Blood Group
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
          {BLOOD_GROUPS.map((bg) => (
            <TouchableOpacity
              key={bg}
              style={{
                width: '30%',
                height: 60,
                backgroundColor: editData.bloodGroup === bg ? '#EF4444' : '#F8FAFC',
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#E2E8F0',
              }}
              onPress={() => {
                setEditData({ ...editData, bloodGroup: bg });
                setBloodModalVisible(false);
              }}
            >
              <Text style={{ color: editData.bloodGroup === bg ? '#FFF' : '#64748B', fontWeight: '800' }}>
                {bg}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassModal>

      {/* ── QR Code Pass Modal ── */}
      <GlassModal
        visible={qrModalVisible}
        onDismiss={() => setQrModalVisible(false)}
        contentContainerStyle={{ width: '85%', maxWidth: 320, borderRadius: 28, padding: 0 }}
      >
        <Surface style={styles.qrModalContent}>
          <Text variant="titleLarge" style={styles.qrTitle}>{t('profile.digitalIdPass')}</Text>
          <QRCode value={profile?.mrn || 'N/A'} size={200} />
          <Text style={styles.qrName}>{patientFullName}</Text>
          <Text style={styles.qrMrn}>MRN: {patientMRN}</Text>
          <Button mode="contained" onPress={() => setQrModalVisible(false)} style={{ marginTop: 20 }}>
            Close
          </Button>
        </Surface>
      </GlassModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Rapido Top Header ── */
  rapidoHeader: {
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rapidoHeaderTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  /* ── Rapido Top Profile Card ── */
  rapidoProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  rapidoUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rapidoAvatarWrap: {
    position: 'relative',
    marginRight: 14,
  },
  rapidoAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#006AF5',
  },
  rapidoAvatarPreset: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  rapidoAvatarEmoji: {
    fontSize: 28,
  },
  rapidoAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  rapidoCameraBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#006AF5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  rapidoUserMeta: {
    flex: 1,
  },
  rapidoUserName: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  rapidoUserPhone: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 3,
  },
  rapidoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  rapidoRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  rapidoRatingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rapidoRatingText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  rapidoRatingSub: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },

  /* ── Avatar Modal: 5MB hint & transient file info ── */
  fileSizeHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  fileSizeHintTxt: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1D4ED8',
    flex: 1,
  },
  pendingFileInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  pendingFileName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#15803D',
  },
  pendingFileSize: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#4ADE80',
    marginTop: 1,
  },

  /* ── Rapido Menu List ── */
  rapidoMenuList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  rapidoMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  menuIconWrap: {
    width: 38,
    alignItems: 'flex-start',
  },
  menuTextWrap: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  menuItemSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },

  /* ── Logout Row ── */
  rapidoLogoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 24,
    justifyContent: 'center',
  },
  rapidoLogoutTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
  deleteLink: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
  deleteLinkTxt: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  /* ── Modal Common Styles ── */
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginLeft: 10,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formSubHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#006AF5',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 15,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    backgroundColor: '#F8F9FA',
    gap: 10,
  },
  saveBtn: {
    borderRadius: 10,
  },
  qrModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
  },
  qrTitle: {
    fontWeight: 'bold',
    marginBottom: 20,
  },
  qrName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
  },
  qrMrn: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },

  /* ── Avatar Modal Styles ── */
  avatarModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
  },
  avatarModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarModalTitle: {
    fontWeight: '900',
    color: '#1E293B',
    fontSize: 18,
  },
  avatarModalSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  photoActionsBox: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 12,
    borderRadius: 14,
  },
  photoActionTxt: {
    color: '#006AF5',
    fontWeight: '800',
    fontSize: 12,
  },
  presetSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 12,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  presetCard: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
  },
  presetCardSelected: {
    borderColor: '#006AF5',
    borderWidth: 2.5,
  },
  presetEmoji: {
    fontSize: 26,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 3,
  },
  presetCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#006AF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
