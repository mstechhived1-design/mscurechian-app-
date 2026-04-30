import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { 
  ChevronLeft, 
  Plus, 
  Pill, 
  Clock, 
  Bell, 
  BellOff,
  CheckCircle2,
  Trash2,
  Calendar
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { RootStackParamList } from '@/navigation/types';
import { SanctuaryText } from '../components/SanctuaryComponents';
import { COLORS } from '../constants/designSystem';

const { width } = Dimensions.get('window');

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  time: string;
  frequency: string;
  taken: boolean;
}

export default function MedicineReminderScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [remindersEnabled, setRemindersEnabled] = useState(false);

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      const saved = await AsyncStorage.getItem('medicines');
      if (saved) setMedicines(JSON.parse(saved));
      else {
        const initial = [
          { id: '1', name: 'Vitamin D3', dosage: '1000 IU', time: '09:00 AM', frequency: 'Daily', taken: false },
          { id: '2', name: 'Metformin', dosage: '500mg', time: '08:00 PM', frequency: 'Daily', taken: false },
        ];
        setMedicines(initial);
        await AsyncStorage.setItem('medicines', JSON.stringify(initial));
      }
    } catch (e) { console.error(e); }
  };

  const toggleTaken = async (id: string) => {
    const updated = medicines.map(m => m.id === id ? { ...m, taken: !m.taken } : m);
    setMedicines(updated);
    await AsyncStorage.setItem('medicines', JSON.stringify(updated));
  };

  const deleteMedicine = async (id: string) => {
    const updated = medicines.filter(m => m.id !== id);
    setMedicines(updated);
    await AsyncStorage.setItem('medicines', JSON.stringify(updated));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <SanctuaryText variant="headline_sm" style={styles.headerTitle}>Medicine Cabinet</SanctuaryText>
        <TouchableOpacity style={styles.addBtnHeader} onPress={() => {}}>
          <Plus size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Today's Summary */}
        <View style={styles.summaryCard}>
          <LinearGradient colors={[COLORS.primary, '#1D4ED8']} style={styles.summaryGrad}>
            <View style={styles.summaryRow}>
              <View>
                <SanctuaryText variant="headline_sm" style={styles.summaryTitle}>
                  {medicines.filter(m => m.taken).length}/{medicines.length} Taken
                </SanctuaryText>
                <SanctuaryText variant="label_sm" style={styles.summarySub}>Today's Progress</SanctuaryText>
              </View>
              <Calendar size={32} color="rgba(255,255,255,0.4)" />
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(medicines.filter(m => m.taken).length / (medicines.length || 1)) * 100}%` }]} />
            </View>
          </LinearGradient>
        </View>

        {/* Medicine List */}
        <View style={styles.listSection}>
          <SanctuaryText variant="label_lg" style={styles.sectionTitle}>Daily Medications</SanctuaryText>
          {medicines.map((med) => (
            <TouchableOpacity 
              key={med.id} 
              style={[styles.medCard, med.taken && styles.medCardTaken]}
              onPress={() => toggleTaken(med.id)}
            >
              <View style={[styles.medIconBox, { backgroundColor: med.taken ? '#ECFDF5' : '#F1F5F9' }]}>
                <Pill size={24} color={med.taken ? '#059669' : '#64748B'} />
              </View>
              <View style={styles.medInfo}>
                <SanctuaryText variant="label_lg" style={[styles.medName, med.taken && styles.textTaken]}>{med.name}</SanctuaryText>
                <SanctuaryText variant="body_sm" style={styles.medMeta}>{med.dosage} · {med.frequency}</SanctuaryText>
                <View style={styles.timeRow}>
                  <Clock size={12} color="#94A3B8" />
                  <SanctuaryText variant="label_sm" style={styles.timeTxt}>{med.time}</SanctuaryText>
                </View>
              </View>
              <TouchableOpacity onPress={() => deleteMedicine(med.id)} style={styles.deleteBtn}>
                {med.taken ? (
                  <CheckCircle2 size={24} color="#059669" fill="#059669" />
                ) : (
                  <Trash2 size={20} color="#CBD5E1" />
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Refill Alerts */}
        <View style={styles.refillCard}>
          <Bell size={20} color="#D97706" />
          <View style={{ flex: 1 }}>
            <SanctuaryText variant="label_lg" style={styles.refillTitle}>Refill Alert</SanctuaryText>
            <SanctuaryText variant="body_sm" style={styles.refillSub}>Metformin is running low (4 days left).</SanctuaryText>
          </View>
          <TouchableOpacity style={styles.orderBtn}>
            <SanctuaryText variant="label_sm" style={styles.orderBtnTxt}>ORDER</SanctuaryText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#1E293B', fontWeight: '900', fontSize: 18 },
  addBtnHeader: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

  scrollContent: { padding: 20 },

  summaryCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 24 },
  summaryGrad: { padding: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  summaryTitle: { color: '#FFF', fontWeight: '900', fontSize: 22 },
  summarySub: { color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: '#FFF', borderRadius: 3 },

  listSection: { marginBottom: 24 },
  sectionTitle: { color: '#1E293B', fontWeight: '900', fontSize: 15, marginBottom: 16 },
  medCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  medCardTaken: { backgroundColor: '#F8FAFC', opacity: 0.8 },
  medIconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  medInfo: { flex: 1, marginLeft: 16 },
  medName: { color: '#1E293B', fontWeight: '800', fontSize: 16, marginBottom: 2 },
  textTaken: { textDecorationLine: 'line-through', color: '#94A3B8' },
  medMeta: { color: '#64748B', fontWeight: '600', fontSize: 12, marginBottom: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeTxt: { color: '#94A3B8', fontWeight: '800', fontSize: 11 },
  deleteBtn: { padding: 8 },

  refillCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', borderRadius: 20, padding: 16, gap: 14, borderLeftWidth: 4, borderLeftColor: '#D97706' },
  refillTitle: { color: '#92400E', fontWeight: '900', fontSize: 14 },
  refillSub: { color: '#B45309', fontWeight: '600', fontSize: 12 },
  orderBtn: { backgroundColor: '#D97706', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  orderBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 10 },
});
