import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
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
import {
  Text,
  Card,
  IconButton,
  Surface,
  Divider,
  Button,
  Portal,
  Modal,
  TextInput as PaperInput,
} from 'react-native-paper';
import {
  User,
  Phone,
  Activity,
  FileText,
  Droplets,
  ChevronLeft,
  LogOut,
  Edit3,
  Mail,
  MapPin,
  Heart,
  QrCode,
  Shield,
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
} from 'lucide-react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { familyService } from '@/services/familyService';

import { apiClient, PATIENT_ENDPOINTS, clearAuthTokens, getAccessToken, TOKEN_KEYS } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import LanguageSelector from '@/components/LanguageSelector';
import { DigitalAtriumLoader } from '@/components/SanctuaryComponents';
import GlassModal from '@/components/GlassModal';
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

  useEffect(() => {
    if (route.params?.openEdit) {
      setEditModalVisible(true);
    }
  }, [route.params?.openEdit]);
  
  // Avatar State
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

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

  const handlePickFromGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const uri = res.assets[0].uri;
        setSelectedAvatar(uri);
        await AsyncStorage.setItem('patient_profile_avatar', uri);
        setAvatarModalVisible(false);
      }
    } catch (e: any) {
      Alert.alert('Notice', 'Could not open photo library: ' + e.message);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const uri = res.assets[0].uri;
        setSelectedAvatar(uri);
        await AsyncStorage.setItem('patient_profile_avatar', uri);
        setAvatarModalVisible(false);
      }
    } catch (e: any) {
      Alert.alert('Notice', 'Could not open camera: ' + e.message);
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

  // ── Biometric Authentication State ──────────────────────────────────────────
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
      const isEnabled = await isBiometricLoginEnabled();
      setBiometricEnabled(isEnabled);
    } catch (e) {
      console.warn('Failed to load biometric settings:', e);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (value) {
      if (!biometricStatus.hasHardware) {
        Alert.alert(
          'Hardware Not Supported',
          'This device does not have biometric authentication hardware (Touch ID / Face ID).'
        );
        return;
      }
      if (!biometricStatus.isEnrolled) {
        Alert.alert(
          'No Biometrics Enrolled',
          'Please set up Face ID or Fingerprint in your phone device Settings first.'
        );
        return;
      }

      setBiometricToggling(true);
      try {
        const token = await getAccessToken();
        const refreshToken = await AsyncStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
        if (!token) {
          Alert.alert('Session Expired', 'Please re-login to save your biometric credentials.');
          setBiometricToggling(false);
          return;
        }

        const success = await enableBiometricLogin({
          accessToken: token,
          refreshToken: refreshToken || undefined,
          identifier: profile?.user?.mobile || editData.mobile,
        });

        if (success) {
          setBiometricEnabled(true);
          Alert.alert(
            'Biometrics Enabled',
            `${biometricStatus.label} has been enabled. You can now unlock MSCureChain instantly!`
          );
        } else {
          setBiometricEnabled(false);
        }
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to enable biometric authentication.');
        setBiometricEnabled(false);
      } finally {
        setBiometricToggling(false);
      }
    } else {
      Alert.alert(
        'Disable Biometric Unlock',
        'Are you sure you want to turn off biometric login? You will need your password to log in next time.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Turn Off',
            style: 'destructive',
            onPress: async () => {
              await disableBiometricLogin();
              setBiometricEnabled(false);
            },
          },
        ]
      );
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
      loadBiometricSettings();
    }, [])
  );

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
    // Validations: Supports DD-MM-YYYY or DD/MM/YYYY
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
      // Clean up numeric fields and convert DOB
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
          style: 'destructive' 
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    const doDelete = async () => {
      try {
        setLoading(true);
        const response = await apiClient.delete(PATIENT_ENDPOINTS.DELETE_ACCOUNT);
        if (response.data.success) {
          if (Platform.OS === 'web') {
            await AsyncStorage.clear();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          } else {
            Alert.alert(
              'Account Deleted',
              'Your account has been permanently removed. Thank you for using our services.',
              [{ 
                text: 'OK', 
                onPress: async () => {
                  await AsyncStorage.clear();
                  navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                }
              }]
            );
          }
        }
      } catch (err: any) {
        console.error('Delete Account Error:', err);
        const msg = err.response?.data?.message || 'Could not delete account. Please contact support if the issue persists.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        } else {
          Alert.alert('Deletion Failed', msg);
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm(t('profile.deleteAccountWarning') || 'Are you absolutely sure? This action is permanent and will delete your identity, clinical profile, and all associated data from our database.') : true;
      if (confirmed) {
        await doDelete();
      }
      return;
    }

    Alert.alert(
      t('profile.deleteAccountTitle') || 'Delete Account Permanently',
      t('profile.deleteAccountWarning') || 'Are you absolutely sure? This action is permanent and will delete your identity, clinical profile, and all associated data from our database. You will not be able to recover this information.',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { 
          text: t('profile.deletePermanently') || 'Delete Permanently', 
          onPress: doDelete,
          style: 'destructive' 
        }
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerRow}>
          <View style={{ width: 48 }} />
          <Text variant="titleLarge" style={styles.headerTitle}>{t('profile.title')}</Text>
          <View style={styles.row}>
            <LanguageSelector />
            <TouchableOpacity 
              onPress={handleLogout} 
              style={{ padding: 8, marginLeft: 4, justifyContent: 'center', alignItems: 'center' }}
              accessibilityLabel="Logout"
            >
              <LogOut size={22} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      </Surface>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006AF5']} />
        }
      >
        {/* User Card */}
        <Card style={styles.userCard} mode="contained">
          <Card.Content style={styles.userCardContent}>
            {(() => {
              const selectedPreset = PRESET_AVATARS.find(p => p.id === selectedAvatar);
              const isCustomPhoto = selectedAvatar && (selectedAvatar.startsWith('file:') || selectedAvatar.startsWith('http') || selectedAvatar.startsWith('data:'));

              return (
                <TouchableOpacity 
                  onPress={() => setAvatarModalVisible(true)} 
                  style={[
                    styles.avatarBox,
                    selectedPreset ? { backgroundColor: selectedPreset.bg, borderColor: selectedPreset.border } : {}
                  ]}
                  activeOpacity={0.8}
                >
                  {isCustomPhoto ? (
                    <Image source={{ uri: selectedAvatar! }} style={styles.avatarPhoto} />
                  ) : selectedPreset ? (
                    <Text style={styles.avatarEmoji}>{selectedPreset.emoji}</Text>
                  ) : (
                    <User size={36} color="#006AF5" />
                  )}
                  <View style={styles.cameraBadge}>
                    <Camera size={11} color="#FFF" />
                  </View>
                </TouchableOpacity>
              );
            })()}

            <View style={styles.userInfo}>
              <Text variant="titleMedium" style={styles.userName} numberOfLines={1}>{profile?.user?.name}</Text>
              <View style={styles.mrnBadge}>
                <Text style={styles.mrnText}>MRN: #{profile?.mrn}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={styles.qrFab} onPress={() => setQrModalVisible(true)}>
                <QrCode size={15} color="#006AF5" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.editFab} onPress={() => setEditModalVisible(true)}>
                <Edit3 size={15} color="#FFF" />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Vital Stats Grid */}
        <View style={styles.vitalsGrid}>
          <View style={[styles.vitalItem, { backgroundColor: '#EBF4FF' }]}>
            <Heart size={16} color="#006AF5" />
            <Text style={styles.vitalVal}>{profile?.user?.bloodGroup || profile?.bloodGroup || 'O+'}</Text>
            <Text style={styles.vitalLab}>Blood Group</Text>
          </View>
          <View style={[styles.vitalItem, { backgroundColor: '#F0FFF4' }]}>
            <Activity size={16} color="#16A34A" />
            <Text style={styles.vitalVal}>{profile?.user?.weight || profile?.weight || '--'} kg</Text>
            <Text style={styles.vitalLab}>Weight</Text>
          </View>
          <View style={[styles.vitalItem, { backgroundColor: '#FFF5F5' }]}>
            <Droplets size={16} color="#DC2626" />
            <Text style={styles.vitalVal}>{(profile?.user?.allergies || profile?.allergies) ? 'Active' : 'None'}</Text>
            <Text style={styles.vitalLab}>Allergies</Text>
          </View>
        </View>

        {/* Identity Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>{t('profile.identityBio')}</Text>
          </View>
          <Card style={styles.detailsCard} mode="outlined">
            <View style={styles.detailRow}>
              <User size={16} color="#666" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Gender / Age</Text>
                <Text style={styles.detailVal}>{profile?.user?.gender || profile?.gender || 'Not set'} • {profile?.user?.age || profile?.age || '--'} Yrs</Text>
              </View>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <User size={16} color="#666" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Height / Weight</Text>
                <Text style={styles.detailVal}>{profile?.user?.height || profile?.height || '--'} cm • {profile?.user?.weight || profile?.weight || '--'} kg</Text>
              </View>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <Mail size={16} color="#666" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Electronic Mail</Text>
                <Text style={styles.detailVal}>{profile?.user?.email || 'N/A'}</Text>
              </View>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <MapPin size={16} color="#666" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Residential Address</Text>
                <Text style={styles.detailVal}>{profile?.user?.address || profile?.address || 'Street address not available'}</Text>
              </View>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <User size={16} color="#666" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Father's / Guardian's Name</Text>
                <Text style={styles.detailVal}>{profile?.user?.fatherName || profile?.user?.GuardianName || profile?.GuardianName || profile?.fatherName || 'Not set'}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>{t('profile.emergencyContact')}</Text>
          </View>
          <Card style={[styles.detailsCard, { borderColor: '#FED7D7' }]} mode="outlined">
            <View style={styles.detailRow}>
              <Phone size={16} color="#C53030" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Primary Contact</Text>
                <Text style={[styles.detailVal, { color: '#C53030' }]}>
                  {profile?.user?.emergencyContactName || profile?.emergencyContactName || 'No contact added'} 
                  {(profile?.user?.emergencyContactRelation || profile?.emergencyContactRelation) ? ` (${profile?.user?.emergencyContactRelation || profile.emergencyContactRelation})` : ''}
                </Text>
              </View>
            </View>
            <Divider style={styles.divider} />
            {(() => {
              const emPhone = profile?.user?.emergencyContactPhone || profile?.emergencyContactPhone;
              return (
                <View style={[styles.detailRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Phone size={16} color="#C53030" style={styles.detailIcon} />
                    <View>
                      <Text style={styles.detailLabel}>Contact Phone</Text>
                      <Text style={styles.detailVal}>{emPhone || 'N/A'}</Text>
                    </View>
                  </View>
                  {!!emPhone && (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#FEF2F2',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#FCA5A5',
                        gap: 6,
                      }}
                      onPress={() => Linking.openURL(`tel:${emPhone}`)}
                      activeOpacity={0.7}
                    >
                      <PhoneCall size={14} color="#DC2626" />
                      <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 12 }}>Call Now</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}
          </Card>
        </View>

        {/* Emergency Medical ID Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Emergency Response</Text>
          </View>
          <Card style={[styles.detailsCard, { borderColor: '#FCA5A5' }]} mode="outlined">
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => navigation.navigate('EmergencyMedicalId')}
              activeOpacity={0.7}
            >
              <ShieldAlert size={20} color="#DC2626" style={styles.detailIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailLabel, { color: '#DC2626', fontWeight: '800' }]}>
                  Digital Emergency Medical ID Card
                </Text>
                <Text style={styles.detailVal}>
                  Offline card · Blood Group ({editData.bloodGroup || 'O+'}) · ICE & QR
                </Text>
              </View>
              <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ color: '#DC2626', fontWeight: '900', fontSize: 11 }}>VIEW</Text>
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Family Health Circle & Dependents */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Family & Dependents</Text>
          </View>
          <Card style={[styles.detailsCard, { borderColor: '#BBF7D0' }]} mode="outlined">
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => navigation.navigate('FamilyMembers')}
              activeOpacity={0.7}
            >
              <Users size={20} color="#16A34A" style={styles.detailIcon} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailLabel, { color: '#15803D', fontWeight: '800' }]}>
                  Family Health Circle
                </Text>
                <Text style={styles.detailVal}>
                  Shared mobile profiles · Children, Spouse & Parents
                </Text>
              </View>
              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ color: '#15803D', fontWeight: '900', fontSize: 11 }}>MANAGE</Text>
              </View>
            </TouchableOpacity>
          </Card>
        </View>

        {/* Biometric Security Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Security & Biometrics</Text>
          </View>
          <Card style={[styles.detailsCard, { borderColor: biometricEnabled ? '#BFDBFE' : '#E2E8F0' }]} mode="outlined">
            <View style={[styles.detailRow, { paddingVertical: 14 }]}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: biometricEnabled ? '#EFF6FF' : '#F8FAFC',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: biometricEnabled ? '#BFDBFE' : '#E2E8F0',
                }}
              >
                {biometricStatus.biometricType === 'FaceID' ? (
                  <ScanFace size={22} color={biometricEnabled ? '#006AF5' : '#64748B'} />
                ) : (
                  <FingerprintPattern size={22} color={biometricEnabled ? '#006AF5' : '#64748B'} />
                )}
              </View>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.detailLabel, { color: '#0F172A', fontWeight: '800', fontSize: 14 }]}>
                    {biometricStatus.label || 'Biometric Unlock'}
                  </Text>
                  {biometricEnabled && (
                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ color: '#16A34A', fontSize: 10, fontWeight: '800' }}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.detailVal, { color: '#64748B', fontSize: 12, marginTop: 2 }]}>
                  {biometricStatus.hasHardware
                    ? biometricEnabled
                      ? `Enabled for 1-tap fast login with ${biometricStatus.label}`
                      : `Enable ${biometricStatus.label} for instant secure access`
                    : 'Hardware biometric sensor not available on this device'}
                </Text>
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
          </Card>
        </View>

        {/* Legal & Policies */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Legal & Policies</Text>
          </View>
          <Card style={styles.detailsCard} mode="outlined">
            <TouchableOpacity 
              style={styles.detailRow}
              onPress={() => navigation.navigate('TermsAndConditions', { initialTab: 'privacy' })}
            >
              <Shield size={16} color="#006AF5" style={styles.detailIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Privacy & Data Security</Text>
                <Text style={styles.detailVal}>Read our Privacy Policy</Text>
              </View>
              <FileText size={14} color="#CCC" />
            </TouchableOpacity>
            <Divider style={styles.divider} />
            <TouchableOpacity 
              style={styles.detailRow}
              onPress={() => navigation.navigate('TermsAndConditions', { initialTab: 'terms' })}
            >
              <FileText size={16} color="#006AF5" style={styles.detailIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Terms of Use</Text>
                <Text style={styles.detailVal}>Service Agreement & T&C</Text>
              </View>
              <FileText size={14} color="#CCC" />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Sign Out Action */}
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={handleLogout} 
          activeOpacity={0.7}
        >
          <LogOut size={15} color="#DC2626" />
          <Text style={styles.logoutTxt}>
            {t('profile.signOutOfAccount')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      {/* Blood Group Modal */}
      <GlassModal
        visible={bloodModalVisible}
        onDismiss={() => setBloodModalVisible(false)}
        contentContainerStyle={{ width: '88%', maxWidth: 360, borderRadius: 28, padding: 24, backgroundColor: '#FFF' }}
      >
        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1E293B', textAlign: 'center', marginBottom: 24 }}>Select Blood Group</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 }}>
          {BLOOD_GROUPS.map((bg) => (
            <TouchableOpacity
              key={bg}
              style={{ 
                width: '30%', height: 60, backgroundColor: editData.bloodGroup === bg ? '#EF4444' : '#F8FAFC', 
                borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' 
              }}
              onPress={() => {
                setEditData({ ...editData, bloodGroup: bg });
                setBloodModalVisible(false);
              }}
            >
              <Text style={{ color: editData.bloodGroup === bg ? '#FFF' : '#64748B', fontWeight: '800' }}>{bg}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </GlassModal>

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
            <PaperInput label="Full Name" value={editData.name} onChangeText={(t) => setEditData({...editData, name: t})} mode="outlined" style={styles.input} />
            <PaperInput label="Father's / Guardian's Name" value={editData.fatherName} onChangeText={(t) => setEditData({...editData, fatherName: t})} mode="outlined" style={styles.input} />

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 8, marginLeft: 2 }}>Gender</Text>
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
                  onChangeText={(t) => setEditData({...editData, dob: t})} 
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
                  <PaperInput label="Age" value={editData.age} onChangeText={(t) => setEditData({...editData, age: t})} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1, marginRight: 8, marginBottom: 0 }]} />
                  <TouchableOpacity 
                    style={{ flex: 1, height: 56, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, justifyContent: 'center', paddingHorizontal: 10, marginTop: 6 }} 
                    onPress={() => setBloodModalVisible(true)}
                  >
                    <Text style={{ color: editData.bloodGroup ? '#000' : '#666' }}>{editData.bloodGroup || 'Blood Group'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.row}>
                  <PaperInput label="Height (cm)" value={editData.height} onChangeText={(t) => setEditData({...editData, height: t})} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1, marginRight: 8 }]} />
                  <PaperInput label="Weight (kg)" value={editData.weight} onChangeText={(t) => setEditData({...editData, weight: t})} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1 }]} />
                </View>
                
                <Text style={styles.formSubHeader}>{t('profile.contactAddress')}</Text>
                <PaperInput label="EMail Address" value={editData.email} onChangeText={(t) => setEditData({...editData, email: t})} mode="outlined" keyboardType="email-address" style={styles.input} />
                <PaperInput label="Home Address" value={editData.address} onChangeText={(t) => setEditData({...editData, address: t})} mode="outlined" multiline numberOfLines={2}  style={styles.input} />
                
                <Text style={styles.formSubHeader}>{t('profile.emergencySOSContact')}</Text>
                <PaperInput label="Contact Person Name" value={editData.emergencyContactName} onChangeText={(t) => setEditData({...editData, emergencyContactName: t})} mode="outlined" style={styles.input} />
                <PaperInput label="Relationship" value={editData.emergencyContactRelation} onChangeText={(t) => setEditData({...editData, emergencyContactRelation: t})} mode="outlined" style={styles.input} placeholder="Spouse, Parent, Friend..." />
                <PaperInput label="Contact Phone" value={editData.emergencyContactPhone} onChangeText={(t) => setEditData({...editData, emergencyContactPhone: t})} mode="outlined" keyboardType="phone-pad" style={styles.input} />
                
                <PaperInput 
                  label="Medical Allergies" 
                  value={editData.allergies} 
                  onChangeText={(t) => setEditData({...editData, allergies: t})} 
                  mode="outlined" 
                  style={styles.input} 
                />

                <PaperInput 
                  label="Chronic Conditions" 
                  value={editData.conditions} 
                  onChangeText={(t) => setEditData({...editData, conditions: t})} 
                  mode="outlined" 
                  style={styles.input} 
                />
                
                <PaperInput 
                  label="Mobile Number" 
                  value={editData.mobile} 
                  onChangeText={(t) => setEditData({...editData, mobile: t})} 
                  mode="outlined" 
                  keyboardType="phone-pad" 
                  style={styles.input} 
                  disabled 
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <Button onPress={() => setEditModalVisible(false)}>Cancel</Button>
                <Button mode="contained" onPress={handleUpdate} style={styles.saveBtn}>{t('profile.saveChanges')}</Button>
              </View>
          </View>
      </GlassModal>

      {/* QR Modal */}
      <GlassModal visible={qrModalVisible} onDismiss={() => setQrModalVisible(false)} contentContainerStyle={{ width: '85%', maxWidth: 320, borderRadius: 28, padding: 0 }}>
        <Surface style={styles.qrModalContent}>
           <Text variant="titleLarge" style={styles.qrTitle}>{t('profile.digitalIdPass')}</Text>
           <QRCode value={profile?.mrn || 'N/A'} size={200} />
           <Text style={styles.qrName}>{profile?.user?.name}</Text>
           <Text style={styles.qrMrn}>MRN: {profile?.mrn}</Text>
           <Button mode="contained" onPress={() => setQrModalVisible(false)} style={{ marginTop: 20 }}>Close</Button>
        </Surface>
      </GlassModal>

      {/* ── Avatar Selection Modal ── */}
      <GlassModal 
        visible={avatarModalVisible} 
        onDismiss={() => setAvatarModalVisible(false)} 
        contentContainerStyle={{ width: '92%', maxWidth: 420, maxHeight: '82%', borderRadius: 28, padding: 0 }}
      >
        <Surface style={styles.avatarModalContent}>
            <View style={styles.avatarModalHeader}>
              <View>
                <Text variant="titleMedium" style={styles.avatarModalTitle}>Choose Profile Avatar</Text>
                <Text variant="bodySmall" style={styles.avatarModalSub}>Select a persona or upload your photo</Text>
              </View>
              <IconButton icon="close" size={20} onPress={() => setAvatarModalVisible(false)} />
            </View>

            {/* Presets Grid */}
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
                      isSelected && styles.presetCardSelected
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

            {/* Custom Photo Upload Actions */}
            <View style={styles.photoActionsBox}>
              <TouchableOpacity 
                style={styles.photoActionBtn} 
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
              >
                <Upload size={18} color="#006AF5" />
                <Text style={styles.photoActionTxt}>Upload from Gallery</Text>
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
          </Surface>
        </GlassModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: Platform.OS === 'ios' ? 48 : 28, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 10 },
  headerTitle: { fontWeight: '800', color: '#1E293B', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  scrollContent: { padding: 14, paddingBottom: 20 },
  userCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#F1F5F9' },
  userCardContent: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  avatarBox: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#E6F4FE', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', position: 'relative' },
  avatarPhoto: { width: 50, height: 50, borderRadius: 25 },
  avatarEmoji: { fontSize: 24 },
  cameraBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#006AF5', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FFF' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontWeight: '800', color: '#1E293B', fontSize: 15 },
  mrnBadge: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 3, borderWidth: 1, borderColor: '#BFDBFE' },
  mrnText: { color: '#006AF5', fontWeight: '800', fontSize: 10.5, letterSpacing: 0.5 },
  qrFab: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#EBF4FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  editFab: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#006AF5', justifyContent: 'center', alignItems: 'center' },
  vitalsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  vitalItem: { width: '31%', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 14, alignItems: 'center' },
  vitalVal: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginTop: 4 },
  vitalLab: { fontSize: 8.5, color: '#64748B', fontWeight: '800', textTransform: 'uppercase', marginTop: 1, letterSpacing: 0.5 },
  section: { marginBottom: 12 },
  sectionHeader: { marginBottom: 6 },
  sectionTitle: { fontWeight: '800', color: '#334155', fontSize: 12.5 },
  detailsCard: { backgroundColor: '#fff', borderRadius: 14, borderColor: '#F1F5F9', overflow: 'hidden' },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12 },
  detailIcon: { marginRight: 10 },
  detailLabel: { fontSize: 8.5, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8 },
  detailVal: { fontSize: 12.5, fontWeight: '700', color: '#1E293B', marginTop: 1 },
  divider: { backgroundColor: '#F8FAFC' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, paddingVertical: 10, marginTop: 8, marginBottom: 12 },
  logoutTxt: { color: '#DC2626', fontWeight: '800', fontSize: 12.5 },
  modalContainer: { 
    height: SCREEN_HEIGHT * 0.85,
    width: SCREEN_WIDTH * 0.95,
    alignSelf: 'center', 
    backgroundColor: 'transparent' 
  },
  modalContent: { 
    flex: 1,
    backgroundColor: '#fff', 
    borderRadius: 24, 
    overflow: 'hidden', 
    elevation: 5 
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontWeight: 'bold', marginLeft: 10 },
  modalForm: { padding: 20 },
  input: { marginBottom: 12, backgroundColor: '#fff' },
  formSubHeader: { fontSize: 12, fontWeight: 'bold', color: '#006AF5', textTransform: 'uppercase', marginTop: 10, marginBottom: 15 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: 15, backgroundColor: '#F8F9FA', gap: 10 },
  saveBtn: { borderRadius: 10 },
  qrModalContainer: { padding: 20 },
  qrModalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 30, alignItems: 'center' },
  qrTitle: { fontWeight: 'bold', marginBottom: 20 },
  qrName: { fontSize: 20, fontWeight: 'bold', marginTop: 15 },
  qrMrn: { fontSize: 14, color: '#666', marginBottom: 20 },

  // Avatar Modal Styles
  avatarModalContainer: { padding: 20 },
  avatarModalContent: { backgroundColor: '#FFF', borderRadius: 24, padding: 20 },
  avatarModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  avatarModalTitle: { fontWeight: '900', color: '#1E293B', fontSize: 18 },
  avatarModalSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  presetSectionLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 12 },
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  presetCard: { width: '22%', aspectRatio: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, position: 'relative' },
  presetCardSelected: { borderColor: '#006AF5', borderWidth: 2.5 },
  presetEmoji: { fontSize: 26 },
  presetLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', marginTop: 3 },
  presetCheck: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#006AF5', justifyContent: 'center', alignItems: 'center' },
  photoActionsBox: { flexDirection: 'row', gap: 10, marginTop: 20 },
  photoActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingVertical: 12, borderRadius: 14 },
  photoActionTxt: { color: '#006AF5', fontWeight: '800', fontSize: 12 },
});
