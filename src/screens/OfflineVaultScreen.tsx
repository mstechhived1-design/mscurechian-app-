import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Dimensions,
  Platform,
  Alert,
  Modal,
  TextInput,
  StatusBar,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cleanFrequency } from '@/utils/pdfExportUtil';
import {
  ShieldAlert,
  Heart,
  Phone,
  Share2,
  ChevronLeft,
  User,
  Activity,
  Pill,
  CheckCircle2,
  QrCode,
  FileText,
  AlertTriangle,
  Info,
  Calendar,
  Lock,
  Download,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  Stethoscope,
  FlaskConical,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  Trash2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import QRCode from 'react-native-qrcode-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Text, Surface, Searchbar, Chip } from 'react-native-paper';

import { RootStackParamList } from '@/navigation/types';
import {
  offlineVaultService,
  OfflineVaultData,
  VaultPrescription,
  VaultLabRecord,
} from '@/services/offlineVaultService';
import { familyService } from '@/services/familyService';
import { DigitalAtriumLoader } from '@/components/SanctuaryComponents';

function formatDuration(duration?: string): string {
  if (!duration) return 'As directed';
  const d = String(duration).trim();
  if (!d) return 'As directed';
  if (/^\d+$/.test(d)) return `${d} Days`;
  return d;
}

function cleanInstructions(instruct?: string): string {
  if (!instruct) return '';
  const s = String(instruct).trim();
  if (!s) return '';
  if (
    s.toLowerCase().includes('status: pending') ||
    s.toLowerCase().includes('status: completed') ||
    s.toLowerCase().includes('[pending]') ||
    s.toLowerCase().includes('[dispensed]') ||
    s.toLowerCase().includes('qty:')
  ) {
    const segments = s.split('|').map(x => x.trim()).filter(Boolean);
    const cleanSegment = segments.find(seg =>
      !seg.toLowerCase().startsWith('qty:') &&
      !seg.toLowerCase().startsWith('status:') &&
      !seg.toLowerCase().includes('pending') &&
      !seg.toLowerCase().includes('completed') &&
      !/^\d+\w*$/.test(seg)
    );
    return cleanSegment || '';
  }
  return s;
}

const { width } = Dimensions.get('window');

type VaultTab = 'prescriptions' | 'labs' | 'qr' | 'settings';

export default function OfflineVaultScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [isOnline, setIsOnline] = useState(offlineVaultService.isOnline());
  const [simulatedOffline, setSimulatedOffline] = useState(offlineVaultService.getIsSimulatedOffline());
  const [activeTab, setActiveTab] = useState<VaultTab>('prescriptions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<VaultPrescription | null>(null);
  const [selectedLabRecord, setSelectedLabRecord] = useState<VaultLabRecord | null>(null);

  const [vaultData, setVaultData] = useState<OfflineVaultData>({
    profile: {
      fullName: 'Loading...',
      mrn: 'MSC-EM-001',
      age: '',
      gender: '',
      bloodGroup: 'O+',
      allergies: ['Penicillin'],
      chronicConditions: ['None Reported'],
      emergencyContactName: 'Family Member',
      emergencyContactPhone: '108',
      emergencyContactRelation: 'Contact',
      secondaryContactPhone: '112',
      hospitalName: 'MS CureChain Partner Hospital',
      organDonor: true,
      specialNotes: 'Emergency medical records cached on device.',
    },
    prescriptions: [],
    labRecords: [],
    lastSyncedAt: new Date().toISOString(),
    version: '1.0',
    isEncrypted: true,
  });

  // Load cached vault data on mount
  useFocusEffect(
    React.useCallback(() => {
      loadVault();
    }, [])
  );

  useEffect(() => {
    loadVault();

    const unsubNet = offlineVaultService.addNetworkListener((online) => {
      setIsOnline(online);
      setSimulatedOffline(offlineVaultService.getIsSimulatedOffline());
    });

    const unsubProfile = familyService.onProfileChange(() => {
      loadVault();
    });

    return () => {
      unsubNet();
      unsubProfile();
    };
  }, []);

  const loadVault = async () => {
    try {
      setLoading(true);
      const data = await offlineVaultService.getVaultData();
      setVaultData(data);
    } catch (e) {
      console.error('[OfflineVaultScreen] Load vault error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    if (!isOnline && !simulatedOffline) {
      Alert.alert(
        'Zero-Network Detected',
        'Device is currently offline with no cellular or Wi-Fi connection. Showing records saved in local device flash storage.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setSyncing(true);
      const res = await offlineVaultService.syncVaultData(true);
      if (res.success) {
        await loadVault();
        Alert.alert(
          'Vault Synchronized',
          `Successfully refreshed offline records:\n• ${res.prescriptionsCount} Prescriptions\n• ${res.labsCount} Lab Reports\n\nAll data is cached for zero-signal offline use.`
        );
      } else {
        Alert.alert('Sync Notice', res.message);
      }
    } catch (err: any) {
      Alert.alert('Sync Error', err.message || 'Could not connect to hospital cloud.');
    } finally {
      setSyncing(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      await offlineVaultService.exportOfflineVaultPdf(vaultData);
    } catch (e: any) {
      Alert.alert('Export Error', e.message || 'Could not export offline emergency PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleToggleSimulatedOffline = async () => {
    const nextVal = !simulatedOffline;
    setSimulatedOffline(nextVal);
    await offlineVaultService.setSimulatedOfflineMode(nextVal);
  };

  const handleCallEmergency = (phoneNumber: string) => {
    const clean = phoneNumber.replace(/[^0-9+]/g, '');
    if (!clean) {
      Alert.alert('Invalid Number', 'No phone number provided.');
      return;
    }
    Linking.openURL(`tel:${clean}`).catch(() => {
      Alert.alert('Error', 'Could not open device dialer.');
    });
  };

  const handleClearVault = () => {
    Alert.alert(
      'Clear Local Vault Cache?',
      'This will remove all offline prescriptions and lab reports from this device until the next online sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            await offlineVaultService.clearVault();
            await loadVault();
            Alert.alert('Vault Cleared', 'Local emergency cache has been reset.');
          },
        },
      ]
    );
  };

  // Filtered lists based on search
  const filteredPrescriptions = useMemo(() => {
    if (!searchQuery.trim()) return vaultData.prescriptions;
    const q = searchQuery.toLowerCase();
    return vaultData.prescriptions.filter(
      (rx) =>
        rx.diagnosis.toLowerCase().includes(q) ||
        rx.doctorName.toLowerCase().includes(q) ||
        rx.hospitalName.toLowerCase().includes(q) ||
        rx.medicines.some((m) => m.name.toLowerCase().includes(q))
    );
  }, [vaultData.prescriptions, searchQuery]);

  const filteredLabRecords = useMemo(() => {
    if (!searchQuery.trim()) return vaultData.labRecords;
    const q = searchQuery.toLowerCase();
    return vaultData.labRecords.filter(
      (lab) =>
        lab.testName.toLowerCase().includes(q) ||
        lab.hospitalName.toLowerCase().includes(q) ||
        lab.summaryResult?.toLowerCase().includes(q) ||
        lab.subTests?.some((st) => st.name.toLowerCase().includes(q))
    );
  }, [vaultData.labRecords, searchQuery]);

  // First-responder QR payload
  const qrPayload = useMemo(() => {
    return JSON.stringify({
      schema: 'MSCURECHAIN_EMERGENCY_V1',
      mrn: vaultData.profile.mrn,
      name: vaultData.profile.fullName,
      bloodGroup: vaultData.profile.bloodGroup,
      age: vaultData.profile.age,
      gender: vaultData.profile.gender,
      allergies: vaultData.profile.allergies,
      conditions: vaultData.profile.chronicConditions,
      icePhone: vaultData.profile.emergencyContactPhone,
      iceName: vaultData.profile.emergencyContactName,
      syncedAt: vaultData.lastSyncedAt,
    });
  }, [vaultData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#991B1B" />

      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <View style={styles.headerBadgeRow}>
            <View style={styles.pulseDot} />
            <Text style={styles.headerBadgeText}>
              {simulatedOffline ? 'SIMULATED OFFLINE' : isOnline ? 'ONLINE • VAULT READY' : 'ZERO SIGNAL SAFE'}
            </Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Emergency Records Vault
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleExportPdf}
            disabled={exportingPdf}
          >
            {exportingPdf ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Share2 size={20} color="#FFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleSyncNow}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <RefreshCw size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Emergency Status & Patient Hero Card ────────────────────────── */}
        <LinearGradient
          colors={['#7F1D1D', '#991B1B', '#B91C1C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroPatientInfo}>
              <Text style={styles.heroMrnBadge}>MRN: {vaultData.profile.mrn}</Text>
              <Text style={styles.heroPatientName} numberOfLines={1}>
                {vaultData.profile.fullName}
              </Text>
              <Text style={styles.heroPatientDemographics}>
                {vaultData.profile.age ? `${vaultData.profile.age} Yrs` : 'Adult'} •{' '}
                {vaultData.profile.gender} • {vaultData.profile.hospitalName || 'MS CureChain'}
              </Text>
            </View>

            <View style={styles.heroBloodGroupWrap}>
              <Text style={styles.heroBloodGroupLabel}>BLOOD GROUP</Text>
              <Text style={styles.heroBloodGroupVal}>{vaultData.profile.bloodGroup}</Text>
            </View>
          </View>

          {/* Critical Allergies Strip */}
          <View style={styles.heroAllergiesContainer}>
            <View style={styles.allergyTitleRow}>
              <ShieldAlert size={14} color="#FECACA" />
              <Text style={styles.allergyTitleText}>CRITICAL ALLERGIES & CONTRAINDICATIONS</Text>
            </View>
            <View style={styles.allergyChipsRow}>
              {vaultData.profile.allergies.map((allergy, index) => (
                <View key={index} style={styles.allergyChip}>
                  <Text style={styles.allergyChipText}>⚠️ {allergy}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Speed Dial Emergency Contacts */}
          <View style={styles.heroContactsRow}>
            <TouchableOpacity
              style={styles.heroContactBtn}
              onPress={() => handleCallEmergency(vaultData.profile.emergencyContactPhone)}
              activeOpacity={0.85}
            >
              <Phone size={14} color="#FFF" />
              <Text style={styles.heroContactBtnText} numberOfLines={1}>
                ICE: {vaultData.profile.emergencyContactName} ({vaultData.profile.emergencyContactPhone})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroAmbulanceBtn}
              onPress={() => handleCallEmergency('108')}
              activeOpacity={0.85}
            >
              <Phone size={14} color="#991B1B" />
              <Text style={styles.heroAmbulanceBtnText}>108 ER</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── Offline Diagnostics Banner ─────────────────────────────────── */}
        <View style={styles.vaultMetaStrip}>
          <View style={styles.vaultMetaLeft}>
            <Lock size={14} color="#059669" />
            <Text style={styles.vaultMetaText}>
              Encrypted Local Snapshot •{' '}
              {new Date(vaultData.lastSyncedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.simToggleBadge}
            onPress={handleToggleSimulatedOffline}
          >
            {simulatedOffline ? (
              <WifiOff size={12} color="#DC2626" />
            ) : (
              <Wifi size={12} color="#059669" />
            )}
            <Text
              style={[
                styles.simToggleText,
                { color: simulatedOffline ? '#DC2626' : '#059669' },
              ]}
            >
              {simulatedOffline ? 'Sim Offline: ON' : 'Live Mode'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Category Tabs ──────────────────────────────────────────────── */}
        <View style={styles.tabBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            <TouchableOpacity
              style={[styles.tabChip, activeTab === 'prescriptions' && styles.tabChipActive]}
              onPress={() => setActiveTab('prescriptions')}
              activeOpacity={0.7}
            >
              <Pill size={15} color={activeTab === 'prescriptions' ? '#DC2626' : '#64748B'} />
              <Text style={[styles.tabChipText, activeTab === 'prescriptions' && styles.tabChipTextActive]}>
                Prescriptions
              </Text>
              <View style={[styles.tabCountBadge, activeTab === 'prescriptions' && styles.tabCountBadgeActive]}>
                <Text style={[styles.tabCountText, activeTab === 'prescriptions' && styles.tabCountTextActive]}>
                  {vaultData.prescriptions.length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabChip, activeTab === 'labs' && styles.tabChipActive]}
              onPress={() => setActiveTab('labs')}
              activeOpacity={0.7}
            >
              <FlaskConical size={15} color={activeTab === 'labs' ? '#DC2626' : '#64748B'} />
              <Text style={[styles.tabChipText, activeTab === 'labs' && styles.tabChipTextActive]}>
                Lab Tests
              </Text>
              <View style={[styles.tabCountBadge, activeTab === 'labs' && styles.tabCountBadgeActive]}>
                <Text style={[styles.tabCountText, activeTab === 'labs' && styles.tabCountTextActive]}>
                  {vaultData.labRecords.length}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabChip, activeTab === 'qr' && styles.tabChipActive]}
              onPress={() => setActiveTab('qr')}
              activeOpacity={0.7}
            >
              <QrCode size={15} color={activeTab === 'qr' ? '#DC2626' : '#64748B'} />
              <Text style={[styles.tabChipText, activeTab === 'qr' && styles.tabChipTextActive]}>
                ER Pass
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabChip, activeTab === 'settings' && styles.tabChipActive]}
              onPress={() => setActiveTab('settings')}
              activeOpacity={0.7}
            >
              <Layers size={15} color={activeTab === 'settings' ? '#DC2626' : '#64748B'} />
              <Text style={[styles.tabChipText, activeTab === 'settings' && styles.tabChipTextActive]}>
                Vault Info
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── Search Bar (For Prescriptions and Labs) ────────────────────── */}
        {(activeTab === 'prescriptions' || activeTab === 'labs') && (
          <View style={styles.searchWrap}>
            <Search size={18} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={
                activeTab === 'prescriptions'
                  ? 'Search medicines, diagnosis, doctor...'
                  : 'Search blood tests, parameters...'
              }
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
        )}

        {/* ── TAB 1: PRESCRIPTIONS ───────────────────────────────────────── */}
        {activeTab === 'prescriptions' && (
          <View style={styles.tabContent}>
            {filteredPrescriptions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Pill size={36} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Prescriptions Cached</Text>
                <Text style={styles.emptySub}>
                  {searchQuery
                    ? 'No cached medications match your search.'
                    : 'Sync when connected to automatically save your latest hospital prescriptions.'}
                </Text>
              </View>
            ) : (
              filteredPrescriptions.map((rx) => (
                <TouchableOpacity
                  key={rx._id}
                  style={styles.rxCard}
                  activeOpacity={0.88}
                  onPress={() => setSelectedPrescription(rx)}
                >
                  <View style={styles.rxCardHeader}>
                    <View style={styles.rxTitleWrap}>
                      <Text style={styles.rxDiagnosis}>{rx.diagnosis}</Text>
                      <Text style={styles.rxDoctorSub}>
                        {rx.doctorName} • {rx.hospitalName}
                      </Text>
                    </View>
                    <View style={styles.rxDateBadge}>
                      <Calendar size={12} color="#64748B" />
                      <Text style={styles.rxDateText}>
                        {new Date(rx.date).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>

                  {/* Medicines List Preview */}
                  <View style={styles.medsTable}>
                    {rx.medicines.map((med, mIdx) => (
                      <View key={mIdx} style={styles.medRow}>
                        <View style={styles.medDot} />
                        <View style={styles.medDetails}>
                          <Text style={styles.medName}>{med.name}</Text>
                          <Text style={styles.medInstructions}>
                            {med.dosage} •{' '}
                            <Text style={styles.medFrequency}>{cleanFrequency(med.frequency)}</Text>
                            {med.duration ? ` • ${formatDuration(med.duration)}` : ''}
                          </Text>
                          {cleanInstructions(med.instructions) ? (
                            <Text style={styles.medRemark}>"{cleanInstructions(med.instructions)}"</Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>

                  {rx.notes ? (
                    <View style={styles.rxNotesBox}>
                      <Text style={styles.rxNotesLabel}>Doctor Advice:</Text>
                      <Text style={styles.rxNotesText}>{rx.notes}</Text>
                    </View>
                  ) : null}

                  <View style={styles.rxCardFooter}>
                    <Text style={styles.rxCachedTag}>⚡ Verified Offline Slip</Text>
                    <View style={styles.rxViewLink}>
                      <Text style={styles.rxViewLinkText}>Tap for Full Details</Text>
                      <ChevronRight size={14} color="#DC2626" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ── TAB 2: LAB & DIAGNOSTIC TESTS ──────────────────────────────── */}
        {activeTab === 'labs' && (
          <View style={styles.tabContent}>
            {filteredLabRecords.length === 0 ? (
              <View style={styles.emptyCard}>
                <FlaskConical size={36} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Lab Reports Cached</Text>
                <Text style={styles.emptySub}>
                  {searchQuery
                    ? 'No cached tests match your query.'
                    : 'Connect to sync your blood tests, pathology, and diagnostic investigations.'}
                </Text>
              </View>
            ) : (
              filteredLabRecords.map((lab) => (
                <TouchableOpacity
                  key={lab._id}
                  style={styles.labCard}
                  activeOpacity={0.88}
                  onPress={() => setSelectedLabRecord(lab)}
                >
                  <View style={styles.labCardHeader}>
                    <View style={styles.labTitleWrap}>
                      <Text style={styles.labTestName}>{lab.testName}</Text>
                      <Text style={styles.labHospitalSub}>
                        {lab.hospitalName} • {lab.category || 'Diagnostic'}
                      </Text>
                    </View>
                    <View style={styles.labStatusBadge}>
                      <CheckCircle2 size={12} color="#166534" />
                      <Text style={styles.labStatusText}>{lab.status}</Text>
                    </View>
                  </View>

                  {/* Sub-tests / Parameters Table */}
                  {lab.subTests && lab.subTests.length > 0 ? (
                    <View style={styles.paramTable}>
                      <View style={styles.paramTableHeader}>
                        <Text style={[styles.paramHeadCol, { flex: 2 }]}>PARAMETER</Text>
                        <Text style={[styles.paramHeadCol, { flex: 1.2, textAlign: 'right' }]}>
                          VALUE
                        </Text>
                        <Text style={[styles.paramHeadCol, { flex: 1.4, textAlign: 'right' }]}>
                          NORMAL RANGE
                        </Text>
                      </View>

                      {lab.subTests.map((st, stIdx) => (
                        <View key={stIdx} style={styles.paramRow}>
                          <Text style={[styles.paramNameText, { flex: 2 }]} numberOfLines={1}>
                            {st.name}
                          </Text>
                          <Text
                            style={[
                              styles.paramValueText,
                              { flex: 1.2, textAlign: 'right' },
                              st.isAbnormal && styles.paramValueAbnormal,
                            ]}
                          >
                            {st.result} {st.unit} {st.isAbnormal ? '⚠️' : ''}
                          </Text>
                          <Text style={[styles.paramRangeText, { flex: 1.4, textAlign: 'right' }]}>
                            {st.range ? `${st.range} ${st.unit}` : 'Standard'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.labSummaryBox}>
                      <Text style={styles.labSummaryLabel}>Summary Finding:</Text>
                      <Text style={styles.labSummaryText}>{lab.summaryResult}</Text>
                    </View>
                  )}

                  <View style={styles.labCardFooter}>
                    <Text style={styles.labDateText}>
                      Reported on {new Date(lab.date).toLocaleDateString()}
                    </Text>
                    <View style={styles.rxViewLink}>
                      <Text style={styles.rxViewLinkText}>Inspect</Text>
                      <ChevronRight size={14} color="#DC2626" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ── TAB 3: FIRST-RESPONDER OFFLINE QR PASS ─────────────────────── */}
        {activeTab === 'qr' && (
          <View style={styles.tabContent}>
            <View style={styles.qrPassCard}>
              <View style={styles.qrBadgePill}>
                <ShieldAlert size={14} color="#DC2626" />
                <Text style={styles.qrBadgeText}>FIRST RESPONDER OFFLINE EMERGENCY PASS</Text>
              </View>

              <Text style={styles.qrInstructions}>
                Scannable by any smartphone camera, paramedic tablet, or ER triage terminal without internet reception.
              </Text>

              <View style={styles.qrFrame}>
                <QRCode
                  value={qrPayload}
                  size={Math.min(width - 120, 220)}
                  color="#0F172A"
                  backgroundColor="#FFFFFF"
                />
              </View>

              <View style={styles.qrDetailsGrid}>
                <View style={styles.qrGridItem}>
                  <Text style={styles.qrGridLabel}>PATIENT MRN</Text>
                  <Text style={styles.qrGridVal}>{vaultData.profile.mrn}</Text>
                </View>
                <View style={styles.qrGridItem}>
                  <Text style={styles.qrGridLabel}>BLOOD GROUP</Text>
                  <Text style={[styles.qrGridVal, { color: '#DC2626' }]}>
                    {vaultData.profile.bloodGroup}
                  </Text>
                </View>
                <View style={styles.qrGridItem}>
                  <Text style={styles.qrGridLabel}>ICE CONTACT</Text>
                  <Text style={styles.qrGridVal}>
                    {vaultData.profile.emergencyContactPhone}
                  </Text>
                </View>
                <View style={styles.qrGridItem}>
                  <Text style={styles.qrGridLabel}>ORGAN DONOR</Text>
                  <Text style={styles.qrGridVal}>
                    {vaultData.profile.organDonor ? 'YES' : 'NO'}
                  </Text>
                </View>
              </View>

              <View style={styles.qrNoticeBox}>
                <Info size={14} color="#0369A1" />
                <Text style={styles.qrNoticeText}>
                  This QR contains compressed emergency clinical data digitally signed by MS CureChain.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── TAB 4: VAULT SETTINGS & DIAGNOSTICS ─────────────────────────── */}
        {activeTab === 'settings' && (
          <View style={styles.tabContent}>
            <View style={styles.settingsCard}>
              <Text style={styles.settingsTitle}>Vault Storage & Diagnostics</Text>

              <View style={styles.settingsRow}>
                <Text style={styles.settingsRowLabel}>Storage Mode</Text>
                <Text style={styles.settingsRowValue}>Device Flash Storage (AES Encrypted)</Text>
              </View>

              <View style={styles.settingsRow}>
                <Text style={styles.settingsRowLabel}>Last Successful Sync</Text>
                <Text style={styles.settingsRowValue}>
                  {new Date(vaultData.lastSyncedAt).toLocaleString()}
                </Text>
              </View>

              <View style={styles.settingsRow}>
                <Text style={styles.settingsRowLabel}>Cached Prescriptions</Text>
                <Text style={styles.settingsRowValue}>{vaultData.prescriptions.length} Records</Text>
              </View>

              <View style={styles.settingsRow}>
                <Text style={styles.settingsRowLabel}>Cached Lab Reports</Text>
                <Text style={styles.settingsRowValue}>{vaultData.labRecords.length} Reports</Text>
              </View>

              <View style={styles.settingsRow}>
                <Text style={styles.settingsRowLabel}>Active Network Status</Text>
                <Text
                  style={[
                    styles.settingsRowValue,
                    { color: isOnline ? '#166534' : '#DC2626', fontWeight: '700' },
                  ]}
                >
                  {isOnline ? 'Connected (Cloud Sync Active)' : 'Offline (Zero Signal Mode)'}
                </Text>
              </View>

              {/* Offline Simulation Switch */}
              <TouchableOpacity
                style={styles.simActionBtn}
                onPress={handleToggleSimulatedOffline}
              >
                <View style={styles.simActionLeft}>
                  {simulatedOffline ? (
                    <WifiOff size={20} color="#DC2626" />
                  ) : (
                    <Wifi size={20} color="#059669" />
                  )}
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.simActionTitle}>
                      {simulatedOffline ? 'Simulated Offline Mode Active' : 'Simulate Zero-Signal Mode'}
                    </Text>
                    <Text style={styles.simActionSub}>
                      {simulatedOffline
                        ? 'Testing zero-network behavior. Tap to restore live network.'
                        : 'Simulates hospital basement with no cell signal.'}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#64748B" />
              </TouchableOpacity>

              {/* Force Sync Action */}
              <TouchableOpacity
                style={styles.syncActionBtn}
                onPress={handleSyncNow}
                disabled={syncing}
              >
                <RefreshCw size={18} color="#0284C7" />
                <Text style={styles.syncActionText}>
                  {syncing ? 'Syncing with Server...' : 'Force Cloud Sync Now'}
                </Text>
              </TouchableOpacity>

              {/* Export PDF Button */}
              <TouchableOpacity
                style={styles.exportActionBtn}
                onPress={handleExportPdf}
                disabled={exportingPdf}
              >
                <Download size={18} color="#166534" />
                <Text style={styles.exportActionText}>
                  {exportingPdf ? 'Generating PDF...' : 'Export Complete Emergency PDF Slip'}
                </Text>
              </TouchableOpacity>

              {/* Clear Cache Button */}
              <TouchableOpacity
                style={styles.clearActionBtn}
                onPress={handleClearVault}
              >
                <Trash2 size={16} color="#DC2626" />
                <Text style={styles.clearActionText}>Clear Local Vault Storage</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Prescription Detail Modal ───────────────────────────────────── */}
      <Modal
        visible={!!selectedPrescription}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedPrescription(null)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 45 : 70}
            tint="dark"
            style={StyleSheet.absoluteFill}
          >
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedPrescription(null)} activeOpacity={1} />
          </BlurView>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Prescription Details</Text>
                <Text style={styles.modalSub}>
                  {selectedPrescription?.diagnosis} • {selectedPrescription?.hospitalName}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedPrescription(null)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalDoctorBox}>
                <Stethoscope size={18} color="#0284C7" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.modalDoctorName}>
                    {selectedPrescription?.doctorName}
                  </Text>
                  <Text style={styles.modalDoctorSpec}>
                    {selectedPrescription?.doctorSpecialty || 'General Medicine'}
                  </Text>
                </View>
              </View>

              <Text style={styles.modalSectionHeading}>PRESCRIBED MEDICINES</Text>
              {selectedPrescription?.medicines.map((m, idx) => (
                <View key={idx} style={styles.modalMedCard}>
                  <View style={styles.modalMedHeader}>
                    <Text style={styles.modalMedName}>{m.name}</Text>
                    <Text style={styles.modalMedDose}>{m.dosage}</Text>
                  </View>
                  <View style={styles.modalMedTimingRow}>
                    <Text style={styles.modalMedTiming}>Regimen: {cleanFrequency(m.frequency)}</Text>
                    <Text style={styles.modalMedDuration}>Duration: {formatDuration(m.duration)}</Text>
                  </View>
                  {cleanInstructions(m.instructions) ? (
                    <Text style={styles.modalMedInstruct}>Advice: {cleanInstructions(m.instructions)}</Text>
                  ) : null}
                </View>
              ))}

              {selectedPrescription?.notes ? (
                <View style={styles.modalNotesBox}>
                  <Text style={styles.modalNotesLabel}>Additional Instructions:</Text>
                  <Text style={styles.modalNotesText}>{selectedPrescription.notes}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalPrintBtn}
                onPress={handleExportPdf}
              >
                <Share2 size={16} color="#FFF" />
                <Text style={styles.modalPrintBtnText}>Share Emergency PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Lab Report Detail Modal ─────────────────────────────────────── */}
      <Modal
        visible={!!selectedLabRecord}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedLabRecord(null)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 45 : 70}
            tint="dark"
            style={StyleSheet.absoluteFill}
          >
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setSelectedLabRecord(null)} activeOpacity={1} />
          </BlurView>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedLabRecord?.testName}</Text>
                <Text style={styles.modalSub}>{selectedLabRecord?.hospitalName}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedLabRecord(null)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedLabRecord?.subTests && selectedLabRecord.subTests.length > 0 ? (
                <View style={styles.modalParamsTable}>
                  {selectedLabRecord.subTests.map((st, i) => (
                    <View key={i} style={styles.modalParamRow}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.modalParamName}>{st.name}</Text>
                        <Text style={styles.modalParamRange}>
                          Normal: {st.range} {st.unit}
                        </Text>
                      </View>
                      <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                        <Text
                          style={[
                            styles.modalParamValue,
                            st.isAbnormal && { color: '#DC2626', fontWeight: '800' },
                          ]}
                        >
                          {st.result} {st.unit}
                        </Text>
                        {st.isAbnormal ? (
                          <Text style={styles.modalParamAbnormalTag}>OUT OF RANGE</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.modalSimpleResult}>
                  <Text style={styles.modalResultLabel}>Result Finding:</Text>
                  <Text style={styles.modalResultValue}>{selectedLabRecord?.summaryResult}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalPrintBtn}
                onPress={handleExportPdf}
              >
                <Share2 size={16} color="#FFF" />
                <Text style={styles.modalPrintBtnText}>Export Report Summary</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#991B1B',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  loadingSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748B',
  },
  headerBar: {
    backgroundColor: '#991B1B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 8,
    paddingBottom: 14,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
    marginRight: 6,
  },
  headerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FECACA',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroCard: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#991B1B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroPatientInfo: {
    flex: 1,
    marginRight: 12,
  },
  heroMrnBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FEE2E2',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  heroPatientName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  heroPatientDemographics: {
    fontSize: 11,
    color: '#FCA5A5',
    marginTop: 2,
  },
  heroBloodGroupWrap: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    minWidth: 70,
  },
  heroBloodGroupLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 0.5,
  },
  heroBloodGroupVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#B91C1C',
  },
  heroAllergiesContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  allergyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  allergyTitleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FECACA',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  allergyChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  allergyChip: {
    backgroundColor: '#FFF',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  allergyChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
  },
  heroContactsRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  heroContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  heroContactBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 6,
  },
  heroAmbulanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  heroAmbulanceBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
    marginLeft: 4,
  },
  vaultMetaStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vaultMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vaultMetaText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    marginLeft: 6,
  },
  simToggleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  simToggleText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  tabBarWrapper: {
    marginHorizontal: 16,
    marginBottom: 14,
  },
  tabScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabChipActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
  tabChipTextActive: {
    color: '#991B1B',
    fontWeight: '800',
  },
  tabCountBadge: {
    marginLeft: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabCountBadgeActive: {
    backgroundColor: '#FECACA',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabCountTextActive: {
    color: '#991B1B',
    fontWeight: '800',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  rxCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  rxCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  rxTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  rxDiagnosis: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  rxDoctorSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  rxDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  rxDateText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
    marginLeft: 4,
  },
  medsTable: {
    marginBottom: 8,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  medDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0284C7',
    marginTop: 6,
    marginRight: 8,
  },
  medDetails: {
    flex: 1,
  },
  medName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  medInstructions: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  medFrequency: {
    fontWeight: '700',
    color: '#0284C7',
  },
  medRemark: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 2,
  },
  rxNotesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
  },
  rxNotesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  rxNotesText: {
    fontSize: 11,
    color: '#334155',
    marginTop: 2,
  },
  rxCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  rxCachedTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  rxViewLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rxViewLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginRight: 2,
  },
  labCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  labTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  labTestName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  labHospitalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  labStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  labStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    marginLeft: 4,
  },
  paramTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  paramTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 4,
    marginBottom: 6,
  },
  paramHeadCol: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paramNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  paramValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  paramValueAbnormal: {
    color: '#DC2626',
    fontWeight: '800',
  },
  paramRangeText: {
    fontSize: 10,
    color: '#64748B',
  },
  labSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  labSummaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  labSummaryText: {
    fontSize: 11,
    color: '#1E293B',
    marginTop: 2,
  },
  labCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  labDateText: {
    fontSize: 10,
    color: '#64748B',
  },
  qrPassCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginBottom: 8,
  },
  qrBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  qrInstructions: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  qrFrame: {
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  qrDetailsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  qrGridItem: {
    width: '50%',
    padding: 6,
  },
  qrGridLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  qrGridVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  qrNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 10,
  },
  qrNoticeText: {
    fontSize: 10,
    color: '#0369A1',
    marginLeft: 6,
    flex: 1,
  },
  settingsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingsRowLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  settingsRowValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  simActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  simActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  simActionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  simActionSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  syncActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  syncActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
    marginLeft: 6,
  },
  exportActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  exportActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 6,
  },
  clearActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  clearActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
  },
  modalBody: {
    padding: 16,
  },
  modalDoctorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  modalDoctorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  modalDoctorSpec: {
    fontSize: 11,
    color: '#0284C7',
  },
  modalSectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalMedCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalMedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalMedName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalMedDose: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  modalMedTimingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  modalMedTiming: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  modalMedDuration: {
    fontSize: 11,
    color: '#475569',
  },
  modalMedInstruct: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalNotesBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  modalNotesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  modalNotesText: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 2,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  modalPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalPrintBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 6,
  },
  modalParamsTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
  },
  modalParamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalParamName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalParamRange: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  modalParamValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  modalParamAbnormalTag: {
    fontSize: 8,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 2,
  },
  modalSimpleResult: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
  },
  modalResultLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  modalResultValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 4,
  },
});
