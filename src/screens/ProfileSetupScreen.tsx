import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput as RNTextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { 
  User, 
  ChevronRight,
  UserCircle,
  Calendar,
  MapPin,
  Droplet, 
  Heart, 
  ArrowRight,
  Activity,
  Phone,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { 
  Portal,
  Modal,
} from 'react-native-paper';

import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/designSystem';
import { SanctuaryText, PrimaryButton } from '@/components/SanctuaryComponents';
import { GlassModal } from '@/components/GlassModal';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HONORIFICS = ['Mr', 'Mrs', 'Ms', 'Dr'];
const GENDERS = ['male', 'female', 'other'];
const BLOOD_GROUPS = ['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function ProfileSetupScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  const [loading, setLoading] = useState(false);
  const [honorific, setHonorific] = useState('Mr');
  const [gender, setGender] = useState('male');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('Unknown');
  const [address, setAddress] = useState('');
  const [bloodModalVisible, setBloodModalVisible] = useState(false);
  
  // New Fields
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  
  // Emergency Contact Fields
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const d = selectedDate.getDate().toString().padStart(2, '0');
      const m = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const y = selectedDate.getFullYear();
      setDob(`${d}-${m}-${y}`);
    }
  };

  const handleFinish = async () => {
    // Advanced Form Restrictions: DD-MM-YYYY or DD/MM/YYYY
    const dobRegex = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;
    const phoneRegex = /^\d{10}$/;

    if (!dob || !address || !emergencyContactName || !emergencyContactPhone) {
      Alert.alert('Incomplete Profile', 'Please provide DOB, Address and Emergency Contact.');
      return;
    }

    if (!dobRegex.test(dob)) {
      Alert.alert('Invalid Date', 'Please use DD-MM-YYYY or DD/MM/YYYY format for your birth date.');
      return;
    }

    if (!phoneRegex.test(emergencyContactPhone)) {
      Alert.alert('Invalid Phone', 'Emergency contact should be a 10-digit number.');
      return;
    }

    setLoading(true);
    try {
      // Convert DD-MM-YYYY or DD/MM/YYYY to ISO for the backend
      const parts = dob.split(/[-/]/);
      const [d, m, y] = parts;
      const isoDob = `${y}-${m}-${d}`;

      await apiClient.patch('/patients/profile', {
        honorific,
        gender,
        dob: isoDob,
        bloodGroup,
        address,
        weight,
        height,
        allergies,
        conditions,
        emergencyContactName,
        emergencyContactPhone,
        emergencyContactRelation
      });

      Alert.alert(
        'Profile Completed',
        'Thank you! Your clinical profile is now ready.',
        [{ text: 'Go to Dashboard', onPress: () => navigation.replace('Dashboard') }]
      );
    } catch (error: any) {
      console.error('[ProfileSetup] Error:', error);
      Alert.alert('Update Failed', error.message || 'Something went wrong while saving your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <LinearGradient
              colors={[COLORS.primary, '#6366F1']}
              style={styles.iconCircle}
            >
              <UserCircle size={40} color="#FFFFFF" />
            </LinearGradient>
            <SanctuaryText variant="headline_md" style={styles.title}>Clinical Profile</SanctuaryText>
            <SanctuaryText variant="body_md" style={styles.subtitle}>
              This information helps our doctors provide personalized healthcare and accurate diagnoses.
            </SanctuaryText>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.dot} />
              <SanctuaryText variant="label_lg" style={styles.sectionTitle}>IDENTITY & BIOMETRICS</SanctuaryText>
            </View>
            
            <View style={styles.fieldWrap}>
              <SanctuaryText variant="label_sm" style={styles.label}>HONORIFIC</SanctuaryText>
              <View style={styles.chips}>
                {HONORIFICS.map(h => (
                  <TouchableOpacity 
                    key={h} 
                    style={[styles.chip, honorific === h && styles.chipActive]}
                    onPress={() => setHonorific(h)}
                  >
                    <SanctuaryText variant="label_sm" style={[styles.chipTxt, honorific === h && styles.chipTxtActive]}>{h}</SanctuaryText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <SanctuaryText variant="label_sm" style={styles.label}>GENDER</SanctuaryText>
              <View style={styles.chips}>
                {GENDERS.map(g => (
                  <TouchableOpacity 
                    key={g} 
                    style={[styles.chip, gender === g && styles.chipActive]}
                    onPress={() => setGender(g)}
                  >
                    <SanctuaryText variant="label_sm" style={[styles.chipTxt, gender === g && styles.chipTxtActive]}>{g.toUpperCase()}</SanctuaryText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputItem}>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Calendar size={18} color={COLORS.primary} style={styles.inputIcon} />
                <RNTextInput
                  style={styles.textInput}
                  placeholder="Birth Date (DD-MM-YYYY)"
                  placeholderTextColor="#94A3B8"
                  value={dob}
                  onChangeText={setDob}
                />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={(() => {
                  if (dob) {
                    const parts = dob.split(/[-/]/);
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
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}

            <View style={styles.row}>
              <View style={[styles.inputItem, { flex: 1, marginRight: 8 }]}>
                <Droplet size={18} color="#EF4444" style={styles.inputIcon} />
                <RNTextInput
                  style={styles.textInput}
                  placeholder="Weight (kg)"
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                  value={weight}
                  onChangeText={(val) => {
                    const num = parseInt(val);
                    if (val === '' || (!isNaN(num) && num <= 500)) setWeight(val);
                  }}
                />
              </View>
              <View style={[styles.inputItem, { flex: 1, marginLeft: 8 }]}>
                <ArrowRight size={18} color={COLORS.primary} style={[styles.inputIcon, { transform: [{ rotate: '-90deg' }] }]} />
                <RNTextInput
                  style={styles.textInput}
                  placeholder="Height (cm)"
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                  value={height}
                  onChangeText={(val) => {
                    const num = parseInt(val);
                    if (val === '' || (!isNaN(num) && num <= 300)) setHeight(val);
                  }}
                />
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <View style={styles.labelRow}>
                <Droplet size={14} color="#EF4444" />
                <SanctuaryText variant="label_sm" style={[styles.label, { marginBottom: 0, marginLeft: 6 }]}>BLOOD GROUP</SanctuaryText>
              </View>
              <TouchableOpacity 
                style={styles.dropdownInput}
                onPress={() => setBloodModalVisible(true)}
              >
                <SanctuaryText variant="label_lg" style={styles.dropdownTxt}>
                  {bloodGroup || 'Select Blood Group'}
                </SanctuaryText>
                <ChevronRight size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.section, { marginTop: 24 }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <SanctuaryText variant="label_lg" style={styles.sectionTitle}>MEDICAL HISTORY</SanctuaryText>
            </View>
            
            <View style={[styles.inputItem, styles.multilineInput]}>
              <Heart size={18} color="#EF4444" style={styles.inputIcon} />
              <RNTextInput
                style={styles.textInput}
                placeholder="Known Allergies (e.g. Peanuts, Aspirin)"
                placeholderTextColor="#94A3B8"
                multiline
                value={allergies}
                onChangeText={setAllergies}
              />
            </View>

            <View style={[styles.inputItem, styles.multilineInput]}>
              <Activity size={18} color="#10B981" style={styles.inputIcon} />
              <RNTextInput
                style={styles.textInput}
                placeholder="Chronic Conditions (e.g. Asthma, Diabetes)"
                placeholderTextColor="#94A3B8"
                multiline
                value={conditions}
                onChangeText={setConditions}
              />
            </View>
          </View>

          <View style={[styles.section, { marginTop: 24 }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
              <SanctuaryText variant="label_lg" style={styles.sectionTitle}>EMERGENCY CONTACT</SanctuaryText>
            </View>
            
            <View style={styles.inputItem}>
              <User size={18} color="#F59E0B" style={styles.inputIcon} />
              <RNTextInput
                style={styles.textInput}
                placeholder="Full Contact Name"
                placeholderTextColor="#94A3B8"
                value={emergencyContactName}
                onChangeText={setEmergencyContactName}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputItem, { flex: 1, marginRight: 8 }]}>
                <ArrowRight size={18} color="#F59E0B" style={styles.inputIcon} />
                <RNTextInput
                  style={styles.textInput}
                  placeholder="Relation"
                  placeholderTextColor="#94A3B8"
                  value={emergencyContactRelation}
                  onChangeText={setEmergencyContactRelation}
                />
              </View>
              <View style={[styles.inputItem, { flex: 2, marginLeft: 8 }]}>
                <Phone size={18} color="#F59E0B" style={styles.inputIcon} />
                <RNTextInput
                  style={styles.textInput}
                  placeholder="Phone Number"
                  keyboardType="phone-pad"
                  placeholderTextColor="#94A3B8"
                  value={emergencyContactPhone}
                  onChangeText={setEmergencyContactPhone}
                />
              </View>
            </View>
          </View>

          <View style={[styles.section, { marginTop: 24 }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
              <SanctuaryText variant="label_lg" style={styles.sectionTitle}>LIVING ADDRESS</SanctuaryText>
            </View>
            
            <View style={[styles.inputItem, { alignItems: 'flex-start', height: 100, paddingTop: 16 }]}>
              <MapPin size={18} color={COLORS.primary} style={[styles.inputIcon, { marginTop: 2 }]} />
              <RNTextInput
                style={[styles.textInput, { textAlignVertical: 'top' }]}
                placeholder="Your Full Residential Address"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          <View style={styles.spacer} />

          <PrimaryButton
            label="Save Clinical Profile"
            onPress={handleFinish}
            loading={loading}
            icon={ArrowRight}
            style={styles.button}
          />
          
          <TouchableOpacity 
            style={styles.skipBtn} 
            onPress={() => navigation.replace('Dashboard')}
          >
            <SanctuaryText variant="label_lg" style={styles.skipTxt}>Complete later</SanctuaryText>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
      
      <GlassModal
        visible={bloodModalVisible}
        onClose={() => setBloodModalVisible(false)}
        title="Select Blood Group"
      >
        <View style={styles.bloodGrid}>
          {BLOOD_GROUPS.map((bg) => (
            <TouchableOpacity
              key={bg}
              style={[styles.bloodOption, bloodGroup === bg && styles.bloodOptionActive]}
              onPress={() => {
                setBloodGroup(bg);
                setBloodModalVisible(false);
              }}
            >
              <Droplet size={20} color={bloodGroup === bg ? '#FFF' : '#EF4444'} />
              <SanctuaryText 
                variant="label_lg" 
                style={[styles.bloodOptionTxt, bloodGroup === bg && styles.bloodOptionTxtActive]}
              >
                {bg}
              </SanctuaryText>
            </TouchableOpacity>
          ))}
        </View>
      </GlassModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 24, paddingBottom: 60 },
  
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15 },
  title: { color: '#1E293B', textAlign: 'center', marginBottom: 6, fontWeight: '900' },
  subtitle: { color: '#64748B', textAlign: 'center', fontSize: 13, lineHeight: 20, paddingHorizontal: 20 },

  section: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary, marginRight: 10 },
  sectionTitle: { color: '#1E293B', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, opacity: 0.7 },
  
  fieldWrap: { marginBottom: 20 },
  label: { color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  
  row: { flexDirection: 'row', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  bloodActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  chipTxt: { color: '#64748B', fontWeight: '800', fontSize: 12 },
  chipTxtActive: { color: '#FFFFFF' },
  
  bloodChips: { gap: 6, paddingBottom: 4 },
  
  inputItem: { flexDirection: 'row', alignItems: 'center', height: 56, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, marginBottom: 16 },
  multilineInput: { height: 80, alignItems: 'flex-start', paddingTop: 16 },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '700' },

  dropdownInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16 },
  dropdownTxt: { color: '#1E293B', fontWeight: '700' },
  
  bloodModalContent: { backgroundColor: '#FFF', margin: 24, borderRadius: 32, padding: 24 },
  bloodModalTitle: { color: '#1E293B', fontWeight: '900', textAlign: 'center', marginBottom: 24 },
  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  bloodOption: { width: '30%', height: 75, backgroundColor: '#F8FAFC', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  bloodOptionActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  bloodOptionTxt: { color: '#64748B', marginTop: 4, fontWeight: '800' },
  bloodOptionTxtActive: { color: '#FFF' },
  
  button: { height: 60, borderRadius: 20, marginTop: 10, backgroundColor: COLORS.primary },
  skipBtn: { marginTop: 20, paddingVertical: 12, alignItems: 'center' },
  skipTxt: { color: '#94A3B8', fontWeight: '800', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  
  spacer: { height: 32 },
});
