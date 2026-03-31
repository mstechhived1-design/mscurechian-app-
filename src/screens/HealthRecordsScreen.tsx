import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
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
  TestTube,
  FileText,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';

export default function HealthRecordsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const recordCategories = [
    {
      id: 'hospitals',
      title: 'Registered Hospitals',
      subtitle: 'Hospitals where you are registered',
      icon: Hospital,
      color: '#006AF5',
      bgColor: '#EBF4FF',
      onPress: () => navigation.navigate('Hospitals'),
    },
    {
      id: 'appointments',
      title: 'Appointment History',
      subtitle: 'Complete list of your visits',
      icon: CalendarDays,
      color: '#38A169',
      bgColor: '#F0FFF4',
      onPress: () => navigation.navigate('Appointments'),
    },
    {
      id: 'lab',
      title: 'Pharmacy & Labs',
      subtitle: 'Prescriptions and medical reports',
      icon: TestTube,
      color: '#E53E3E',
      bgColor: '#FFF5F5',
      onPress: () => navigation.navigate('Reports', {}),
    },
    {
      id: 'discharge',
      title: 'Discharge Summaries',
      subtitle: 'View your hospital exit records',
      icon: FileText,
      color: '#0369A1',
      bgColor: '#F0F9FF',
      onPress: () => navigation.navigate('DischargeRecords'),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerContent}>
          <IconButton icon="arrow-left" iconColor="#1A1A1A" size={24} onPress={() => navigation.goBack()} />
          <Text variant="headlineSmall" style={styles.headerTitle}>Health Records</Text>
        </View>
      </Surface>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="bodyMedium" style={styles.description}>
          Access your complete medical history, hospital registrations, and discharge details in one place.
        </Text>

        <View style={styles.grid}>
          {recordCategories.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.cardWrapper}
              onPress={item.onPress}
            >
              <Surface style={styles.card} elevation={1}>
                <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                  <item.icon size={28} color={item.color} />
                </View>
                <View style={styles.cardInfo}>
                  <Text variant="titleMedium" style={styles.cardTitle}>{item.title}</Text>
                  <Text variant="bodySmall" style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>
                <IconButton icon="chevron-right" iconColor="#CCC" size={20} />
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 50,
    backgroundColor: '#FFF',
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#1A1A1A',
  },
  scrollContent: {
    padding: 20,
  },
  description: {
    color: '#666',
    marginBottom: 25,
    lineHeight: 20,
  },
  grid: {
    gap: 16,
  },
  cardWrapper: {
    marginBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  cardSubtitle: {
    color: '#888',
    marginTop: 2,
  },
});
