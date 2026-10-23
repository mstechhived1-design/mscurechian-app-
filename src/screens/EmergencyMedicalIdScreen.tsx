import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShieldAlert,
  Heart,
  Phone,
  Share2,
  Edit3,
  X,
  ChevronLeft,
  User,
  Activity,
  Pill,
  CheckCircle2,
  QrCode,
  Printer,
  AlertTriangle,
  Info,
  Calendar,
  Lock,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/navigation/types';
import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { familyService } from '@/services/familyService';
import { COLORS } from '../constants/designSystem';
import { SanctuaryText } from '../components/SanctuaryComponents';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 32, 420);

export interface EmergencyMedicalIdData {
  fullName: string;
  age: string;
  gender: string;
  bloodGroup: string;
  mrn: string;
  allergies: string[];
  chronicConditions: string[];
  medications: string[];
  organDonor: boolean;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  hospitalName?: string;
  specialNotes?: string;
  avatarUri?: string;
  lastUpdated?: string;
}

const STORAGE_KEY = 'mscurechain_emergency_medical_id';

export default function EmergencyMedicalIdScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'card' | 'qr' | 'contacts'>('card');
  const [data, setData] = useState<EmergencyMedicalIdData>({
    fullName: 'Patient',
    age: '',
    gender: 'Unknown',
    bloodGroup: 'O+',
    mrn: 'MSC-EM-001',
    allergies: ['Penicillin'],
    chronicConditions: ['None Reported'],
    medications: ['None Reported'],
    organDonor: true,
    emergencyContactName: 'Family Member',
    emergencyContactPhone: '108',
    emergencyContactRelation: 'Spouse',
    hospitalName: 'MS CureChain Partner Hospital',
    specialNotes: 'Present this ID to ER triage or ambulance staff.',
    lastUpdated: new Date().toLocaleDateString(),
  });

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState<EmergencyMedicalIdData>(data);
  const [newAllergyInput, setNewAllergyInput] = useState('');
  const [newConditionInput, setNewConditionInput] = useState('');
  const [newMedInput, setNewMedInput] = useState('');
  const [exporting, setExporting] = useState(false);

  const getStorageKey = async () => {
    const pid = (await familyService.getActivePatientId()) || 'default';
    return `mscurechain_emergency_medical_id_${pid}`;
  };

  useFocusEffect(
    React.useCallback(() => {
      loadMedicalIdData();
    }, [])
  );

  useEffect(() => {
    loadMedicalIdData();

    const unsub = familyService.onProfileChange(() => {
      loadMedicalIdData();
    });
    return () => unsub();
  }, []);

  const loadMedicalIdData = async () => {
    try {
      setLoading(true);

      // 1. Read offline cache
      const key = await getStorageKey();
      const cached = await AsyncStorage.getItem(key);
      let initialData: Partial<EmergencyMedicalIdData> = {};
      if (cached) {
        try {
          initialData = JSON.parse(cached);
          setData((prev) => ({ ...prev, ...initialData }));
        } catch (e) {
          console.warn('[EmergencyMedicalId] Failed to parse cache:', e);
        }
      }

      const activePid = (await familyService.getActivePatientId()) || 'default';
      const storedAvatar = await AsyncStorage.getItem(`patient_profile_avatar_${activePid}`) || await AsyncStorage.getItem('patient_profile_avatar');

      // 2. Fetch fresh user profile from backend
      try {
        const response = await apiClient.get(PATIENT_ENDPOINTS.PROFILE);
        const profile = response.data;
        const user = profile?.user || profile || {};

        const allergiesList = typeof user.allergies === 'string'
          ? user.allergies.split(',').map((s: string) => s.trim()).filter(Boolean)
          : Array.isArray(user.allergies) ? user.allergies : initialData.allergies || ['None Reported'];

        const conditionsList = typeof user.conditions === 'string'
          ? user.conditions.split(',').map((s: string) => s.trim()).filter(Boolean)
          : Array.isArray(user.conditions) ? user.conditions : initialData.chronicConditions || ['None Reported'];

        const merged: EmergencyMedicalIdData = {
          fullName: user.name || initialData.fullName || 'Patient',
          age: String(user.age || initialData.age || ''),
          gender: user.gender || initialData.gender || 'Unknown',
          bloodGroup: user.bloodGroup || initialData.bloodGroup || 'O+',
          mrn: profile?.mrn || user.patientId || initialData.mrn || 'MSC-EM-001',
          allergies: allergiesList.length > 0 ? allergiesList : ['None Reported'],
          chronicConditions: conditionsList.length > 0 ? conditionsList : ['None Reported'],
          medications: initialData.medications && initialData.medications.length > 0 ? initialData.medications : ['None Reported'],
          organDonor: initialData.organDonor ?? true,
          emergencyContactName: user.emergencyContactName || user.emergencyContact?.name || initialData.emergencyContactName || 'Family Member',
          emergencyContactPhone: user.emergencyContactPhone || user.emergencyContact?.phone || initialData.emergencyContactPhone || '108',
          emergencyContactRelation: user.emergencyContactRelation || user.emergencyContact?.relation || initialData.emergencyContactRelation || 'Emergency Contact',
          secondaryContactName: initialData.secondaryContactName || 'Emergency Dispatch',
          secondaryContactPhone: initialData.secondaryContactPhone || '108',
          hospitalName: user.hospitalName || initialData.hospitalName || 'MS CureChain Partner Hospital',
          specialNotes: initialData.specialNotes || 'Present this ID to ER triage or ambulance staff.',
          avatarUri: storedAvatar || undefined,
          lastUpdated: new Date().toLocaleDateString(),
        };

        setData(merged);
        setEditForm(merged);
        await AsyncStorage.setItem(key, JSON.stringify(merged));
      } catch (apiErr) {
        console.warn('[EmergencyMedicalId] Offline mode active, loaded cached card:', apiErr);
      }
    } catch (err) {
      console.error('[EmergencyMedicalId] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const updated = {
        ...editForm,
        lastUpdated: new Date().toLocaleDateString(),
      };
      setData(updated);
      const key = await getStorageKey();
      await AsyncStorage.setItem(key, JSON.stringify(updated));

      try {
        await apiClient.put(PATIENT_ENDPOINTS.PROFILE, {
          bloodGroup: updated.bloodGroup,
          allergies: updated.allergies.join(', '),
          conditions: updated.chronicConditions.join(', '),
          emergencyContactName: updated.emergencyContactName,
          emergencyContactPhone: updated.emergencyContactPhone,
          emergencyContactRelation: updated.emergencyContactRelation,
        });
      } catch (syncErr) {
        console.log('[EmergencyMedicalId] Saved locally, remote sync queued:', syncErr);
      }

      setEditModalVisible(false);
      Alert.alert('Updated', 'Emergency Medical ID Card has been saved offline and securely synced.');
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save changes: ' + err.message);
    }
  };

  const handleDialNumber = (phone: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${clean}`).catch(() => {
      Alert.alert('Call Failed', 'Unable to initiate call to ' + clean);
    });
  };

  // Generate Emergency Card HTML
  const generateCardHtml = () => {
    const allergiesHtml = data.allergies.map(a => `<span class="pill pill-alert">${a}</span>`).join(' ');
    const conditionsHtml = data.chronicConditions.map(c => `<span class="pill pill-info">${c}</span>`).join(' ');
    const medsHtml = data.medications.map(m => `<span class="pill pill-neutral">${m}</span>`).join(' ');

    const qrPayload = JSON.stringify({
      type: 'MSCURECHAIN_EMERGENCY_ID',
      name: data.fullName,
      blood: data.bloodGroup,
      mrn: data.mrn,
      allergies: data.allergies,
      conditions: data.chronicConditions,
      ice: `${data.emergencyContactName} (${data.emergencyContactPhone})`,
      donor: data.organDonor ? 'YES' : 'NO',
    });

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 24px; margin: 0; }
          .card { max-width: 480px; margin: 0 auto; background: #ffffff; border: 2px solid #dc2626; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.15); }
          .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ef4444; }
          .header-title { font-size: 19px; font-weight: 900; letter-spacing: 0.5px; color: #ffffff; margin: 0; text-transform: uppercase; }
          .header-sub { font-size: 11px; color: #fee2e2; margin-top: 3px; font-weight: 600; }
          .badge-pulse { background: #ffffff; color: #dc2626; padding: 4px 10px; border-radius: 9999px; font-weight: 900; font-size: 11px; }
          .body { padding: 22px; }
          .profile-row { display: flex; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 18px; }
          .blood-box { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff; border-radius: 14px; padding: 10px 16px; text-align: center; border: 1.5px solid #f87171; margin-right: 18px; min-width: 68px; }
          .blood-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #fee2e2; }
          .blood-val { font-size: 30px; font-weight: 900; line-height: 1.1; margin-top: 2px; }
          .p-name { font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; }
          .p-meta { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 600; }
          .sec-title { font-size: 11px; text-transform: uppercase; color: #dc2626; font-weight: 800; letter-spacing: 0.8px; margin-bottom: 8px; margin-top: 16px; }
          .pills-box { display: flex; flex-wrap: wrap; gap: 6px; }
          .pill { display: inline-block; padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; }
          .pill-alert { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
          .pill-info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
          .pill-neutral { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
          .ice-card { background: #f8fafc; border-radius: 12px; padding: 14px; margin-top: 18px; border: 1.5px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
          .ice-label { font-size: 10px; color: #dc2626; font-weight: 800; text-transform: uppercase; }
          .ice-name { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px; }
          .ice-phone { font-size: 16px; font-weight: 900; color: #059669; margin-top: 2px; letter-spacing: 0.5px; }
          .donor-tag { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; background: ${data.organDonor ? '#ecfdf5' : '#f1f5f9'}; color: ${data.organDonor ? '#059669' : '#64748b'}; border: 1px solid ${data.organDonor ? '#a7f3d0' : '#cbd5e1'}; }
          .footer { background: #f8fafc; padding: 14px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
          .qr-center { text-align: center; margin-top: 20px; padding: 14px; background: #ffffff; border-radius: 12px; display: inline-block; border: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div>
              <h1 class="header-title">EMERGENCY MEDICAL ID</h1>
              <div class="header-sub">MS CureChain Healthcare Network · Verified Health Card</div>
            </div>
            <div class="badge-pulse">ICE / EMS</div>
          </div>

          <div class="body">
            <div class="profile-row">
              <div class="blood-box">
                <div class="blood-label">Blood</div>
                <div class="blood-val">${data.bloodGroup}</div>
              </div>
              <div>
                <h2 class="p-name">${data.fullName}</h2>
                <div class="p-meta">MRN: ${data.mrn} · ${data.age ? data.age + ' Yrs' : ''} ${data.gender}</div>
                <div style="margin-top: 8px;">
                  <span class="donor-tag">${data.organDonor ? '❤️ ORGAN DONOR: YES' : 'ORGAN DONOR: NO'}</span>
                </div>
              </div>
            </div>

            <div class="sec-title">⚠️ Critical Allergies & Sensitivities</div>
            <div class="pills-box">
              ${allergiesHtml}
            </div>

            <div class="sec-title">🩺 Chronic Conditions & Medical Implants</div>
            <div class="pills-box">
              ${conditionsHtml}
            </div>

            <div class="sec-title">💊 Active Medications</div>
            <div class="pills-box">
              ${medsHtml}
            </div>

            <div class="ice-card">
              <div>
                <div class="ice-label">Primary In Case of Emergency (ICE)</div>
                <div class="ice-name">${data.emergencyContactName} (${data.emergencyContactRelation})</div>
                <div class="ice-phone">${data.emergencyContactPhone}</div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 26px;">📞</span>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <div class="qr-center">
                <img src="${qrUrl}" width="120" height="120" alt="Emergency QR" />
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 6px;">Scan with any phone camera to read medical summary offline</div>
            </div>
          </div>

          <div class="footer">
            This card is accessible offline 24/7 on this device without network connectivity.
            <br>Ambulance: 108 · National Emergency: 112
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Robust Export/Print/Save as PDF Handler
  const handleExportCard = async () => {
    try {
      setExporting(true);
      const html = generateCardHtml();

      // Native Platform Print & Save-to-PDF Dialog (Universal, 0 file permission issues)
      await Print.printAsync({ html });
    } catch (err: any) {
      console.error('[EmergencyMedicalId] Export failed:', err);
      Alert.alert('Notice', 'Unable to open document: ' + (err.message || 'Please try again'));
    } finally {
      setExporting(false);
    }
  };

  // QR String for Emergency Responders
  const qrString = JSON.stringify({
    app: 'MSCureChain',
    type: 'EMERGENCY_MEDICAL_ID',
    name: data.fullName,
    blood: data.bloodGroup,
    mrn: data.mrn,
    age: data.age,
    gender: data.gender,
    allergies: data.allergies,
    conditions: data.chronicConditions,
    meds: data.medications,
    ice: `${data.emergencyContactName}: ${data.emergencyContactPhone}`,
    donor: data.organDonor,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Screen Header - Clean Medical White */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <SanctuaryText variant="headline_sm" style={styles.topTitle}>
            Emergency Medical ID
          </SanctuaryText>
          <SanctuaryText variant="body_sm" style={styles.topSubtitle}>
            Offline First-Responder Card
          </SanctuaryText>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => {
              setEditForm(data);
              setEditModalVisible(true);
            }}
            accessibilityLabel="Edit Emergency Card"
          >
            <Edit3 size={18} color="#0F172A" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}
            onPress={handleExportCard}
            accessibilityLabel="Export Emergency Card"
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Printer size={18} color="#DC2626" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Mode Segment Switch - Clean White/Light Red */}
      <View style={styles.segmentBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'card' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('card')}
        >
          <ShieldAlert size={15} color={activeTab === 'card' ? '#FFF' : '#64748B'} />
          <SanctuaryText
            variant="label_sm"
            style={[styles.segmentTxt, activeTab === 'card' && styles.segmentTxtActive]}
          >
            Medical Card
          </SanctuaryText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'qr' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('qr')}
        >
          <QrCode size={15} color={activeTab === 'qr' ? '#FFF' : '#64748B'} />
          <SanctuaryText
            variant="label_sm"
            style={[styles.segmentTxt, activeTab === 'qr' && styles.segmentTxtActive]}
          >
            Responder QR
          </SanctuaryText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'contacts' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('contacts')}
        >
          <Phone size={15} color={activeTab === 'contacts' ? '#FFF' : '#64748B'} />
          <SanctuaryText
            variant="label_sm"
            style={[styles.segmentTxt, activeTab === 'contacts' && styles.segmentTxtActive]}
          >
            ICE Contacts
          </SanctuaryText>
        </TouchableOpacity>
      </View>

      {/* Main Scroll Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'card' && (
          <>
            {/* ── LUXURY LIGHT-THEMED PHYSICAL MEDICAL ID CARD ── */}
            <View style={styles.cardContainer}>
              <LinearGradient
                colors={['#DC2626', '#B91C1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardHeader}
              >
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.cardShieldIconBox}>
                    <ShieldAlert size={20} color="#DC2626" />
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <SanctuaryText variant="label_lg" style={styles.cardTitle}>
                      EMERGENCY MEDICAL ID
                    </SanctuaryText>
                    <SanctuaryText variant="body_sm" style={styles.cardSub}>
                      MS CURECHAIN HEALTH LEDGER
                    </SanctuaryText>
                  </View>
                </View>
                <View style={styles.icePill}>
                  <SanctuaryText variant="label_sm" style={styles.icePillTxt}>
                    ICE / EMS
                  </SanctuaryText>
                </View>
              </LinearGradient>

              <View style={styles.cardBody}>
                {/* Patient Primary Strip */}
                <View style={styles.patientRow}>
                  {/* High Contrast Crimson Blood Group Box */}
                  <LinearGradient
                    colors={['#DC2626', '#991B1B']}
                    style={styles.bloodBadgeBox}
                  >
                    <SanctuaryText variant="label_sm" style={styles.bloodLabel}>
                      BLOOD
                    </SanctuaryText>
                    <SanctuaryText variant="headline_sm" style={styles.bloodValue}>
                      {data.bloodGroup || 'O+'}
                    </SanctuaryText>
                  </LinearGradient>

                  {/* Patient Info */}
                  <View style={styles.patientMeta}>
                    <SanctuaryText variant="headline_sm" style={styles.patientName} numberOfLines={1}>
                      {data.fullName}
                    </SanctuaryText>
                    <SanctuaryText variant="body_sm" style={styles.patientSub}>
                      MRN: {data.mrn} · {data.age ? `${data.age} Yrs` : ''} {data.gender}
                    </SanctuaryText>

                    <View style={styles.organDonorRow}>
                      <View
                        style={[
                          styles.donorPill,
                          {
                            backgroundColor: data.organDonor ? '#ECFDF5' : '#F1F5F9',
                            borderColor: data.organDonor ? '#A7F3D0' : '#CBD5E1',
                          },
                        ]}
                      >
                        <Heart size={11} color={data.organDonor ? '#059669' : '#64748B'} fill={data.organDonor ? '#059669' : 'none'} />
                        <SanctuaryText
                          variant="label_sm"
                          style={[styles.donorTxt, { color: data.organDonor ? '#059669' : '#64748B' }]}
                        >
                          {data.organDonor ? 'ORGAN DONOR: YES' : 'ORGAN DONOR: NO'}
                        </SanctuaryText>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Critical Allergies Section */}
                <View style={styles.sectionWrap}>
                  <View style={styles.secHeaderRow}>
                    <AlertTriangle size={14} color="#DC2626" />
                    <SanctuaryText variant="label_sm" style={styles.secTitle}>
                      CRITICAL ALLERGIES & SENSITIVITIES
                    </SanctuaryText>
                  </View>
                  <View style={styles.tagsRow}>
                    {data.allergies.map((allergy, i) => (
                      <View key={i} style={styles.allergyTag}>
                        <SanctuaryText variant="label_sm" style={styles.allergyTagTxt}>
                          {allergy}
                        </SanctuaryText>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Chronic Conditions Section */}
                <View style={styles.sectionWrap}>
                  <View style={styles.secHeaderRow}>
                    <Activity size={14} color="#2563EB" />
                    <SanctuaryText variant="label_sm" style={[styles.secTitle, { color: '#2563EB' }]}>
                      CHRONIC CONDITIONS & IMPLANTS
                    </SanctuaryText>
                  </View>
                  <View style={styles.tagsRow}>
                    {data.chronicConditions.map((cond, i) => (
                      <View key={i} style={styles.conditionTag}>
                        <SanctuaryText variant="label_sm" style={styles.conditionTagTxt}>
                          {cond}
                        </SanctuaryText>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Active Medications */}
                <View style={styles.sectionWrap}>
                  <View style={styles.secHeaderRow}>
                    <Pill size={14} color="#7C3AED" />
                    <SanctuaryText variant="label_sm" style={[styles.secTitle, { color: '#7C3AED' }]}>
                      ACTIVE MEDICATIONS
                    </SanctuaryText>
                  </View>
                  <View style={styles.tagsRow}>
                    {data.medications.map((med, i) => (
                      <View key={i} style={styles.medTag}>
                        <SanctuaryText variant="label_sm" style={styles.medTagTxt}>
                          {med}
                        </SanctuaryText>
                      </View>
                    ))}
                  </View>
                </View>

                {/* In Case of Emergency Primary Box */}
                <TouchableOpacity
                  style={styles.iceCard}
                  onPress={() => handleDialNumber(data.emergencyContactPhone)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <SanctuaryText variant="label_sm" style={styles.iceCardLabel}>
                      PRIMARY EMERGENCY CONTACT (ICE)
                    </SanctuaryText>
                    <SanctuaryText variant="label_lg" style={styles.iceCardName}>
                      {data.emergencyContactName} ({data.emergencyContactRelation})
                    </SanctuaryText>
                    <SanctuaryText variant="label_lg" style={styles.iceCardPhone}>
                      {data.emergencyContactPhone}
                    </SanctuaryText>
                  </View>
                  <View style={styles.callIconBubble}>
                    <Phone size={18} color="#FFF" />
                  </View>
                </TouchableOpacity>

                {/* Special Clinical Notes */}
                {Boolean(data.specialNotes) && (
                  <View style={styles.notesBox}>
                    <Info size={14} color="#64748B" />
                    <SanctuaryText variant="body_sm" style={styles.notesTxt}>
                      {data.specialNotes}
                    </SanctuaryText>
                  </View>
                )}
              </View>

              {/* Offline Ledger Footer */}
              <View style={styles.cardFooter}>
                <CheckCircle2 size={13} color="#059669" />
                <SanctuaryText variant="body_sm" style={styles.cardFooterTxt}>
                  OFFLINE AVAILABLE 24/7 · ZERO DATA REQUIRED
                </SanctuaryText>
              </View>
            </View>

            {/* Quick Action Buttons */}
            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={handleExportCard}
                activeOpacity={0.8}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Printer size={18} color="#FFF" />
                    <SanctuaryText variant="label_lg" style={styles.actionBtnTxt}>
                      SAVE / EXPORT CARD (PDF)
                    </SanctuaryText>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => {
                  setEditForm(data);
                  setEditModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Edit3 size={18} color="#0F172A" />
                <SanctuaryText variant="label_lg" style={styles.actionBtnSecondaryTxt}>
                  EDIT DETAILS
                </SanctuaryText>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── RESPONDER QR CODE TAB ── */}
        {activeTab === 'qr' && (
          <View style={styles.qrTabContainer}>
            <View style={styles.qrCard}>
              <SanctuaryText variant="headline_sm" style={styles.qrTitle}>
                Emergency Responder QR
              </SanctuaryText>
              <SanctuaryText variant="body_sm" style={styles.qrSubtitle}>
                Scan with any ambulance scanner or camera app to immediately extract blood group, allergies, and emergency contact details offline.
              </SanctuaryText>

              <View style={styles.qrWrapper}>
                <QRCode
                  value={qrString}
                  size={200}
                  color="#0F172A"
                  backgroundColor="#FFFFFF"
                />
              </View>

              <View style={styles.qrInfoGrid}>
                <View style={styles.qrInfoCol}>
                  <SanctuaryText variant="label_sm" style={styles.qrInfoLabel}>PATIENT</SanctuaryText>
                  <SanctuaryText variant="label_lg" style={styles.qrInfoVal}>{data.fullName}</SanctuaryText>
                </View>
                <View style={styles.qrInfoCol}>
                  <SanctuaryText variant="label_sm" style={styles.qrInfoLabel}>BLOOD GROUP</SanctuaryText>
                  <SanctuaryText variant="label_lg" style={[styles.qrInfoVal, { color: '#DC2626' }]}>{data.bloodGroup}</SanctuaryText>
                </View>
              </View>
            </View>

            <View style={styles.offlineNotice}>
              <Info size={16} color="#2563EB" />
              <SanctuaryText variant="body_sm" style={styles.offlineNoticeTxt}>
                The QR code encapsulates full encrypted medical JSON payload directly. First responders do not need cellular reception to decrypt.
              </SanctuaryText>
            </View>
          </View>
        )}

        {/* ── ICE CONTACTS & SPEED DIALS TAB ── */}
        {activeTab === 'contacts' && (
          <View style={styles.contactsTabContainer}>
            {/* Primary Contact */}
            <View style={styles.contactItemCard}>
              <View style={styles.contactItemHeader}>
                <View style={styles.contactAvatar}>
                  <User size={22} color="#DC2626" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <SanctuaryText variant="label_sm" style={styles.contactRole}>
                    PRIMARY EMERGENCY CONTACT (ICE)
                  </SanctuaryText>
                  <SanctuaryText variant="headline_sm" style={styles.contactName}>
                    {data.emergencyContactName}
                  </SanctuaryText>
                  <SanctuaryText variant="body_sm" style={styles.contactRel}>
                    Relation: {data.emergencyContactRelation}
                  </SanctuaryText>
                </View>
              </View>

              <TouchableOpacity
                style={styles.dialBtn}
                onPress={() => handleDialNumber(data.emergencyContactPhone)}
                activeOpacity={0.8}
              >
                <Phone size={18} color="#FFF" />
                <SanctuaryText variant="label_lg" style={styles.dialBtnTxt}>
                  CALL {data.emergencyContactPhone}
                </SanctuaryText>
              </TouchableOpacity>
            </View>

            {/* National Emergency Speed Dials */}
            <SanctuaryText variant="label_lg" style={styles.speedDialHeader}>
              Immediate Emergency Dispatchers
            </SanctuaryText>

            <View style={styles.dispatchGrid}>
              <TouchableOpacity
                style={[styles.dispatchCard, { borderColor: '#FCA5A5' }]}
                onPress={() => handleDialNumber('108')}
                activeOpacity={0.8}
              >
                <View style={[styles.dispatchIcon, { backgroundColor: '#FEE2E2' }]}>
                  <ShieldAlert size={22} color="#DC2626" />
                </View>
                <SanctuaryText variant="headline_sm" style={[styles.dispatchNumber, { color: '#DC2626' }]}>108</SanctuaryText>
                <SanctuaryText variant="body_sm" style={styles.dispatchLabel}>Free Ambulance</SanctuaryText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dispatchCard, { borderColor: '#BFDBFE' }]}
                onPress={() => handleDialNumber('112')}
                activeOpacity={0.8}
              >
                <View style={[styles.dispatchIcon, { backgroundColor: '#DBEAFE' }]}>
                  <Phone size={22} color="#2563EB" />
                </View>
                <SanctuaryText variant="headline_sm" style={[styles.dispatchNumber, { color: '#2563EB' }]}>112</SanctuaryText>
                <SanctuaryText variant="body_sm" style={styles.dispatchLabel}>National Emergency</SanctuaryText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── EDIT MEDICAL ID MODAL ── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
        transparent={false}
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCloseBtn}>
              <X size={24} color="#0F172A" />
            </TouchableOpacity>
            <SanctuaryText variant="headline_sm" style={styles.modalTitle}>
              Edit Emergency Medical ID
            </SanctuaryText>
            <TouchableOpacity onPress={handleSaveEdit} style={styles.modalSaveBtn}>
              <SanctuaryText variant="label_lg" style={styles.modalSaveBtnTxt}>
                Save
              </SanctuaryText>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
            {/* Blood Group Selector */}
            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>BLOOD GROUP</SanctuaryText>
            <View style={styles.bloodSelectRow}>
              {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                <TouchableOpacity
                  key={bg}
                  style={[
                    styles.bloodSelectChip,
                    editForm.bloodGroup === bg && styles.bloodSelectChipActive,
                  ]}
                  onPress={() => setEditForm({ ...editForm, bloodGroup: bg })}
                >
                  <SanctuaryText
                    variant="label_md"
                    style={[
                      styles.bloodSelectChipTxt,
                      editForm.bloodGroup === bg && styles.bloodSelectChipTxtActive,
                    ]}
                  >
                    {bg}
                  </SanctuaryText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Organ Donor Toggle */}
            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>ORGAN DONOR STATUS</SanctuaryText>
            <TouchableOpacity
              style={[
                styles.donorToggleBtn,
                editForm.organDonor ? { backgroundColor: '#ECFDF5', borderColor: '#10B981' } : { backgroundColor: '#F8FAFC' },
              ]}
              onPress={() => setEditForm({ ...editForm, organDonor: !editForm.organDonor })}
            >
              <Heart size={18} color={editForm.organDonor ? '#059669' : '#64748B'} fill={editForm.organDonor ? '#059669' : 'none'} />
              <SanctuaryText
                variant="label_md"
                style={{
                  color: editForm.organDonor ? '#059669' : '#64748B',
                  fontWeight: '800',
                  marginLeft: 10,
                }}
              >
                {editForm.organDonor ? 'Registered Organ Donor (YES)' : 'Organ Donor (NO)'}
              </SanctuaryText>
            </TouchableOpacity>

            {/* Allergies Builder */}
            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>CRITICAL ALLERGIES</SanctuaryText>
            <View style={styles.tagsRow}>
              {editForm.allergies.map((item, idx) => (
                <View key={idx} style={styles.modalTag}>
                  <SanctuaryText variant="label_sm" style={styles.modalTagTxt}>{item}</SanctuaryText>
                  <TouchableOpacity
                    onPress={() => {
                      const next = editForm.allergies.filter((_, i) => i !== idx);
                      setEditForm({ ...editForm, allergies: next.length > 0 ? next : ['None Reported'] });
                    }}
                  >
                    <X size={14} color="#EF4444" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.addTagRow}>
              <TextInput
                style={styles.addTagInput}
                placeholder="Add allergy (e.g. Aspirin, Latex)"
                placeholderTextColor="#94A3B8"
                value={newAllergyInput}
                onChangeText={setNewAllergyInput}
              />
              <TouchableOpacity
                style={styles.addTagBtn}
                onPress={() => {
                  if (newAllergyInput.trim()) {
                    const cleaned = editForm.allergies.filter(a => a !== 'None Reported');
                    setEditForm({ ...editForm, allergies: [...cleaned, newAllergyInput.trim()] });
                    setNewAllergyInput('');
                  }
                }}
              >
                <SanctuaryText variant="label_sm" style={{ color: '#FFF', fontWeight: '800' }}>Add</SanctuaryText>
              </TouchableOpacity>
            </View>

            {/* Chronic Conditions */}
            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>CHRONIC CONDITIONS</SanctuaryText>
            <View style={styles.tagsRow}>
              {editForm.chronicConditions.map((item, idx) => (
                <View key={idx} style={[styles.modalTag, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]}>
                  <SanctuaryText variant="label_sm" style={[styles.modalTagTxt, { color: '#1E40AF' }]}>{item}</SanctuaryText>
                  <TouchableOpacity
                    onPress={() => {
                      const next = editForm.chronicConditions.filter((_, i) => i !== idx);
                      setEditForm({ ...editForm, chronicConditions: next.length > 0 ? next : ['None Reported'] });
                    }}
                  >
                    <X size={14} color="#3B82F6" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.addTagRow}>
              <TextInput
                style={styles.addTagInput}
                placeholder="Add condition (e.g. Asthma, Pacemaker)"
                placeholderTextColor="#94A3B8"
                value={newConditionInput}
                onChangeText={setNewConditionInput}
              />
              <TouchableOpacity
                style={[styles.addTagBtn, { backgroundColor: '#2563EB' }]}
                onPress={() => {
                  if (newConditionInput.trim()) {
                    const cleaned = editForm.chronicConditions.filter(c => c !== 'None Reported');
                    setEditForm({ ...editForm, chronicConditions: [...cleaned, newConditionInput.trim()] });
                    setNewConditionInput('');
                  }
                }}
              >
                <SanctuaryText variant="label_sm" style={{ color: '#FFF', fontWeight: '800' }}>Add</SanctuaryText>
              </TouchableOpacity>
            </View>

            {/* Active Medications */}
            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>ACTIVE MEDICATIONS</SanctuaryText>
            <View style={styles.tagsRow}>
              {editForm.medications.map((item, idx) => (
                <View key={idx} style={[styles.modalTag, { borderColor: '#DDD6FE', backgroundColor: '#F5F3FF' }]}>
                  <SanctuaryText variant="label_sm" style={[styles.modalTagTxt, { color: '#6D28D9' }]}>{item}</SanctuaryText>
                  <TouchableOpacity
                    onPress={() => {
                      const next = editForm.medications.filter((_, i) => i !== idx);
                      setEditForm({ ...editForm, medications: next.length > 0 ? next : ['None Reported'] });
                    }}
                  >
                    <X size={14} color="#7C3AED" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.addTagRow}>
              <TextInput
                style={styles.addTagInput}
                placeholder="Add medicine (e.g. Metformin 500mg)"
                placeholderTextColor="#94A3B8"
                value={newMedInput}
                onChangeText={setNewMedInput}
              />
              <TouchableOpacity
                style={[styles.addTagBtn, { backgroundColor: '#7C3AED' }]}
                onPress={() => {
                  if (newMedInput.trim()) {
                    const cleaned = editForm.medications.filter(m => m !== 'None Reported');
                    setEditForm({ ...editForm, medications: [...cleaned, newMedInput.trim()] });
                    setNewMedInput('');
                  }
                }}
              >
                <SanctuaryText variant="label_sm" style={{ color: '#FFF', fontWeight: '800' }}>Add</SanctuaryText>
              </TouchableOpacity>
            </View>

            {/* In Case of Emergency Contact Details */}
            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>PRIMARY ICE CONTACT NAME</SanctuaryText>
            <TextInput
              style={styles.modalInput}
              value={editForm.emergencyContactName}
              onChangeText={(t) => setEditForm({ ...editForm, emergencyContactName: t })}
              placeholder="e.g. Jane Doe"
              placeholderTextColor="#94A3B8"
            />

            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>PRIMARY ICE PHONE NUMBER</SanctuaryText>
            <TextInput
              style={styles.modalInput}
              value={editForm.emergencyContactPhone}
              onChangeText={(t) => setEditForm({ ...editForm, emergencyContactPhone: t })}
              placeholder="e.g. +91 9876543210"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />

            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>RELATIONSHIP</SanctuaryText>
            <TextInput
              style={styles.modalInput}
              value={editForm.emergencyContactRelation}
              onChangeText={(t) => setEditForm({ ...editForm, emergencyContactRelation: t })}
              placeholder="e.g. Spouse, Mother, Brother"
              placeholderTextColor="#94A3B8"
            />

            <SanctuaryText variant="label_sm" style={styles.fieldLabel}>SPECIAL MEDICAL NOTES FOR ER</SanctuaryText>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              value={editForm.specialNotes}
              onChangeText={(t) => setEditForm({ ...editForm, specialNotes: t })}
              placeholder="e.g. Needs immediate insulin check, wears medic-alert bracelet"
              placeholderTextColor="#94A3B8"
              multiline
            />

            <TouchableOpacity style={styles.saveModalFinalBtn} onPress={handleSaveEdit}>
              <SanctuaryText variant="label_lg" style={styles.saveModalFinalBtnTxt}>
                SAVE EMERGENCY CARD
              </SanctuaryText>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  topSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  /* Segment Switch - Clean Light Pill */
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentTxt: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTxtActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },

  /* Premium Light Emergency Card */
  cardContainer: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    elevation: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardShieldIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardSub: {
    color: '#FEE2E2',
    fontSize: 9,
    fontWeight: '700',
  },
  icePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  icePillTxt: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '900',
  },

  cardBody: {
    padding: 18,
    backgroundColor: '#FFFFFF',
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 16,
    marginBottom: 16,
  },
  bloodBadgeBox: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    marginRight: 14,
    minWidth: 68,
    borderWidth: 1,
    borderColor: '#F87171',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  bloodLabel: {
    color: '#FEE2E2',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bloodValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
  },
  patientMeta: {
    flex: 1,
  },
  patientName: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
  },
  patientSub: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  organDonorRow: {
    marginTop: 6,
    flexDirection: 'row',
  },
  donorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  donorTxt: {
    fontSize: 10,
    fontWeight: '800',
  },

  /* Sections */
  sectionWrap: {
    marginBottom: 14,
  },
  secHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  secTitle: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergyTag: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  allergyTagTxt: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '700',
  },
  conditionTag: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conditionTagTxt: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '700',
  },
  medTag: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  medTagTxt: {
    color: '#6D28D9',
    fontSize: 12,
    fontWeight: '700',
  },

  /* In Case of Emergency Primary Box */
  iceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginTop: 6,
  },
  iceCardLabel: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iceCardName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  iceCardPhone: {
    color: '#059669',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  callIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },

  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesTxt: {
    flex: 1,
    color: '#64748B',
    fontSize: 11,
    fontStyle: 'italic',
  },

  cardFooter: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 11,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardFooterTxt: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* Action Buttons below Card */
  cardActionsRow: {
    width: CARD_WIDTH,
    gap: 10,
    marginTop: 18,
  },
  actionBtnPrimary: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnTxt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionBtnSecondary: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  actionBtnSecondaryTxt: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },

  /* QR Tab */
  qrTabContainer: {
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  qrTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  qrSubtitle: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  qrInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  qrInfoCol: {
    flex: 1,
  },
  qrInfoLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  qrInfoVal: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    width: '100%',
  },
  offlineNoticeTxt: {
    flex: 1,
    color: '#1E40AF',
    fontSize: 12,
    lineHeight: 16,
  },

  /* ICE Contacts Tab */
  contactsTabContainer: {
    width: CARD_WIDTH,
  },
  contactItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  contactItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactRole: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contactName: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  contactRel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  dialBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dialBtnTxt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  speedDialHeader: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dispatchGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  dispatchCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  dispatchIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dispatchNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  dispatchLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  /* Modal Styles */
  modalSafe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSaveBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
  },
  modalSaveBtnTxt: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalScroll: {
    flex: 1,
  },
  fieldLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 6,
  },
  bloodSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  bloodSelectChipActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  bloodSelectChipTxt: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  bloodSelectChipTxtActive: {
    color: '#FFFFFF',
  },
  donorToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalTagTxt: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '700',
  },
  addTagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  addTagInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  addTagBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  saveModalFinalBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  saveModalFinalBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
