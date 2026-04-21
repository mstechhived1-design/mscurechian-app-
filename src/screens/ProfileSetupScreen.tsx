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
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/designSystem';
import { SanctuaryText, PrimaryButton } from '@/components/SanctuaryComponents';

const { width } = Dimensions.get('window');

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

  const handleFinish = async () => {
    if (!dob || !address) {
      Alert.alert('Incomplete Profile', 'Please provide your date of birth and address for accurate clinical records.');
      return;
    }

    setLoading(true);
    try {
      // We use the existing profile update endpoint which handles identity and profile data
      await apiClient.patch('/patients/profile', {
        honorific,
        gender,
        dob,
        bloodGroup,
        address,
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
            <View style={styles.iconCircle}>
              <UserCircle size={40} color={COLORS.primary} />
            </View>
            <SanctuaryText variant="headline_md" style={styles.title}>Complete Profile</SanctuaryText>
            <SanctuaryText variant="body_md" style={styles.subtitle}>
              Helping our doctors provide you with more accurate healthcare services.
            </SanctuaryText>
          </View>

          <View style={styles.section}>
            <SanctuaryText variant="label_lg" style={styles.sectionTitle}>BASIC INFORMATION</SanctuaryText>
            
            {/* Honorific Select */}
            <View style={styles.fieldWrap}>
              <SanctuaryText variant="label_sm" style={styles.label}>HOW SHOULD WE ADDRESS YOU?</SanctuaryText>
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

            {/* Gender Select */}
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

            {/* DOB Input */}
            <View style={styles.inputItem}>
              <Calendar size={18} color={COLORS.primary} style={styles.inputIcon} />
              <RNTextInput
                style={styles.textInput}
                placeholder="Date of Birth (YYYY-MM-DD)"
                placeholderTextColor="#94A3B8"
                value={dob}
                onChangeText={setDob}
              />
            </View>

            {/* Blood Group Select */}
            <View style={styles.fieldWrap}>
              <View style={styles.labelRow}>
                <Droplet size={14} color="#EF4444" />
                <SanctuaryText variant="label_sm" style={[styles.label, { marginLeft: 6 }]}>BLOOD GROUP</SanctuaryText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bloodChips}>
                {BLOOD_GROUPS.map(bg => (
                  <TouchableOpacity 
                    key={bg} 
                    style={[styles.chip, bloodGroup === bg && styles.cardActive]}
                    onPress={() => setBloodGroup(bg)}
                  >
                    <SanctuaryText variant="label_sm" style={[styles.chipTxt, bloodGroup === bg && styles.chipTxtActive]}>{bg}</SanctuaryText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={[styles.section, { marginTop: 20 }]}>
            <SanctuaryText variant="label_lg" style={styles.sectionTitle}>CONTACT & ADDRESS</SanctuaryText>
            
            <View style={[styles.inputItem, { alignItems: 'flex-start', height: 100, paddingTop: 16 }]}>
              <MapPin size={18} color={COLORS.primary} style={[styles.inputIcon, { marginTop: 2 }]} />
              <RNTextInput
                style={[styles.textInput, { textAlignVertical: 'top' }]}
                placeholder="Full Residential Address"
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
            label="Complete Registration"
            onPress={handleFinish}
            loading={loading}
            icon={ArrowRight}
            style={styles.button}
          />
          
          <TouchableOpacity 
            style={styles.skipBtn} 
            onPress={() => navigation.replace('Dashboard')}
          >
            <SanctuaryText variant="label_lg" style={styles.skipTxt}>I'll do this later</SanctuaryText>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 32, paddingBottom: 60 },
  
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { color: '#1E293B', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#64748B', textAlign: 'center', fontSize: 14, lineHeight: 21 },

  section: { width: '100%' },
  sectionTitle: { color: COLORS.primary, fontSize: 11, letterSpacing: 1, marginBottom: 20, opacity: 0.8 },
  
  fieldWrap: { marginBottom: 24 },
  label: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  cardActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  chipTxt: { color: '#64748B', fontWeight: '700' },
  chipTxtActive: { color: '#FFFFFF' },
  
  bloodChips: { gap: 8, paddingBottom: 4 },
  
  inputItem: { flexDirection: 'row', alignItems: 'center', height: 60, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, marginBottom: 24 },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 14, color: '#1E293B', fontWeight: '600' },
  
  button: { height: 60, borderRadius: 16, marginTop: 20 },
  skipBtn: { marginTop: 24, paddingVertical: 12, alignItems: 'center' },
  skipTxt: { color: '#94A3B8', fontWeight: '700' },
  
  spacer: { height: 40 },
});
