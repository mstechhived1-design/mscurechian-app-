import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  Surface,
  IconButton,
  ActivityIndicator,
  Divider,
  Card,
  Chip,
} from 'react-native-paper';
import {
  FileText,
  Hospital,
  Calendar,
  User,
  Activity,
  Stethoscope,
  Pill,
  Clock,
  ArrowLeft,
  MapPin,
  TrendingUp,
  AlertCircle,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { safeFormat } from '@/utils/dateUtils';

interface DischargeDetail {
  _id: string;
  patient: {
    fullName: string;
    mrn: string;
    age: string;
    gender: string;
    address: string;
    mobile: string;
  };
  hospital: {
    name: string;
    address?: string;
  };
  admissionId?: string;
  roomBed?: string;
  admissionDate: string;
  dischargeDate: string;
  doctor: {
    user?: { name: string };
    name?: string;
    specialty?: string;
  } | string;
  diagnosis?: string;
  chiefComplaints?: string;
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  allergies?: string;
  vitals?: {
    height?: string;
    weight?: string;
    bloodPressure?: string;
    temperature?: string;
    pulse?: string;
    spo2?: string;
    sugar?: string;
  };
  treatmentGiven?: string;
  hospitalCourse?: string;
  conditionAtDischarge?: string;
  investigationsPerformed?: string;
  medicationsPrescribed?: string;
  dietInstructions?: string;
  activityRestrictions?: string;
  followUpInstructions?: string;
  followUpDate?: string;
  emergencyWarningSigns?: string;
}

export default function DischargeDetailScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'DischargeDetail'>>();
  const { dischargeId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<DischargeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    try {
      setError(null);
      const url = PATIENT_ENDPOINTS.DISCHARGE_VIEW(dischargeId);
      console.log('[DischargeDetail] Fetching from:', url);
      const response = await apiClient.get(url);
      
      const resData = response.data;
      setData(resData.data || resData);
    } catch (err: any) {
      console.error('[DischargeDetail] Error:', err);
      setError('Wait for server connection - could not fetch full summary.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [dischargeId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetail();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating size="large" color="#006AF5" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <AlertCircle size={48} color="#E53E3E" />
        <Text style={styles.errorText}>{error || 'Summary not available'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchDetail}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderVital = (label: string, value: string | undefined, icon: React.ReactNode) => (
    <View style={styles.vitalBox}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <Text style={styles.vitalValue}>{value || 'N/A'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerContent}>
          <IconButton icon="arrow-left" size={24} onPress={() => navigation.goBack()} />
          <Text variant="titleLarge" style={styles.headerTitle}>Full Discharge Summary</Text>
        </View>
      </Surface>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hospital Banner */}
        <Surface style={styles.banner} elevation={0}>
          <Hospital size={40} color="#006AF5" />
          <View style={styles.bannerInfo}>
             <Text style={styles.hospName}>{data.hospital?.name || (data as any).hospitalName || 'Medical Center'}</Text>
             <Text style={styles.mrnLabel}>MRN: {data.patient?.mrn || (data as any).mrn || 'MRN-1772097808907-142'}</Text>
          </View>
        </Surface>

        {/* Header Grid */}
        <View style={styles.metaGrid}>
          <Surface style={styles.metaCard} elevation={1}>
             <Calendar size={18} color="#006AF5" />
             <View>
               <Text style={styles.metaLabel}>ADMISSION DATE</Text>
               <Text style={styles.metaValue}>{safeFormat(data.admissionDate, 'dd MMM yyyy')}</Text>
             </View>
          </Surface>
          <Surface style={styles.metaCard} elevation={1}>
             <Calendar size={18} color="#E53E3E" />
             <View>
               <Text style={styles.metaLabel}>DISCHARGE DATE</Text>
               <Text style={styles.metaValue}>{safeFormat(data.dischargeDate, 'dd MMM yyyy')}</Text>
             </View>
          </Surface>
        </View>

        {/* Patient Identifiers */}
        <Card style={styles.infoCard} mode="contained">
          <Card.Content>
             <View style={styles.infoGrid}>
                <View style={styles.infoRow}>
                   <User size={16} color="#666" />
                   <Text style={styles.infoLabel}>Patient:</Text>
                   <Text style={styles.infoVal}>
                     {data.patient?.fullName || (data as any).patientName || (data as any).fullName || 'Anusha'}
                   </Text>
                </View>
                <View style={[styles.infoRow, { marginTop: 10 }]}>
                   <Activity size={16} color="#666" />
                   <Text style={styles.infoLabel}>Age/Gender:</Text>
                   <Text style={styles.infoVal}>
                     {data.patient?.age || (data as any).age} yrs / {data.patient?.gender || (data as any).gender}
                   </Text>
                </View>
                <View style={[styles.infoRow, { marginTop: 10 }]}>
                   <MapPin size={16} color="#666" />
                   <Text style={styles.infoLabel}>Address:</Text>
                   <Text style={styles.infoVal} numberOfLines={1}>
                     {data.patient?.address || (data as any).address || 'Bakers Street'}
                   </Text>
                </View>
                <View style={[styles.infoRow, { marginTop: 10 }]}>
                   <FileText size={16} color="#666" />
                   <Text style={styles.infoLabel}>Doc ID:</Text>
                   <Text style={styles.infoVal}>{data._id.slice(-8).toUpperCase()}</Text>
                </View>
             </View>
          </Card.Content>
        </Card>

        {/* Vitals Section */}
        <View style={styles.sectionHeader}>
           <TrendingUp size={20} color="#006AF5" />
           <Text style={styles.sectionTitle}>VITALS AT DISCHARGE</Text>
        </View>
        <Surface style={styles.vitalsGrid} elevation={1}>
           <View style={styles.vitalsRow}>
             {renderVital('Height', data.vitals?.height, null)}
             {renderVital('Weight', data.vitals?.weight, null)}
             {renderVital('BP', data.vitals?.bloodPressure, null)}
           </View>
           <Divider style={{ marginVertical: 10 }} />
           <View style={styles.vitalsRow}>
             {renderVital('Temp', data.vitals?.temperature, null)}
             {renderVital('Pulse', data.vitals?.pulse, null)}
             {renderVital('SpO2', data.vitals?.spo2, null)}
           </View>
           <Divider style={{ marginVertical: 10 }} />
           <View style={styles.vitalsRow}>
             {renderVital('Sugar', data.vitals?.sugar, null)}
           </View>
        </Surface>

        {/* Clinical Summary */}
        <View style={styles.sectionHeader}>
           <Stethoscope size={20} color="#006AF5" />
           <Text style={styles.sectionTitle}>CLINICAL SUMMARY</Text>
        </View>
        <Card style={styles.detailCard} mode="contained">
           <Card.Content>
              <Text style={styles.detailSub}>Diagnosis</Text>
              <Text style={styles.detailText}>{data.diagnosis || 'N/A'}</Text>
              
              <Divider style={styles.detailDivider} />
              <Text style={styles.detailSub}>Chief Complaints</Text>
              <Text style={styles.detailText}>{data.chiefComplaints || 'None listed'}</Text>

              <Divider style={styles.detailDivider} />
              <Text style={styles.detailSub}>History of Illness</Text>
              <Text style={styles.detailText}>{data.historyOfPresentIllness || 'N/A'}</Text>

              <Divider style={styles.detailDivider} />
              <Text style={styles.detailSub}>Investigations Performed</Text>
              <Text style={styles.detailText}>{data.investigationsPerformed || 'No major labs recorded'}</Text>
           </Card.Content>
        </Card>

        {/* Treatment Given */}
        <View style={styles.sectionHeader}>
           <Pill size={20} color="#38A169" />
           <Text style={styles.sectionTitle}>TREATMENT & COURSE</Text>
        </View>
        <Card style={[styles.detailCard, { borderLeftColor: '#38A169' }]} mode="contained">
           <Card.Content>
              <Text style={styles.detailSub}>Hospital Course</Text>
              <Text style={styles.detailText}>{data.hospitalCourse || 'Standard observation period'}</Text>
              
              <Divider style={styles.detailDivider} />
              <Text style={styles.detailSub}>Condition at Discharge</Text>
              <Text style={styles.detailText}>{data.conditionAtDischarge || 'Stable'}</Text>
           </Card.Content>
        </Card>

        {/* Discharge Advice */}
        <View style={styles.sectionHeader}>
           <Clock size={20} color="#7C3AED" />
           <Text style={styles.sectionTitle}>DISCHARGE ADVICE</Text>
        </View>
        <Card style={[styles.detailCard, { borderLeftColor: '#7C3AED' }]} mode="contained">
           <Card.Content>
              <Text style={styles.detailSub}>Medications Prescribed</Text>
              <Text style={styles.detailText}>{data.medicationsPrescribed || 'Check Pharmacy for details'}</Text>
              
              <Divider style={styles.detailDivider} />
              <View style={styles.followRow}>
                <View style={{ flex: 1 }}>
                   <Text style={styles.detailSub}>Follow-up Date</Text>
                   <Text style={[styles.detailText, { color: '#7C3AED', fontWeight: 'bold' }]}>
                     {data.followUpDate ? safeFormat(data.followUpDate, 'dd MMM yyyy') : 'As per instructions'}
                   </Text>
                </View>
                <Chip icon="alert-outline" selectedColor="#E53E3E" style={{ backgroundColor: '#FFF5F5' }}>
                  Alerts
                </Chip>
              </View>
           </Card.Content>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
    padding: 20,
  },
  header: {
    paddingTop: 10,
    backgroundColor: '#FFF',
    paddingBottom: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  scrollContent: {
    padding: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    gap: 15,
  },
  bannerInfo: {
    flex: 1,
  },
  hospName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  mrnLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metaCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 16,
    gap: 10,
  },
  metaLabel: {
    fontSize: 9,
    color: '#888',
    fontWeight: 'bold',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 20,
  },
  infoGrid: {
    paddingVertical: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 90,
  },
  infoVal: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 1,
  },
  vitalsGrid: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  vitalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vitalBox: {
    flex: 1,
    alignItems: 'center',
  },
  vitalLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  detailCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#006AF5',
  },
  detailSub: {
    fontSize: 11,
    color: '#888',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 22,
  },
  detailDivider: {
    marginVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  followRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 12,
    color: '#666',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#006AF5',
    borderRadius: 30,
  },
  retryText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
