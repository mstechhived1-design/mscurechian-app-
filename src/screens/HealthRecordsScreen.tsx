import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  Text,
  Surface,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import {
  Hospital,
  CalendarDays,
  FlaskConical,
  FileText,
  ChevronRight,
  ArrowLeft,
  Stethoscope,
  Pill,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';

export default function HealthRecordsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const recordCategories = [
    {
      id: 'doctor-prescriptions',
      title: 'Doctor Prescriptions',
      subtitle: 'Clinical prescriptions directly from your consulting doctors',
      icon: Stethoscope,
      color: '#006AF5',
      bgColor: '#EFF6FF',
      onPress: () => navigation.navigate('Reports', { initialTab: 'prescriptions' }),
    },
    {
      id: 'pharmacy-orders',
      title: 'Pharmacy & Orders',
      subtitle: 'Medication fulfillment, dispensary tokens & bills',
      icon: Pill,
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
      onPress: () => navigation.navigate('Reports', { initialTab: 'pharmacy' }),
    },
    {
      id: 'lab-investigations',
      title: 'Lab Investigations',
      subtitle: 'Pathology results, diagnostic reports & blood tests',
      icon: FlaskConical,
      color: '#0D9488',
      bgColor: '#F0FDFA',
      onPress: () => navigation.navigate('Reports', { initialTab: 'labs' }),
    },
    {
      id: 'appointments',
      title: 'Appointment History',
      subtitle: 'Complete list of OPD & IPD consultations',
      icon: CalendarDays,
      color: '#16A34A',
      bgColor: '#F0FDF4',
      onPress: () => navigation.navigate('Appointments'),
    },
    {
      id: 'discharge',
      title: 'Discharge Summaries',
      subtitle: 'Inpatient hospital exit records & discharge bills',
      icon: FileText,
      color: '#0284C7',
      bgColor: '#F0F9FF',
      onPress: () => navigation.navigate('DischargeRecords'),
    },
    {
      id: 'hospitals',
      title: 'Registered Hospitals',
      subtitle: 'Hospitals where you are registered',
      icon: Hospital,
      color: '#EA580C',
      bgColor: '#FFF7ED',
      onPress: () => navigation.navigate('Hospitals'),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={0}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Health Records</Text>
            <Text style={styles.headerSub}>Complete medical history & documents</Text>
          </View>
        </View>
      </Surface>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {recordCategories.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.cardWrapper}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Surface style={styles.card} elevation={0}>
                <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                  <item.icon size={20} color={item.color} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={16} color="#94A3B8" />
              </Surface>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    height: '100%',
    minHeight: 0,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 8,
    backgroundColor: '#FFF',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  backBtn: {
    padding: 6,
    marginRight: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 0.5,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  grid: {
    gap: 8,
  },
  cardWrapper: {
    marginBottom: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 13.5,
    color: '#0F172A',
  },
  cardSubtitle: {
    color: '#64748B',
    fontSize: 10.5,
    marginTop: 1,
  },
});
