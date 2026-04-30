import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { 
  ChevronLeft, 
  Droplets, 
  Plus, 
  Minus, 
  Bell, 
  BellOff,
  History,
  TrendingUp,
  Target
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
const DAILY_GOAL = 2500; // ml
const CUP_SIZE = 250; // ml

export default function WaterReminderScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [intake, setIntake] = useState(0);
  const [remindersEnabled, setRemindersEnabled] = useState(false);

  useEffect(() => {
    loadIntake();
  }, []);

  const loadIntake = async () => {
    try {
      const saved = await AsyncStorage.getItem('water_intake');
      if (saved) setIntake(parseInt(saved));
    } catch (e) { console.error(e); }
  };

  const updateIntake = async (amount: number) => {
    const newIntake = Math.max(0, intake + amount);
    setIntake(newIntake);
    try {
      await AsyncStorage.setItem('water_intake', newIntake.toString());
    } catch (e) { console.error(e); }
  };

  const toggleReminders = async () => {
    if (!remindersEnabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable notifications in settings to receive water reminders.');
        return;
      }
      setRemindersEnabled(true);
      Alert.alert('Reminders Enabled', 'We will remind you to drink water every 2 hours.');
    } else {
      setRemindersEnabled(false);
    }
  };

  const progress = Math.min(1, intake / DAILY_GOAL);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <SanctuaryText variant="headline_sm" style={styles.headerTitle}>Water Tracker</SanctuaryText>
        <TouchableOpacity style={styles.reminderBtn} onPress={toggleReminders}>
          {remindersEnabled ? <Bell size={22} color={COLORS.primary} /> : <BellOff size={22} color="#94A3B8" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Circle Visual */}
        <View style={styles.progressSection}>
          <View style={styles.circleOuter}>
            <LinearGradient
              colors={['#E0F2FE', '#BAE6FD']}
              style={[styles.circleInner, { height: `${progress * 100}%` }]}
            />
            <View style={styles.circleOverlay}>
              <Droplets size={48} color={COLORS.primary} fill={progress > 0.5 ? 'rgba(59, 130, 246, 0.2)' : 'transparent'} />
              <SanctuaryText variant="headline_sm" style={styles.intakeTxt}>{intake} ml</SanctuaryText>
              <SanctuaryText variant="label_sm" style={styles.goalTxt}>Goal: {DAILY_GOAL} ml</SanctuaryText>
            </View>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlBtn} onPress={() => updateIntake(-CUP_SIZE)}>
            <Minus size={24} color="#64748B" />
          </TouchableOpacity>
          <View style={styles.cupInfo}>
            <SanctuaryText variant="headline_sm" style={styles.cupSizeTxt}>{CUP_SIZE} ml</SanctuaryText>
            <SanctuaryText variant="label_sm" style={styles.cupLabel}>Standard Cup</SanctuaryText>
          </View>
          <TouchableOpacity style={[styles.controlBtn, styles.addBtn]} onPress={() => updateIntake(CUP_SIZE)}>
            <Plus size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Target size={20} color={COLORS.primary} />
            <SanctuaryText variant="label_lg" style={styles.statVal}>{Math.round(progress * 100)}%</SanctuaryText>
            <SanctuaryText variant="label_sm" style={styles.statLabel}>Daily Goal</SanctuaryText>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={20} color="#10B981" />
            <SanctuaryText variant="label_lg" style={styles.statVal}>{intake / CUP_SIZE}</SanctuaryText>
            <SanctuaryText variant="label_sm" style={styles.statLabel}>Cups Today</SanctuaryText>
          </View>
          <View style={styles.statCard}>
            <History size={20} color="#F59E0B" />
            <SanctuaryText variant="label_lg" style={styles.statVal}>7 Days</SanctuaryText>
            <SanctuaryText variant="label_sm" style={styles.statLabel}>Best Streak</SanctuaryText>
          </View>
        </View>

        {/* Tip Section */}
        <View style={styles.tipCard}>
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.tipGrad}>
            <SanctuaryText variant="label_lg" style={styles.tipTitle}>Hydration Tip</SanctuaryText>
            <SanctuaryText variant="body_sm" style={styles.tipBody}>
              Drinking water before meals can help with weight management and digestion. Stay hydrated for better focus!
            </SanctuaryText>
          </LinearGradient>
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
  reminderBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

  scrollContent: { padding: 20 },

  progressSection: { alignItems: 'center', marginVertical: 40 },
  circleOuter: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 8,
    borderColor: '#F1F5F9',
    elevation: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  circleInner: { width: '100%', backgroundColor: '#BAE6FD' },
  circleOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', gap: 12 },
  intakeTxt: { color: '#1E293B', fontSize: 32, fontWeight: '900' },
  goalTxt: { color: '#94A3B8', fontWeight: '700' },

  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40, marginBottom: 40 },
  controlBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  addBtn: { backgroundColor: COLORS.primary },
  cupInfo: { alignItems: 'center' },
  cupSizeTxt: { color: '#1E293B', fontSize: 20, fontWeight: '900' },
  cupLabel: { color: '#94A3B8', fontWeight: '700', fontSize: 12 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, padding: 16, alignItems: 'center', gap: 6 },
  statVal: { color: '#1E293B', fontWeight: '900', fontSize: 16 },
  statLabel: { color: '#94A3B8', fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },

  tipCard: { borderRadius: 24, overflow: 'hidden' },
  tipGrad: { padding: 24 },
  tipTitle: { color: '#FFF', fontWeight: '900', marginBottom: 8 },
  tipBody: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', lineHeight: 20 },
});
