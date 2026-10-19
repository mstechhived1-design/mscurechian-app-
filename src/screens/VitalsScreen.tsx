import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { Text, Surface, IconButton, ActivityIndicator, Card } from 'react-native-paper';
import { Activity, Heart, Thermometer, Wind, Ruler, Weight, Droplets, Brain, ChevronLeft, Info, Sparkles, ShieldAlert } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { LinearGradient } from 'expo-linear-gradient';
import { SanctuaryText } from '../components/SanctuaryComponents';
import { COLORS } from '../constants/designSystem';
import { analyzeVitals } from '../services/nutritionService';

const { width } = Dimensions.get('window');

const VitalsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vitalsDataMap, setVitalsDataMap] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const getVitalValue = (vitalsObj: any, keys: string[]) => {
    if (!vitalsObj) return null;
    for (const key of keys) {
      if (vitalsObj[key] !== undefined && vitalsObj[key] !== null && vitalsObj[key] !== '') {
        return vitalsObj[key];
      }
    }
    return null;
  };

  const fetchVitalsData = async () => {
    try {
      setError(null);
      // Fetch both dashboard (for profile/metrics) and full appointments (for clinical visit vitals)
      const [dashRes, apptsRes] = await Promise.all([
        apiClient.get(PATIENT_ENDPOINTS.DASHBOARD_DATA),
        apiClient.get(PATIENT_ENDPOINTS.APPOINTMENTS)
      ]);

      const dashData = dashRes.data.data || dashRes.data;
      const allAppts = Array.isArray(apptsRes.data.data) ? apptsRes.data.data : (Array.isArray(apptsRes.data) ? apptsRes.data : []);
      
      const profile = dashData.profile || {};
      const metrics = dashData.metrics || {};

      // Sort appointments by date descending to find the absolute LATEST recordings
      const sortedAppts = [...allAppts].sort((a, b) => {
        const dateA = new Date(typeof a.date === 'string' ? a.date : (a.date?.$date || a.date)).getTime();
        const dateB = new Date(typeof b.date === 'string' ? b.date : (b.date?.$date || b.date)).getTime();
        return dateB - dateA;
      });

      // Find THE latest measurement for each vital across history
      const findLatest = (keys: string[], profileField?: string) => {
        // 1. Search in appointments history (most reliable triage data)
        for (const apt of sortedAppts) {
          const val = getVitalValue(apt.vitals, keys);
          if (val) return val;
        }
        // 2. Fallback to metrics dashboard
        const metricVal = metrics[profileField || ''] || getVitalValue(metrics, keys);
        if (metricVal) return metricVal;
        
        // 3. Fallback to general profile
        return profile[profileField || ''] || getVitalValue(profile, keys);
      };

      setVitalsDataMap({
        weight: findLatest(['weight', 'Weight', 'WEIGHT (kg)', 'weight_kg'], 'weight'),
        bloodPressure: findLatest(['bloodPressure', 'bp', 'BP', 'blood_pressure', 'BP (mmHg)'], 'bloodPressure'),
        temperature: findLatest(['temperature', 'temp', 'TEMP', 'TEMP (F)', 'temp_f'], 'temperature'),
        spo2: findLatest(['spo2', 'SPO2', 'spO2', 'SpO2', 'SPO2 (%)', 'spo2_percent', 'oxygen_saturation'], 'spo2'),
        height: findLatest(['height', 'Height', 'HEIGHT (cm)', 'height_cm'], 'height'),
        sugar: findLatest(['sugar', 'glucose', 'Sugar', 'Glucose', 'GLUCOSE (mg/dL)', 'blood_sugar'], 'sugar'),
        pulse: findLatest(['pulse', 'heartRate', 'PULSE', 'PULSE (bpm)', 'heart_rate', 'pulse_rate'], 'pulse')
      });

    } catch (err: any) {
      console.error('[VitalsScreen] Fetch Error:', err);
      setError('Could not sync latest clinical measurements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVitalsData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVitalsData();
    setAiInsight(null);
  }, []);

  const runAiAnalysis = async () => {
    if (!vitalsDataMap) return;
    setAnalyzing(true);
    try {
      const insight = await analyzeVitals(vitalsDataMap);
      setAiInsight(insight);
    } catch (e) { console.error(e); }
    finally { setAnalyzing(false); }
  };


  const vitalsDisplay = [
    { label: t('vitals.weight'), value: vitalsDataMap?.weight || '--', unit: 'kg', icon: <Weight size={24} color="#006AF5" />, bg: '#EBF4FF' },
    { label: t('vitals.bp'),     value: vitalsDataMap?.bloodPressure || '--/--', unit: 'mmHg', icon: <Heart size={24} color="#E53E3E" />, bg: '#FFF5F5' },
    { label: t('vitals.temp'),   value: vitalsDataMap?.temperature || '--', unit: '°F', icon: <Thermometer size={24} color="#319795" />, bg: '#E6FFFA' },
    { label: t('vitals.spo2'),   value: vitalsDataMap?.spo2 || '--', unit: '%', icon: <Wind size={24} color="#006AF5" />, bg: '#F0F9FF' },
    { label: t('vitals.height'), value: vitalsDataMap?.height || '--', unit: 'cm', icon: <Ruler size={24} color="#38A169" />, bg: '#F0FFF4' },
    { label: t('vitals.sugar'),  value: vitalsDataMap?.sugar || '--', unit: 'mg/dL', icon: <Droplets size={24} color="#D1913C" />, bg: '#FFFAF0' },
    { label: t('vitals.pulse'),  value: vitalsDataMap?.pulse || '--', unit: 'bpm', icon: <Activity size={24} color="#805AD5" />, bg: '#FAF5FF' },
  ];


  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#006AF5" />
        <Text style={styles.loadingText}>Fetching latest clinical vitals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={2}>
         <View style={{ width: 48 }} />
         <Text variant="titleLarge" style={styles.headerTitle}>{t('vitals.title')}</Text>
         <IconButton icon="plus" mode="contained" containerColor="#006AF5" onPress={() => {}} />
      </Surface>

      <ScrollView 
        }
      >
        {/* MEDICAL DISCLAIMER */}
        <View style={styles.disclaimerBanner}>
          <ShieldAlert size={14} color="#B91C1C" />
          <Text style={styles.disclaimerText}>
            Medical Disclaimer: These metrics and AI insights are for informational purposes only. Consult a doctor for medical advice.
          </Text>
        </View>

         {/* AI Insight Section */}
         <View style={styles.aiSection}>
           <LinearGradient colors={['#F0F7FF', '#E0F2FE']} style={styles.aiCard}>
             <View style={styles.aiHeader}>
               <Sparkles size={18} color={COLORS.primary} />
               <SanctuaryText variant="label_lg" style={styles.aiTitle}>AI Health Insight</SanctuaryText>
             </View>
             {aiInsight ? (
               <SanctuaryText variant="body_sm" style={styles.aiBody}>{aiInsight}</SanctuaryText>
             ) : (
               <View>
                 <SanctuaryText variant="body_sm" style={styles.aiPlaceholder}>
                   Let Gemini analyze your latest clinical measurements for personalized insights.
                 </SanctuaryText>
                 <TouchableOpacity 
                   style={styles.aiBtn} 
                   onPress={runAiAnalysis}
                   disabled={analyzing}
                 >
                   {analyzing ? (
                     <ActivityIndicator size="small" color="#FFF" />
                   ) : (
                     <>
                       <Brain size={16} color="#FFF" />
                       <SanctuaryText variant="label_lg" style={styles.aiBtnTxt}>Analyze Vitals</SanctuaryText>
                     </>
                   )}
                 </TouchableOpacity>
               </View>
             )}
           </LinearGradient>
         </View>

         {error && (
           <View style={styles.errorBanner}>
             <Info size={14} color="#E53E3E" />
             <SanctuaryText variant="body_sm" style={styles.errorText}>{error}</SanctuaryText>
           </View>
         )}

         <View style={styles.grid}>
            {vitalsDisplay.map((v: any, i: number) => (
               <Surface key={i} style={styles.vitalBox} elevation={0}>
                  <View style={[styles.iconBox, { backgroundColor: v.bg }]}>
                     {v.icon}
                  </View>
                  <View style={styles.vitalInfo}>
                    <SanctuaryText variant="headline_sm" style={styles.vitalValue}>{v.value}</SanctuaryText>
                    <SanctuaryText variant="label_sm" style={styles.vitalUnit}>{v.unit}</SanctuaryText>
                    <SanctuaryText variant="label_sm" style={styles.vitalLabel}>{v.label}</SanctuaryText>
                  </View>
               </Surface>
            ))}
         </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  header: { 
     flexDirection: 'row', 
     alignItems: 'center', 
     justifyContent: 'space-between', 
     paddingTop: 60, 
     paddingBottom: 20, 
     paddingHorizontal: 15,
     backgroundColor: '#FFF',
  },
  headerTitle: { fontWeight: '900', color: '#1E293B' },
  scroll: { padding: 20, paddingBottom: 100 },

  aiSection: { marginBottom: 24 },
  aiCard: { padding: 20, borderRadius: 24, elevation: 0 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiTitle: { color: COLORS.primary, fontWeight: '900' },
  aiBody: { color: '#1E3A8A', fontWeight: '600', lineHeight: 20 },
  aiPlaceholder: { color: '#64748B', fontWeight: '500', marginBottom: 16, lineHeight: 18 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start' },
  aiBtnTxt: { color: '#FFF', fontWeight: '800' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  vitalBox: { 
     width: (width - 56) / 2, 
     backgroundColor: '#FFF', 
     borderRadius: 24, 
     padding: 16, 
     flexDirection: 'row',
     alignItems: 'center', 
     marginBottom: 16,
     borderWidth: 1,
     borderColor: '#F1F5F9',
     gap: 12,
  },
  iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  vitalInfo: { flex: 1 },
  vitalValue: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  vitalUnit: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginBottom: 2 },
  vitalLabel: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 12, marginBottom: 20 },
  errorText: { color: '#DC2626', fontWeight: '600' },
  disclaimerBanner: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '700',
    lineHeight: 14,
  },
});

export default VitalsScreen;

