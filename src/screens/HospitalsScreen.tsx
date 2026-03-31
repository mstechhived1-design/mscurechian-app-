import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import {
  Text,
  Surface,
  IconButton,
  ActivityIndicator,
  Avatar,
  Card,
  Button,
} from 'react-native-paper';
import {
  Hospital as HospitalIcon,
  Phone,
  MapPin,
  ChevronRight,
  ArrowLeft,
  Calendar,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { apiClient, PATIENT_ENDPOINTS } from '@/api';

interface HospitalData {
  _id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  website?: string;
}

export default function HospitalsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hospitals, setHospitals] = useState<HospitalData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchHospitals = async () => {
    try {
      setError(null);
      const response = await apiClient.get(PATIENT_ENDPOINTS.HOSPITALS);
      if (response.data.success) {
        setHospitals(response.data.data || []);
      } else {
        setError('Failed to load registered hospitals.');
      }
    } catch (err: any) {
      console.error('[HospitalsScreen] Fetch Error:', err);
      setError('Error connecting to the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHospitals();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating size="large" color="#006AF5" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerContent}>
          <IconButton icon="arrow-left" iconColor="#1A1A1A" size={24} onPress={() => navigation.goBack()} />
          <Text variant="headlineSmall" style={styles.headerTitle}>{t('hospitals.title')}</Text>
        </View>
      </Surface>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006AF5']} />
        }
      >
        <Text variant="bodyMedium" style={styles.description}>
          Hospitals where your records are maintained. 
        </Text>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="outlined" onPress={fetchHospitals} style={styles.retryBtn}>Retry</Button>
          </View>
        ) : (Array.isArray(hospitals) && hospitals.length === 0) ? (
          <View style={styles.emptyContainer}>
            <Surface style={styles.emptyIcon} elevation={0}>
              <HospitalIcon size={48} color="#CCC" />
            </Surface>
            <Text style={styles.emptyText}>{t('hospitals.noHospitals')}</Text>
          </View>
        ) : (
          Array.isArray(hospitals) && hospitals.map((hospital) => (
            <Card key={hospital._id} style={styles.hospitalCard} mode="elevated" elevation={2}>
              <Card.Content>
                <View style={styles.hospitalHeader}>
                  <Avatar.Text 
                    size={48} 
                    label={hospital.name.substring(0, 1).toUpperCase()} 
                    style={styles.hospitalAvatar}
                    labelStyle={styles.hospitalAvatarLabel}
                  />
                  <View style={styles.hospitalInfo}>
                    <Text variant="titleLarge" style={styles.hospitalName}>{hospital.name}</Text>
                    <View style={styles.infoRow}>
                       <MapPin size={12} color="#666" />
                       <Text variant="bodySmall" style={styles.infoText} numberOfLines={1}>{hospital.address}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.contactRow}>
                  <View style={styles.contactItem}>
                    <Phone size={14} color="#006AF5" />
                    <Text style={styles.contactText}>{hospital.phone}</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <Button 
                      mode="contained-tonal" 
                      compact 
                      onPress={() => navigation.navigate('Appointments')}
                      style={styles.bookBtn}
                    >
                      {t('hospitals.details')}
                    </Button>
                    <Button 
                      mode="outlined" 
                      compact 
                      onPress={() => navigation.navigate('Feedback', { 
                        hospitalId: hospital._id, 
                        hospitalName: hospital.name 
                      })}
                      style={[styles.bookBtn, styles.feedbackBtn]}
                      textColor="#006AF5"
                    >
                      {t('hospitals.feedback')}
                    </Button>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
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
    marginBottom: 20,
  },
  hospitalCard: {
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#FFF',
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  hospitalAvatar: {
    backgroundColor: '#F0F7FF',
  },
  hospitalAvatarLabel: {
    color: '#006AF5',
    fontWeight: 'bold',
  },
  hospitalInfo: {
    marginLeft: 15,
    flex: 1,
  },
  hospitalName: {
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    marginLeft: 4,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#444',
  },
  bookBtn: {
    borderRadius: 10,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  feedbackBtn: {
    marginLeft: 8,
    borderColor: '#006AF5',
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  errorText: {
    color: '#E53E3E',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryBtn: {
    width: 150,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
});
