import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Surface,
  IconButton,
  ActivityIndicator,
  Card,
  Button,
  Avatar,
} from 'react-native-paper';
import {
  FileText,
  Hospital,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Activity,
  User,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import dayjs from 'dayjs';
import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { Portal, Modal, Surface as PaperSurface, IconButton as PaperIconButton, Chip, Divider } from 'react-native-paper';
import { safeFormat } from '@/utils/dateUtils';

interface DischargeRecord {
  _id: string;
  admissionDate: string;
  dischargeDate: string;
  hospital: { name: string };
  doctor: { user: { name: string } } | string;
  diagnosis?: string;
  dischargeSummary?: string;
  reasonForAdmission?: string;
  status?: string;
  createdAt?: string;
}

export default function DischargeRecordsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<DischargeRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DischargeRecord | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchDischargeRecords = async () => {
    try {
      console.log('[DischargeRecordsScreen] Starting data fetch phase...');
      setError(null);
      let recordsArray: DischargeRecord[] = [];
      
      try {
        console.log('[DischargeRecordsScreen] Primary fetch call:', PATIENT_ENDPOINTS.DISCHARGE_RECORDS);
        const response = await apiClient.get(PATIENT_ENDPOINTS.DISCHARGE_RECORDS);
        const resData = response.data;
        const data = resData.data || resData;
        
        let foundRecords = [];
        if (Array.isArray(data)) {
          foundRecords = data;
        } else if (data && Array.isArray(data.dischargeRecords)) {
          foundRecords = data.dischargeRecords;
        } else if (data && Array.isArray(data.data)) {
          foundRecords = data.data;
        }
        recordsArray = foundRecords;
      } catch (primaryErr: any) {
        console.warn('[DischargeRecordsScreen] Primary failed! Error:', primaryErr.message);
      }

      // If primary failed or returned nothing, try dashboard data
      if (!Array.isArray(recordsArray) || recordsArray.length === 0) {
        console.log('[DischargeRecordsScreen] Executing dashboard data fallback...');
        const dashboard = await apiClient.get(PATIENT_ENDPOINTS.DASHBOARD_DATA);
        const dashBase = dashboard.data?.data || dashboard.data;
        
        // Comprehensive check for nested discharge records
        let dashRecords = [];
        if (dashBase) {
          if (Array.isArray(dashBase.dischargeRecords)) {
            dashRecords = dashBase.dischargeRecords;
          } else if (dashBase.data && Array.isArray(dashBase.data.dischargeRecords)) {
            dashRecords = dashBase.data.dischargeRecords;
          } else if (Array.isArray(dashBase.data)) {
             // Sometimes it's just in .data if it's a specific fetch
             dashRecords = dashBase.data;
          }
        }
        
        recordsArray = dashRecords || [];
      }

      console.log('[DischargeRecordsScreen] Final array size:', Array.isArray(recordsArray) ? recordsArray.length : 'NaN');
      setRecords(Array.isArray(recordsArray) ? recordsArray : []);
      
    } catch (err: any) {
      console.error('[DischargeRecordsScreen] CRITICAL Fetch Error:', err);
      setError('Technical issue loading records. Please pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('[DischargeRecordsScreen] Refreshing manually...');
    setRefreshing(true);
    fetchDischargeRecords();
  };

  useEffect(() => {
    fetchDischargeRecords();
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating size="large" color="#006AF5" />
      </View>
    );
  }

  console.log('[DischargeRecordsScreen] Rendering with records:', Array.isArray(records) ? records.length : 'undefined');

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerContent}>
          <IconButton icon="arrow-left" iconColor="#1A1A1A" size={24} onPress={() => navigation.goBack()} />
          <Text variant="headlineSmall" style={styles.headerTitle}>Discharge Records</Text>
        </View>
      </Surface>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006AF5']} />
        }
      >
        {error ? (
          <View style={styles.emptyContainer}>
            <FileText size={48} color="#CCC" />
            <Text style={styles.emptySub}>{error || 'No discharge summaries to display.'}</Text>
          </View>
        ) : (Array.isArray(records) && records.length === 0) ? (
          <View style={styles.emptyContainer}>
             <FileText size={64} color="#DDD" />
             <Text style={styles.emptyTitle}>No Records Found</Text>
             <Text style={styles.emptySub}>Your hospital discharge summaries will appear here.</Text>
          </View>
        ) : (
          Array.isArray(records) && records.map((record) => (
            <Card 
              key={record._id} 
              style={styles.recordCard} 
              mode="outlined"
              onPress={() => navigation.navigate('DischargeDetail', { dischargeId: record._id })}
            >
              <Card.Content style={{ padding: 16 }}>
                 <View style={styles.cardHeader}>
                    <View style={styles.leftInfo}>
                       <View style={styles.typeBadge}>
                         <Text style={styles.typeText}>Discharge Summary</Text>
                       </View>
                       <Text variant="titleMedium" style={styles.hospName}>
                         {record.hospital?.name || 'Medical Center'}
                       </Text>
                       <View style={styles.row}>
                         <User size={12} color="#006AF5" />
                         <Text style={styles.subText}>
                            Dr. {typeof record.doctor === 'string' ? record.doctor : (record.doctor as any)?.user?.name || 'N/A'}
                         </Text>
                       </View>
                    </View>
                    <View style={styles.dateBadge}>
                       <Text style={styles.dateMonth}>{safeFormat(record.dischargeDate || record.createdAt, 'MMM')}</Text>
                       <Text style={styles.dateDay}>{safeFormat(record.dischargeDate || record.createdAt, 'dd')}</Text>
                    </View>
                 </View>

                 <View style={styles.diagBox}>
                    <Text style={styles.diagLabel}>DIAGNOSIS</Text>
                    <Text style={styles.diagText} numberOfLines={1}>{record.diagnosis || 'General Assessment'}</Text>
                 </View>

                 <View style={styles.stayRow}>
                    <Calendar size={14} color="#666" />
                    <Text style={styles.stayText}>
                      Stay: {safeFormat(record.admissionDate, 'dd MMM')} - {safeFormat(record.dischargeDate, 'dd MMM yyyy')}
                    </Text>
                 </View>

                 <Divider style={styles.divider} />
                 
                 <View style={styles.cardActions}>
                    <Button 
                      mode="text" 
                      compact 
                      icon="eye" 
                      onPress={() => navigation.navigate('DischargeDetail', { dischargeId: record._id })}
                    >
                      View Full Summary
                    </Button>
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
    padding: 16,
    paddingBottom: 100,
  },
  recordCard: {
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leftInfo: {
    flex: 1,
  },
  typeBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  typeText: {
    color: '#006AF5',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  hospName: {
    fontWeight: 'bold',
    color: '#1A1A1A',
    fontSize: 16,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subText: {
    color: '#666',
    fontSize: 12,
  },
  dateBadge: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 50,
  },
  dateMonth: {
    fontSize: 10,
    color: '#006AF5',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  diagBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  diagLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  diagText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  stayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  stayText: {
    fontSize: 12,
    color: '#64748B',
  },
  divider: {
    marginVertical: 12,
    backgroundColor: '#F1F5F9',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  modalContainer: {
    padding: 20,
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  modalBody: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 24,
  },
  hospitalDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  hospIconBox: {
    width: 50,
    height: 50,
    backgroundColor: '#F0F7FF',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hospNameLarge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  drNameSmall: {
    fontSize: 13,
    color: '#64748B',
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#006AF5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailBox: {
    backgroundColor: '#F8FAFC',
    padding: 15,
    borderRadius: 12,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
  },
  datesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  miniVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  summaryFullText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  statusBox: {
    alignItems: 'center',
    marginVertical: 10,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  doneBtn: {
    borderRadius: 12,
    paddingVertical: 6,
  },
});
