import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Platform,
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '@/navigation/types';
import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { familyService } from '@/services/familyService';

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
  const insets = useSafeAreaInsets();
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

  useFocusEffect(
    React.useCallback(() => {
      fetchHospitals();
    }, [])
  );

  useEffect(() => {
    fetchHospitals();

    const unsub = familyService.onProfileChange(() => {
      fetchHospitals();
    });
    return () => unsub();
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
      {/* Compact Header */}
      <Surface style={[styles.header, { paddingTop: Platform.OS === 'ios' ? (insets.top > 0 ? insets.top : 44) : 8 }]} elevation={0}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{t('hospitals.title')}</Text>
            <Text style={styles.headerSubtitle}>Registered healthcare facilities</Text>
          </View>
        </View>
      </Surface>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006AF5']} />
          ) : undefined
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="outlined" onPress={fetchHospitals} style={styles.retryBtn}>Retry</Button>
          </View>
        ) : (Array.isArray(hospitals) && hospitals.length === 0) ? (
          <View style={styles.emptyContainer}>
            <Surface style={styles.emptyIcon} elevation={0}>
              <HospitalIcon size={36} color="#CBD5E1" />
            </Surface>
            <Text style={styles.emptyText}>{t('hospitals.noHospitals')}</Text>
          </View>
        ) : (
          Array.isArray(hospitals) && hospitals.map((hospital) => (
            <Card key={hospital._id} style={styles.hospitalCard} mode="elevated" elevation={1}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.hospitalHeader}>
                  <Avatar.Text 
                    size={36} 
                    label={hospital.name.substring(0, 1).toUpperCase()} 
                    style={styles.hospitalAvatar}
                    labelStyle={styles.hospitalAvatarLabel}
                  />
                  <View style={styles.hospitalInfo}>
                    <Text style={styles.hospitalName} numberOfLines={1}>{hospital.name}</Text>
                    <View style={styles.infoRow}>
                       <MapPin size={11} color="#64748B" />
                       <Text style={styles.infoText} numberOfLines={1}>{hospital.address}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.contactRow}>
                  <View style={styles.contactItem}>
                    <Phone size={12} color="#006AF5" />
                    <Text style={styles.contactText}>{hospital.phone}</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <Button 
                      mode="contained-tonal" 
                      compact 
                      onPress={() => navigation.navigate('Appointments')}
                      style={styles.bookBtn}
                      labelStyle={styles.btnLabel}
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
                      labelStyle={styles.btnLabel}
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
    height: '100%',
    minHeight: 0,
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
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 20,
  },
  hospitalCard: {
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardContent: {
    padding: 10,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hospitalAvatar: {
    backgroundColor: '#EFF6FF',
  },
  hospitalAvatarLabel: {
    color: '#006AF5',
    fontWeight: '800',
    fontSize: 15,
  },
  hospitalInfo: {
    marginLeft: 10,
    flex: 1,
  },
  hospitalName: {
    fontWeight: '800',
    fontSize: 13,
    color: '#0F172A',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  infoText: {
    marginLeft: 4,
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
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
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  bookBtn: {
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
  },
  feedbackBtn: {
    borderColor: '#006AF5',
  },
  btnLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    marginVertical: 0,
    marginHorizontal: 8,
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
    marginTop: 60,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    color: '#888',
    fontSize: 13,
  },
});
