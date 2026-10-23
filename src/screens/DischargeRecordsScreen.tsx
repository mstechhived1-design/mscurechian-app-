import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '@/navigation/types';
import dayjs from 'dayjs';
import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { familyService } from '@/services/familyService';
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
  const insets = useSafeAreaInsets();
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

  useFocusEffect(
    React.useCallback(() => {
      fetchDischargeRecords();
    }, [])
  );

  useEffect(() => {
    fetchDischargeRecords();

    const unsub = familyService.onProfileChange(() => {
      fetchDischargeRecords();
    });
    return () => unsub();
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
            <Text style={styles.headerTitle}>Discharge Records</Text>
            <Text style={styles.headerSubtitle}>Hospital stay summaries</Text>
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
          <View style={styles.emptyContainer}>
            <FileText size={36} color="#CBD5E1" />
            <Text style={styles.emptySub}>{error || 'No discharge summaries to display.'}</Text>
          </View>
        ) : (Array.isArray(records) && records.length === 0) ? (
          <View style={styles.emptyContainer}>
             <FileText size={48} color="#CBD5E1" />
             <Text style={styles.emptyTitle}>No Records Found</Text>
             <Text style={styles.emptySub}>Your hospital discharge summaries will appear here.</Text>
          </View>
        ) : (
          Array.isArray(records) && records.map((record) => (
            <Card 
              key={record._id} 
              style={styles.recordCard} 
              mode="elevated"
              elevation={1}
              onPress={() => navigation.navigate('DischargeDetail', { dischargeId: record._id })}
            >
              <Card.Content style={styles.cardContent}>
                 <View style={styles.cardHeader}>
                    <View style={styles.leftInfo}>
                       <View style={styles.typeBadge}>
                         <Text style={styles.typeText}>Discharge Summary</Text>
                       </View>
                       <Text style={styles.hospName} numberOfLines={1}>
                         {record.hospital?.name || 'Medical Center'}
                       </Text>
                       <View style={styles.row}>
                         <User size={11} color="#006AF5" />
                         <Text style={styles.subText} numberOfLines={1}>
                           {(() => {
                             const rawDoc =
                               (record as any).primaryDoctor ||
                               (Array.isArray((record as any).consultants) && (record as any).consultants[0]) ||
                               (record as any).doctorName ||
                               (typeof record.doctor === 'string' ? record.doctor : ((record.doctor as any)?.user?.name || (record.doctor as any)?.name)) ||
                               '';
                             return rawDoc.startsWith('Dr.') ? rawDoc : `Dr. ${rawDoc}`;
                           })()}
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
                    <Calendar size={12} color="#64748B" />
                    <Text style={styles.stayText} numberOfLines={1}>
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
                      labelStyle={styles.btnLabel}
                      style={styles.summaryBtn}
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
    paddingBottom: 24,
  },
  recordCard: {
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardContent: {
    padding: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  leftInfo: {
    flex: 1,
  },
  typeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  typeText: {
    color: '#006AF5',
    fontSize: 8.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  hospName: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  subText: {
    color: '#64748B',
    fontSize: 11,
  },
  dateBadge: {
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 42,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dateMonth: {
    fontSize: 8.5,
    color: '#006AF5',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dateDay: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  diagBox: {
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: 6,
    marginTop: 5,
  },
  diagLabel: {
    fontSize: 7.5,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  diagText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  stayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },
  stayText: {
    fontSize: 10.5,
    color: '#64748B',
  },
  divider: {
    marginVertical: 6,
    backgroundColor: '#F1F5F9',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  summaryBtn: {
    height: 28,
  },
  btnLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginVertical: 0,
    marginHorizontal: 4,
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
