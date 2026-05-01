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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Text,
  Card,
  IconButton,
  ActivityIndicator,
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
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';

import { apiClient, PATIENT_ENDPOINTS, clearAuthTokens } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import LanguageSelector from '@/components/LanguageSelector';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  
  // Edit Form Fields
  const [editData, setEditData] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
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
        bloodGroup: data.user?.bloodGroup || data.bloodGroup || '',
        allergies: data.user?.allergies || data.allergies || '',
        gender: data.user?.gender || data.gender || '',
        height: String(data.user?.height || data.height || ''),
        weight: String(data.user?.weight || data.weight || ''),
        age: String(data.user?.age || data.age || ''),
        dob: (() => {
          const rawDob = data.user?.dateOfBirth || data.dob;
          if (!rawDob) return '';
          const d = new Date(rawDob);
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

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
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
    Alert.alert(
      'Logout',
      'Are you sure you want to exit?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            await clearAuthTokens();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
          style: 'destructive' 
        }
      ]
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
            <IconButton 
              icon={() => <LogOut size={20} color="#FF3B30" />} 
              onPress={handleLogout} 
            />
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
            <TouchableOpacity onPress={() => setQrModalVisible(true)} style={styles.avatarBox}>
               <QrCode size={40} color="#006AF5" />
            </TouchableOpacity>
            <View style={styles.userInfo}>
              <Text variant="headlineSmall" style={styles.userName}>{profile?.user?.name}</Text>
              <Text variant="bodySmall" style={styles.mrnText}>MRN: #{profile?.mrn}</Text>
            </View>
            <TouchableOpacity style={styles.editFab} onPress={() => setEditModalVisible(true)}>
              <Edit3 size={18} color="#FFF" />
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Vital Stats Grid */}
        <View style={styles.vitalsGrid}>
          <View style={[styles.vitalItem, { backgroundColor: '#EBF4FF' }]}>
            <Heart size={20} color="#006AF5" />
            <Text style={styles.vitalVal}>{profile?.user?.bloodGroup || profile?.bloodGroup || 'O+'}</Text>
            <Text style={styles.vitalLab}>Blood Group</Text>
          </View>
          <View style={[styles.vitalItem, { backgroundColor: '#F0FFF4' }]}>
            <Activity size={20} color="#38A169" />
            <Text style={styles.vitalVal}>{profile?.user?.weight || profile?.weight || '--'} kg</Text>
            <Text style={styles.vitalLab}>Weight</Text>
          </View>
          <View style={[styles.vitalItem, { backgroundColor: '#FFF5F5' }]}>
            <Droplets size={20} color="#E53E3E" />
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
            <View style={styles.detailRow}>
              <Phone size={16} color="#C53030" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Contact Phone</Text>
                <Text style={styles.detailVal}>{profile?.user?.emergencyContactPhone || profile?.emergencyContactPhone || 'N/A'}</Text>
              </View>
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

        <Button 
          mode="text" 
          onPress={handleLogout} 
          textColor="#FF3B30"
          style={styles.logoutBtn}
          icon="logout"
        >
          {t('profile.signOutOfAccount')}
        </Button>
        {/* Bottom clearance for the tab bar */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Portal>
        {/* Blood Group Modal */}
        <Modal
          visible={bloodModalVisible}
          onDismiss={() => setBloodModalVisible(false)}
          contentContainerStyle={{ backgroundColor: '#FFF', margin: 24, borderRadius: 32, padding: 24 }}
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
        </Modal>

        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={styles.modalTitle}>{t('profile.updateProfile')}</Text>
                <IconButton icon="close" onPress={() => setEditModalVisible(false)} />
              </View>
              
              <ScrollView 
                style={[styles.modalForm, { flex: 1 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.formSubHeader}>{t('profile.personalInfo')}</Text>
                <PaperInput label="Full Name" value={editData.name} onChangeText={(t) => setEditData({...editData, name: t})} mode="outlined" style={styles.input} />
                <PaperInput label="Gender" value={editData.gender} onChangeText={(t) => setEditData({...editData, gender: t})} mode="outlined" style={styles.input} placeholder="Male/Female/Other" />
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
          </Surface>
        </Modal>

        {/* QR Modal */}
        <Modal visible={qrModalVisible} onDismiss={() => setQrModalVisible(false)} contentContainerStyle={styles.qrModalContainer}>
          <Surface style={styles.qrModalContent}>
             <Text variant="titleLarge" style={styles.qrTitle}>{t('profile.digitalIdPass')}</Text>
             <QRCode value={profile?.mrn || 'N/A'} size={200} />
             <Text style={styles.qrName}>{profile?.user?.name}</Text>
             <Text style={styles.qrMrn}>MRN: {profile?.mrn}</Text>
             <Button mode="contained" onPress={() => setQrModalVisible(false)} style={{ marginTop: 20 }}>Close</Button>
          </Surface>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 10 },
  headerTitle: { fontWeight: 'bold', color: '#1A1A1A' },
  row: { flexDirection: 'row', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  userCard: { backgroundColor: '#fff', borderRadius: 24, marginBottom: 20, elevation: 2 },
  userCardContent: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  avatarBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E6F4FE', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  userInfo: { flex: 1, marginLeft: 15 },
  userName: { fontWeight: 'bold', color: '#1A1A1A' },
  mrnText: { color: '#006AF5', fontWeight: 'bold', marginTop: 2, letterSpacing: 1 },
  editFab: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#006AF5', justifyContent: 'center', alignItems: 'center' },
  vitalsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  vitalItem: { width: '31%', padding: 15, borderRadius: 18, alignItems: 'center' },
  vitalVal: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginTop: 8 },
  vitalLab: { fontSize: 9, color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontWeight: 'bold', color: '#1A1A1A', opacity: 0.8 },
  detailsCard: { backgroundColor: '#fff', borderRadius: 16, borderColor: '#EEE', overflow: 'hidden' },
  detailRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  detailIcon: { marginRight: 15 },
  detailLabel: { fontSize: 9, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', letterSpacing: 1 },
  detailVal: { fontSize: 14, fontWeight: 'bold', color: '#333', marginTop: 2 },
  divider: { backgroundColor: '#F8F9FA' },
  logoutBtn: { marginTop: 10, marginBottom: 20 },
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
});
