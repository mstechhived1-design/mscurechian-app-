import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
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
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';

import { apiClient, PATIENT_ENDPOINTS, clearAuthTokens } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import LanguageSelector from '@/components/LanguageSelector';

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
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
  });

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
        address: data.address || '',
        bloodGroup: data.bloodGroup || '',
        allergies: data.allergies || '',
        gender: data.gender || '',
        height: String(data.height || ''),
        weight: String(data.weight || ''),
        age: String(data.age || ''),
        emergencyContactName: data.emergencyContactName || '',
        emergencyContactPhone: data.emergencyContactPhone || '',
        emergencyContactRelation: data.emergencyContactRelation || '',
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
    try {
      setLoading(true);
      // Clean up numeric fields
      const updatePayload = {
        ...editData,
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
          <Text variant="titleLarge" style={styles.headerTitle}>{t('profile.title') || 'Medical Vault'}</Text>
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
            <Text style={styles.vitalVal}>{profile?.bloodGroup || 'O+'}</Text>
            <Text style={styles.vitalLab}>Blood Group</Text>
          </View>
          <View style={[styles.vitalItem, { backgroundColor: '#F0FFF4' }]}>
            <Activity size={20} color="#38A169" />
            <Text style={styles.vitalVal}>{profile?.weight || '--'} kg</Text>
            <Text style={styles.vitalLab}>Weight</Text>
          </View>
          <View style={[styles.vitalItem, { backgroundColor: '#FFF5F5' }]}>
            <Droplets size={20} color="#E53E3E" />
            <Text style={styles.vitalVal}>{profile?.allergies ? 'Active' : 'None'}</Text>
            <Text style={styles.vitalLab}>Allergies</Text>
          </View>
        </View>

        {/* Identity Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Identity & Bio</Text>
          </View>
          <Card style={styles.detailsCard} mode="outlined">
            <View style={styles.detailRow}>
              <User size={16} color="#666" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Gender / Age</Text>
                <Text style={styles.detailVal}>{profile?.gender || 'Not set'} • {profile?.age || '--'} Yrs</Text>
              </View>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <User size={16} color="#666" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Height / Weight</Text>
                <Text style={styles.detailVal}>{profile?.height || '--'} cm • {profile?.weight || '--'} kg</Text>
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
                <Text style={styles.detailVal}>{profile?.address || 'Street address not available'}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Emergency Contact</Text>
          </View>
          <Card style={[styles.detailsCard, { borderColor: '#FED7D7' }]} mode="outlined">
            <View style={styles.detailRow}>
              <Phone size={16} color="#C53030" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Primary Contact</Text>
                <Text style={[styles.detailVal, { color: '#C53030' }]}>
                  {profile?.emergencyContactName || 'No contact added'} 
                  {profile?.emergencyContactRelation ? ` (${profile.emergencyContactRelation})` : ''}
                </Text>
              </View>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <Phone size={16} color="#C53030" style={styles.detailIcon} />
              <View>
                <Text style={styles.detailLabel}>Contact Phone</Text>
                <Text style={styles.detailVal}>{profile?.emergencyContactPhone || 'N/A'}</Text>
              </View>
            </View>
          </Card>
        </View>

        <Button 
          mode="text" 
          onPress={handleLogout} 
          textColor="#FF3B30"
          style={styles.logoutBtn}
          icon="logout"
        >
          Sign out of Account
        </Button>
        {/* Bottom clearance for the tab bar */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>Update Profile</Text>
              <IconButton icon="close" onPress={() => setEditModalVisible(false)} />
            </View>
            
            <ScrollView style={styles.modalForm}>
              <Text style={styles.formSubHeader}>Personal Info</Text>
              <PaperInput label="Full Name" value={editData.name} onChangeText={(t) => setEditData({...editData, name: t})} mode="outlined" style={styles.input} />
              <PaperInput label="Gender" value={editData.gender} onChangeText={(t) => setEditData({...editData, gender: t})} mode="outlined" style={styles.input} placeholder="Male/Female/Other" />
              <View style={styles.row}>
                <PaperInput label="Age" value={editData.age} onChangeText={(t) => setEditData({...editData, age: t})} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1, marginRight: 8 }]} />
                <PaperInput label="Blood Group" value={editData.bloodGroup} onChangeText={(t) => setEditData({...editData, bloodGroup: t})} mode="outlined" style={[styles.input, { flex: 1 }]} />
              </View>
              <View style={styles.row}>
                <PaperInput label="Height (cm)" value={editData.height} onChangeText={(t) => setEditData({...editData, height: t})} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1, marginRight: 8 }]} />
                <PaperInput label="Weight (kg)" value={editData.weight} onChangeText={(t) => setEditData({...editData, weight: t})} mode="outlined" keyboardType="numeric" style={[styles.input, { flex: 1 }]} />
              </View>
              
              <Text style={styles.formSubHeader}>Contact & Address</Text>
              <PaperInput label="EMail Address" value={editData.email} onChangeText={(t) => setEditData({...editData, email: t})} mode="outlined" keyboardType="email-address" style={styles.input} />
              <PaperInput label="Home Address" value={editData.address} onChangeText={(t) => setEditData({...editData, address: t})} mode="outlined" multiline numberOfLines={2}  style={styles.input} />
              
              <Text style={styles.formSubHeader}>Emergency SOS Contact</Text>
              <PaperInput label="Contact Person Name" value={editData.emergencyContactName} onChangeText={(t) => setEditData({...editData, emergencyContactName: t})} mode="outlined" style={styles.input} />
              <PaperInput label="Relationship" value={editData.emergencyContactRelation} onChangeText={(t) => setEditData({...editData, emergencyContactRelation: t})} mode="outlined" style={styles.input} placeholder="Spouse, Parent, Friend..." />
              <PaperInput label="Contact Phone" value={editData.emergencyContactPhone} onChangeText={(t) => setEditData({...editData, emergencyContactPhone: t})} mode="outlined" keyboardType="phone-pad" style={styles.input} />
              
              <PaperInput label="Medical Allergies" value={editData.allergies} onChangeText={(t) => setEditData({...editData, allergies: t})} mode="outlined" style={styles.input} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button onPress={() => setEditModalVisible(false)}>Cancel</Button>
              <Button mode="contained" onPress={handleUpdate} style={styles.saveBtn}>Save Changes</Button>
            </View>
          </Surface>
        </Modal>

        {/* QR Modal */}
        <Modal visible={qrModalVisible} onDismiss={() => setQrModalVisible(false)} contentContainerStyle={styles.qrModalContainer}>
          <Surface style={styles.qrModalContent}>
             <Text variant="titleLarge" style={styles.qrTitle}>Digital ID Pass</Text>
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
  modalContainer: { padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', maxHeight: '90%' },
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
