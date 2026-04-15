import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { Text, Surface, IconButton, ActivityIndicator, Card } from 'react-native-paper';
import { Activity, Heart, Thermometer, Wind, Ruler, Weight, Droplets } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { apiClient, PATIENT_ENDPOINTS } from '@/api';

const { width } = Dimensions.get('window');

const VitalsScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vitalsDataMap, setVitalsDataMap] = useState<any>(null);

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
  }, []);


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
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006AF5']} />
        }
      >
         {error && (
           <Surface style={styles.errorBanner} elevation={1}>
             <Text style={styles.errorText}>{error}</Text>
           </Surface>
         )}

         <View style={styles.grid}>
            {vitalsDisplay.map((v: any, i: number) => (
               <Surface key={i} style={styles.vitalBox} elevation={1}>
                  <View style={[styles.iconBox, { backgroundColor: v.bg }]}>
                     {v.icon}
                  </View>
                  <Text style={styles.vitalValue}>{v.value}</Text>
                  <Text style={styles.vitalUnit}>{v.unit}</Text>
                  <Text style={styles.vitalLabel}>{v.label}</Text>
               </Surface>
            ))}
         </View>

         <Card style={styles.historyCard} mode="outlined">
            <Card.Content>
               <Text variant="titleMedium" style={styles.historyTitle}>Recent Trends</Text>
               <View style={styles.trendRow}>
                  <IconButton icon={vitalsDataMap?.weight ? "trending-up" : "minus"} iconColor={vitalsDataMap?.weight ? "#38A169" : "#888"} />
                  <Text style={styles.trendText}>
                    {vitalsDataMap?.weight ? `Weight is recorded as ${vitalsDataMap.weight}kg.` : "No recent weight changes recorded."}
                  </Text>
               </View>
               <View style={styles.trendRow}>
                  <IconButton icon={vitalsDataMap?.bloodPressure ? "heart" : "minus"} iconColor={vitalsDataMap?.bloodPressure ? "#E53E3E" : "#888"} />
                  <Text style={styles.trendText}>
                    {vitalsDataMap?.bloodPressure ? `Latest Blood Pressure: ${vitalsDataMap.bloodPressure} mmHg.` : "Blood pressure monitoring recommended."}
                  </Text>
               </View>
            </Card.Content>
         </Card>

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
  headerTitle: { fontWeight: 'bold' },
  scroll: { padding: 20, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  vitalBox: { 
     width: (width - 60) / 2, 
     backgroundColor: '#FFF', 
     borderRadius: 24, 
     padding: 20, 
     alignItems: 'center', 
     marginBottom: 20,
     borderWidth: 1,
     borderColor: '#F1F5F9',
  },
  iconBox: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  vitalValue: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  vitalUnit: { fontSize: 11, color: '#888', fontWeight: 'bold', marginBottom: 4 },
  vitalLabel: { fontSize: 13, color: '#555', fontWeight: '500' },
  historyCard: { borderRadius: 20, marginTop: 10, backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  historyTitle: { fontWeight: 'bold', marginBottom: 15 },
  trendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  trendText: { marginLeft: 5, color: '#555' },
  errorBanner: { padding: 15, backgroundColor: '#FFF5F5', borderRadius: 12, marginBottom: 20, alignItems: 'center' },
  errorText: { color: '#E53E3E', fontSize: 12 },
});

export default VitalsScreen;

