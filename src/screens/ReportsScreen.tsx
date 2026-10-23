import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  Share,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  Text,
  Card,
  IconButton,
  Surface,
  Searchbar,
  Chip,
  Portal,
  Modal,
  Button,
  List,
  Divider,
} from 'react-native-paper';
import dayjs from 'dayjs';
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
  Share2,
  MessageSquare,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import { apiClient, REPORT_ENDPOINTS, PATIENT_ENDPOINTS } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import { safeFormat } from '@/utils/dateUtils';
import { notificationService } from '@/services/notificationService';
import {
  exportPrescriptionPdf,
  sharePrescriptionViaWhatsApp,
  formatDoctorName,
  PrescriptionPdfData,
} from '@/utils/pdfExportUtil';
import { receiptService } from '@/services/receiptService';
import OfflineBanner from '@/components/OfflineBanner';
import { offlineVaultService } from '@/services/offlineVaultService';
import { DigitalAtriumLoader } from '@/components/SanctuaryComponents';
import GlassModal from '@/components/GlassModal';
import { familyService } from '@/services/familyService';

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

type TabType = 'prescriptions' | 'pharmacy' | 'labs';

export default function ReportsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Reports'>>();
  const patientId = route.params?.patientId;

  const [activeTab, setActiveTab] = useState<TabType>(route.params?.initialTab || 'prescriptions');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<LabReport[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<string>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<'ALL' | '30DAYS' | '3MONTHS' | 'THIS_YEAR'>('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null);
  const [selectedLabReport, setSelectedLabReport] = useState<LabReport | null>(null);
  const [isLabModalVisible, setIsLabModalVisible] = useState(false);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [pdfExportingId, setPdfExportingId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profile once for accurate patient demographic details in exported documents
      let loadedProfile: any = null;
      try {
        const profRes = await apiClient.get(PATIENT_ENDPOINTS.PROFILE);
        if (profRes.data) {
          loadedProfile = profRes.data;
          setPatientProfile(profRes.data);
        }
      } catch (pErr) {
        console.warn('[ReportsScreen] Patient profile load warning:', pErr);
      }

      let fetchedLabs: any[] = [];
      const fetchLabs = async () => {
        try {
          const endpoint = patientId
            ? REPORT_ENDPOINTS.GET_BY_PATIENT(patientId)
            : PATIENT_ENDPOINTS.LAB_RECORDS;
          const response = await apiClient.get(endpoint);
          const data = response.data.data || response.data;
          const labs = Array.isArray(data) ? data : (Array.isArray(data.labRecords) ? data.labRecords : []);
          fetchedLabs = labs;
          setReports(labs);
        } catch (lErr) {
          console.warn('[ReportsScreen] Labs fetch warning:', lErr);
        }
      };

      let fetchedPrescriptions: any[] = [];
      const fetchPrescriptions = async () => {
        try {
          const response = await apiClient.get(PATIENT_ENDPOINTS.PRESCRIPTIONS);
          if (response.data.success || response.data) {
            const data = response.data.data || response.data;
            const prescs = Array.isArray(data) ? data : (Array.isArray(data.prescriptions) ? data.prescriptions : []);
            const filtered = prescs.filter((p: any) => (p.displayType || p.type) !== 'Hospital Administration');
            fetchedPrescriptions = filtered;
            setPrescriptions(filtered);

            if (filtered.length > 0) {
              notificationService.schedulePrescriptionFollowup(filtered[0]);
              notificationService.scheduleRandomHealthTip();
            }
          }
        } catch (pErr) {
          console.warn('[ReportsScreen] Prescriptions fetch warning:', pErr);
        }
      };

      await Promise.all([fetchLabs(), fetchPrescriptions()]);

      // Opportunistically update local emergency records vault
      offlineVaultService.cacheOpportunistically({
        profile: loadedProfile || patientProfile,
        prescriptions: fetchedPrescriptions,
        labRecords: fetchedLabs,
      });
    } catch (err: any) {
      console.error('[ReportsScreen] Fetch Data Error:', err);
      setError(err.message || 'Could not load your medical records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  useEffect(() => {
    fetchData();
  }, [patientId]);

  useEffect(() => {
    const unsubProfile = familyService.onProfileChange(() => fetchData());
    return () => unsubProfile();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const availableHospitals = React.useMemo(() => {
    const hospSet = new Set<string>();
    reports.forEach(r => {
      const h = typeof r.hospital === 'string' ? r.hospital : r.hospital?.name;
      if (h && h.trim()) hospSet.add(h.trim());
    });
    prescriptions.forEach(p => {
      const h = typeof p.hospital === 'string' ? p.hospital : p.hospital?.name;
      if (h && h.trim()) hospSet.add(h.trim());
    });
    return Array.from(hospSet);
  }, [reports, prescriptions]);

  const isDateWithinRange = (dateStr?: string) => {
    if (!dateStr || selectedDateRange === 'ALL') return true;
    const d = dayjs(dateStr);
    if (!d.isValid()) return true;
    const now = dayjs();
    if (selectedDateRange === '30DAYS') return d.isAfter(now.subtract(30, 'day'));
    if (selectedDateRange === '3MONTHS') return d.isAfter(now.subtract(90, 'day'));
    if (selectedDateRange === 'THIS_YEAR') return d.isAfter(now.startOf('year'));
    return true;
  };

  const matchesHospital = (h?: any) => {
    if (selectedHospital === 'ALL') return true;
    const hName = typeof h === 'string' ? h : h?.name;
    return (hName || '').toLowerCase().trim() === selectedHospital.toLowerCase().trim();
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

  // 1. Lab Reports Filtered
  const filteredReports = (Array.isArray(reports) ? reports : []).filter(r => {
    const reportName = (r?.name || r?.testName || (r?.tests && r?.tests[0]?.testName) || "").toLowerCase();
    const hospName = typeof r.hospital === 'string' ? r.hospital.toLowerCase() : (r?.hospital as any)?.name?.toLowerCase() || "";
    const drName = typeof r.doctor === 'string' ? r.doctor.toLowerCase() : (r?.doctor as any)?.name?.toLowerCase() || "";

    const matchesSearch = reportName.includes(q) || hospName.includes(q) || drName.includes(q);
    return matchesSearch && matchesHospital(r.hospital) && isDateWithinRange(r.date || (r as any).createdAt);
  });

  // 2. Doctor Prescriptions (Clinical consultations)
  const doctorPrescriptions = (Array.isArray(prescriptions) ? prescriptions : []).filter(p => {
    return (
      p.displayType !== 'Pharmacy Order' &&
      p.displayType !== 'Pharmacy Invoice' &&
      (p as any).type !== 'pharma-invoice' &&
      !(p as any).isPharmaInvoice
    );
  });

  const filteredPrescriptions = doctorPrescriptions.filter(p => {
    const drName = (p.doctor as any)?.user?.name || (p.doctor as any)?.name || '';
    const hospName = (p.hospital as any)?.name || (typeof p.hospital === 'string' ? p.hospital : '');
    const diag = p.diagnosis || '';
    const medNames = (p.medicines || []).map((m: any) => m.name || '').join(' ');

    const matchesSearch = drName.toLowerCase().includes(q) ||
      diag.toLowerCase().includes(q) ||
      hospName.toLowerCase().includes(q) ||
      medNames.toLowerCase().includes(q);

    return matchesSearch && matchesHospital(p.hospital) && isDateWithinRange(p.prescriptionDate || p.createdAt);
  });

  // 3. Pharmacy Invoices (Medication bills, retail pharmacy Tax Invoices)
  const pharmacyOrders = (Array.isArray(prescriptions) ? prescriptions : []).filter(p => {
    return (
      (p as any).isPharmaInvoice ||
      p.displayType === 'Pharmacy Invoice' ||
      (p as any).type === 'pharma-invoice' ||
      p.displayType === 'Pharmacy Order' ||
      (p as any).type === 'pharma' ||
      Boolean((p as any).invoiceNo)
    );
  });

  const filteredPharmacyOrders = pharmacyOrders.filter(p => {
    const hospName = (p.hospital as any)?.name || (typeof p.hospital === 'string' ? p.hospital : '');
    const drName = (p.doctor as any)?.user?.name || (p.doctor as any)?.name || '';
    const token = (p as any).invoiceNo || (p as any).tokenNumber || '';
    const medNames = (p.medicines || []).map((m: any) => m.name || '').join(' ');

    const matchesSearch = hospName.toLowerCase().includes(q) ||
      drName.toLowerCase().includes(q) ||
      token.toLowerCase().includes(q) ||
      medNames.toLowerCase().includes(q);

    return matchesSearch && matchesHospital(p.hospital) && isDateWithinRange(p.prescriptionDate || p.createdAt);
  });

  const formatFrequency = (freq: any): string => {
    if (!freq && freq !== 0) return 'As needed';
    if (typeof freq === 'object' && freq !== null) {
      if (freq.type === 'custom' && freq.custom) {
        const interval = freq.custom.interval || freq.custom.hours;
        const timing = freq.custom.timing ? ` (${freq.custom.timing === 'after' ? 'After Food' : freq.custom.timing === 'before' ? 'Before Food' : freq.custom.timing})` : '';
        return interval ? `Every ${interval} hrs${timing}` : 'As directed';
      }
      const std = freq.standard || freq;
      if (typeof std === 'object' && std !== null && (std.morning != null || std.afternoon != null || std.night != null || std.evening != null)) {
        const parts: string[] = [];
        const isSlotActive = (val: any) => val && val !== 'off' && val !== '0' && val !== false;
        if (isSlotActive(std.morning || std.m)) parts.push('Morning');
        if (isSlotActive(std.afternoon || std.noon || std.a)) parts.push('Afternoon');
        if (isSlotActive(std.evening || std.e)) parts.push('Evening');
        if (isSlotActive(std.night || std.n)) parts.push('Night');
        if (parts.length > 0) {
          const timingVal = (std.morning && std.morning !== 'off' && std.morning !== true) ? std.morning : (freq.custom?.timing || '');
          const timingStr = timingVal === 'after' ? ' (After Food)' : timingVal === 'before' ? ' (Before Food)' : '';
          return parts.join(', ') + timingStr;
        }
      }
      if (freq.label) return String(freq.label);
      if (freq.name) return String(freq.name);
      if (freq.value) return formatFrequency(freq.value);
      if (freq.timing) return String(freq.timing);
      if (freq.timesPerDay) return `${freq.timesPerDay}x / day`;
      if (freq.times) return `${freq.times}x / day`;
      return 'As directed';
    }
    if (typeof freq === 'number') {
      if (freq === 1) return 'Once daily';
      if (freq === 2) return 'Twice daily';
      if (freq === 3) return '3 times / day';
      return `${freq} times / day`;
    }
    const freqStr = String(freq).trim();
    if (!freqStr || freqStr === '[object Object]') return 'As directed';

    if (freqStr === '1-0-1') return 'Morning, Night';
    if (freqStr === '1-1-1') return 'Morning, Afternoon, Night';
    if (freqStr === '1-0-0') return 'Morning';
    if (freqStr === '0-0-1') return 'Night';
    if (freqStr === '0-1-0') return 'Afternoon';

    const parts = freqStr.split('-');
    if (parts.length !== 3) return freqStr;

    const times = [];
    if (parts[0] !== '0') times.push('Morning');
    if (parts[1] !== '0') times.push('Afternoon');
    if (parts[2] !== '0') times.push('Night');

    return times.length > 0 ? times.join(', ') : 'As needed';
  };

  const getTestRangeStatus = (testName: any, resultStr: any) => {
    if (!resultStr && resultStr !== 0) return null;
    const val = parseFloat(String(resultStr));
    if (isNaN(val)) return null;

    const t = String(testName || '').toLowerCase();
    if (t.includes('hemoglobin') || t.includes('hb')) {
      if (val < 12.0) return { label: 'Low', color: '#DC2626', bg: '#FEF2F2' };
      if (val > 17.5) return { label: 'High', color: '#DC2626', bg: '#FEF2F2' };
      return { label: 'Normal (12.0 - 17.5)', color: '#059669', bg: '#ECFDF5' };
    }
    if (t.includes('glucose') || t.includes('sugar')) {
      if (val < 70) return { label: 'Low', color: '#DC2626', bg: '#FEF2F2' };
      if (val > 125) return { label: 'High', color: '#DC2626', bg: '#FEF2F2' };
      if (val > 99) return { label: 'Elevated (100-125)', color: '#D97706', bg: '#FFFBEB' };
      return { label: 'Normal (70 - 99)', color: '#059669', bg: '#ECFDF5' };
    }
    if (t.includes('cholesterol')) {
      if (val >= 200) return { label: 'High (>= 200)', color: '#DC2626', bg: '#FEF2F2' };
      return { label: 'Desirable (< 200)', color: '#059669', bg: '#ECFDF5' };
    }
    if (t.includes('wbc')) {
      if (val < 4000) return { label: 'Low', color: '#DC2626', bg: '#FEF2F2' };
      if (val > 11000) return { label: 'High', color: '#DC2626', bg: '#FEF2F2' };
      return { label: 'Normal', color: '#059669', bg: '#ECFDF5' };
    }
    return null;
  };

  const mapPrescriptionToPdfData = (presc: any): PrescriptionPdfData => {
    const rawPatientId = presc.patient?._id || (typeof presc.patient === 'string' ? presc.patient : presc.patientId) || patientProfile?._id || patientProfile?.user?._id;
    return {
      prescriptionId: presc._id,
      patientId: rawPatientId ? String(rawPatientId) : undefined,
      fileUrl: presc.fileUrl || presc.pdfUrl || presc.signedUrl || presc.url,
      date: dayjs(presc.prescriptionDate || presc.createdAt).format('DD MMM YYYY'),
      patientName: patientProfile?.user?.name || patientProfile?.name || 'Registered Patient',
      patientMrn: patientProfile?.mrn || 'N/A',
      patientAge: patientProfile?.user?.age || patientProfile?.age || '--',
      patientGender: patientProfile?.user?.gender || patientProfile?.gender || '--',
      patientBloodGroup: patientProfile?.user?.bloodGroup || patientProfile?.bloodGroup || 'O+',
      doctorName: presc.doctor?.user?.name || presc.doctor?.name || 'Specialist Physician',
      doctorSpecialty: presc.doctor?.specialties?.[0] || presc.doctor?.department || 'Consultant',
      hospitalName: presc.hospital?.name || 'MSCureChain Super Specialty Hospital',
      hospitalAddress: presc.hospital?.address || 'Healthcare System',
      diagnosis: presc.diagnosis,
      notes: presc.notes,
      followUpDate: presc.followUpDate ? dayjs(presc.followUpDate).format('DD MMM YYYY') : undefined,
      medicines: (presc.medicines || []).map((m: any) => ({
        name: m.name || 'Prescribed Medicine',
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
      })),
    };
  };

  const handleExportPrescriptionPdf = async (presc: any) => {
    if (!presc) return;
    try {
      setPdfExportingId(presc._id);
      await receiptService.printOrExportPdf('prescription', presc._id, presc);
    } catch (err: any) {
      console.warn('[ReportsScreen] Prescription export error:', err?.message);
    } finally {
      setPdfExportingId(null);
    }
  };

  const openWhatsAppText = async (message: string) => {
    try {
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        const webUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        const canOpenWeb = await Linking.canOpenURL(webUrl);
        if (canOpenWeb) {
          await Linking.openURL(webUrl);
        } else {
          await Share.share({ message });
        }
      }
    } catch (err: any) {
      console.warn('[ReportsScreen] WhatsApp launch error:', err?.message);
      await Share.share({ message });
    }
  };

  const handleWhatsAppPrescription = async (presc: any) => {
    if (!presc) return;
    const docName = formatDoctorName(presc.doctor?.user?.name || presc.doctor?.name);
    const hospName = presc.hospital?.name || 'Hospital';
    const dateStr = safeFormat(presc.prescriptionDate || presc.createdAt, 'dd MMM yyyy');
    const meds = Array.isArray(presc.medicines)
      ? presc.medicines.map((m: any, idx: number) => `${idx + 1}. ${m.name} (${m.dosage || '1 dose'}) - ${m.duration || 'As directed'}`).join('\n')
      : 'None listed';

    const message = `*${hospName.toUpperCase()} - DIGITAL PRESCRIPTION*\n` +
      `--------------------\n` +
      `Doctor: ${docName}\n` +
      `Date: ${dateStr}\n` +
      (presc.diagnosis ? `Diagnosis: ${presc.diagnosis}\n` : '') +
      `Prescribed Medications:\n${meds}\n` +
      `--------------------\n` +
      `Shared via MSCureChain Patient Portal`;

    await openWhatsAppText(message);
  };

  const handleExportPharmacyPdf = async (item: any) => {
    if (!item) return;
    try {
      setPdfExportingId(item._id);
      await receiptService.printOrExportPdf('pharmacy-invoice', item._id);
    } catch (err: any) {
      console.warn('[ReportsScreen] Pharmacy export error:', err?.message);
    } finally {
      setPdfExportingId(null);
    }
  };

  const handleWhatsAppPharmacy = async (item: any) => {
    if (!item) return;
    const hospName = item.hospital?.name || 'Hospital Pharmacy';
    const invNumber = item.invoiceNo ? `TAX INVOICE #${item.invoiceNo}` : (item.tokenNumber ? `TOKEN #${item.tokenNumber}` : 'PHARMACY INVOICE');
    const dateStr = safeFormat(item.prescriptionDate || item.createdAt, 'dd MMM yyyy');
    const amount = item.amount || item.totalAmount || item.netPayable ? `Rs. ${item.amount || item.totalAmount || item.netPayable} (PAID)` : '';
    const doc = formatDoctorName(item.doctor?.user?.name || item.doctor?.name);
    const meds = Array.isArray(item.medicines)
      ? item.medicines.map((m: any, idx: number) => `${idx + 1}. ${m.name} (Qty: ${m.quantity || 1})`).join('\n')
      : 'None listed';

    const message = `*${hospName.toUpperCase()} - ${invNumber}*\n` +
      `--------------------\n` +
      (amount ? `Amount: ${amount}\n` : '') +
      `Date: ${dateStr}\n` +
      (doc ? `Prescribing Doctor: ${doc}\n` : '') +
      `Dispensed Items:\n${meds}\n` +
      `--------------------\n` +
      `Shared via MSCureChain Patient Portal`;

    await openWhatsAppText(message);
  };

  const handleExportLabReportPdf = async (rep: any) => {
    if (!rep) return;
    try {
      setPdfExportingId(rep._id);
      await receiptService.printOrExportPdf('lab-report', rep._id);
    } catch (err: any) {
      console.warn('[ReportsScreen] Lab report export error:', err?.message);
    } finally {
      setPdfExportingId(null);
    }
  };

  const handleWhatsAppLabReport = async (rep: any) => {
    if (!rep) return;
    const testName = rep.name || rep.testName || (rep.tests && rep.tests[0]?.testName) || 'Lab Investigation';
    const hospName = typeof rep.hospital === 'string' ? rep.hospital : (rep.hospital?.name || 'Medical Center');
    const dateStr = safeFormat(rep.date || rep.createdAt, 'dd MMM yyyy');
    const doc = typeof rep.doctor === 'string' ? rep.doctor : (rep.doctor?.name || '');

    let subtestLines = '';
    if (rep.tests && rep.tests[0]?.subTests) {
      subtestLines = rep.tests[0].subTests.map((s: any) =>
        `- ${s.name}: ${s.result} ${s.unit} (Normal: ${s.range})`
      ).join('\n');
    }

    const message = `*${hospName.toUpperCase()} - LAB REPORT*\n` +
      `--------------------\n` +
      `Test: ${testName}\n` +
      `Date: ${dateStr}\n` +
      (doc ? `Doctor: ${doc}\n` : '') +
      `Readings:\n${subtestLines || 'Verified by pathology department.'}\n` +
      `--------------------\n` +
      `Shared via MSCureChain Patient Portal`;

    await openWhatsAppText(message);
  };

  const handleExportLabInvoice = async (rep: any) => {
    if (!rep) return;
    try {
      setPdfExportingId(rep._id);
      await receiptService.printOrExportPdf('lab-invoice', rep._id);
    } catch (err: any) {
      console.warn('[ReportsScreen] Lab invoice export error:', err?.message);
    } finally {
      setPdfExportingId(null);
    }
  };

  const handleWhatsAppLabInvoice = async (rep: any) => {
    if (!rep) return;
    const hospName = typeof rep.hospital === 'string' ? rep.hospital : (rep.hospital?.name || 'Medical Center');
    const testName = rep.name || rep.testName || 'Lab Investigation';
    const dateStr = safeFormat(rep.date || rep.createdAt, 'dd MMM yyyy');

    const message = `*${hospName.toUpperCase()} - LAB INVOICE*\n` +
      `--------------------\n` +
      `Investigation: ${testName}\n` +
      `Date: ${dateStr}\n` +
      `Status: PAID\n` +
      `--------------------\n` +
      `Shared via MSCureChain Patient Portal`;

    await openWhatsAppText(message);
  };

  const handleSharePrescription = async (presc: any) => {
    await handleWhatsAppPrescription(presc);
  };

  const handleShareLabReport = async (rep: any) => {
    if (!rep) return;
    try {
      const testName = rep.name || rep.testName || (rep.tests && rep.tests[0]?.testName) || 'Lab Investigation';
      const dateStr = dayjs(rep.date || rep.createdAt).format('DD MMM YYYY');

      let subtestLines = '';
      if (rep.tests && rep.tests[0]?.subTests) {
        subtestLines = rep.tests[0].subTests.map((s: any) =>
          `- ${s.name}: ${s.result} ${s.unit} (Ref: ${s.range})`
        ).join('\n');
      }

      const message =
        `*MSCureChain Lab Results Summary*\n` +
        `Test: ${testName}\n` +
        `Date: ${dateStr}\n` +
        `Hospital: ${typeof rep.hospital === 'string' ? rep.hospital : (rep.hospital?.name || 'Medical Center')}\n\n` +
        `Readings:\n${subtestLines || 'Verified by pathology department.'}\n\n` +
        `Generated via MSCureChain Patient Portal`;

      await openWhatsAppText(message);
    } catch (e: any) {
      console.warn('Share lab error:', e.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={[styles.header, { paddingTop: Platform.OS === 'ios' ? (insets.top > 0 ? insets.top : 44) : 8 }]} elevation={0}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reports</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'prescriptions' && styles.activeTabPrescriptions]}
            onPress={() => setActiveTab('prescriptions')}
            activeOpacity={0.7}
          >
            <Stethoscope size={15} color={activeTab === 'prescriptions' ? '#006AF5' : '#64748B'} />
            <Text
              numberOfLines={1}
              style={[styles.tabText, activeTab === 'prescriptions' && styles.activeTabTextPrescriptions]}
            >
              Prescriptions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'pharmacy' && styles.activeTabPharmacy]}
            onPress={() => setActiveTab('pharmacy')}
            activeOpacity={0.7}
          >
            <Pill size={15} color={activeTab === 'pharmacy' ? '#8B5CF6' : '#64748B'} />
            <Text
              numberOfLines={1}
              style={[styles.tabText, activeTab === 'pharmacy' && styles.activeTabTextPharmacy]}
            >
              Pharmacy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'labs' && styles.activeTabLabs]}
            onPress={() => setActiveTab('labs')}
            activeOpacity={0.7}
          >
            <FlaskConical size={15} color={activeTab === 'labs' ? '#0D9488' : '#64748B'} />
            <Text
              numberOfLines={1}
              style={[styles.tabText, activeTab === 'labs' && styles.activeTabTextLabs]}
            >
              Lab Reports
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar + Filter Toggle button in the SAME ROW */}
        <View style={styles.searchAndToggleRow}>
          <Searchbar
            placeholder={
              activeTab === 'labs'
                ? 'Search Labs...'
                : activeTab === 'pharmacy'
                  ? 'Search Pharmacy...'
                  : 'Search Prescriptions...'
            }
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            inputStyle={styles.searchInput}
            iconColor={
              activeTab === 'labs' ? '#0D9488' : activeTab === 'pharmacy' ? '#8B5CF6' : '#006AF5'
            }
          />
          <TouchableOpacity
            style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
            onPress={() => setShowFilters(prev => !prev)}
            activeOpacity={0.7}
          >
            <Filter size={12} color={showFilters ? '#FFF' : '#64748B'} />
            <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
              {showFilters ? 'ON' : 'OFF'}
            </Text>
            <View style={[styles.filterSwitchPill, showFilters && styles.filterSwitchPillActive]}>
              <View style={[styles.filterSwitchKnob, showFilters && styles.filterSwitchKnobActive]} />
            </View>
            {(selectedHospital !== 'ALL' || selectedDateRange !== 'ALL') && !showFilters && (
              <View style={styles.filterActiveDot} />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Filter Chips: Hospital & Date (Opened only when toggle button is ON) ── */}
        {showFilters && (
          <View style={styles.filtersSection}>
            {/* Hospital Filter Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipScroll}>
              <View style={styles.filterLabelContainer}>
                <Building2 size={13} color="#64748B" />
                <Text style={styles.filterGroupLabel}>Hospital:</Text>
              </View>
              <TouchableOpacity
                style={[styles.filterChip, selectedHospital === 'ALL' && styles.filterChipActive]}
                onPress={() => setSelectedHospital('ALL')}
              >
                <Text style={[styles.filterChipText, selectedHospital === 'ALL' && styles.filterChipTextActive]}>
                  All Hospitals
                </Text>
              </TouchableOpacity>
              {availableHospitals.map(hosp => (
                <TouchableOpacity
                  key={hosp}
                  style={[styles.filterChip, selectedHospital === hosp && styles.filterChipActive]}
                  onPress={() => setSelectedHospital(selectedHospital === hosp ? 'ALL' : hosp)}
                >
                  <Text style={[styles.filterChipText, selectedHospital === hosp && styles.filterChipTextActive]}>
                    {hosp}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Date Filter Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterChipScroll, { marginTop: 6 }]}>
              <View style={styles.filterLabelContainer}>
                <Calendar size={13} color="#64748B" />
                <Text style={styles.filterGroupLabel}>Date:</Text>
              </View>
              <TouchableOpacity
                style={[styles.filterChip, selectedDateRange === 'ALL' && styles.filterChipActive]}
                onPress={() => setSelectedDateRange('ALL')}
              >
                <Text style={[styles.filterChipText, selectedDateRange === 'ALL' && styles.filterChipTextActive]}>
                  All Time
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedDateRange === '30DAYS' && styles.filterChipActive]}
                onPress={() => setSelectedDateRange(selectedDateRange === '30DAYS' ? 'ALL' : '30DAYS')}
              >
                <Text style={[styles.filterChipText, selectedDateRange === '30DAYS' && styles.filterChipTextActive]}>
                  Last 30 Days
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedDateRange === '3MONTHS' && styles.filterChipActive]}
                onPress={() => setSelectedDateRange(selectedDateRange === '3MONTHS' ? 'ALL' : '3MONTHS')}
              >
                <Text style={[styles.filterChipText, selectedDateRange === '3MONTHS' && styles.filterChipTextActive]}>
                  Last 3 Months
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, selectedDateRange === 'THIS_YEAR' && styles.filterChipActive]}
                onPress={() => setSelectedDateRange(selectedDateRange === 'THIS_YEAR' ? 'ALL' : 'THIS_YEAR')}
              >
                <Text style={[styles.filterChipText, selectedDateRange === 'THIS_YEAR' && styles.filterChipTextActive]}>
                  This Year
                </Text>
              </TouchableOpacity>
              {(selectedHospital !== 'ALL' || selectedDateRange !== 'ALL' || searchQuery !== '') && (
                <TouchableOpacity
                  style={styles.clearFiltersChip}
                  onPress={() => {
                    setSelectedHospital('ALL');
                    setSelectedDateRange('ALL');
                    setSearchQuery('');
                  }}
                >
                  <X size={12} color="#DC2626" />
                  <Text style={styles.clearFiltersText}>Reset</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}
      </Surface>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={true}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#006AF5']} />
          ) : undefined
        }
      >
        {/* Offline Zero-Network Mode Banner */}
        <OfflineBanner />

        {loading ? (
          <ActivityIndicator size="large" color="#006AF5" style={{ marginTop: 40 }} />
        ) : error && !refreshing ? (
          <View style={styles.errorContainer}>
            <IconButton icon="alert-circle" iconColor="#E53E3E" size={48} />
            <Text style={styles.errorText}>Connectivity Issue</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <Button mode="contained" onPress={fetchData} style={styles.retryBtn}>Retry</Button>
            <Button
              mode="outlined"
              icon="shield-lock"
              textColor="#DC2626"
              style={{ marginTop: 12, borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
              onPress={() => navigation.navigate('OfflineVault')}
            >
              Open Offline Emergency Records Vault
            </Button>
          </View>
        ) : activeTab === 'labs' ? (
          filteredReports.length > 0 ? (
            filteredReports.map((report) => (
              <Card key={report._id} style={styles.reportCard} mode="outlined">
                <Card.Content style={{ padding: 10 }}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: '#E6FFFA' }]}>
                      <FlaskConical size={24} color="#0D9488" />
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
                      <Text style={[styles.dateMonth, { color: '#0D9488' }]}>{safeFormat(report.date || (report as any).createdAt, 'MMM')}</Text>
                      <Text style={styles.dateDay}>{safeFormat(report.date || (report as any).createdAt, 'dd')}</Text>
                    </View>
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <User size={14} color="#0D9488" />
                      <Text style={[styles.detailText, { fontWeight: '600' }]} numberOfLines={1}>
                        {typeof report.doctor === 'string' ? report.doctor : ((report.doctor as any)?.name || 'Suggested Dr.')}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Building2 size={14} color="#0D9488" />
                      <Text style={[styles.detailText, { fontWeight: '600' }]} numberOfLines={1}>
                        {typeof report.hospital === 'string' ? report.hospital : ((report.hospital as any)?.name || 'Medical Center')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.labActionRow}>
                    <TouchableOpacity
                      style={[styles.labBtn, { backgroundColor: '#0D9488' }]}
                      onPress={() => handleView(report)}
                      activeOpacity={0.7}
                    >
                      <Eye size={15} color="#FFF" />
                      <Text style={styles.labBtnTxt}>
                        {(report.signedUrl || report.url) ? 'View Report' : 'Full Results'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.labBtn, { backgroundColor: '#0284C7' }]}
                      onPress={() => handleExportLabInvoice(report)}
                      disabled={pdfExportingId === report._id}
                      activeOpacity={0.7}
                    >
                      <Download size={15} color="#FFF" />
                      <Text style={styles.labBtnTxt}>
                        {pdfExportingId === report._id ? 'Preparing...' : 'Lab Invoice'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <FlaskConical size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Lab Reports Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery || selectedHospital !== 'ALL' || selectedDateRange !== 'ALL'
                  ? 'No lab investigations match your selected filters.'
                  : 'Your laboratory investigations and diagnostic reports will appear here.'}
              </Text>
            </View>
          )
        ) : activeTab === 'pharmacy' ? (
          filteredPharmacyOrders.length > 0 ? (
            filteredPharmacyOrders.map((item: any) => (
              <Card
                key={item._id}
                style={styles.reportCard}
                mode="outlined"
                onPress={() => setSelectedPrescription(item)}
              >
                <Card.Content style={{ padding: 10 }}>
                  <View style={styles.cardHeader}>
                    <View style={styles.leftInfo}>
                      <View style={[styles.typeBadge, { backgroundColor: '#F3E8FF' }]}>
                        <Text style={[styles.typeText, { color: '#7E22CE' }]}>
                          {item.invoiceNo ? `TAX INVOICE #${item.invoiceNo}` : (item.tokenNumber ? `TOKEN #${item.tokenNumber}` : 'PHARMACY INVOICE')}
                        </Text>
                      </View>
                      <Text variant="titleMedium" style={styles.doctorName}>
                        {item.amount || item.totalAmount || item.netPayable
                          ? `₹${item.amount || item.totalAmount || item.netPayable} • ${String(item.paymentStatus || 'PAID').toUpperCase()}`
                          : `${item.medicines?.length || 0} Dispensed Item${(item.medicines?.length || 0) !== 1 ? 's' : ''}`}
                      </Text>
                      <View style={styles.hospitalRow}>
                        <Building2 size={12} color="#8B5CF6" />
                        <Text style={styles.hospitalNameSmall} numberOfLines={1}>
                          {item.hospital?.name || 'Hospital Pharmacy'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.dateBadge}>
                      <Text style={[styles.dateMonth, { color: '#8B5CF6' }]}>
                        {dayjs(item.prescriptionDate || item.createdAt).format('MMM')}
                      </Text>
                      <Text style={styles.dateDay}>
                        {dayjs(item.prescriptionDate || item.createdAt).format('DD')}
                      </Text>
                    </View>
                  </View>

                  {/* Concise summary row */}
                  <View style={styles.summaryBadgeRow}>
                    <View style={[styles.diagChip, { backgroundColor: '#FAF5FF', borderColor: '#F3E8FF' }]}>
                      <Text style={[styles.diagChipTxt, { color: '#7E22CE' }]} numberOfLines={1}>
                        Dr: {formatDoctorName(item.doctor?.user?.name || item.doctor?.name)}
                      </Text>
                    </View>
                    <View style={[styles.medCountChip, { backgroundColor: '#F3E8FF' }]}>
                      <Pill size={11} color="#7E22CE" />
                      <Text style={[styles.medCountChipTxt, { color: '#7E22CE' }]}>
                        {item.medicines?.length || 0} Items
                      </Text>
                    </View>
                  </View>

                  {/* Single-row Action Strip */}
                  <View style={styles.prescActionRow}>
                    <TouchableOpacity
                      style={[styles.prescPdfBtn, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}
                      onPress={() => handleExportPharmacyPdf(item)}
                      disabled={pdfExportingId === item._id}
                      activeOpacity={0.7}
                    >
                      <Download size={13} color="#7E22CE" />
                      <Text style={[styles.prescPdfTxt, { color: '#7E22CE' }]}>
                        {pdfExportingId === item._id ? 'Preparing...' : 'Tax Invoice'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.prescWaBtn}
                      onPress={() => handleWhatsAppPharmacy(item)}
                      disabled={pdfExportingId === item._id}
                      activeOpacity={0.7}
                    >
                      <MessageSquare size={13} color="#16A34A" />
                      <Text style={styles.prescWaTxt}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.prescViewBtn}
                      onPress={() => setSelectedPrescription(item)}
                      activeOpacity={0.7}
                    >
                      <Eye size={13} color="#64748B" />
                      <Text style={styles.prescViewTxt}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Pill size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Pharmacy Invoices</Text>
              <Text style={styles.emptySub}>
                {searchQuery || selectedHospital !== 'ALL' || selectedDateRange !== 'ALL'
                  ? 'No pharmacy invoices match your selected filters.'
                  : 'Your retail pharmacy tax invoices and dispensing receipts will appear here.'}
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
                <Card.Content style={{ padding: 10 }}>
                  <View style={styles.cardHeader}>
                    <View style={styles.leftInfo}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>{item.displayType || 'Prescription'}</Text>
                      </View>
                      <Text variant="titleMedium" style={styles.doctorName}>
                        {formatDoctorName(item.doctor?.user?.name || item.doctor?.name)}
                      </Text>
                      <View style={styles.hospitalRow}>
                        <Building2 size={12} color="#006AF5" />
                        <Text style={styles.hospitalNameSmall} numberOfLines={1}>{item.hospital?.name}</Text>
                      </View>
                    </View>
                    <View style={styles.dateBadge}>
                      <Text style={styles.dateMonth}>
                        {dayjs(item.prescriptionDate || item.createdAt).format('MMM')}
                      </Text>
                      <Text style={styles.dateDay}>
                        {dayjs(item.prescriptionDate || item.createdAt).format('DD')}
                      </Text>
                    </View>
                  </View>

                  {/* Concise summary row */}
                  <View style={styles.summaryBadgeRow}>
                    {!!item.diagnosis && (
                      <View style={styles.diagChip}>
                        <Text style={styles.diagChipTxt} numberOfLines={1}>
                          Diagnosis: {item.diagnosis}
                        </Text>
                      </View>
                    )}
                    <View style={styles.medCountChip}>
                      <Pill size={11} color="#006AF5" />
                      <Text style={styles.medCountChipTxt}>
                        {item.medicines?.length || 0} Meds
                      </Text>
                    </View>
                  </View>

                  {/* Single-row Action Strip */}
                  <View style={styles.prescActionRow}>
                    <TouchableOpacity
                      style={styles.prescPdfBtn}
                      onPress={() => handleExportPrescriptionPdf(item)}
                      disabled={pdfExportingId === item._id}
                      activeOpacity={0.7}
                    >
                      <Download size={13} color="#006AF5" />
                      <Text style={styles.prescPdfTxt}>
                        {pdfExportingId === item._id ? 'Preparing...' : 'PDF Slip'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.prescWaBtn}
                      onPress={() => handleWhatsAppPrescription(item)}
                      disabled={pdfExportingId === item._id}
                      activeOpacity={0.7}
                    >
                      <MessageSquare size={13} color="#16A34A" />
                      <Text style={styles.prescWaTxt}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.prescViewBtn}
                      onPress={() => setSelectedPrescription(item)}
                      activeOpacity={0.7}
                    >
                      <Eye size={13} color="#64748B" />
                      <Text style={styles.prescViewTxt}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </Card.Content>
              </Card>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <FileText size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Prescriptions Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery || selectedHospital !== 'ALL' || selectedDateRange !== 'ALL'
                  ? 'No doctor prescriptions match your selected filters.'
                  : 'Your clinical prescriptions from consulting doctors will appear here.'}
              </Text>
            </View>
          )
        )}
      </ScrollView>

      {/* Prescription / Pharmacy Detail Modal */}
      <GlassModal
        visible={!!selectedPrescription}
        onDismiss={() => setSelectedPrescription(null)}
        contentContainerStyle={{ width: '92%', maxWidth: 390, maxHeight: '88%', borderRadius: 24, padding: 0 }}
      >
        {selectedPrescription && (
          <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitle}>
                  <View style={[styles.modalIconBox, activeTab === 'pharmacy' && { backgroundColor: '#F5F3FF' }]}>
                    {activeTab === 'pharmacy' ? (
                      <Pill size={18} color="#8B5CF6" />
                    ) : (
                      <Stethoscope size={18} color="#006AF5" />
                    )}
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>
                      {activeTab === 'pharmacy'
                        ? (selectedPrescription.tokenNumber ? `Token #${selectedPrescription.tokenNumber}` : 'Pharmacy Order')
                        : 'Prescription Info'}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {activeTab === 'pharmacy' ? 'TOKEN' : 'RECORD'} ID: #{String(selectedPrescription._id || selectedPrescription.id || 'N/A').slice(-8).toUpperCase()}
                    </Text>
                  </View>
                </View>
                <IconButton
                  icon={() => <X size={18} color="#64748B" />}
                  size={18}
                  onPress={() => setSelectedPrescription(null)}
                />
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.doctorInfoSection}>
                  <View style={styles.drDetail}>
                    <Stethoscope size={20} color={activeTab === 'pharmacy' ? '#8B5CF6' : '#006AF5'} />
                    <View style={styles.drText}>
                      <Text style={styles.drNameLarge}>{formatDoctorName(selectedPrescription.doctor?.user?.name || selectedPrescription.doctor?.name)}</Text>
                      <Text style={styles.hospNameSmall}>{selectedPrescription.hospital?.name || 'Medical Center'}</Text>
                    </View>
                  </View>
                </View>

                {!!selectedPrescription.diagnosis && (
                  <View style={[styles.diagSection, activeTab === 'pharmacy' && { backgroundColor: '#FAF5FF', borderColor: '#F3E8FF' }]}>
                    <View style={styles.sectionHeader}>
                      <Info size={13} color={activeTab === 'pharmacy' ? '#8B5CF6' : '#006AF5'} />
                      <Text style={[styles.sectionLabel, activeTab === 'pharmacy' && { color: '#7E22CE' }]}>DIAGNOSIS</Text>
                    </View>
                    <Text style={styles.diagTextValue}>{selectedPrescription.diagnosis}</Text>
                  </View>
                )}

                <View style={styles.medsSection}>
                  <View style={styles.sectionHeader}>
                    <Pill size={13} color="#64748B" />
                    <Text style={styles.sectionLabel}>PRESCRIBED MEDICINES ({selectedPrescription.medicines?.length || 0})</Text>
                  </View>
                  {Array.isArray(selectedPrescription.medicines) && selectedPrescription.medicines.map((med: any, mIdx: number) => (
                    <View key={mIdx} style={styles.fullMedItem}>
                      <View style={styles.medHeaderRow}>
                        <Text style={styles.fullMedName}>{med.name}</Text>
                        <View style={[styles.freqChip, activeTab === 'pharmacy' && { backgroundColor: '#FAF5FF' }]}>
                          <Text style={[styles.freqText, activeTab === 'pharmacy' && { color: '#7E22CE' }]}>{formatFrequency(med.frequency)}</Text>
                        </View>
                      </View>
                      <Text style={styles.medDetailText}>{med.dosage || '1 dose'} • {med.duration || 'As directed'}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: '#16A34A' }]}
                    onPress={() => handleWhatsAppPrescription(selectedPrescription)}
                    activeOpacity={0.8}
                  >
                    <MessageSquare size={14} color="#FFF" />
                    <Text style={styles.modalActionBtnTxt}>
                      {activeTab === 'pharmacy' ? 'WhatsApp Slip' : 'WhatsApp'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: activeTab === 'pharmacy' ? '#8B5CF6' : '#006AF5' }]}
                    onPress={() => handleExportPrescriptionPdf(selectedPrescription)}
                    activeOpacity={0.8}
                  >
                    <Download size={14} color="#FFF" />
                    <Text style={styles.modalActionBtnTxt}>
                      {activeTab === 'pharmacy' ? 'Export Slip' : 'Export PDF'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </GlassModal>

        {/* Lab Results Detail Modal */}
        <GlassModal
          visible={isLabModalVisible}
          onDismiss={() => setIsLabModalVisible(false)}
          contentContainerStyle={{ width: '92%', maxWidth: 390, maxHeight: '88%', borderRadius: 24, padding: 0 }}
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

                    {test.subTests && test.subTests.map((sub, sIdx) => {
                      const rangeStatus = getTestRangeStatus(sub.name, sub.result);
                      return (
                        <View key={sIdx} style={{ paddingVertical: 10, borderBottomWidth: sIdx === test.subTests!.length - 1 ? 0 : 1, borderBottomColor: '#F0F0F0' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontWeight: '600', color: '#1A1A1A' }}>{sub.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ fontWeight: 'bold', color: '#006AF5', fontSize: 16 }}>{sub.result} {sub.unit}</Text>
                              {rangeStatus && (
                                <View style={{ backgroundColor: rangeStatus.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ color: rangeStatus.color, fontSize: 10, fontWeight: 'bold' }}>{rangeStatus.label}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                            <Text style={{ fontSize: 11, color: '#888' }}>Normal Range: {sub.range}</Text>
                          </View>
                        </View>
                      );
                    })}

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
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: '#0D9488' }]}
                    onPress={() => handleExportLabReportPdf(selectedLabReport)}
                    disabled={pdfExportingId === selectedLabReport._id}
                    activeOpacity={0.8}
                  >
                    <Download size={14} color="#FFF" />
                    <Text style={styles.modalActionBtnTxt}>
                      {pdfExportingId === selectedLabReport._id ? 'Generating...' : 'Official PDF'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: '#16A34A' }]}
                    onPress={() => handleWhatsAppLabReport(selectedLabReport)}
                    disabled={pdfExportingId === selectedLabReport._id}
                    activeOpacity={0.8}
                  >
                    <MessageSquare size={14} color="#FFF" />
                    <Text style={styles.modalActionBtnTxt}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </GlassModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 6,
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    marginBottom: 8,
    gap: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6.5,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeTab: {
    backgroundColor: '#EBF4FF',
    borderColor: '#006AF5',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTabText: {
    color: '#006AF5',
    fontWeight: '800',
  },
  activeTabPrescriptions: {
    backgroundColor: '#EFF6FF',
    borderColor: '#006AF5',
  },
  activeTabTextPrescriptions: {
    color: '#006AF5',
    fontWeight: '800',
  },
  activeTabPharmacy: {
    backgroundColor: '#F5F3FF',
    borderColor: '#8B5CF6',
  },
  activeTabTextPharmacy: {
    color: '#8B5CF6',
    fontWeight: '800',
  },
  activeTabLabs: {
    backgroundColor: '#F0FDFA',
    borderColor: '#0D9488',
  },
  activeTabTextLabs: {
    color: '#0D9488',
    fontWeight: '800',
  },
  filtersSection: {
    paddingTop: 6,
    paddingHorizontal: 14,
  },
  filterChipScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  filterLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  filterGroupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  clearFiltersChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearFiltersText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
  },
  searchAndToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    elevation: 0,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterToggleBtn: {
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  filterToggleBtnActive: {
    backgroundColor: '#006AF5',
    borderColor: '#006AF5',
  },
  filterToggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  filterToggleTextActive: {
    color: '#FFF',
  },
  filterSwitchPill: {
    width: 22,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CBD5E1',
    padding: 1.5,
    justifyContent: 'center',
  },
  filterSwitchPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  filterSwitchKnob: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FFF',
  },
  filterSwitchKnobActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFF',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  searchInput: {
    fontSize: 12.5,
    minHeight: 0,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 30,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleInfo: {
    flex: 1,
    marginLeft: 10,
  },
  reportName: {
    fontWeight: '800',
    fontSize: 13,
    color: '#1A1A1A',
  },
  reportType: {
    color: '#888',
    fontSize: 10,
    marginTop: 1,
  },
  dateBadge: {
    alignItems: 'center',
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#F0F0F0',
    minWidth: 40,
  },
  dateMonth: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#006AF5',
    textTransform: 'uppercase',
  },
  dateDay: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1A1A1A',
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 10.5,
    color: '#666',
    marginLeft: 4,
  },
  divider: {
    marginVertical: 8,
    backgroundColor: '#F0F0F0',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#006AF5',
  },
  downloadBtn: {
    borderRadius: 8,
    backgroundColor: '#006AF5',
    minHeight: 38,
    justifyContent: 'center',
  },
  downloadLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFF',
    marginVertical: 0,
    marginHorizontal: 4,
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
    backgroundColor: '#F8FAFC',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 5,
  },
  diagnosisLabel: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  diagnosisText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  medsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 5,
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
  },
  medName: {
    fontSize: 10.5,
    color: '#006AF5',
    fontWeight: '600',
    marginLeft: 3,
  },
  modalContainer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalSubtitle: {
    fontSize: 9.5,
    color: '#94A3B8',
  },
  modalBody: {
    padding: 12,
    maxHeight: 460,
  },
  doctorInfoSection: {
    marginBottom: 8,
  },
  drDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drText: {
    flex: 1,
  },
  drNameLarge: {
    fontSize: 15,
    fontWeight: '800',
  },
  hospNameSmall: {
    color: '#006AF5',
    fontSize: 11,
  },
  diagSection: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  diagTextValue: {
    fontSize: 12.5,
    color: '#334155',
  },
  medsSection: {
    marginBottom: 8,
  },
  fullMedItem: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    backgroundColor: '#FAFBFC',
  },
  medHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  fullMedName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  freqChip: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  freqText: {
    fontSize: 9,
    color: '#006AF5',
    fontWeight: '700',
  },
  medDetailText: {
    fontSize: 11,
    color: '#64748B',
  },
  modalFooter: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 5,
  },
  modalActionBtnTxt: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
  },
  prescActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  prescPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
  },
  prescPdfTxt: {
    color: '#006AF5',
    fontWeight: '800',
    fontSize: 11,
  },
  prescWaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
  },
  prescWaTxt: {
    color: '#16A34A',
    fontWeight: '800',
    fontSize: 11,
  },
  summaryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 6,
    flexWrap: 'wrap',
  },
  diagChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    maxWidth: '70%',
  },
  diagChipTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#006AF5',
  },
  medCountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  medCountChipTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  prescViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
  },
  prescViewTxt: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 11,
  },
  labActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    width: '100%',
  },
  labBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
    minHeight: 38,
  },
  labBtnTxt: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
