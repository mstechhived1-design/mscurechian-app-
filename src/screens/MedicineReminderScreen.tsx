import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { 
  ChevronLeft, 
  ChevronRight,
  Pill, 
  Clock, 
  Bell, 
  BellOff,
  CheckCircle2, 
  RefreshCw,
  Check,
  Building2,
  UserCheck,
  Calendar,
  Utensils,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  History,
  AlertTriangle,
} from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle as SvgCircle, Text as SvgText } from 'react-native-svg';

import { RootStackParamList } from '@/navigation/types';
import { SanctuaryText } from '../components/SanctuaryComponents';
import { COLORS } from '../constants/designSystem';
import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { notificationService } from '@/services/notificationService';
import { formatDoctorName } from '@/utils/pdfExportUtil';
import { familyService } from '@/services/familyService';

const { width } = Dimensions.get('window');
const CONSULTATIONS_PER_PAGE = 5;

export type FoodTiming = 'anytime' | 'before' | 'after' | 'with';

export interface StandardFrequency {
  morning: FoodTiming | 'off';
  afternoon: FoodTiming | 'off';
  evening: FoodTiming | 'off';
  night: FoodTiming | 'off';
}

export interface CustomFrequency {
  interval: number; // in hours
  timing: FoodTiming;
}

export interface Frequency {
  type: 'standard' | 'custom';
  standard: StandardFrequency;
  custom: CustomFrequency;
}

export const INITIAL_FREQUENCY: Frequency = {
  type: 'standard',
  standard: {
    morning: 'off',
    afternoon: 'off',
    evening: 'off',
    night: 'off',
  },
  custom: {
    interval: 8,
    timing: 'after',
  },
};

export const mapFrequency = (freq: any): Frequency => {
  const newFreq: Frequency = JSON.parse(JSON.stringify(INITIAL_FREQUENCY));

  if (typeof freq === 'object' && freq !== null) {
    newFreq.type = freq.type === 'custom' ? 'custom' : 'standard';

    if (freq.standard) {
      (['morning', 'afternoon', 'evening', 'night'] as const).forEach((slot) => {
        const val = freq.standard[slot];
        if (typeof val === 'string') {
          newFreq.standard[slot] = val as any;
        } else if (typeof val === 'boolean') {
          newFreq.standard[slot] = val ? (freq.foodTiming || 'anytime') : 'off';
        }
      });
    }

    if (freq.custom) {
      newFreq.custom.interval = 
        freq.custom.interval !== undefined && freq.custom.interval !== null 
          ? Number(freq.custom.interval) 
          : (freq.custom.hours ? Number(freq.custom.hours) : 8);
      newFreq.custom.timing = freq.custom.timing || freq.foodTiming || 'after';
    }

    return newFreq;
  }

  if (typeof freq === 'string') {
    const parts = freq.split('-').map((p) => p.trim());
    if (parts.length >= 3) {
      newFreq.standard = {
        morning: parts[0] !== '0' && parts[0] !== '' ? 'anytime' : 'off',
        afternoon: parts[1] !== '0' && parts[1] !== '' ? 'anytime' : 'off',
        evening: parts.length > 3 && parts[2] !== '0' && parts[2] !== '' ? 'anytime' : 'off',
        night: (parts.length > 3 ? parts[3] : parts[2]) !== '0' ? 'anytime' : 'off',
      };
      return newFreq;
    }

    const hourlyMatch = freq.match(/every\s+(\d+)\s*h/i);
    if (hourlyMatch) {
      newFreq.type = 'custom';
      newFreq.custom = { interval: parseInt(hourlyMatch[1], 10), timing: 'after' };
      return newFreq;
    }
  }

  return newFreq;
};

export const formatFrequency = (freq: any, timingFallback?: string): string => {
  const f = mapFrequency(freq);

  const timingLabels: Record<FoodTiming, string> = {
    anytime: 'Any time',
    before: 'Before Food',
    after: 'After Food',
    with: 'With Food',
  };

  if (f.type === 'custom') {
    const interval = f.custom?.interval || 8;
    const timing = f.custom?.timing ? timingLabels[f.custom.timing] : (timingFallback || 'After Food');
    return `Every ${interval} hrs (${timing})`;
  }

  const slotStrings: string[] = [];
  const slotLabels = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
  };

  (['morning', 'afternoon', 'evening', 'night'] as const).forEach((slot) => {
    const slotTiming = f.standard[slot];
    if (slotTiming !== 'off') {
      const label = slotLabels[slot];
      const tLabel = slotTiming !== 'anytime' ? ` (${timingLabels[slotTiming]})` : '';
      slotStrings.push(`${label}${tLabel}`);
    }
  });

  if (slotStrings.length === 0) return timingFallback ? `As advised (${timingFallback})` : 'As advised by doctor';
  return slotStrings.join(', ');
};

export interface DoseSchedule {
  id: string;
  slot: string;
  shortLabel: string;
  timeStr: string;
  hour: number;
  minute: number;
  taken: boolean;
}

export interface DynamicMedicine {
  id: string;
  consultationId: string;
  name: string;
  dosage: string;
  form: string;
  durationText?: string;
  totalQuantity: number;
  consumedQuantity: number;
  remainingQuantity: number;
  timing: string;
  frequencyText: string;
  instructions?: string;
  doctorName?: string;
  hospitalName?: string;
  prescriptionDate?: string;
  diagnosis?: string;
  doses: DoseSchedule[];
  reminderEnabled: boolean;
  fromPrescription: boolean;
  // Dynamic Pharma Expiry & Batch Details
  expiryDate?: string;
  batchNumber?: string;
  daysUntilExpiry?: number;
  isExpired?: boolean;
  isExpiringSoon?: boolean;
  expiryAlert?: string;
}

export interface ConsultationGroup {
  id: string;
  prescriptionId: string;
  consultationDate: string;
  formattedDate: string;
  doctorName: string;
  hospitalName: string;
  diagnosis?: string;
  medicines: DynamicMedicine[];
  isExpanded: boolean;
}

function sanitizeDuration(rawDuration: any): string | undefined {
  if (!rawDuration) return undefined;
  const str = String(rawDuration).trim();
  if (str.toLowerCase().includes('exp') || str.includes('/')) {
    return str;
  }
  const numeric = parseInt(str, 10);
  if (!isNaN(numeric) && numeric > 0) {
    return `${numeric} Days Course`;
  }
  return str.toLowerCase().includes('day') ? str : `${str} Course`;
}

export function formatRemainingExpiry(expiryDateStr?: string, daysUntilExpiry?: number): string {
  if (!expiryDateStr) return '';
  const expDate = new Date(expiryDateStr);
  if (isNaN(expDate.getTime())) return '';

  const now = new Date();
  const diffDays = daysUntilExpiry !== undefined 
    ? daysUntilExpiry 
    : Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays < 30) return `Expired ${absDays}d ago`;
    const months = Math.round(absDays / 30);
    return `Expired ${months} mo${months > 1 ? 's' : ''} ago`;
  }

  if (diffDays === 0) return 'Expires Today!';
  if (diffDays === 1) return 'Expires Tomorrow!';
  if (diffDays < 30) return `${diffDays} Days Left`;
  
  const months = Math.floor(diffDays / 30);
  const remDays = diffDays % 30;

  if (months < 12) {
    if (remDays >= 10) {
      return `${months}m ${remDays}d Left`;
    }
    return `${months} Month${months > 1 ? 's' : ''} Left`;
  }

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (remMonths > 0) {
    return `${years}y ${remMonths}m Left`;
  }
  return `${years} Year${years > 1 ? 's' : ''} Left`;
}

function resolveDynamicDoses(
  freqRaw: any,
  timingRaw?: string,
  instructionsRaw?: string,
  baseId = 'dose'
): DoseSchedule[] {
  const f = mapFrequency(freqRaw);
  const doses: DoseSchedule[] = [];

  const getDoseTime = (timing: FoodTiming, defaultHour: number, defaultMin: number) => {
    const isBefore = timing === 'before';
    const hour = isBefore ? defaultHour - 1 : defaultHour;
    const minute = isBefore ? 45 : defaultMin;
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const ampm = hour < 12 ? 'A' : 'P';
    const timeStr = `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}${ampm}`;
    return { hour, minute, timeStr };
  };

  if (f.type === 'custom') {
    const interval = f.custom?.interval || 8;
    let currentHour = 8;
    let count = 0;
    const totalDosesPerDay = Math.max(1, Math.min(6, Math.floor(24 / interval)));

    while (count < totalDosesPerDay && currentHour < 24) {
      const displayHour = currentHour % 12 === 0 ? 12 : currentHour % 12;
      const ampm = currentHour < 12 ? 'AM' : 'PM';
      const formattedTime = `${String(displayHour).padStart(2, '0')}:00 ${ampm}`;
      const slotIdentifier = `Custom_${String(displayHour).padStart(2, '0')}:00${ampm}`;

      doses.push({
        id: `${baseId}_cst_${currentHour}`,
        slot: slotIdentifier,
        shortLabel: `⏰ ${formattedTime}`,
        timeStr: `${formattedTime} (Every ${interval}h)`,
        hour: currentHour,
        minute: 0,
        taken: false,
      });
      currentHour += interval;
      count++;
    }

    if (doses.length > 0) return doses;
  }

  if (f.standard.morning !== 'off') {
    const t = getDoseTime(f.standard.morning, 8, 30);
    doses.push({
      id: `${baseId}_m`,
      slot: 'Morning',
      shortLabel: `🌅 ${t.timeStr}`,
      timeStr: `${t.timeStr} Morning`,
      hour: t.hour,
      minute: t.minute,
      taken: false,
    });
  }

  if (f.standard.afternoon !== 'off') {
    const t = getDoseTime(f.standard.afternoon, 13, 30);
    doses.push({
      id: `${baseId}_a`,
      slot: 'Afternoon',
      shortLabel: `☀️ ${t.timeStr}`,
      timeStr: `${t.timeStr} Noon`,
      hour: t.hour,
      minute: t.minute,
      taken: false,
    });
  }

  if (f.standard.evening !== 'off') {
    const t = getDoseTime(f.standard.evening, 18, 0);
    doses.push({
      id: `${baseId}_e`,
      slot: 'Evening',
      shortLabel: `🌆 ${t.timeStr}`,
      timeStr: `${t.timeStr} Eve`,
      hour: t.hour,
      minute: t.minute,
      taken: false,
    });
  }

  if (f.standard.night !== 'off') {
    const t = getDoseTime(f.standard.night, 20, 30);
    doses.push({
      id: `${baseId}_n`,
      slot: 'Night',
      shortLabel: `🌙 ${t.timeStr}`,
      timeStr: `${t.timeStr} Night`,
      hour: t.hour,
      minute: t.minute,
      taken: false,
    });
  }

  if (doses.length === 0) {
    doses.push({
      id: `${baseId}_m`,
      slot: 'Morning',
      shortLabel: '🌅 08:30A',
      timeStr: '08:30 AM Morning',
      hour: 8,
      minute: 30,
      taken: false,
    });
  }

  return doses;
}

export default function MedicineReminderScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<'cabinet' | 'history'>('cabinet');
  const [consultations, setConsultations] = useState<ConsultationGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activePatientName, setActivePatientName] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Dedicated Backend History State & Pagination
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const getStorageKey = async (): Promise<string> => {
    const pid = (await familyService.getActivePatientId()) || 'default';
    return `consultation_cabinet_v5_${pid}`;
  };

  const loadPatientName = async () => {
    try {
      const activeId = await familyService.getActivePatientId();
      const members = await familyService.getFamilyMembers();
      const current = members.find((m) => m._id === activeId || m.isCurrent);
      if (current?.name) {
        setActivePatientName(current.name);
      } else {
        setActivePatientName('');
      }
    } catch {}
  };

  const loadHistory = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const pid = await familyService.getActivePatientId();
      const res = await apiClient.get(PATIENT_ENDPOINTS.MEDICATION_HISTORY, {
        params: { page, limit: 10, patientId: pid },
      });
      if (res.data?.success) {
        setHistoryLogs(res.data.logs || []);
        setHistoryPage(res.data.page || 1);
        setHistoryTotalPages(res.data.totalPages || 1);
        setHistoryTotal(res.data.total || 0);
      }
    } catch (e) {
      console.warn('[MedicineReminder] loadHistory error:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadData = async () => {
    try {
      await loadPatientName();
      const key = await getStorageKey();
      const saved = await AsyncStorage.getItem(key);
      if (saved) {
        const parsed: ConsultationGroup[] = JSON.parse(saved);
        const seenIds = new Set<string>();
        const dedupedSaved: ConsultationGroup[] = [];
        for (const g of parsed) {
          const sig = `${g.doctorName}_${g.formattedDate}_${(g.medicines || []).map((m) => m.name).sort().join('|')}`;
          if (!seenIds.has(g.id) && !seenIds.has(sig)) {
            seenIds.add(g.id);
            seenIds.add(sig);
            dedupedSaved.push({ ...g, isExpanded: false });
          }
        }
        setConsultations(dedupedSaved);
      }
      // Always sync with backend to get live consumed/remaining counts and prescriptions
      await syncFromPrescriptions(false);
      // Preload history count
      await loadHistory(1);
    } catch (e) {
      console.error('[MedicineReminder] Load Error:', e);
    }
  };

  const saveConsultations = async (groups: ConsultationGroup[]) => {
    setConsultations(groups);
    try {
      const key = await getStorageKey();
      await AsyncStorage.setItem(key, JSON.stringify(groups));
    } catch (e) {
      console.error('[MedicineReminder] Save Error:', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();

    const unsubProfile = familyService.onProfileChange(() => {
      setConsultations([]);
      setHistoryLogs([]);
      setCurrentPage(1);
      setHistoryPage(1);
      loadData();
    });

    return () => {
      unsubProfile();
    };
  }, []);

  /**
   * Sync active doctor prescriptions and backend medication status
   */
  const syncFromPrescriptions = async (showSuccessAlert = true) => {
    setLoading(true);
    try {
      await loadPatientName();
      const pid = await familyService.getActivePatientId();

      // Parallel fetch: Real doctor prescriptions + live backend medication status
      const [prescRes, statusRes] = await Promise.all([
        apiClient.get(PATIENT_ENDPOINTS.PRESCRIPTIONS),
        apiClient.get(PATIENT_ENDPOINTS.MEDICATION_STATUS, { params: { patientId: pid } }).catch(() => ({ data: {} })),
      ]);

      const prescList: any[] = Array.isArray(prescRes.data.data) 
        ? prescRes.data.data 
        : (Array.isArray(prescRes.data) ? prescRes.data : (prescRes.data?.prescriptions || []));

      const backendTodayTaken: Record<string, boolean> = statusRes.data?.todayTakenMap || {};
      const backendConsumedMap: Record<string, number> = statusRes.data?.consumedMap || {};

      // Filter out pharmacy tokens, pharmacy orders, invoices, and hospital administration
      const validPrescriptions = prescList.filter((p: any) => {
        const displayType = String(p.displayType || '').toLowerCase();
        const itemType = String(p.type || '').toLowerCase();
        const diag = String(p.diagnosis || '').toLowerCase();

        if (displayType.includes('invoice') || itemType.includes('invoice') || diag.includes('invoice')) return false;
        if (displayType.includes('hospital administration') || itemType.includes('hospital administration')) return false;
        if (displayType.includes('pharmacy') || itemType.includes('pharmacy') || itemType === 'pharma' || itemType.includes('pharma')) return false;
        return true;
      });

      // Deduplicate by ID, Appointment ID, and Consultation Signature (Doctor + Date + Medicines)
      const seenPrescIds = new Set<string>();
      const seenApptIds = new Set<string>();
      const seenConsultationKeys = new Set<string>();

      const dedupedPrescs = validPrescriptions.filter((p: any) => {
        const id = String(p._id || p.id || '');
        if (id && seenPrescIds.has(id)) return false;

        const apptId = String(p.appointment?._id || p.appointment || '');
        if (apptId && seenApptIds.has(apptId)) return false;

        const docName = String(p.doctor?.name || p.doctor?.user?.name || '').trim().toLowerCase();
        const dateStr = new Date(p.prescriptionDate || p.createdAt || 0).toDateString();
        const medNames = (p.medicines || [])
          .map((m: any) => String(m.name || '').trim().toLowerCase())
          .sort()
          .join('|');
        const consultKey = `${docName}_${dateStr}_${medNames}`;
        if (consultKey && seenConsultationKeys.has(consultKey)) return false;

        if (id) seenPrescIds.add(id);
        if (apptId) seenApptIds.add(apptId);
        if (consultKey) seenConsultationKeys.add(consultKey);
        return true;
      });

      // Sort newest consultations first
      const sortedPrescs = [...dedupedPrescs].sort((a, b) => {
        const dateA = new Date(a.prescriptionDate || a.createdAt || 0).getTime();
        const dateB = new Date(b.prescriptionDate || b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      const groups: ConsultationGroup[] = [];

      sortedPrescs.forEach((p: any, pIdx: number) => {
        if (!Array.isArray(p.medicines) || p.medicines.length === 0) return;

        const docName = formatDoctorName(p.doctor?.name || p.doctor?.user?.name);
        const hospName = p.hospital?.name || p.hospitalName || 'Care Facility';
        const rawDate = p.prescriptionDate || p.createdAt || new Date().toISOString();
        const prescId = p._id || p.id || `presc_${pIdx}`;

        const parsedDate = new Date(rawDate);
        const isToday = parsedDate.toDateString() === new Date().toDateString();
        const formattedDate = isToday 
          ? 'Today' 
          : parsedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

        const groupMeds: DynamicMedicine[] = [];

        p.medicines.forEach((m: any, mIdx: number) => {
          const cleanName = (m.name || 'Medication').trim();
          const cleanLower = cleanName.toLowerCase();
          const rawFreq = m.freq || m.frequency;
          const rawDuration = m.days || m.duration;
          const rawQty = m.qty || m.quantity;
          const formVal = m.form || m.dosageForm || 'Tablet';
          const dosageDisplay = m.dosage ? `${m.dosage} • ${formVal}` : formVal;

          const totalParsed = parseInt(String(rawQty || '30'), 10) || 30;
          const uniqueMedId = `rx_${prescId}_${m._id || m.id || mIdx}`;

          // Live dynamic consumed count from backend (matches both uniqueMedId and clean name)
          const liveConsumed = Number(
            backendConsumedMap[uniqueMedId] ?? 
            backendConsumedMap[cleanLower] ?? 
            0
          );
          const liveRemaining = Math.max(0, totalParsed - liveConsumed);

          const dynamicDoses = resolveDynamicDoses(
            rawFreq,
            m.timing,
            m.instructions,
            uniqueMedId
          ).map((dose) => {
            const slotLower = dose.slot.toLowerCase();
            const isTaken = Boolean(
              backendTodayTaken[`${uniqueMedId}_${dose.slot}`] ||
              backendTodayTaken[`${uniqueMedId}_${slotLower}`] ||
              backendTodayTaken[`${cleanLower}_${dose.slot}`] ||
              backendTodayTaken[`${cleanLower}_${slotLower}`]
            );
            return {
              ...dose,
              taken: isTaken,
            };
          });

          const rawExpiry = m.expiryDate;
          const rawBatch = m.batchNumber || m.batchNo;
          let isExpired = Boolean(m.isExpired);
          let isExpiringSoon = Boolean(m.isExpiringSoon);
          let daysUntilExpiry = m.daysUntilExpiry !== undefined ? Number(m.daysUntilExpiry) : undefined;
          let expiryAlert = m.expiryAlert || undefined;

          if (rawExpiry && daysUntilExpiry === undefined) {
            const expDate = new Date(rawExpiry);
            const now = new Date();
            const diff = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            daysUntilExpiry = diff;
            isExpired = diff < 0;
            isExpiringSoon = diff >= 0 && diff <= 30;
            const formattedExp = expDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            if (!expiryAlert) {
              expiryAlert = isExpired
                ? `⚠️ Medicine EXPIRED on ${formattedExp}! Do not consume.`
                : isExpiringSoon
                ? `⏳ Expiring in ${diff} day${diff === 1 ? '' : 's'} (${formattedExp}). Contact pharmacy for fresh stock.`
                : `Exp: ${formattedExp}`;
            }
          }

          groupMeds.push({
            id: uniqueMedId,
            consultationId: prescId,
            name: cleanName,
            dosage: dosageDisplay,
            form: formVal,
            durationText: sanitizeDuration(rawDuration),
            totalQuantity: totalParsed,
            consumedQuantity: liveConsumed,
            remainingQuantity: liveRemaining,
            timing: m.timing || 'After food',
            frequencyText: formatFrequency(rawFreq, m.timing),
            instructions: m.instructions || undefined,
            doctorName: docName,
            hospitalName: hospName,
            prescriptionDate: rawDate,
            diagnosis: p.diagnosis || undefined,
            doses: dynamicDoses,
            reminderEnabled: true,
            fromPrescription: true,
            expiryDate: rawExpiry || undefined,
            batchNumber: rawBatch || undefined,
            daysUntilExpiry,
            isExpired,
            isExpiringSoon,
            expiryAlert,
          });
        });

        if (groupMeds.length > 0) {
          groups.push({
            id: prescId,
            prescriptionId: prescId,
            consultationDate: rawDate,
            formattedDate,
            doctorName: docName,
            hospitalName: hospName,
            diagnosis: p.diagnosis || undefined,
            medicines: groupMeds,
            isExpanded: false,
          });
        }
      });

      await saveConsultations(groups);

      // Schedule audible reminder notifications for each dose
      for (const group of groups) {
        for (const med of group.medicines) {
          if (med.reminderEnabled) {
            for (const dose of med.doses) {
              await notificationService.scheduleDailyMedicineReminder(
                dose.id,
                med.name,
                med.dosage,
                dose.hour,
                dose.minute,
                { slot: dose.slot, doctor: med.doctorName, hospital: med.hospitalName }
              );
            }
          }
        }
      }

      if (showSuccessAlert) {
        if (groups.length > 0) {
          Alert.alert(
            'Prescriptions Updated',
            `Loaded ${groups.length} consultation prescription(s) with daily dose schedules and audio notifications.`
          );
        } else {
          Alert.alert(
            'Cabinet Up to Date',
            'No active doctor prescriptions found for this patient profile.'
          );
        }
      }
    } catch (err: any) {
      console.warn('[MedicineReminder] Sync error:', err);
      if (showSuccessAlert) {
        Alert.alert('Notice', 'Could not sync doctor prescriptions. Showing offline saved cabinet.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Toggles taken status for a dose:
   * Direct backend API call to record intake and dynamically decrement remaining tablets.
   */
  const toggleDoseTaken = async (groupId: string, med: DynamicMedicine, dose: DoseSchedule) => {
    if (med.isExpired && !dose.taken) {
      Alert.alert(
        '⚠️ Expired Medicine Warning',
        `Warning: ${med.name} expired on ${med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : 'an earlier date'}.\n\nConsuming expired medicine can be ineffective or hazardous to your health.\n\nDo you still wish to record this dose as taken?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Record Taken',
            style: 'destructive',
            onPress: () => performToggleDoseTaken(groupId, med, dose),
          },
        ]
      );
      return;
    }
    await performToggleDoseTaken(groupId, med, dose);
  };

  const performToggleDoseTaken = (groupId: string, med: DynamicMedicine, dose: DoseSchedule) => {
    const nextTaken = !dose.taken;
    const cleanNameLower = med.name.trim().toLowerCase();

    // 1. Instant Synchronous UI update (0ms lag, immediately blocks/checks the box)
    setConsultations((prev) => {
      const updated = prev.map((group) => {
        const updatedMeds = group.medicines.map((m) => {
          const isTarget = m.id === med.id || m.name.trim().toLowerCase() === cleanNameLower;
          if (!isTarget) return m;

          const updatedDoses = m.doses.map((d) => {
            const isMatch = d.id === dose.id || (d.slot.toLowerCase() === dose.slot.toLowerCase() && d.hour === dose.hour);
            return isMatch ? { ...d, taken: nextTaken } : d;
          });
          const newConsumed = nextTaken ? m.consumedQuantity + 1 : Math.max(0, m.consumedQuantity - 1);
          const newRemaining = nextTaken ? Math.max(0, m.remainingQuantity - 1) : m.remainingQuantity + 1;

          return {
            ...m,
            doses: updatedDoses,
            consumedQuantity: newConsumed,
            remainingQuantity: newRemaining,
          };
        });

        return { ...group, medicines: updatedMeds };
      });

      // Persist to storage without blocking the UI thread
      getStorageKey().then((key) => AsyncStorage.setItem(key, JSON.stringify(updated))).catch(() => {});
      return updated;
    });

    // 2. Direct Backend API Call in background
    (async () => {
      try {
        const pid = await familyService.getActivePatientId();
        const res = await apiClient.post(PATIENT_ENDPOINTS.MEDICATION_INTAKE, {
          patientId: pid,
          prescriptionId: med.consultationId,
          medicineId: med.id,
          medicineName: med.name,
          dosage: med.dosage,
          timeSlot: dose.slot,
          scheduledTime: dose.timeStr,
          isTaken: nextTaken,
          totalQuantity: med.totalQuantity,
        });

        // Synchronize verified counts from DB using functional updater (never stale)
        if (res.data?.success) {
          const backendConsumed = Number(res.data.consumedCount);
          const backendRemaining = Number(res.data.remainingCount);

          setConsultations((prev) => {
            const synced = prev.map((g) => ({
              ...g,
              medicines: g.medicines.map((m) => {
                const isTarget = m.id === med.id || m.name.trim().toLowerCase() === cleanNameLower;
                if (!isTarget) return m;
                return {
                  ...m,
                  consumedQuantity: backendConsumed,
                  remainingQuantity: backendRemaining,
                };
              }),
            }));

            getStorageKey().then((key) => AsyncStorage.setItem(key, JSON.stringify(synced))).catch(() => {});
            return synced;
          });

          // Refresh history count silently
          loadHistory(1);
        }
      } catch (apiErr) {
        console.warn('[MedicineReminder] Backend intake recording failed, kept local state:', apiErr);
      }
    })();
  };

  const toggleExpandGroup = (groupId: string) => {
    setConsultations((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, isExpanded: !g.isExpanded } : g))
    );
  };

  const snoozeMedicine = async (med: DynamicMedicine) => {
    try {
      const now = new Date();
      const snoozeTime = new Date(now.getTime() + 10 * 60000);
      const sHour = snoozeTime.getHours();
      const sMinute = snoozeTime.getMinutes();
      const sTimeStr = snoozeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await notificationService.scheduleDailyMedicineReminder(
        `snooze_${med.id}_${Date.now()}`,
        `[Snoozed] ${med.name}`,
        med.dosage,
        sHour,
        sMinute,
        { slot: 'Snoozed', doctor: med.doctorName }
      );

      Alert.alert(
        'Reminder Snoozed',
        `Audio alarm for ${med.name} will ring at ${sTimeStr} (in 10 minutes).`
      );
    } catch {
      Alert.alert('Notice', 'Reminder set for 10 minutes.');
    }
  };

  const toggleReminderAlarm = async (med: DynamicMedicine) => {
    const newStatus = !med.reminderEnabled;
    const updated = consultations.map((group) => {
      const updatedMeds = group.medicines.map((m) => (m.id === med.id ? { ...m, reminderEnabled: newStatus } : m));
      return { ...group, medicines: updatedMeds };
    });
    await saveConsultations(updated);

    if (newStatus) {
      for (const dose of med.doses) {
        await notificationService.scheduleDailyMedicineReminder(
          dose.id,
          med.name,
          med.dosage,
          dose.hour,
          dose.minute,
          { slot: dose.slot, doctor: med.doctorName, hospital: med.hospitalName }
        );
      }
      Alert.alert('Reminders On', `Audio alarms enabled for ${med.name}.`);
    } else {
      for (const dose of med.doses) {
        await notificationService.cancelMedicineReminder(dose.id);
      }
      Alert.alert('Reminders Off', `Audio alarms muted for ${med.name}.`);
    }
  };

  // Metrics: calculate total dose slots vs taken
  const allMeds = consultations.flatMap((g) => g.medicines);
  const allDosesList = allMeds.flatMap((m) => m.doses);
  const totalDoses = allDosesList.length;
  const takenDoses = allDosesList.filter((d) => d.taken).length;
  const progressPct = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(consultations.length / CONSULTATIONS_PER_PAGE));
  const displayedConsultations = consultations.slice(
    (currentPage - 1) * CONSULTATIONS_PER_PAGE,
    currentPage * CONSULTATIONS_PER_PAGE
  );

  return (
    <View style={styles.container}>
      {/* ── Compact Header ──────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={20} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <SanctuaryText variant="headline_sm" style={styles.headerTitle}>Medicine Cabinet</SanctuaryText>
          {activePatientName ? (
            <View style={styles.profileBadge}>
              <SanctuaryText variant="label_sm" style={styles.profileBadgeText}>
                {activePatientName}
              </SanctuaryText>
            </View>
          ) : null}
        </View>

        <TouchableOpacity 
          style={styles.syncBtnHeader} 
          onPress={() => {
            if (activeTab === 'cabinet') {
              syncFromPrescriptions(true);
            } else {
              loadHistory(historyPage);
            }
          }}
          disabled={loading || historyLoading}
          activeOpacity={0.7}
        >
          {loading || historyLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <RefreshCw size={17} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── Segmented Navigation Tabs ─────────────────────────────────── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'cabinet' && styles.tabButtonActive]}
          onPress={() => setActiveTab('cabinet')}
          activeOpacity={0.8}
        >
          <Pill size={14} color={activeTab === 'cabinet' ? COLORS.primary : '#64748B'} />
          <SanctuaryText
            variant="label_md"
            style={[styles.tabText, activeTab === 'cabinet' && styles.tabTextActive]}
          >
            Prescriptions
          </SanctuaryText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('history');
            loadHistory(1);
          }}
          activeOpacity={0.8}
        >
          <History size={14} color={activeTab === 'history' ? COLORS.primary : '#64748B'} />
          <SanctuaryText
            variant="label_md"
            style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}
          >
            Intake History
          </SanctuaryText>
          {historyTotal > 0 && (
            <View style={styles.historyCountBadge}>
              <SanctuaryText variant="label_sm" style={styles.historyCountBadgeTxt}>
                {historyTotal}
              </SanctuaryText>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              setRefreshing(true);
              if (activeTab === 'cabinet') {
                syncFromPrescriptions(false);
              } else {
                loadHistory(historyPage).then(() => setRefreshing(false));
              }
            }} 
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ── Tab 1: Prescriptions Cabinet View ─────────────────────────── */}
        {activeTab === 'cabinet' && (
          <>
            {/* ── Adherence Summary Card ────────────────────────────────────── */}
            <View style={styles.summaryCard}>
              <LinearGradient colors={[COLORS.primary, '#1D4ED8']} style={styles.summaryGrad}>
                <View style={styles.adherenceMainRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={styles.adherenceStatusPill}>
                      <SanctuaryText variant="label_sm" style={styles.adherenceStatusText}>
                        {progressPct === 100 ? '⭐ TODAY COMPLETE' : progressPct >= 50 ? '👍 ON SCHEDULE' : '🔔 REMINDERS ACTIVE'}
                      </SanctuaryText>
                    </View>
                    <SanctuaryText variant="headline_sm" style={styles.summaryTitle}>
                      {takenDoses} of {totalDoses} Doses Taken
                    </SanctuaryText>
                    <SanctuaryText variant="body_sm" style={styles.summarySub}>
                      {totalDoses - takenDoses === 0 
                        ? 'All doses taken for today' 
                        : `${totalDoses - takenDoses} dose(s) remaining today`}
                    </SanctuaryText>
                  </View>

                  <View style={styles.ringWrapper}>
                    <Svg width={62} height={62}>
                      <SvgCircle
                        cx={31}
                        cy={31}
                        r={24}
                        stroke="rgba(255, 255, 255, 0.2)"
                        strokeWidth={5}
                        fill="none"
                      />
                      <SvgCircle
                        cx={31}
                        cy={31}
                        r={24}
                        stroke="#4ADE80"
                        strokeWidth={5}
                        fill="none"
                        strokeDasharray={150.8}
                        strokeDashoffset={150.8 - (150.8 * Math.min(100, Math.max(0, progressPct))) / 100}
                        strokeLinecap="round"
                        transform="rotate(-90 31 31)"
                      />
                      <SvgText
                        x={31}
                        y={35}
                        fontSize="11"
                        fontWeight="bold"
                        fill="#FFFFFF"
                        textAnchor="middle"
                      >
                        {Math.round(progressPct)}%
                      </SvgText>
                    </Svg>
                  </View>
                </View>

                <View style={styles.weekStreakRow}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dIdx) => {
                    const todayIdx = (new Date().getDay() + 6) % 7;
                    const isToday = dIdx === todayIdx;
                    const isPast = dIdx < todayIdx;
                    const completed = isPast || (isToday && progressPct === 100);

                    return (
                      <View key={dIdx} style={styles.dayStreakItem}>
                        <View style={[
                          styles.dayDot,
                          completed && styles.dayDotCompleted,
                          isToday && styles.dayDotToday
                        ]}>
                          {completed ? (
                            <Check size={9} color="#FFF" strokeWidth={3} />
                          ) : (
                            <SanctuaryText variant="label_sm" style={[styles.dayDotText, isToday && { color: '#FFF' }]}>{day}</SanctuaryText>
                          )}
                        </View>
                        <SanctuaryText variant="label_sm" style={styles.dayLabelTxt}>{day}</SanctuaryText>
                      </View>
                    );
                  })}
                </View>
              </LinearGradient>
            </View>

            {/* ── Categorized Consultations List ────────────────────────────── */}
            <View style={styles.listSection}>
              <View style={styles.sectionHeaderRow}>
                <SanctuaryText variant="label_md" style={styles.sectionTitle}>
                  Prescribed Medications by Consultation
                </SanctuaryText>
                {consultations.length > 0 && (
                  <SanctuaryText variant="label_sm" style={styles.consultationTotalTxt}>
                    {consultations.length} Consultation{consultations.length > 1 ? 's' : ''}
                  </SanctuaryText>
                )}
              </View>

              {consultations.length === 0 ? (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconCircle}>
                    <Pill size={30} color="#94A3B8" />
                  </View>
                  <SanctuaryText variant="label_lg" style={styles.emptyTitle}>
                    No Active Prescriptions Found
                  </SanctuaryText>
                  <SanctuaryText variant="body_sm" style={styles.emptySub}>
                    Your medicine cabinet will update automatically when your doctor adds a prescription during your appointment.
                  </SanctuaryText>
                  <TouchableOpacity 
                    style={styles.emptyCheckBtn}
                    onPress={() => syncFromPrescriptions(true)}
                  >
                    <RefreshCw size={13} color="#FFF" style={{ marginRight: 6 }} />
                    <SanctuaryText variant="label_sm" style={styles.emptyCheckBtnTxt}>Check For Prescriptions</SanctuaryText>
                  </TouchableOpacity>
                </View>
              ) : (
                displayedConsultations.map((group) => (
                  <View key={group.id} style={styles.consultationCard}>
                    {/* ── Consultation Header Bar ─────────────────────────────── */}
                    <TouchableOpacity 
                      style={styles.consultationHeader}
                      onPress={() => toggleExpandGroup(group.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.consultationLeft}>
                        <View style={styles.calendarBadge}>
                          <Calendar size={13} color={COLORS.primary} />
                          <SanctuaryText variant="label_sm" style={styles.calendarBadgeTxt}>
                            {group.formattedDate}
                          </SanctuaryText>
                        </View>
                        <View>
                          <SanctuaryText variant="label_md" style={styles.consultationDocName}>
                            {group.doctorName}
                          </SanctuaryText>
                          <SanctuaryText variant="body_sm" style={styles.consultationHospName}>
                            {group.hospitalName}
                          </SanctuaryText>
                        </View>
                      </View>

                      <View style={styles.consultationRight}>
                        <SanctuaryText variant="label_sm" style={styles.medsCountBadge}>
                          {group.medicines.length} Medicine{group.medicines.length > 1 ? 's' : ''}
                        </SanctuaryText>
                        {group.isExpanded ? (
                          <ChevronUp size={16} color="#64748B" />
                        ) : (
                          <ChevronDown size={16} color="#64748B" />
                        )}
                      </View>
                    </TouchableOpacity>

                    {group.diagnosis ? (
                      <View style={styles.diagnosisBar}>
                        <Stethoscope size={11} color="#64748B" />
                        <SanctuaryText variant="body_sm" style={styles.diagnosisTxt}>
                          Diagnosis: {group.diagnosis}
                        </SanctuaryText>
                      </View>
                    ) : null}

                    {/* ── Medicines in this Consultation ──────────────────────── */}
                    {group.isExpanded && (
                      <View style={styles.medicinesWrapper}>
                        {group.medicines.map((med, mIdx) => {
                          const allTaken = med.doses.every((d) => d.taken);
                          return (
                            <View 
                              key={med.id || `med_${mIdx}`} 
                              style={[styles.compactMedCard, allTaken && styles.compactMedCardTaken]}
                            >
                              {/* Medicine Name & Badges */}
                              <View style={styles.cardHeaderRow}>
                                <View style={styles.cardTitleArea}>
                                  <View style={[styles.pillIconBox, allTaken && styles.pillIconBoxTaken]}>
                                    <Pill size={14} color={allTaken ? '#059669' : COLORS.primary} />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <View style={styles.nameWithRx}>
                                      <SanctuaryText variant="label_md" style={[styles.medNameText, allTaken && styles.textTaken]}>
                                        {med.name}
                                      </SanctuaryText>
                                      <View style={styles.rxBadge}>
                                        <SanctuaryText variant="label_sm" style={styles.rxBadgeText}>Rx</SanctuaryText>
                                      </View>
                                    </View>
                                    <SanctuaryText variant="body_sm" style={styles.dosageSubText}>
                                      {med.dosage}
                                    </SanctuaryText>
                                  </View>
                                </View>

                                <View style={styles.cardHeaderActions}>
                                  <TouchableOpacity 
                                    onPress={() => snoozeMedicine(med)} 
                                    style={styles.snoozeBtnCompact}
                                    activeOpacity={0.7}
                                  >
                                    <Clock size={10} color="#D97706" />
                                    <SanctuaryText variant="label_sm" style={styles.snoozeTxtCompact}>Snooze</SanctuaryText>
                                  </TouchableOpacity>

                                  <TouchableOpacity 
                                    onPress={() => toggleReminderAlarm(med)} 
                                    style={[styles.alarmToggleBtn, !med.reminderEnabled && styles.alarmToggleBtnOff]}
                                    activeOpacity={0.7}
                                  >
                                    {med.reminderEnabled ? (
                                      <Bell size={12} color="#10B981" />
                                    ) : (
                                      <BellOff size={12} color="#94A3B8" />
                                    )}
                                  </TouchableOpacity>
                                </View>
                              </View>

                              {/* Chips: Frequency, Meal Relation, Duration, Batch, Expiry */}
                              <View style={styles.metaChipsWrap}>
                                {med.frequencyText ? (
                                  <View style={styles.metaChip}>
                                    <Clock size={9} color="#2563EB" />
                                    <SanctuaryText variant="label_sm" style={styles.metaChipTxtBlue}>
                                      {med.frequencyText}
                                    </SanctuaryText>
                                  </View>
                                ) : null}

                                {med.timing ? (
                                  <View style={styles.metaChip}>
                                    <Utensils size={9} color="#059669" />
                                    <SanctuaryText variant="label_sm" style={styles.metaChipTxtGreen}>
                                      {med.timing}
                                    </SanctuaryText>
                                  </View>
                                ) : null}

                                {med.durationText ? (
                                  <View style={styles.metaChip}>
                                    <Calendar size={9} color="#7C3AED" />
                                    <SanctuaryText variant="label_sm" style={styles.metaChipTxtPurple}>
                                      {med.durationText}
                                    </SanctuaryText>
                                  </View>
                                ) : null}

                                {med.expiryDate ? (
                                  <View style={styles.metaChip}>
                                    <Calendar size={9} color="#2563EB" />
                                    <SanctuaryText variant="label_sm" style={styles.metaChipTxtBlue}>
                                      Exp: {new Date(med.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </SanctuaryText>
                                  </View>
                                ) : null}

                                {med.expiryDate ? (
                                  <View style={[
                                    styles.metaChip,
                                    med.isExpired && styles.metaChipExpired,
                                    med.isExpiringSoon && styles.metaChipExpiringSoon,
                                  ]}>
                                    {med.isExpired ? (
                                      <AlertTriangle size={9} color="#DC2626" />
                                    ) : (
                                      <Clock size={9} color={med.isExpiringSoon ? "#D97706" : "#059669"} />
                                    )}
                                    <SanctuaryText
                                      variant="label_sm"
                                      style={[
                                        styles.metaChipTxtGreen,
                                        med.isExpired && styles.metaChipTxtExpired,
                                        med.isExpiringSoon && styles.metaChipTxtExpiringSoon,
                                      ]}
                                    >
                                      {formatRemainingExpiry(med.expiryDate, med.daysUntilExpiry)}
                                    </SanctuaryText>
                                  </View>
                                ) : null}
                              </View>

                              {/* ── Dynamic Pharma Expiry Alert Banner ── */}
                              {med.isExpired ? (
                                <View style={styles.expiredBanner}>
                                  <AlertTriangle size={12} color="#DC2626" />
                                  <SanctuaryText variant="label_sm" style={styles.expiredBannerTxt}>
                                    {med.expiryAlert || 'This medicine has expired. Do not consume!'}
                                  </SanctuaryText>
                                </View>
                              ) : med.isExpiringSoon ? (
                                <View style={styles.expiringSoonBanner}>
                                  <Clock size={11} color="#D97706" />
                                  <SanctuaryText variant="label_sm" style={styles.expiringSoonBannerTxt}>
                                    {med.expiryAlert || 'Expiring soon. Contact pharmacy for fresh stock.'}
                                  </SanctuaryText>
                                </View>
                              ) : null}

                              {/* ── Dynamic Live Inventory Tracker (Direct from Backend) ── */}
                              <View style={styles.inventoryBar}>
                                <SanctuaryText variant="label_sm" style={styles.inventoryLabel}>
                                  Tablets Remaining:
                                </SanctuaryText>
                                <SanctuaryText variant="label_sm" style={styles.inventoryCountTxt}>
                                  {med.remainingQuantity} of {med.totalQuantity} <SanctuaryText variant="body_sm" style={styles.consumedSubTxt}>({med.consumedQuantity} Taken)</SanctuaryText>
                                </SanctuaryText>
                              </View>

                              {/* ── Ultra-Compact Micro Dose Buttons (Space-Saving) ── */}
                              <View style={styles.dosesSection}>
                                <SanctuaryText variant="label_sm" style={styles.dosesHeading}>
                                  Today's Doses:
                                </SanctuaryText>
                                <View style={styles.dosesRow}>
                                  {med.doses.map((dose) => (
                                    <TouchableOpacity
                                      key={dose.id}
                                      style={[styles.microDoseBtn, dose.taken && styles.microDoseBtnTaken]}
                                      onPress={() => toggleDoseTaken(group.id, med, dose)}
                                      activeOpacity={0.7}
                                    >
                                      {dose.taken ? (
                                        <View style={styles.microCheckCircle}>
                                          <Check size={8} color="#FFF" strokeWidth={3} />
                                        </View>
                                      ) : (
                                        <View style={styles.microUncheckedCircle} />
                                      )}
                                      <SanctuaryText 
                                        variant="label_sm" 
                                        style={[styles.microDoseTxt, dose.taken && styles.microDoseTxtTaken]}
                                      >
                                        {dose.shortLabel}
                                      </SanctuaryText>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ))
              )}

              {/* ── Consultation Pagination Controls (Visible for All Consultations) ── */}
              {consultations.length > 0 && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity 
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    activeOpacity={0.7}
                  >
                    <ChevronLeft size={14} color={currentPage === 1 ? '#94A3B8' : COLORS.primary} />
                    <SanctuaryText variant="label_sm" style={[styles.pageBtnTxt, currentPage === 1 && { color: '#94A3B8' }]}>
                      Previous
                    </SanctuaryText>
                  </TouchableOpacity>

                  <View style={styles.pageIndicatorBox}>
                    <SanctuaryText variant="label_sm" style={styles.pageIndicatorText}>
                      Page {currentPage} of {totalPages} ({consultations.length} Total)
                    </SanctuaryText>
                  </View>

                  <TouchableOpacity 
                    style={[styles.pageBtn, currentPage >= totalPages && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    activeOpacity={0.7}
                  >
                    <SanctuaryText variant="label_sm" style={[styles.pageBtnTxt, currentPage >= totalPages && { color: '#94A3B8' }]}>
                      Next
                    </SanctuaryText>
                    <ChevronRight size={14} color={currentPage >= totalPages ? '#94A3B8' : COLORS.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Tab 2: Dedicated Medication Intake History ──────────────────── */}
        {activeTab === 'history' && (
          <View style={styles.historySection}>
            <View style={styles.historyBanner}>
              <View style={styles.historyBannerLeft}>
                <View style={styles.historyShieldIcon}>
                  <CheckCircle2 size={16} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <SanctuaryText variant="label_md" style={styles.historyBannerTitle}>
                    Cloud-Recorded Intake History
                  </SanctuaryText>
                  <SanctuaryText variant="body_sm" style={styles.historyBannerSub}>
                    Permanent database log of verified medicine doses taken.
                  </SanctuaryText>
                </View>
              </View>
              <View style={styles.historyTotalBadge}>
                <SanctuaryText variant="label_sm" style={styles.historyTotalBadgeTxt}>
                  {historyTotal} Taken
                </SanctuaryText>
              </View>
            </View>

            {historyLoading ? (
              <View style={styles.historyLoadingBox}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <SanctuaryText variant="body_sm" style={styles.historyLoadingTxt}>
                  Loading intake history from database...
                </SanctuaryText>
              </View>
            ) : historyLogs.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <History size={28} color="#94A3B8" />
                </View>
                <SanctuaryText variant="label_lg" style={styles.emptyTitle}>
                  No Intake History Recorded Yet
                </SanctuaryText>
                <SanctuaryText variant="body_sm" style={styles.emptySub}>
                  When you check off your scheduled doses in the Prescriptions cabinet, they are automatically logged and saved here in the backend database.
                </SanctuaryText>
              </View>
            ) : (
              <View style={styles.historyList}>
                {historyLogs.map((log: any, idx: number) => {
                  const logDate = log.date || (log.takenAt ? new Date(log.takenAt).toISOString().split('T')[0] : '');
                  const takenTime = log.takenAt
                    ? new Date(log.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : (log.scheduledTime || '');

                  const slotIcons: Record<string, string> = {
                    Morning: '🌅',
                    Afternoon: '☀️',
                    Evening: '🌆',
                    Night: '🌙',
                    Custom: '⏰',
                  };
                  const icon = slotIcons[log.timeSlot] || '💊';

                  return (
                    <View key={log._id || `log_${idx}`} style={styles.historyCard}>
                      <View style={styles.historyCardHeader}>
                        <View style={styles.historyCardLeft}>
                          <View style={styles.historyPillIcon}>
                            <Pill size={13} color={COLORS.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <SanctuaryText variant="label_md" style={styles.historyMedName}>
                              {log.medicineName}
                            </SanctuaryText>
                            <SanctuaryText variant="body_sm" style={styles.historyDosageTxt}>
                              {log.dosage || '1 Dose'}
                            </SanctuaryText>
                          </View>
                        </View>
                        <View style={styles.historyTakenBadge}>
                          <Check size={9} color="#059669" strokeWidth={3} />
                          <SanctuaryText variant="label_sm" style={styles.historyTakenBadgeTxt}>
                            Taken
                          </SanctuaryText>
                        </View>
                      </View>

                      <View style={styles.historyCardFooter}>
                        <View style={styles.historySlotChip}>
                          <SanctuaryText variant="label_sm" style={styles.historySlotTxt}>
                            {icon} {log.timeSlot}
                          </SanctuaryText>
                        </View>

                        <View style={styles.historyTimeRow}>
                          <Calendar size={11} color="#64748B" />
                          <SanctuaryText variant="body_sm" style={styles.historyTimeTxt}>
                            {logDate}
                          </SanctuaryText>
                          {takenTime ? (
                            <>
                              <Clock size={11} color="#64748B" style={{ marginLeft: 6 }} />
                              <SanctuaryText variant="body_sm" style={styles.historyTimeTxt}>
                                {takenTime}
                              </SanctuaryText>
                            </>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })}

                {/* ── History Pagination Controls ───────────────────────── */}
                <View style={styles.paginationRow}>
                  <TouchableOpacity 
                    style={[styles.pageBtn, historyPage === 1 && styles.pageBtnDisabled]}
                    onPress={() => loadHistory(Math.max(1, historyPage - 1))}
                    disabled={historyPage === 1 || historyLoading}
                    activeOpacity={0.7}
                  >
                    <ChevronLeft size={14} color={historyPage === 1 ? '#94A3B8' : COLORS.primary} />
                    <SanctuaryText variant="label_sm" style={[styles.pageBtnTxt, historyPage === 1 && { color: '#94A3B8' }]}>
                      Previous
                    </SanctuaryText>
                  </TouchableOpacity>

                  <View style={styles.pageIndicatorBox}>
                    <SanctuaryText variant="label_sm" style={styles.pageIndicatorText}>
                      Page {historyPage} of {historyTotalPages} ({historyTotal} Total)
                    </SanctuaryText>
                  </View>

                  <TouchableOpacity 
                    style={[styles.pageBtn, historyPage >= historyTotalPages && styles.pageBtnDisabled]}
                    onPress={() => loadHistory(Math.min(historyTotalPages, historyPage + 1))}
                    disabled={historyPage >= historyTotalPages || historyLoading}
                    activeOpacity={0.7}
                  >
                    <SanctuaryText variant="label_sm" style={[styles.pageBtnTxt, historyPage >= historyTotalPages && { color: '#94A3B8' }]}>
                      Next
                    </SanctuaryText>
                    <ChevronRight size={14} color={historyPage >= historyTotalPages ? '#94A3B8' : COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 16, 
    paddingBottom: 12,
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9',
  },
  headerCenter: { alignItems: 'center' },
  backBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#F1F5F9', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { color: '#0F172A', fontWeight: '900', fontSize: 16 },
  profileBadge: {
    marginTop: 2,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  profileBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
  syncBtnHeader: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#EFF6FF', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  scrollContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 28 },

  summaryCard: { borderRadius: 18, overflow: 'hidden', marginBottom: 12 },
  summaryGrad: { padding: 14 },
  adherenceMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adherenceStatusPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  adherenceStatusText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  summaryTitle: { color: '#FFF', fontWeight: '900', fontSize: 18, lineHeight: 22 },
  summarySub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '500' },
  ringWrapper: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekStreakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
  },
  dayStreakItem: {
    alignItems: 'center',
    gap: 3,
  },
  dayDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayDotCompleted: {
    backgroundColor: '#10B981',
  },
  dayDotToday: {
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  dayDotText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 9,
    fontWeight: '700',
  },
  dayLabelTxt: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 8,
    fontWeight: '600',
  },

  listSection: { marginBottom: 16 },
  sectionHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 10 
  },
  sectionTitle: { color: '#0F172A', fontWeight: '900', fontSize: 14 },
  consultationTotalTxt: { color: '#64748B', fontSize: 11, fontWeight: '700' },

  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: '#1E293B', fontWeight: '800', fontSize: 14 },
  emptySub: { color: '#64748B', textAlign: 'center', fontSize: 11, lineHeight: 16, paddingHorizontal: 12 },
  emptyCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyCheckBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 12 },

  // Consultation Group
  consultationCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  consultationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  consultationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  calendarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  calendarBadgeTxt: { color: COLORS.primary, fontSize: 10, fontWeight: '800' },
  consultationDocName: { color: '#0F172A', fontWeight: '800', fontSize: 13 },
  consultationHospName: { color: '#64748B', fontSize: 10, fontWeight: '600' },
  consultationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  medsCountBadge: {
    backgroundColor: '#E2E8F0',
    color: '#475569',
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diagnosisBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  diagnosisTxt: { color: '#475569', fontSize: 10, fontWeight: '600' },

  medicinesWrapper: {
    padding: 10,
    gap: 10,
  },

  // Medication Card inside Consultation
  compactMedCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  compactMedCardTaken: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  cardTitleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillIconBoxTaken: {
    backgroundColor: '#ECFDF5',
  },
  nameWithRx: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  medNameText: { color: '#0F172A', fontWeight: '800', fontSize: 13 },
  rxBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  rxBadgeText: { color: COLORS.primary, fontWeight: '900', fontSize: 9 },
  textTaken: { textDecorationLine: 'line-through', color: '#94A3B8' },
  dosageSubText: { color: '#64748B', fontSize: 10, fontWeight: '600', marginTop: 1 },

  cardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  snoozeBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  snoozeTxtCompact: { color: '#D97706', fontSize: 9, fontWeight: '700' },
  alarmToggleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmToggleBtnOff: {
    backgroundColor: '#F1F5F9',
  },

  metaChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  metaChipTxtBlue: { color: '#2563EB', fontSize: 8.5, fontWeight: '700' },
  metaChipTxtGreen: { color: '#059669', fontSize: 8.5, fontWeight: '700' },
  metaChipTxtPurple: { color: '#7C3AED', fontSize: 8.5, fontWeight: '700' },
  metaChipTxtGray: { color: '#475569', fontSize: 8.5, fontWeight: '700' },
  metaChipExpired: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  metaChipTxtExpired: { color: '#DC2626', fontWeight: '800' },
  metaChipExpiringSoon: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  metaChipTxtExpiringSoon: { color: '#D97706', fontWeight: '800' },

  // Expiry Alert Banners
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  expiredBannerTxt: {
    color: '#B91C1C',
    fontSize: 9.5,
    fontWeight: '800',
    flex: 1,
  },
  expiringSoonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  expiringSoonBannerTxt: {
    color: '#B45309',
    fontSize: 9.5,
    fontWeight: '700',
    flex: 1,
  },

  // Inventory Bar
  inventoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  inventoryLabel: { color: '#64748B', fontSize: 9.5, fontWeight: '700' },
  inventoryCountTxt: { color: '#0F172A', fontSize: 10, fontWeight: '800' },
  consumedSubTxt: { color: '#10B981', fontSize: 9, fontWeight: '600' },

  // Doses Section (Micro-Buttons)
  dosesSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 6,
  },
  dosesHeading: { color: '#64748B', fontSize: 9, fontWeight: '700', marginBottom: 4 },
  dosesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  microDoseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  microDoseBtnTaken: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
    borderWidth: 1.5,
  },
  microCheckCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  microUncheckedCircle: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 1,
    borderColor: '#94A3B8',
  },
  microDoseTxt: { color: '#334155', fontSize: 9, fontWeight: '700' },
  microDoseTxtTaken: { color: '#15803D', fontWeight: '800' },

  // Pagination Controls
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  pageBtnDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
  },
  pageBtnTxt: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  pageIndicatorBox: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pageIndicatorText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Segmented Navigation Tabs ─────────────────────────────
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  historyCountBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  historyCountBadgeTxt: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },

  // ── Dedicated History Section ─────────────────────────────
  historySection: {
    marginBottom: 16,
  },
  historyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  historyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  historyShieldIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyBannerTitle: {
    color: '#065F46',
    fontWeight: '800',
    fontSize: 12,
  },
  historyBannerSub: {
    color: '#047857',
    fontSize: 9.5,
  },
  historyTotalBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyTotalBadgeTxt: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  historyLoadingBox: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  historyLoadingTxt: {
    color: '#64748B',
    fontSize: 11,
  },
  historyList: {
    gap: 8,
  },
  historyCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  historyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  historyPillIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyMedName: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 12,
  },
  historyDosageTxt: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  historyTakenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyTakenBadgeTxt: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '800',
  },
  historyCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  historySlotChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  historySlotTxt: {
    color: '#334155',
    fontSize: 9,
    fontWeight: '700',
  },
  historyTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  historyTimeTxt: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '600',
  },
});
