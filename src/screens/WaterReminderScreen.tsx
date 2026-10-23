import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  Alert,
  StatusBar,
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
  Target,
  Info,
  Clock,
  Sparkles
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList } from '@/navigation/types';
import { SanctuaryText, DigitalAtriumLoader } from '../components/SanctuaryComponents';
import { COLORS } from '../constants/designSystem';
import { notificationService } from '@/services/notificationService';
import { familyService } from '@/services/familyService';

const { width } = Dimensions.get('window');
const DAILY_GOAL = 2500; // ml
const CUP_SIZE = 250; // ml

export default function WaterReminderScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [intake, setIntake] = useState(0);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [interval, setIntervalTime] = useState(2); // Default 2 hours
  const [currentPid, setCurrentPid] = useState<string | null>(null);

  const getStorageKey = (key: string, pid?: string | null) => {
    const id = pid || currentPid || 'default';
    return `${key}_${id}`;
  };

  const loadData = async (overridePid?: string | null) => {
    try {
      const activeId = overridePid !== undefined ? overridePid : await familyService.getActivePatientId();
      setCurrentPid(activeId);
      const [savedIntake, savedReminders, savedInterval] = await Promise.all([
        AsyncStorage.getItem(getStorageKey('water_intake', activeId)),
        AsyncStorage.getItem(getStorageKey('water_reminders_enabled', activeId)),
        AsyncStorage.getItem(getStorageKey('water_reminder_interval', activeId)),
      ]);
      
      setIntake(savedIntake ? parseInt(savedIntake, 10) : 0);
      setRemindersEnabled(savedReminders === 'true');
      setIntervalTime(savedInterval ? parseInt(savedInterval, 10) : 2);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    loadData();

    const unsubProfile = familyService.onProfileChange((newPid) => {
      loadData(newPid);
    });

    return () => {
      unsubProfile();
    };
  }, []);

  const updateIntake = async (amount: number) => {
    const newIntake = Math.max(0, intake + amount);
    setIntake(newIntake);
    try {
      await AsyncStorage.setItem(getStorageKey('water_intake'), newIntake.toString());
      if (remindersEnabled && amount > 0) {
        await notificationService.scheduleWaterReminders(interval);
      }
    } catch (e) { console.error(e); }
  };

  const toggleReminders = async () => {
    const newState = !remindersEnabled;
    setRemindersEnabled(newState);
    await AsyncStorage.setItem(getStorageKey('water_reminders_enabled'), newState.toString());

    if (newState) {
      await notificationService.scheduleWaterReminders(interval);
      Alert.alert('💧 Notifications Active', `We've scheduled a test reminder for 2 seconds from now to confirm it's working. After that, we'll nudge you every ${interval} hours.`);
    } else {
      await notificationService.cancelAll();
      Alert.alert('🔕 Notifications Disabled', 'Water reminders have been turned off.');
    }
  };

  const updateInterval = async (val: number) => {
    setIntervalTime(val);
    await AsyncStorage.setItem(getStorageKey('water_reminder_interval'), val.toString());
    if (remindersEnabled) {
      await notificationService.scheduleWaterReminders(val);
    }
  };

  if (loading) return <DigitalAtriumLoader />;

  const progress = Math.min(1, intake / DAILY_GOAL);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <SanctuaryText variant="headline_sm" style={styles.headerTitle}>Hydration</SanctuaryText>
          <SanctuaryText variant="body_sm" style={styles.headerSub}>Track your daily water intake</SanctuaryText>
        </View>
        <TouchableOpacity 
          style={[styles.reminderBtn, remindersEnabled && styles.reminderBtnActive]} 
          onPress={toggleReminders}
        >
          {remindersEnabled ? <Bell size={20} color="#FFF" /> : <BellOff size={20} color="#94A3B8" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Dynamic Water Tank Visualization */}
        <View style={styles.tankSection}>
          <View style={styles.tankContainer}>
            <LinearGradient
              colors={['#3B82F6', '#60A5FA']}
              style={[styles.waterFill, { height: `${progress * 100}%` }]}
            >
              <Sparkles size={100} color="rgba(255,255,255,0.1)" style={styles.waterSparkle} />
            </LinearGradient>
            
            <View style={styles.tankOverlay}>
              <View style={styles.percentageCircle}>
                <SanctuaryText variant="headline_sm" style={styles.percentTxt}>{Math.round(progress * 100)}%</SanctuaryText>
                <SanctuaryText variant="label_sm" style={styles.percentSub}>Goal</SanctuaryText>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoCol}>
                  <SanctuaryText variant="headline_sm" style={styles.valTxt}>{intake}ml</SanctuaryText>
                  <SanctuaryText variant="label_sm" style={styles.lblTxt}>Consumed</SanctuaryText>
                </View>
                <View style={styles.divider} />
                <View style={styles.infoCol}>
                  <SanctuaryText variant="headline_sm" style={styles.valTxt}>{DAILY_GOAL}ml</SanctuaryText>
                  <SanctuaryText variant="label_sm" style={styles.lblTxt}>Daily Goal</SanctuaryText>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Add Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlBtnSecondary} onPress={() => updateIntake(-CUP_SIZE)}>
            <Minus size={24} color="#64748B" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.mainAddBtn} onPress={() => updateIntake(CUP_SIZE)}>
            <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.mainAddGrad}>
              <Plus size={32} color="#FFF" />
              <SanctuaryText variant="label_lg" style={styles.addBtnTxt}>Add {CUP_SIZE}ml</SanctuaryText>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlBtnSecondary} onPress={() => updateIntake(500)}>
            <Plus size={24} color="#3B82F6" />
            <SanctuaryText variant="label_sm" style={styles.smallPlusTxt}>500</SanctuaryText>
          </TouchableOpacity>
        </View>

        {/* Statistics Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}><Target size={18} color="#3B82F6" /></View>
            <SanctuaryText variant="label_lg" style={styles.statVal}>{intake / CUP_SIZE}</SanctuaryText>
            <SanctuaryText variant="label_sm" style={styles.statLbl}>Glasses</SanctuaryText>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}><TrendingUp size={18} color="#10B981" /></View>
            <SanctuaryText variant="label_lg" style={styles.statVal}>Active</SanctuaryText>
            <SanctuaryText variant="label_sm" style={styles.statLbl}>Status</SanctuaryText>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFFBEB' }]}><History size={18} color="#F59E0B" /></View>
            <SanctuaryText variant="label_lg" style={styles.statVal}>7 Days</SanctuaryText>
            <SanctuaryText variant="label_sm" style={styles.statLbl}>Best Streak</SanctuaryText>
          </View>
        </View>

        {/* Reminder Settings */}
        <View style={styles.settingsSection}>
          <View style={styles.sectionHeader}>
            <Clock size={18} color="#1E293B" />
            <SanctuaryText variant="label_lg" style={styles.sectionTitle}>Reminder Frequency</SanctuaryText>
          </View>
          
          <View style={styles.intervalRow}>
            {[1, 2, 3, 4].map((hr) => (
              <TouchableOpacity 
                key={hr} 
                style={[styles.intervalChip, interval === hr && styles.intervalChipActive]}
                onPress={() => updateInterval(hr)}
              >
                <SanctuaryText variant="label_lg" style={[styles.intervalTxt, interval === hr && styles.intervalTxtActive]}>
                  {hr}h
                </SanctuaryText>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.infoBox}>
            <Info size={14} color="#64748B" />
            <SanctuaryText variant="body_sm" style={styles.infoTxt}>
              Periodic reminders help maintain high energy levels and healthy kidney function.
            </SanctuaryText>
          </View>
        </View>

        {/* Pro Tip */}
        <View style={styles.tipCard}>
          <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.tipGrad}>
            <View style={styles.tipHeader}>
              <Sparkles size={18} color="#F59E0B" />
              <SanctuaryText variant="label_lg" style={styles.tipTitle}>Hydration Hack</SanctuaryText>
            </View>
            <SanctuaryText variant="body_sm" style={styles.tipBody}>
              Try adding a slice of lemon or cucumber to your water for natural electrolytes and better taste!
            </SanctuaryText>
          </LinearGradient>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24, paddingBottom: 20, backgroundColor: '#FFF',
  },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  headerTitleWrap: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  headerSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  reminderBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  reminderBtnActive: { backgroundColor: '#3B82F6' },

  scrollContent: { padding: 16 },

  tankSection: { marginBottom: 18 },
  tankContainer: {
    height: 185,
    backgroundColor: '#FFF',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    justifyContent: 'flex-end',
  },
  waterFill: { width: '100%', position: 'relative' },
  waterSparkle: { position: 'absolute', top: 10, alignSelf: 'center' },
  tankOverlay: { ...StyleSheet.absoluteFill as any, justifyContent: 'center', alignItems: 'center', paddingVertical: 12 },
  percentageCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
    marginBottom: 12,
  },
  percentTxt: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  percentSub: { fontSize: 10, color: '#64748B', fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  infoCol: { alignItems: 'center' },
  valTxt: { fontSize: 16, fontWeight: '900', color: '#1E293B' },
  lblTxt: { fontSize: 11, color: '#64748B', fontWeight: '700', marginTop: 2 },
  divider: { width: 1, height: 28, backgroundColor: '#E2E8F0' },

  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  controlBtnSecondary: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  mainAddBtn: { flex: 1, marginHorizontal: 12, height: 52, borderRadius: 18, overflow: 'hidden', elevation: 3 },
  mainAddGrad: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  smallPlusTxt: { fontSize: 9, fontWeight: '900', color: '#3B82F6', marginTop: 1 },

  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 18, padding: 12, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#F1F5F9' },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statVal: { fontSize: 14, fontWeight: '900', color: '#1E293B' },
  statLbl: { fontSize: 10, color: '#64748B', fontWeight: '700' },

  settingsSection: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#1E293B' },
  intervalRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  intervalChip: { flex: 1, height: 42, borderRadius: 14, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  intervalChipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  intervalTxt: { color: '#64748B', fontWeight: '800', fontSize: 13 },
  intervalTxtActive: { color: '#FFF' },
  infoBox: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  infoTxt: { flex: 1, color: '#64748B', fontSize: 11, fontWeight: '600' },

  tipCard: { borderRadius: 24, overflow: 'hidden' },
  tipGrad: { padding: 16 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipTitle: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  tipBody: { color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 18, fontWeight: '600' },
});
