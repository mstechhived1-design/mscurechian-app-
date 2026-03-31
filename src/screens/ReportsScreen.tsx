import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  IconButton,
  ActivityIndicator,
  Surface,
  Searchbar,
  Chip,
  Portal,
  Modal,
  Button,
  List,
  Divider,
} from 'react-native-paper';
import { format } from 'date-fns';
import {
  FlaskConical,
  Calendar,
  Download,
  Eye,
  Search,
  ChevronLeft,
  Filter,
  FileText,
  User,
  ExternalLink,
  Pill,
  Stethoscope,
  Building2,
  X,
  Info,
  Clock,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import { apiClient, REPORT_ENDPOINTS, PATIENT_ENDPOINTS } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import { safeFormat } from '@/utils/dateUtils';

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface Prescription {
  _id: string;
  prescriptionDate: string;
  diagnosis: string;
  medicines: Medicine[];
  doctor: {
    user?: {
      name: string;
    };
    name?: string;
    specialties?: string[];
  };
  hospital: {
    name: string;
  };
  displayType?: string;
  createdAt?: string;
  notes?: string;
}

interface SubTest {
  name: string;
  result: string;
  unit: string;
  range: string;
}

interface LabTest {
  name: string;
  testName: string;
  remarks?: string;
  subTests?: SubTest[];
}

interface LabReport {
  _id: string;
  name?: string;
  type?: string;
  url?: string;
  signedUrl?: string;
  date: string;
  testName?: string;
  hospital?: {
    name: string;
  } | string;
  doctor?: {
    name: string;
  } | string;
  result?: string;
  testValue?: string;
  tests?: LabTest[];
  status?: string;
}

export default function ReportsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Reports'>>();
  const { patientId } = route.params;

  const [activeTab, setActiveTab] = useState<'labs' | 'pharmacy'>('labs');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [selectedLabReport, setSelectedLabReport] = useState<LabReport | null>(null);
  const [isLabModalVisible, setIsLabModalVisible] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (activeTab === 'labs') {
        const endpoint = patientId 
          ? REPORT_ENDPOINTS.GET_BY_PATIENT(patientId)
          : PATIENT_ENDPOINTS.LAB_RECORDS;
        
        console.log('[ReportsScreen] Fetching Labs from:', endpoint);
        const response = await apiClient.get(endpoint);
        const data = response.data.data || response.data;
        const labs = Array.isArray(data) ? data : (Array.isArray(data.labRecords) ? data.labRecords : []);
        console.log('[ReportsScreen] Received Labs:', JSON.stringify(labs.slice(0, 2), null, 2));
        setReports(labs);
      } else {
        console.log('[ReportsScreen] Fetching Pharmacy from:', PATIENT_ENDPOINTS.PRESCRIPTIONS);
        const response = await apiClient.get(PATIENT_ENDPOINTS.PRESCRIPTIONS);
        if (response.data.success || response.data) {
          const data = response.data.data || response.data;
          const prescs = Array.isArray(data) ? data : (Array.isArray(data.prescriptions) ? data.prescriptions : []);
          const filtered = prescs.filter((p: any) => (p.displayType || p.type) !== 'Hospital Administration');
          setPrescriptions(filtered);
        }
      }
    } catch (err: any) {
      console.error('[ReportsScreen] Fetch Data Error:', err);
      setError(err.message || 'Could not load your medical records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [patientId, activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleView = async (report: LabReport) => {
    const fileUrl = report.signedUrl || report.url;
    // If we have a file, open it. If not, show the data modal
    if (fileUrl) {
      console.log('[ReportsScreen] Opening Report URL:', fileUrl);
      await WebBrowser.openBrowserAsync(fileUrl);
    } else {
      console.log('[ReportsScreen] No URL, showing data modal');
      setSelectedLabReport(report);
      setIsLabModalVisible(true);
    }
  };

  const q = (searchQuery || "").toLowerCase();
  
  const filteredReports = (Array.isArray(reports) ? reports : []).filter(r => {
    const reportName = (r?.name || r?.testName || (r?.tests && r?.tests[0]?.testName) || "").toLowerCase();
    const hospName = typeof r.hospital === 'string' ? r.hospital.toLowerCase() : (r?.hospital as any)?.name?.toLowerCase() || "";
    const drName = typeof r.doctor === 'string' ? r.doctor.toLowerCase() : (r?.doctor as any)?.name?.toLowerCase() || "";
    
    return reportName.includes(q) || hospName.includes(q) || drName.includes(q);
  });

  const filteredPrescriptions = (Array.isArray(prescriptions) ? prescriptions : []).filter(p => {
    const drName = (p.doctor as any)?.user?.name || (p.doctor as any)?.name || '';
    return drName.toLowerCase().includes(q) ||
           (p.diagnosis || '').toLowerCase().includes(q);
  });

  const formatFrequency = (freq: string) => {
    if (!freq) return 'As needed';
    const parts = freq.split('-');
    if (parts.length !== 3) return freq;

    const times = [];
    if (parts[0] !== '0') times.push('Morning');
    if (parts[1] !== '0') times.push('Afternoon');
    if (parts[2] !== '0') times.push('Night');

    return times.length > 0 ? times.join(', ') : 'As needed';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerRow}>
          <IconButton 
            icon={() => <ChevronLeft size={24} color="#1A1A1A" />} 
            onPress={() => navigation.goBack()} 
          />
          <Text variant="titleLarge" style={styles.headerTitle}>Reports</Text>
        </View>

        <View style={styles.tabContainer}>
           <TouchableOpacity 
             style={[styles.tab, activeTab === 'pharmacy' && styles.activeTab]} 
             onPress={() => setActiveTab('pharmacy')}
             activeOpacity={0.7}
           >
             <Pill size={20} color={activeTab === 'pharmacy' ? '#006AF5' : '#666'} />
             <Text style={[styles.tabText, activeTab === 'pharmacy' && styles.activeTabText]}>Pharmacy</Text>
           </TouchableOpacity>
           <TouchableOpacity 
             style={[styles.tab, activeTab === 'labs' && styles.activeTab]} 
             onPress={() => setActiveTab('labs')}
             activeOpacity={0.7}
           >
             <FlaskConical size={20} color={activeTab === 'labs' ? '#006AF5' : '#666'} />
             <Text style={[styles.tabText, activeTab === 'labs' && styles.activeTabText]}>Labs</Text>
           </TouchableOpacity>
        </View>
        
        <Searchbar
          placeholder={activeTab === 'labs' ? 'Search Lab Records...' : 'Search Prescription History...'}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          iconColor="#006AF5"
        />
      </Surface>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006AF5']} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#006AF5" style={{ marginTop: 40 }} />
        ) : error && !refreshing ? (
          <View style={styles.errorContainer}>
            <IconButton icon="alert-circle" iconColor="#E53E3E" size={48} />
            <Text style={styles.errorText}>Connectivity Issue</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <Button mode="contained" onPress={fetchData} style={styles.retryBtn}>Retry</Button>
          </View>
        ) : activeTab === 'labs' ? (
          filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <Card key={report._id} style={styles.reportCard} mode="outlined">
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: '#E6FFFA' }]}>
                      <FileText size={24} color="#319795" />
                    </View>
                    <View style={styles.titleInfo}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                          <Text variant="titleMedium" style={[styles.reportName, { minHeight: 20 }]}>
                            {report.name || report.testName || (report.tests && report.tests[0]?.testName) || report.status?.toUpperCase() || 'Medical Record'}
                          </Text>
                          <Text variant="bodySmall" style={styles.reportType}>
                            {report.type || (report.tests && report.tests[0]?.name) || 'Investigation'}
                          </Text>
                        </View>
                        {/* Show result from top level or first test or first subtest */}
                        {(report.result || report.testValue || (report.tests && report.tests[0]?.subTests?.[0]?.result)) && (
                          <View style={{ backgroundColor: '#E6FFFA', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#319795' }}>
                             <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#319795' }}>
                               {report.result || report.testValue || (report.tests && report.tests[0]?.subTests?.[0]?.result)}
                               {report.tests && report.tests[0]?.subTests?.[0]?.unit ? ` ${report.tests[0].subTests[0].unit}` : ''}
                             </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.dateBadge}>
                       <Text style={styles.dateMonth}>{safeFormat(report.date || (report as any).createdAt, 'MMM')}</Text>
                       <Text style={styles.dateDay}>{safeFormat(report.date || (report as any).createdAt, 'dd')}</Text>
                    </View>
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <User size={14} color="#006AF5" />
                      <Text style={[styles.detailText, { fontWeight: '600' }]} numberOfLines={1}>
                        {typeof report.doctor === 'string' ? report.doctor : ((report.doctor as any)?.name || 'Suggested Dr.')}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Building2 size={14} color="#006AF5" />
                      <Text style={[styles.detailText, { fontWeight: '600' }]} numberOfLines={1}>
                        {typeof report.hospital === 'string' ? report.hospital : ((report.hospital as any)?.name || 'Medical Center')}
                      </Text>
                    </View>
                  </View>

                  {(report.tests && report.tests[0]?.remarks) || (report as any).remarks ? (
                    <View style={{ marginTop: 12, backgroundColor: '#F8F9FA', padding: 8, borderRadius: 8 }}>
                       <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#999', marginBottom: 2 }}>DR. REMARKS</Text>
                       <Text style={{ fontSize: 12, color: '#444' }}>{report.tests?.[0]?.remarks || (report as any).remarks}</Text>
                    </View>
                  ) : null}

                  <Divider style={styles.divider} />

                  <View style={styles.actions}>
                    <Button 
                      mode="contained" 
                      icon={() => <Eye size={18} color="#FFF" />}
                      onPress={() => handleView(report)}
                      style={[styles.downloadBtn, { flex: 1 }]}
                      labelStyle={styles.downloadLabel}
                    >
                      { (report.signedUrl || report.url) ? 'View Report' : 'View Full Results' }
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Search size={64} color="#DDD" />
              <Text style={styles.emptyTitle}>No Records Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery ? `No reports matching "${searchQuery}"` : 'Your laboratory investigations will appear here.'}
              </Text>
            </View>
          )
        ) : (
          filteredPrescriptions.length > 0 ? (
            filteredPrescriptions.map((item) => (
              <Card 
                key={item._id} 
                style={styles.reportCard} 
                mode="outlined"
                onPress={() => setSelectedPrescription(item)}
              >
                <Card.Content style={{ padding: 16 }}>
                  <View style={styles.cardHeader}>
                    <View style={styles.leftInfo}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{item.displayType || 'Prescription'}</Text>
                      </View>
                      <Text variant="titleMedium" style={styles.doctorName}>
                        Dr. {item.doctor?.user?.name || item.doctor?.name || 'Specialist'}
                      </Text>
                      <View style={styles.hospitalRow}>
                         <Building2 size={12} color="#006AF5" />
                         <Text style={styles.hospitalNameSmall} numberOfLines={1}>{item.hospital?.name}</Text>
                      </View>
                    </View>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateMonth}>
                        {format(new Date(item.prescriptionDate || item.createdAt || new Date()), 'MMM')}
                      </Text>
                      <Text style={styles.dateDay}>
                        {format(new Date(item.prescriptionDate || item.createdAt || new Date()), 'dd')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.diagnosisBox}>
                    <Text style={styles.diagnosisLabel}>DIAGNOSIS</Text>
                    <Text style={styles.diagnosisText} numberOfLines={1}>{item.diagnosis || 'General Assessment'}</Text>
                  </View>

                  <View style={styles.medsPreview}>
                    {Array.isArray(item.medicines) && item.medicines.slice(0, 2).map((med, idx) => (
                      <View key={idx} style={styles.medItem}>
                        <Pill size={14} color="#006AF5" />
                        <Text style={styles.medName} numberOfLines={1}>{med.name}</Text>
                      </View>
                    ))}
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <FileText size={64} color="#DDD" />
              <Text style={styles.emptyTitle}>No Prescriptions</Text>
              <Text style={styles.emptySub}>Your pharmacy records will appear here.</Text>
            </View>
          )
        )}
      </ScrollView>

      {/* Prescription Detail Modal */}
      <Portal>
        <Modal
          visible={!!selectedPrescription}
          onDismiss={() => setSelectedPrescription(null)}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedPrescription && (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitle}>
                  <View style={styles.modalIconBox}>
                    <Pill size={20} color="#006AF5" />
                  </View>
                  <View>
                    <Text variant="titleMedium" style={styles.modalTitle}>Prescription Info</Text>
                    <Text variant="bodySmall" style={styles.modalSubtitle}>ID: #{selectedPrescription._id.slice(-8).toUpperCase()}</Text>
                  </View>
                </View>
                <IconButton 
                  icon={() => <X size={20} color="#666" />} 
                  onPress={() => setSelectedPrescription(null)} 
                />
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.doctorInfoSection}>
                  <View style={styles.drDetail}>
                    <Stethoscope size={24} color="#006AF5" />
                    <View style={styles.drText}>
                      <Text style={styles.drNameLarge}>Dr. {selectedPrescription.doctor?.user?.name || selectedPrescription.doctor?.name}</Text>
                      <Text style={styles.hospNameSmall}>{selectedPrescription.hospital?.name}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.diagSection}>
                  <View style={styles.sectionHeader}>
                    <Info size={14} color="#666" />
                    <Text style={styles.sectionLabel}>DIAGNOSIS</Text>
                  </View>
                  <Text style={styles.diagTextValue}>{selectedPrescription.diagnosis}</Text>
                </View>

                <View style={styles.medsSection}>
                  <View style={styles.sectionHeader}>
                    <Pill size={14} color="#666" />
                    <Text style={styles.sectionLabel}>MEDICATIONS</Text>
                  </View>
                  {Array.isArray(selectedPrescription.medicines) && selectedPrescription.medicines.map((med: any, mIdx: number) => (
                    <View key={mIdx} style={styles.fullMedItem}>
                      <View style={styles.medHeaderRow}>
                        <Text style={styles.fullMedName}>{med.name}</Text>
                        <View style={styles.freqChip}>
                          <Text style={styles.freqText}>{formatFrequency(med.frequency)}</Text>
                        </View>
                      </View>
                      <Text style={styles.medDetailText}>{med.dosage} • {med.duration}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
              
              <View style={styles.modalFooter}>
                <Button mode="contained" onPress={() => setSelectedPrescription(null)}>Close</Button>
              </View>
            </View>
          )}
        </Modal>
        {/* Lab Results Detail Modal */}
        <Modal
          visible={isLabModalVisible}
          onDismiss={() => setIsLabModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedLabReport && (
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitle}>
                  <View style={[styles.modalIconBox, { backgroundColor: '#E6FFFA' }]}>
                    <FlaskConical size={24} color="#319795" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>
                      {selectedLabReport.name || selectedLabReport.testName || (selectedLabReport.tests && selectedLabReport.tests[0]?.testName) || 'Lab Results'}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {safeFormat(selectedLabReport.date || (selectedLabReport as any).createdAt, 'MMMM dd, yyyy')}
                    </Text>
                  </View>
                </View>
                <IconButton icon="close" size={24} onPress={() => setIsLabModalVisible(false)} />
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.doctorInfoSection}>
                  <View style={styles.drDetail}>
                    <Surface style={[styles.modalIconBox, { width: 45, height: 45, borderRadius: 22 }]} elevation={0}>
                      <User size={24} color="#006AF5" />
                    </Surface>
                    <View style={styles.drText}>
                      <Text style={styles.drNameLarge}>
                        {typeof selectedLabReport.doctor === 'string' ? selectedLabReport.doctor : (selectedLabReport.doctor?.name || 'Assigned Doctor')}
                      </Text>
                      <Text style={styles.hospNameSmall}>
                        {typeof selectedLabReport.hospital === 'string' ? selectedLabReport.hospital : (selectedLabReport.hospital?.name || 'Medical Center')}
                      </Text>
                    </View>
                  </View>
                </View>

                {selectedLabReport.tests && selectedLabReport.tests.map((test, tIdx) => (
                  <View key={tIdx} style={[styles.diagSection, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#F0F0F0' }]}>
                    <View style={styles.sectionHeader}>
                      <Info size={16} color="#319795" />
                      <Text style={[styles.sectionLabel, { color: '#319795' }]}>TEST: {test.testName}</Text>
                    </View>
                    
                    {test.subTests && test.subTests.map((sub, sIdx) => (
                      <View key={sIdx} style={{ paddingVertical: 10, borderBottomWidth: sIdx === test.subTests!.length - 1 ? 0 : 1, borderBottomColor: '#F0F0F0' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontWeight: '600', color: '#1A1A1A' }}>{sub.name}</Text>
                          <Text style={{ fontWeight: 'bold', color: '#006AF5', fontSize: 16 }}>{sub.result} {sub.unit}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={{ fontSize: 11, color: '#888' }}>Normal Range: {sub.range}</Text>
                        </View>
                      </View>
                    ))}

                    {test.remarks && (
                      <View style={{ marginTop: 10, padding: 8, backgroundColor: '#F8F9FA', borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#999' }}>REMARKS</Text>
                        <Text style={{ fontSize: 12, color: '#444' }}>{test.remarks}</Text>
                      </View>
                    )}
                  </View>
                ))}

                {!selectedLabReport.tests && (
                   <View style={styles.emptyContainer}>
                     <Text>No detailed test data available.</Text>
                   </View>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <Button mode="contained" onPress={() => setIsLabModalVisible(false)} style={styles.retryBtn}>
                  Close Results
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 15,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontWeight: 'bold',
    marginLeft: -10,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#EBF4FF',
    borderColor: '#006AF5',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  activeTabText: {
    color: '#006AF5',
    fontWeight: 'bold',
  },
  searchBar: {
    marginHorizontal: 20,
    elevation: 0,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    height: 45,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleInfo: {
    flex: 1,
    marginLeft: 15,
  },
  reportName: {
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  reportType: {
    color: '#888',
    marginTop: 2,
  },
  dateBadge: {
    alignItems: 'center',
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#F0F0F0',
    minWidth: 45,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#006AF5',
    textTransform: 'uppercase',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  divider: {
    marginVertical: 15,
    backgroundColor: '#F0F0F0',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#006AF5',
  },
  downloadBtn: {
    borderRadius: 8,
    backgroundColor: '#006AF5',
  },
  downloadLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#1A1A1A',
  },
  emptySub: {
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 40,
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 100,
    backgroundColor: '#FFF',
    padding: 30,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  errorSub: {
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 12,
  },
  retryBtn: {
    borderRadius: 10,
    width: '100%',
  },
  // Pharmacy/Prescription specific styles
  leftInfo: {
    flex: 1,
  },
  typeBadge: {
    backgroundColor: '#EBF4FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  typeText: {
    color: '#006AF5',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  doctorName: {
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  hospitalNameSmall: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
  diagnosisBox: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  diagnosisLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 2,
  },
  diagnosisText: {
    fontSize: 13,
    color: '#444',
    fontWeight: '600',
  },
  medsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  medName: {
    fontSize: 11,
    color: '#006AF5',
    fontWeight: '600',
    marginLeft: 4,
  },
  modalContainer: {
    padding: 20,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalSubtitle: {
    fontSize: 10,
    color: '#999',
  },
  modalBody: {
    padding: 15,
  },
  doctorInfoSection: {
    marginBottom: 20,
  },
  drDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drText: {
    flex: 1,
  },
  drNameLarge: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  hospNameSmall: {
    color: '#006AF5',
    fontSize: 12,
  },
  diagSection: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#999',
    letterSpacing: 1,
  },
  diagTextValue: {
    fontSize: 14,
    color: '#333',
  },
  medsSection: {
    marginBottom: 20,
  },
  fullMedItem: {
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  medHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fullMedName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  freqChip: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freqText: {
    fontSize: 10,
    color: '#006AF5',
    fontWeight: 'bold',
  },
  medDetailText: {
    fontSize: 12,
    color: '#666',
  },
  modalFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
});
