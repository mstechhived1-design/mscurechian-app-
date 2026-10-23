import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  Dimensions,
  TextInput,
  Modal,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Receipt,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  CalendarDays,
  Wallet,
  Search,
  ListFilter,
  Download,
  HelpCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  X,
  CreditCard,
  ArrowUpRight,
  Pill,
  FlaskConical,
  Bed,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StackNavigationProp } from '@react-navigation/stack';

import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { RootStackParamList } from '@/navigation/types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system/legacy';
import { COLORS } from '../constants/designSystem';
import { SanctuaryText, DigitalAtriumLoader } from '../components/SanctuaryComponents';
import { formatTransactionDateTime, safeFormat } from '@/utils/dateUtils';
import { receiptService } from '@/services/receiptService';
import { familyService } from '@/services/familyService';
import dayjs from 'dayjs';

const { width, height } = Dimensions.get('window');

export type BillCategory = 'appointments' | 'pharma' | 'lab' | 'discharge';

export interface Bill {
  _id: string;
  category: BillCategory;
  categoryLabel: string;
  badgeLabel: string;
  appointmentId?: string;
  doctor: any;
  hospital: any;
  date: string;
  appointmentTime?: string;
  startTime?: string;
  time?: string;
  createdAt?: string;
  formattedDate: string;
  formattedTime: string;
  fullDateTime: string;
  monthYearKey: string;
  shortMonthYear: string;
  amount: number;
  paidAmount: number;
  discountAmount?: number;
  balanceAmount?: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'Paid' | 'pending' | 'failed' | 'not_required';
  type: string;
  mrn?: string;
  items?: any[];
  tests?: any[];
  admissionDate?: string;
  dischargeDate?: string;
  ipNo?: string;
  bedNo?: string;
  roomNo?: string;
  [key: string]: any;
}

export type FilterCategory = 'categories' | 'months' | 'status' | 'paymentTypes' | 'hospitals';

export const STATUS_CONFIG = {
  paid:         { label: 'PAID',        color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  Paid:         { label: 'PAID',        color: '#059669', bg: '#ECFDF5', icon: CheckCircle2 },
  pending:      { label: 'PENDING',     color: '#D97706', bg: '#FFFBEB', icon: Clock },
  failed:       { label: 'FAILED',      color: '#DC2626', bg: '#FEF2F2', icon: AlertCircle },
  not_required: { label: 'WAIVED',      color: '#64748B', bg: '#F8FAFC', icon: CheckCircle2 },
};

export const CATEGORY_CONFIG: Record<BillCategory, {
  label: string;
  badgeLabel: string;
  bannerTitle: string;
  color: string;
  bg: string;
  borderColor: string;
  icon: any;
}> = {
  appointments: {
    label: 'Appointments',
    badgeLabel: 'Appointment',
    bannerTitle: 'OPD CONSULTATION FEE',
    color: '#0284C7',
    bg: '#E0F2FE',
    borderColor: '#BAE6FD',
    icon: CalendarDays,
  },
  pharma: {
    label: 'Pharma Invoices',
    badgeLabel: 'Pharma',
    bannerTitle: 'PHARMACY RETAIL INVOICE',
    color: '#15803D',
    bg: '#DCFCE7',
    borderColor: '#BBF7D0',
    icon: Pill,
  },
  lab: {
    label: 'Lab Invoices',
    badgeLabel: 'Lab Test',
    bannerTitle: 'LAB INVESTIGATION INVOICE',
    color: '#7C3AED',
    bg: '#EDE9FE',
    borderColor: '#DDD6FE',
    icon: FlaskConical,
  },
  discharge: {
    label: 'Discharge Final Bills',
    badgeLabel: 'Discharge Bill',
    bannerTitle: 'IPD FINAL DISCHARGE SETTLEMENT',
    color: '#EA580C',
    bg: '#FFEDD5',
    borderColor: '#FED7AA',
    icon: FileText,
  },
};

function getStatus(apt: any): Bill['paymentStatus'] {
  return apt.payment?.paymentStatus || apt.paymentStatus || 'pending';
}

function getAmount(apt: any): number {
  return Number(apt.payment?.amount ?? apt.amount ?? apt.consultationFee ?? 0);
}

function getPaymentMethod(apt: any): string {
  return apt.payment?.paymentMethod || apt.paymentMethod || 'Razorpay';
}

export default function PaymentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bills, setBills]           = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [selectedBill, setSelectedBill]       = useState<Bill | null>(null);
  const [isFilterOpen, setIsFilterOpen]       = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen]           = useState(false);

  // Quick Category Filter Tab ('all' or 'appointments' | 'pharma' | 'lab' | 'discharge')
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<'all' | BillCategory>('all');

  // Filter Drawer State (Split Pane - PhonePe Style)
  const [activeFilterCat, setActiveFilterCat] = useState<FilterCategory>('categories');
  const [selectedCategories, setSelectedCategories] = useState<BillCategory[]>([]);
  const [selectedMonths, setSelectedMonths]   = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPayTypes, setSelectedPayTypes] = useState<string[]>([]);
  const [selectedHospitals, setSelectedHospitals] = useState<string[]>([]);

  // Statement Modal State
  const [statementPeriodType, setStatementPeriodType] = useState<'range' | 'fy'>('fy');
  const [selectedFY, setSelectedFY]                   = useState('Current FY');
  const [selectedRange, setSelectedRange]             = useState('Last 30 Days');
  const [selectedFileType, setSelectedFileType]       = useState<'PDF' | 'CSV'>('PDF');

  const fetchData = async () => {
    try {
      const [apptsRes, dashRes, dischargeRes] = await Promise.allSettled([
        apiClient.get(PATIENT_ENDPOINTS.APPOINTMENTS),
        apiClient.get(PATIENT_ENDPOINTS.DASHBOARD_DATA),
        apiClient.get(PATIENT_ENDPOINTS.DISCHARGE_RECORDS),
      ]);

      const apts: any[] = (apptsRes.status === 'fulfilled' && Array.isArray(apptsRes.value.data?.data))
        ? apptsRes.value.data.data
        : ((apptsRes.status === 'fulfilled' && Array.isArray(apptsRes.value.data)) ? apptsRes.value.data : []);

      const dashData = dashRes.status === 'fulfilled' 
        ? (dashRes.value.data?.data || dashRes.value.data || {})
        : {};

      // 1. Map Consultation Bills (Appointments)
      const aptBills: Bill[] = apts.map(apt => {
        const timeVal = apt.appointmentTime || apt.time || apt.startTime;
        const dt = formatTransactionDateTime(apt.date, timeVal, apt.createdAt);
        const parsedDate = dayjs(apt.date?.$date || apt.date);
        const shortMonthYear = parsedDate.isValid() ? parsedDate.format('MMM YYYY') : 'Oct 2026';
        const fee = getAmount(apt);
        const st = getStatus(apt);
        const isPaid = ['paid', 'Paid'].includes(st);

        return {
          ...apt,
          _id:             apt._id,
          category:        'appointments' as BillCategory,
          categoryLabel:   'Appointments',
          badgeLabel:      'Appointment',
          appointmentId:   apt.appointmentId || (apt._id ? `APT-${apt._id.slice(-6).toUpperCase()}` : 'APT'),
          doctor:          apt.doctor,
          hospital:        apt.hospital,
          date:            apt.date,
          appointmentTime: apt.appointmentTime,
          startTime:       apt.startTime,
          time:            apt.time,
          createdAt:       apt.createdAt,
          formattedDate:   dt.formattedDate,
          formattedTime:   dt.formattedTime,
          fullDateTime:    dt.fullDateTime,
          monthYearKey:    dt.monthYearKey,
          shortMonthYear,
          amount:          fee,
          paidAmount:      isPaid ? fee : 0,
          discountAmount:  0,
          balanceAmount:   isPaid ? 0 : fee,
          paymentMethod:   getPaymentMethod(apt),
          paymentStatus:   st,
          type:            'Appointments',
          mrn:             apt.mrn || apt.patient?.mrn || apt.patientDetails?.mrn,
          patient:         apt.patient,
          patientDetails:  apt.patientDetails,
          token_number:    apt.token_number || apt.tokenNo,
          tokenNo:         apt.token_number || apt.tokenNo,
          tokenNumber:     apt.token_number || apt.tokenNo,
          symptoms:        apt.symptoms || apt.reason,
          reason:          apt.reason || apt.symptoms,
          raw:             apt,
        };
      });

      // 2. Map Lab Investigation Invoices
      const labList: any[] = Array.isArray(dashData.labRecords?.data) 
        ? dashData.labRecords.data 
        : (Array.isArray(dashData.labRecords) ? dashData.labRecords : []);

      const labBills: Bill[] = labList.map((lab: any, idx: number) => {
        const dt = formatTransactionDateTime(lab.createdAt || lab.date, undefined, lab.createdAt);
        const parsedDate = dayjs(lab.createdAt || lab.date);
        const shortMonthYear = parsedDate.isValid() ? parsedDate.format('MMM YYYY') : 'Oct 2026';
        
        let calculatedAmount = Number(lab.amount ?? lab.totalAmount ?? 0);
        if (!calculatedAmount && Array.isArray(lab.tests)) {
          calculatedAmount = lab.tests.reduce((acc: number, t: any) => acc + (Number(t.price ?? t.cost) || 0), 0);
        }
        const discount = Number(lab.discount || 0);
        const isPaid = lab.status === 'completed' || lab.status === 'processing' || lab.paymentStatus === 'paid';
        const paid = Number(lab.paidAmount ?? (isPaid ? calculatedAmount : 0));
        const balance = Number(lab.balance ?? (calculatedAmount - discount - paid > 0 ? calculatedAmount - discount - paid : 0));

        return {
          _id:             lab._id || `lab_${idx}`,
          category:        'lab' as BillCategory,
          categoryLabel:   'Lab Invoices',
          badgeLabel:      'Lab Test',
          appointmentId:   lab.tokenNumber || (lab._id ? `LAB-${lab._id.slice(-6).toUpperCase()}` : `LAB-${idx + 1}`),
          doctor:          lab.doctor,
          hospital:        lab.hospital,
          date:            lab.date || lab.createdAt,
          formattedDate:   dt.formattedDate,
          formattedTime:   dt.formattedTime,
          fullDateTime:    dt.fullDateTime,
          monthYearKey:    dt.monthYearKey,
          shortMonthYear,
          amount:          calculatedAmount,
          paidAmount:      paid,
          discountAmount:  discount,
          balanceAmount:   balance,
          paymentMethod:   lab.paymentMethod || lab.paymentMode || 'Hospital Counter',
          paymentStatus:   (isPaid ? 'paid' : (lab.status === 'failed' ? 'failed' : 'pending')) as Bill['paymentStatus'],
          type:            'Lab Invoices',
          mrn:             lab.mrn || lab.patientDetails?.mrn,
          tests:           Array.isArray(lab.tests) ? lab.tests : [],
          raw:             lab,
        };
      }).filter((bill: any) => bill.amount > 0);

      // 3. Map Pharmacy Dispensing Bills (only actual billed/priced orders, exclude unpriced prescription notes)
      const pharmaList: any[] = Array.isArray(dashData.prescriptions?.data)
        ? dashData.prescriptions.data
        : (Array.isArray(dashData.prescriptions) ? dashData.prescriptions : []);

      const pharmaOrders = pharmaList.filter((p: any) => 
        p.displayType === 'Pharmacy Order' || p.displayType === 'Pharmacy Invoice' || p.isPharmaInvoice || p.type === 'pharma' || p.type === 'pharma-invoice' || p.tokenNumber || (Array.isArray(p.medicines) && p.medicines.length > 0)
      );

      const pharmaBills: Bill[] = pharmaOrders.map((ph: any, idx: number) => {
        const dt = formatTransactionDateTime(ph.prescriptionDate || ph.createdAt, undefined, ph.createdAt);
        const parsedDate = dayjs(ph.prescriptionDate || ph.createdAt);
        const shortMonthYear = parsedDate.isValid() ? parsedDate.format('MMM YYYY') : 'Oct 2026';
        const items = ph.items || ph.medicines || [];

        let calculatedAmount = Number(ph.amount ?? ph.totalAmount ?? ph.subTotal ?? ph.netPayable ?? 0);
        if (!calculatedAmount && Array.isArray(items) && items.length > 0) {
          calculatedAmount = items.reduce(
            (sum: number, it: any) => sum + (Number(it.amount || it.total || (it.qty || it.quantity || 1) * (it.mrp || it.rate || it.price || 0)) || 0),
            0
          );
        }
        const discount = Number(ph.discount || ph.totalDiscount || 0);
        const isPaid = ph.status === 'dispensed' || ph.paymentStatus === 'paid' || ph.isPharmaInvoice;
        const paid = Number(ph.paidAmount ?? ph.paid ?? (isPaid ? calculatedAmount : 0));
        const balance = Number(ph.balance ?? (calculatedAmount - discount - paid > 0 ? calculatedAmount - discount - paid : 0));

        return {
          _id:             ph._id || `pharma_${idx}`,
          category:        'pharma' as BillCategory,
          categoryLabel:   'Pharma Invoices',
          badgeLabel:      'Pharma',
          appointmentId:   ph.invoiceNo || ph.tokenNumber || (ph._id ? `PH-${ph._id.slice(-6).toUpperCase()}` : `PH-${idx + 1}`),
          doctor:          ph.doctor,
          hospital:        ph.hospital,
          date:            ph.prescriptionDate || ph.createdAt,
          formattedDate:   dt.formattedDate,
          formattedTime:   dt.formattedTime,
          fullDateTime:    dt.fullDateTime,
          monthYearKey:    dt.monthYearKey,
          shortMonthYear,
          amount:          calculatedAmount,
          paidAmount:      paid,
          discountAmount:  discount,
          balanceAmount:   balance,
          paymentMethod:   ph.paymentMethod || ph.mode || ph.paymentMode || 'Pharmacy Counter',
          paymentStatus:   (isPaid ? 'paid' : 'pending') as Bill['paymentStatus'],
          type:            'Pharma Invoices',
          mrn:             ph.mrn,
          items:           items,
          raw:             ph,
        };
      }).filter((bill: any) => bill.amount > 0);

      // 4. Map Discharge Final Settlement Bills
      let dischargeList: any[] = [];
      if (dischargeRes.status === 'fulfilled') {
        const dData = dischargeRes.value.data?.data || dischargeRes.value.data;
        if (Array.isArray(dData)) dischargeList = dData;
        else if (dData && Array.isArray(dData.dischargeRecords)) dischargeList = dData.dischargeRecords;
      }
      if (dischargeList.length === 0 && dashData.dischargeRecords) {
        const dDash = dashData.dischargeRecords.data || dashData.dischargeRecords;
        if (Array.isArray(dDash)) dischargeList = dDash;
      }

      const dischargeBills: Bill[] = dischargeList.map((dc: any, idx: number) => {
        const dateVal = dc.dischargeDate || dc.paymentSettledAt || dc.updatedAt || dc.createdAt || dc.admissionDate;
        const dt = formatTransactionDateTime(dateVal, undefined, dc.createdAt);
        const parsedDate = dayjs(dateVal);
        const shortMonthYear = parsedDate.isValid() ? parsedDate.format('MMM YYYY') : 'Oct 2026';

        const totalBill = Number(dc.totalBillAmount ?? dc.totalPaidAmount ?? dc.amount ?? 0);
        const advance = Number(dc.advanceAmount || 0);
        const discount = Number(dc.discountAmount || 0);
        const isCompleted = dc.status === 'completed' || dc.conditionAtDischarge || dc.dischargeDate;
        const paidAmt = Number(dc.totalPaidAmount ?? (isCompleted ? totalBill : advance));
        const balance = Number(dc.remainingAmount ?? dc.balance ?? (totalBill - discount - paidAmt > 0 ? totalBill - discount - paidAmt : 0));
        const isPaid = (balance === 0 && totalBill > 0) || isCompleted;

        return {
          _id:             dc._id || `discharge_${idx}`,
          category:        'discharge' as BillCategory,
          categoryLabel:   'Discharge Final Bills',
          badgeLabel:      'Discharge Bill',
          appointmentId:   dc.documentId || dc.ipNo || dc.admissionId || (dc._id ? `IPD-${dc._id.slice(-6).toUpperCase()}` : `IPD-${idx + 1}`),
          doctor:          dc.primaryDoctor ? { name: dc.primaryDoctor } : (dc.consultants?.[0] ? { name: dc.consultants[0] } : dc.doctor),
          hospital:        dc.hospital || { name: dc.hospitalName || 'Hospital' },
          date:            dateVal,
          admissionDate:   dc.admissionDate,
          dischargeDate:   dc.dischargeDate,
          ipNo:            dc.ipNo,
          bedNo:           dc.bedNo,
          roomNo:          dc.roomNo,
          formattedDate:   dt.formattedDate,
          formattedTime:   dt.formattedTime,
          fullDateTime:    dt.fullDateTime,
          monthYearKey:    dt.monthYearKey,
          shortMonthYear,
          amount:          totalBill,
          paidAmount:      paidAmt,
          discountAmount:  discount,
          balanceAmount:   balance,
          paymentMethod:   dc.paymentMode || 'Hospital Desk',
          paymentStatus:   isPaid ? 'paid' : (totalBill > 0 && paidAmt > 0 ? 'pending' : 'paid'),
          type:            'Discharge Final Bills',
          mrn:             dc.mrn,
          raw:             dc,
        };
      });

      const activePid = await familyService.getActivePatientId();
      const currentMrn = dashData.profile?.mrn || (apts[0]?.mrn) || (apts[0]?.patient?.mrn);

      const combined = [...aptBills, ...labBills, ...pharmaBills, ...dischargeBills]
        .filter((bill: Bill) => {
          if (currentMrn && currentMrn !== 'N/A' && bill.mrn && bill.mrn !== 'N/A') {
            return bill.mrn.trim().toUpperCase() === currentMrn.trim().toUpperCase();
          }
          if (activePid && bill.patient) {
            const bPid = (typeof bill.patient === 'object' ? bill.patient._id || bill.patient.id : bill.patient)?.toString();
            if (bPid) return bPid === activePid;
          }
          return true;
        })
        .sort((a, b) => {
          return new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime();
        });

      setBills(combined);
    } catch (err) {
      console.error('[Payments]', err);
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

    const unsubProfile = familyService.onProfileChange(() => fetchData());
    return () => unsubProfile();
  }, []);

  // Generate dynamic 12-month list (matching PhonePe screenshot)
  const availableMonthsList = useMemo(() => {
    const list: string[] = [];
    const now = dayjs('2026-10-19');
    for (let i = 0; i < 12; i++) {
      list.push(now.subtract(i, 'month').format('MMM YYYY'));
    }
    bills.forEach(b => {
      if (b.shortMonthYear && !list.includes(b.shortMonthYear)) {
        list.push(b.shortMonthYear);
      }
    });
    return list;
  }, [bills]);

  // Unique hospitals list derived from bills
  const availableHospitalsList = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    bills.forEach(b => {
      const name = b.hospital?.name;
      const id   = b.hospital?._id || b.hospital?.id || name;
      if (name && id && !seen.has(id)) {
        seen.add(id);
        list.push({ id, name });
      }
    });
    return list;
  }, [bills]);

  // Counts per category for quick filter chips
  const categoryCounts = useMemo(() => {
    return {
      all: bills.length,
      appointments: bills.filter(b => b.category === 'appointments').length,
      pharma: bills.filter(b => b.category === 'pharma').length,
      lab: bills.filter(b => b.category === 'lab').length,
      discharge: bills.filter(b => b.category === 'discharge').length,
    };
  }, [bills]);

  // Filter application
  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      // 1. Quick Category Tab Filter
      if (selectedCategoryTab !== 'all' && b.category !== selectedCategoryTab) {
        return false;
      }

      // 2. Modal Category Filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(b.category)) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const docName = (b.doctor?.user?.name || b.doctor?.name || '').toLowerCase();
        const hospName = (b.hospital?.name || '').toLowerCase();
        const apptId = (b.appointmentId || '').toLowerCase();
        const mrn = (b.mrn || '').toLowerCase();
        const type = (b.type || '').toLowerCase();
        const catLabel = (b.categoryLabel || '').toLowerCase();
        const badgeLabel = (b.badgeLabel || '').toLowerCase();
        const dt = (b.fullDateTime || '').toLowerCase();

        const match = docName.includes(q) || hospName.includes(q) || apptId.includes(q) || mrn.includes(q) || type.includes(q) || catLabel.includes(q) || badgeLabel.includes(q) || dt.includes(q);
        if (!match) return false;
      }

      // 4. Months filter
      if (selectedMonths.length > 0) {
        if (!selectedMonths.includes(b.shortMonthYear)) return false;
      }

      // 5. Status filter
      if (selectedStatuses.length > 0) {
        const statusNormalized = b.paymentStatus?.toUpperCase();
        const matchStatus = selectedStatuses.some(s => s.toUpperCase() === statusNormalized);
        if (!matchStatus) return false;
      }

      // 6. Payment types filter
      if (selectedPayTypes.length > 0) {
        const payNormalized = (b.paymentMethod || 'razorpay').toLowerCase();
        const matchPay = selectedPayTypes.some(p => payNormalized.includes(p.toLowerCase()));
        if (!matchPay) return false;
      }

      // 7. Hospital filter
      if (selectedHospitals.length > 0) {
        const hospId   = b.hospital?._id || b.hospital?.id || b.hospital?.name;
        const hospName = b.hospital?.name || '';
        const match = selectedHospitals.includes(hospId) || selectedHospitals.includes(hospName);
        if (!match) return false;
      }

      return true;
    });
  }, [bills, selectedCategoryTab, selectedCategories, searchQuery, selectedMonths, selectedStatuses, selectedPayTypes, selectedHospitals]);

  // Group filtered bills by month (PhonePe grouping e.g. "October 2026")
  const groupedBills = useMemo(() => {
    const groups: { monthKey: string; totalAmount: number; items: Bill[] }[] = [];
    const groupMap: { [key: string]: { monthKey: string; totalAmount: number; items: Bill[] } } = {};

    filteredBills.forEach(b => {
      const key = b.monthYearKey || 'Recent';
      if (!groupMap[key]) {
        groupMap[key] = { monthKey: key, totalAmount: 0, items: [] };
        groups.push(groupMap[key]);
      }
      groupMap[key].items.push(b);
      groupMap[key].totalAmount += b.amount;
    });

    return groups;
  }, [filteredBills]);

  const totalPaid    = bills.filter(b => ['paid','Paid'].includes(b.paymentStatus)).reduce((s, b) => s + b.amount, 0);
  const totalPending = bills.filter(b => b.paymentStatus === 'pending').reduce((s, b) => s + (b.balanceAmount !== undefined ? b.balanceAmount : b.amount), 0);
  const activeFiltersCount = (selectedCategoryTab !== 'all' ? 1 : 0) + selectedCategories.length + selectedMonths.length + selectedStatuses.length + selectedPayTypes.length + selectedHospitals.length;

  const clearAllFilters = () => {
    setSelectedCategoryTab('all');
    setSelectedCategories([]);
    setSelectedMonths([]);
    setSelectedStatuses([]);
    setSelectedPayTypes([]);
    setSelectedHospitals([]);
  };

  const toggleCategory = (cat: BillCategory) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]);
  };

  const toggleMonth = (m: string) => {
    setSelectedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const toggleStatus = (s: string) => {
    setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const togglePayType = (p: string) => {
    setSelectedPayTypes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const toggleHospital = (id: string) => {
    setSelectedHospitals(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getDocName = (doc: any) => {
    const name = doc?.user?.name || doc?.name || 'Physician';
    return name.startsWith('Dr.') ? name : `Dr. ${name}`;
  };

  const handlePayOutstanding = () => {
    Alert.alert(
      'Pay Outstanding',
      `Proceeding to pay pending total ₹${totalPending.toLocaleString()} via secure payment gateway.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pay Now', onPress: () => Alert.alert('Payment Gateway', 'Payment gateway simulated successfully.') }
      ]
    );
  };

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleGenerateInvoicePdf = async (bill: Bill) => {
    try {
      setGeneratingPdf(true);
      let docType: any = 'appointment';
      if (bill.category === 'lab' || bill.type === 'Lab Invoices') {
        docType = 'lab-invoice';
      } else if (bill.category === 'pharma' || bill.type === 'Pharma Invoices') {
        docType = 'pharmacy-invoice';
      } else if (bill.category === 'discharge' || bill.type === 'Discharge Final Bills') {
        docType = 'discharge-settlement';
      }
      const targetId = bill._id || bill.appointmentId || '';
      const payload = bill.raw
        ? {
            ...bill.raw,
            ...bill,
            hospital: (bill.hospital && (bill.hospital as any)._id) ? bill.hospital : (bill.raw?.hospital || bill.hospital),
            hospitalId: bill.raw?.hospital?._id || bill.raw?.hospital || bill.raw?.hospitalId || (bill.hospital as any)?._id,
          }
        : bill;

      const safetyTimer = setTimeout(() => setGeneratingPdf(false), 2000);
      try {
        await receiptService.printOrExportPdf(docType, targetId, payload);
      } finally {
        clearTimeout(safetyTimer);
      }
    } catch (err: any) {
      console.error('Invoice PDF generation failed:', err);
      Alert.alert('Notice', 'Could not open invoice preview: ' + (err.message || 'Please retry.'));
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadStatement = async () => {
    let html = '';
    try {
      const periodLabel = statementPeriodType === 'fy' ? selectedFY : selectedRange;
      const totalStatement = filteredBills.reduce((sum, b) => sum + b.amount, 0);

      const rowsHtml = filteredBills.map(b => `
        <tr>
          <td>${b.fullDateTime}</td>
          <td><strong>${b.type}</strong><br><span style="font-size: 10px; color: #64748b;">${getDocName(b.doctor)} • ${b.hospital?.name || 'Hospital'}</span></td>
          <td>${b.paymentMethod}</td>
          <td><span style="color: ${['paid', 'Paid'].includes(b.paymentStatus) ? '#059669' : '#d97706'}; font-weight: 700;">${b.paymentStatus.toUpperCase()}</span></td>
          <td style="text-align: right; font-weight: 700;">₹${b.amount.toLocaleString()}</td>
        </tr>
      `).join('');

      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 28px; color: #1e293b; }
            .header { border-bottom: 2px solid #5f259e; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: 900; color: #5f259e; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { text-align: left; padding: 8px; background: #f1f5f9; font-size: 10px; text-transform: uppercase; color: #475569; }
            td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
            .summary { margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; text-align: right; font-size: 14px; font-weight: 800; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">MSCureChain Account Statement</div>
            <div style="font-size: 12px; color: #64748b;">Period: ${periodLabel} · Generated on ${new Date().toLocaleDateString()}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Mode</th>
                <th>Status</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="summary">
            Total Account Charges: ₹${totalStatement.toLocaleString()}
          </div>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        let exportedUri = uri;

        const safeDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        const cleanPeriod = (periodLabel || 'All').replace(/[^a-zA-Z0-9]/g, '_');
        const pdfFileName = `Statement_${cleanPeriod}_${Date.now().toString().slice(-4)}.pdf`;
        if (safeDir) {
          const targetPdfUri = `${safeDir}${pdfFileName}`;
          try {
            await FileSystem.copyAsync({ from: uri, to: targetPdfUri });
            exportedUri = targetPdfUri;
          } catch (copyErr) {
            console.log('[PaymentsScreen] Copy statement skipped:', copyErr);
          }
        }

        let shareableUri = exportedUri;
        if (Platform.OS === 'android' && typeof (FileSystem as any)?.getContentUriAsync === 'function') {
          try {
            shareableUri = await (FileSystem as any).getContentUriAsync(exportedUri);
          } catch (cErr) {
            console.log('[PaymentsScreen] getContentUriAsync skipped:', cErr);
          }
        }

        let shared = false;
        if (await Sharing.isAvailableAsync()) {
          try {
            await Sharing.shareAsync(shareableUri, {
              mimeType: 'application/pdf',
              dialogTitle: `Statement - ${periodLabel}`,
            });
            shared = true;
          } catch (shareErr) {
            console.warn('[PaymentsScreen] Sharing statement failed, trying print:', shareErr);
          }
        }

        if (!shared && typeof Print?.printAsync === 'function') {
          await Print.printAsync({ html });
        }
      }
      setIsStatementOpen(false);
    } catch (err: any) {
      try {
        await Print.printAsync({ html });
      } catch (e) {
        Alert.alert('Notice', 'Statement generated.');
      }
      setIsStatementOpen(false);
    }
  };

  if (loading && !refreshing) return <DigitalAtriumLoader />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>

        {/* ── PHONEPE TOP HEADER ── */}
        <View style={styles.header}>
          <SanctuaryText variant="headline_sm" style={styles.headerTitle}>
            History
          </SanctuaryText>

          <View style={styles.headerRight}>
            {/* My Statements Pill Button (Matching Screenshot 4) */}
            <TouchableOpacity
              style={styles.statementsPillBtn}
              onPress={() => setIsStatementOpen(true)}
              activeOpacity={0.7}
            >
              <Download size={14} color="#1E293B" strokeWidth={2.2} />
              <SanctuaryText variant="label_lg" style={styles.statementsPillTxt}>
                My Statements
              </SanctuaryText>
            </TouchableOpacity>

            {/* Help Icon (?) */}
            <TouchableOpacity
              style={styles.helpIconBtn}
              onPress={() => setIsHelpOpen(true)}
              activeOpacity={0.7}
            >
              <HelpCircle size={22} color="#1E293B" strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SEARCH & FILTER BAR (Matching Screenshot 4) ── */}
        <View style={styles.searchSection}>
          <View style={styles.searchPill}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by doctor, hospital..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}

            {/* Vertical Divider */}
            <View style={styles.searchDivider} />

            {/* Filter Icon Button */}
            <TouchableOpacity
              style={styles.filterBtn}
              onPress={() => setIsFilterOpen(true)}
              activeOpacity={0.7}
            >
              <ListFilter size={18} color={activeFiltersCount > 0 ? '#5F259E' : '#1E293B'} strokeWidth={2} />
              {activeFiltersCount > 0 && (
                <View style={styles.filterBadge}>
                  <SanctuaryText variant="label_sm" style={styles.filterBadgeTxt}>
                    {activeFiltersCount}
                  </SanctuaryText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── QUICK BILL CATEGORY FILTER TABS ── */}
        <View style={styles.categoryFilterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilterScroll}>
            <TouchableOpacity
              style={[styles.categoryTabChip, selectedCategoryTab === 'all' && styles.categoryTabChipActive]}
              onPress={() => setSelectedCategoryTab('all')}
              activeOpacity={0.7}
            >
              <SanctuaryText
                variant="label_sm"
                style={[styles.categoryTabChipTxt, selectedCategoryTab === 'all' && styles.categoryTabChipTxtActive]}
              >
                All ({categoryCounts.all})
              </SanctuaryText>
            </TouchableOpacity>

            {(['appointments', 'pharma', 'lab', 'discharge'] as BillCategory[]).map(catKey => {
              const cfg = CATEGORY_CONFIG[catKey];
              const count = categoryCounts[catKey];
              const isSelected = selectedCategoryTab === catKey;
              const IconComponent = cfg.icon;

              return (
                <TouchableOpacity
                  key={catKey}
                  style={[
                    styles.categoryTabChip,
                    isSelected && { backgroundColor: cfg.color, borderColor: cfg.color },
                  ]}
                  onPress={() => setSelectedCategoryTab(isSelected ? 'all' : catKey)}
                  activeOpacity={0.7}
                >
                  <IconComponent size={12} color={isSelected ? '#FFFFFF' : cfg.color} style={{ marginRight: 4 }} />
                  <SanctuaryText
                    variant="label_sm"
                    style={[
                      styles.categoryTabChipTxt,
                      isSelected && styles.categoryTabChipTxtActive,
                    ]}
                  >
                    {cfg.label} ({count})
                  </SanctuaryText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── ACTIVE FILTER CHIPS (If any applied) ── */}
        {activeFiltersCount > 0 && (
          <View style={styles.activeFiltersRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersScroll}>
              <TouchableOpacity style={styles.clearAllChip} onPress={clearAllFilters}>
                <SanctuaryText variant="label_sm" style={styles.clearAllChipTxt}>Clear all</SanctuaryText>
              </TouchableOpacity>

              {selectedCategoryTab !== 'all' && (
                <TouchableOpacity style={styles.filterChip} onPress={() => setSelectedCategoryTab('all')}>
                  <SanctuaryText variant="label_sm" style={styles.filterChipTxt}>
                    Tab: {CATEGORY_CONFIG[selectedCategoryTab]?.label}
                  </SanctuaryText>
                  <X size={12} color="#5F259E" />
                </TouchableOpacity>
              )}

              {selectedCategories.map(catKey => (
                <TouchableOpacity key={catKey} style={styles.filterChip} onPress={() => toggleCategory(catKey)}>
                  <SanctuaryText variant="label_sm" style={styles.filterChipTxt}>
                    {CATEGORY_CONFIG[catKey]?.label}
                  </SanctuaryText>
                  <X size={12} color="#5F259E" />
                </TouchableOpacity>
              ))}

              {selectedMonths.map(m => (
                <TouchableOpacity key={m} style={styles.filterChip} onPress={() => toggleMonth(m)}>
                  <SanctuaryText variant="label_sm" style={styles.filterChipTxt}>{m}</SanctuaryText>
                  <X size={12} color="#5F259E" />
                </TouchableOpacity>
              ))}

              {selectedStatuses.map(s => (
                <TouchableOpacity key={s} style={styles.filterChip} onPress={() => toggleStatus(s)}>
                  <SanctuaryText variant="label_sm" style={styles.filterChipTxt}>{s}</SanctuaryText>
                  <X size={12} color="#5F259E" />
                </TouchableOpacity>
              ))}

              {selectedPayTypes.map(p => (
                <TouchableOpacity key={p} style={styles.filterChip} onPress={() => togglePayType(p)}>
                  <SanctuaryText variant="label_sm" style={styles.filterChipTxt}>{p}</SanctuaryText>
                  <X size={12} color="#5F259E" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── OUTSTANDING BALANCE BANNER (PhonePe Alert Style) ── */}
        {totalPending > 0 && (
          <View style={styles.outstandingBanner}>
            <View style={styles.outstandingLeft}>
              <View style={styles.outstandingIconCircle}>
                <Clock size={16} color="#D97706" strokeWidth={2.2} />
              </View>
              <View style={styles.outstandingTextBox}>
                <SanctuaryText variant="label_lg" style={styles.outstandingTitle}>
                  Outstanding Dues: ₹{totalPending.toLocaleString()}
                </SanctuaryText>
                <SanctuaryText variant="body_sm" style={styles.outstandingSubtitle}>
                  Pending consultation bills
                </SanctuaryText>
              </View>
            </View>
            <TouchableOpacity
              style={styles.outstandingPayBtn}
              onPress={handlePayOutstanding}
              activeOpacity={0.8}
            >
              <SanctuaryText variant="label_lg" style={styles.outstandingPayBtnTxt}>
                PAY NOW
              </SanctuaryText>
            </TouchableOpacity>
          </View>
        )}

        {/* ── TRANSACTIONS LIST GROUPED BY MONTH (Matching Screenshot 4) ── */}
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              colors={['#5F259E']}
              tintColor="#5F259E"
            />
          }
        >
          {groupedBills.length > 0 ? (
            groupedBills.map(group => (
              <View key={group.monthKey} style={styles.monthGroupContainer}>
                {/* Month Header Banner (e.g., "October 2026"  ₹7,428.5 >) */}
                <TouchableOpacity
                  style={styles.monthHeaderRow}
                  activeOpacity={0.7}
                  onPress={() =>
                    Alert.alert(group.monthKey, `Total recorded billing for ${group.monthKey}: ₹${group.totalAmount.toLocaleString()}`)
                  }
                >
                  <SanctuaryText variant="label_lg" style={styles.monthTitle}>
                    {group.monthKey}
                  </SanctuaryText>
                  <View style={styles.monthTotalWrap}>
                    <SanctuaryText variant="label_lg" style={styles.monthTotalAmt}>
                      ₹{group.totalAmount.toLocaleString()}
                    </SanctuaryText>
                    <ChevronRight size={15} color="#64748B" />
                  </View>
                </TouchableOpacity>

                {/* Month Transactions */}
                <View style={styles.monthItemsBox}>
                  {group.items.map(bill => {
                    const isPaid = ['paid', 'Paid'].includes(bill.paymentStatus);
                    const isPending = bill.paymentStatus === 'pending';

                    return (
                      <TouchableOpacity
                        key={bill._id}
                        style={styles.txRow}
                        onPress={() => setSelectedBill(bill)}
                        activeOpacity={0.7}
                      >
                        {/* Left: PhonePe Avatar Circle */}
                        <View
                          style={[
                            styles.avatarCircle,
                            isPaid ? styles.avatarPaid : isPending ? styles.avatarPending : styles.avatarFailed,
                          ]}
                        >
                          {isPaid ? (
                            <ArrowUpRight size={20} color="#1E293B" strokeWidth={2.2} />
                          ) : isPending ? (
                            <Clock size={18} color="#D97706" strokeWidth={2.2} />
                          ) : (
                            <AlertCircle size={18} color="#DC2626" strokeWidth={2.2} />
                          )}
                        </View>

                        {/* Middle: Transaction Description, Real Date & Time, and BADGE */}
                        <View style={styles.txInfo}>
                          {(() => {
                            const catConfig = CATEGORY_CONFIG[bill.category] || CATEGORY_CONFIG.appointments;
                            const CatIcon = catConfig.icon;
                            return (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                                {/* COLOR-CODED CATEGORY BADGE */}
                                <View style={[styles.typeBadge, { backgroundColor: catConfig.bg, borderColor: catConfig.borderColor }]}>
                                  <CatIcon size={10} color={catConfig.color} style={{ marginRight: 3 }} />
                                  <SanctuaryText variant="label_sm" style={[styles.typeBadgeText, { color: catConfig.color }]}>
                                    {catConfig.badgeLabel.toUpperCase()}
                                  </SanctuaryText>
                                </View>

                                <SanctuaryText variant="body_sm" style={styles.txActionLabel}>
                                  {isPaid ? 'Paid to' : 'Pending for'}
                                </SanctuaryText>
                              </View>
                            );
                          })()}

                          <SanctuaryText variant="label_lg" style={styles.txName} numberOfLines={1}>
                            {getDocName(bill.doctor)}
                          </SanctuaryText>

                          {/* EXACT DATE & TIME ROW */}
                          <SanctuaryText variant="body_sm" style={styles.txDateTime}>
                            {bill.fullDateTime}
                          </SanctuaryText>

                          <SanctuaryText variant="body_sm" style={styles.txSubDetails} numberOfLines={1}>
                            {bill.hospital?.name || 'Hospital'} • {bill.categoryLabel}
                          </SanctuaryText>
                        </View>

                        {/* Right: Amount & Status / Source */}
                        <View style={styles.txRight}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <SanctuaryText
                              variant="headline_sm"
                              style={[
                                styles.txAmount,
                                isPaid ? styles.txAmountPaid : isPending ? styles.txAmountPending : styles.txAmountFailed,
                              ]}
                            >
                              ₹{bill.amount.toLocaleString()}
                            </SanctuaryText>

                            <TouchableOpacity
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              onPress={(e) => {
                                (e as any)?.stopPropagation?.();
                                handleGenerateInvoicePdf(bill);
                              }}
                              style={styles.quickReceiptBtn}
                              accessibilityLabel="Download Tax Invoice"
                            >
                              <Download size={13} color="#5F259E" strokeWidth={2.4} />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.txStatusPillRow}>
                            <SanctuaryText
                              variant="body_sm"
                              style={[
                                styles.txStatusText,
                                isPaid ? { color: '#64748B' } : isPending ? { color: '#D97706', fontWeight: '700' } : { color: '#DC2626', fontWeight: '700' },
                              ]}
                            >
                              {isPaid ? `Debited • ${bill.paymentMethod}` : isPending ? 'Pending' : 'Failed'}
                            </SanctuaryText>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Receipt size={48} color="#CBD5E1" />
              <SanctuaryText variant="label_lg" style={styles.emptyTitle}>
                No transactions found
              </SanctuaryText>
              <SanctuaryText variant="body_sm" style={styles.emptySubtitle}>
                Try adjusting your search query or filter selection
              </SanctuaryText>
              {activeFiltersCount > 0 && (
                <TouchableOpacity style={styles.resetFilterBtn} onPress={clearAllFilters}>
                  <SanctuaryText variant="label_sm" style={styles.resetFilterTxt}>
                    Reset all filters
                  </SanctuaryText>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Bottom spacing for bottom tabs */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ══════════════════════════════════════════════════════════════════════
            PHONEPE FILTER MODAL (Matching Screenshot 5 Split-pane Layout)
           ══════════════════════════════════════════════════════════════════════ */}
        <Modal
          visible={isFilterOpen}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setIsFilterOpen(false)}
        >
          <SafeAreaView style={styles.filterModalSafe}>
            {/* Modal Header */}
            <View style={styles.filterModalHeader}>
              <TouchableOpacity
                onPress={() => setIsFilterOpen(false)}
                style={styles.filterBackBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ArrowLeft size={22} color="#1E293B" />
              </TouchableOpacity>

              <SanctuaryText variant="headline_sm" style={styles.filterModalTitle}>
                Filters
              </SanctuaryText>

              <TouchableOpacity onPress={clearAllFilters} style={styles.filterClearBtn}>
                <SanctuaryText variant="label_lg" style={styles.filterClearTxt}>
                  Clear all
                </SanctuaryText>
              </TouchableOpacity>
            </View>

            {/* Split Pane: Left Sidebar + Right Options */}
            <View style={styles.filterSplitBody}>
              {/* Left Sidebar (Categories) */}
              <View style={styles.filterSidebar}>
                <TouchableOpacity
                  style={[styles.sidebarTab, activeFilterCat === 'categories' && styles.sidebarTabActive]}
                  onPress={() => setActiveFilterCat('categories')}
                >
                  <SanctuaryText
                    variant="label_lg"
                    style={[styles.sidebarTabTxt, activeFilterCat === 'categories' && styles.sidebarTabTxtActive]}
                  >
                    Bill Categories
                  </SanctuaryText>
                  {selectedCategories.length > 0 && <View style={styles.sidebarActiveDot} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sidebarTab, activeFilterCat === 'months' && styles.sidebarTabActive]}
                  onPress={() => setActiveFilterCat('months')}
                >
                  <SanctuaryText
                    variant="label_lg"
                    style={[styles.sidebarTabTxt, activeFilterCat === 'months' && styles.sidebarTabTxtActive]}
                  >
                    Months
                  </SanctuaryText>
                  {selectedMonths.length > 0 && <View style={styles.sidebarActiveDot} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sidebarTab, activeFilterCat === 'status' && styles.sidebarTabActive]}
                  onPress={() => setActiveFilterCat('status')}
                >
                  <SanctuaryText
                    variant="label_lg"
                    style={[styles.sidebarTabTxt, activeFilterCat === 'status' && styles.sidebarTabTxtActive]}
                  >
                    Payment status
                  </SanctuaryText>
                  {selectedStatuses.length > 0 && <View style={styles.sidebarActiveDot} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sidebarTab, activeFilterCat === 'paymentTypes' && styles.sidebarTabActive]}
                  onPress={() => setActiveFilterCat('paymentTypes')}
                >
                  <SanctuaryText
                    variant="label_lg"
                    style={[styles.sidebarTabTxt, activeFilterCat === 'paymentTypes' && styles.sidebarTabTxtActive]}
                  >
                    Payment modes
                  </SanctuaryText>
                  {selectedPayTypes.length > 0 && <View style={styles.sidebarActiveDot} />}
                </TouchableOpacity>

                {availableHospitalsList.length > 0 && (
                  <TouchableOpacity
                    style={[styles.sidebarTab, activeFilterCat === 'hospitals' && styles.sidebarTabActive]}
                    onPress={() => setActiveFilterCat('hospitals')}
                  >
                    <SanctuaryText
                      variant="label_lg"
                      style={[styles.sidebarTabTxt, activeFilterCat === 'hospitals' && styles.sidebarTabTxtActive]}
                    >
                      Hospitals
                    </SanctuaryText>
                    {selectedHospitals.length > 0 && <View style={styles.sidebarActiveDot} />}
                  </TouchableOpacity>
                )}
              </View>

              {/* Right Content Pane (Checkboxes) */}
              <ScrollView style={styles.filterOptionsPane} showsVerticalScrollIndicator={false}>
                {/* 1. Bill Categories Selection */}
                {activeFilterCat === 'categories' && (
                  <View style={styles.optionsList}>
                    {(['appointments', 'pharma', 'lab', 'discharge'] as BillCategory[]).map(catKey => {
                      const cfg = CATEGORY_CONFIG[catKey];
                      const isChecked = selectedCategories.includes(catKey);
                      const IconComponent = cfg.icon;

                      return (
                        <TouchableOpacity
                          key={catKey}
                          style={styles.checkboxRow}
                          onPress={() => toggleCategory(catKey)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: cfg.bg, justifyContent: 'center', alignItems: 'center' }}>
                              <IconComponent size={13} color={cfg.color} />
                            </View>
                            <SanctuaryText variant="label_lg" style={styles.checkboxLabel}>
                              {cfg.label}
                            </SanctuaryText>
                          </View>
                          <View style={[styles.squareBox, isChecked && { backgroundColor: cfg.color, borderColor: cfg.color }]}>
                            {isChecked && <Check size={14} color="#FFF" strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* 2. Months Selection */}
                {activeFilterCat === 'months' && (
                  <View style={styles.optionsList}>
                    {availableMonthsList.map(month => {
                      const isChecked = selectedMonths.includes(month);
                      return (
                        <TouchableOpacity
                          key={month}
                          style={styles.checkboxRow}
                          onPress={() => toggleMonth(month)}
                          activeOpacity={0.7}
                        >
                          <SanctuaryText variant="label_lg" style={styles.checkboxLabel}>
                            {month}
                          </SanctuaryText>
                          <View style={[styles.squareBox, isChecked && styles.squareBoxChecked]}>
                            {isChecked && <Check size={14} color="#FFF" strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* 3. Payment Status Selection */}
                {activeFilterCat === 'status' && (
                  <View style={styles.optionsList}>
                    {['PAID', 'PENDING', 'FAILED'].map(st => {
                      const isChecked = selectedStatuses.includes(st);
                      return (
                        <TouchableOpacity
                          key={st}
                          style={styles.checkboxRow}
                          onPress={() => toggleStatus(st)}
                          activeOpacity={0.7}
                        >
                          <SanctuaryText variant="label_lg" style={styles.checkboxLabel}>
                            {st === 'PAID' ? 'Successful Payments' : st === 'PENDING' ? 'Pending Dues' : 'Failed Transactions'}
                          </SanctuaryText>
                          <View style={[styles.squareBox, isChecked && styles.squareBoxChecked]}>
                            {isChecked && <Check size={14} color="#FFF" strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* 4. Payment Modes */}
                {activeFilterCat === 'paymentTypes' && (
                  <View style={styles.optionsList}>
                    {['Razorpay', 'UPI', 'Card', 'Netbanking', 'Cash'].map(pm => {
                      const isChecked = selectedPayTypes.includes(pm);
                      return (
                        <TouchableOpacity
                          key={pm}
                          style={styles.checkboxRow}
                          onPress={() => togglePayType(pm)}
                          activeOpacity={0.7}
                        >
                          <SanctuaryText variant="label_lg" style={styles.checkboxLabel}>
                            {pm}
                          </SanctuaryText>
                          <View style={[styles.squareBox, isChecked && styles.squareBoxChecked]}>
                            {isChecked && <Check size={14} color="#FFF" strokeWidth={3} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* 5. Hospitals */}
                {activeFilterCat === 'hospitals' && (
                  <View style={styles.optionsList}>
                    {availableHospitalsList.length === 0 ? (
                      <SanctuaryText variant="body_sm" style={{ color: '#94A3B8', padding: 12 }}>
                        No hospitals found
                      </SanctuaryText>
                    ) : (
                      availableHospitalsList.map(hosp => {
                        const isChecked = selectedHospitals.includes(hosp.id);
                        return (
                          <TouchableOpacity
                            key={hosp.id}
                            style={styles.checkboxRow}
                            onPress={() => toggleHospital(hosp.id)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center' }}>
                                <Building2 size={13} color="#0284C7" />
                              </View>
                              <SanctuaryText variant="label_lg" style={[styles.checkboxLabel, { flex: 1 }]} numberOfLines={2}>
                                {hosp.name}
                              </SanctuaryText>
                            </View>
                            <View style={[styles.squareBox, isChecked && { backgroundColor: '#0284C7', borderColor: '#0284C7' }]}>
                              {isChecked && <Check size={14} color="#FFF" strokeWidth={3} />}
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Bottom Apply Button */}
            <View style={styles.filterBottomBar}>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setIsFilterOpen(false)}
                activeOpacity={0.85}
              >
                <SanctuaryText variant="label_lg" style={styles.applyBtnTxt}>
                  {activeFiltersCount > 0 ? `Apply (${activeFiltersCount})` : 'Apply'}
                </SanctuaryText>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* ══════════════════════════════════════════════════════════════════════
            PHONEPE "MY STATEMENT" MODAL (Matching Screenshot 3)
           ══════════════════════════════════════════════════════════════════════ */}
        <Modal
          visible={isStatementOpen}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setIsStatementOpen(false)}
        >
          <SafeAreaView style={styles.filterModalSafe}>
            {/* Header */}
            <View style={styles.filterModalHeader}>
              <TouchableOpacity
                onPress={() => setIsStatementOpen(false)}
                style={styles.filterBackBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ArrowLeft size={22} color="#1E293B" />
              </TouchableOpacity>

              <SanctuaryText variant="headline_sm" style={styles.filterModalTitle}>
                My Statement
              </SanctuaryText>

              <TouchableOpacity onPress={() => setIsHelpOpen(true)} style={styles.filterClearBtn}>
                <HelpCircle size={22} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.statementBody} contentContainerStyle={{ padding: 20 }}>
              {/* Statement Period Section */}
              <SanctuaryText variant="label_lg" style={styles.statementSectionTitle}>
                Statement Period
              </SanctuaryText>

              {/* Segmented Control: Range | Financial year */}
              <View style={styles.segmentedContainer}>
                <TouchableOpacity
                  style={[styles.segmentBtn, statementPeriodType === 'range' && styles.segmentBtnActive]}
                  onPress={() => setStatementPeriodType('range')}
                >
                  <SanctuaryText
                    variant="label_lg"
                    style={[styles.segmentTxt, statementPeriodType === 'range' && styles.segmentTxtActive]}
                  >
                    Range
                  </SanctuaryText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, statementPeriodType === 'fy' && styles.segmentBtnActive]}
                  onPress={() => setStatementPeriodType('fy')}
                >
                  <SanctuaryText
                    variant="label_lg"
                    style={[styles.segmentTxt, statementPeriodType === 'fy' && styles.segmentTxtActive]}
                  >
                    Financial year
                  </SanctuaryText>
                </TouchableOpacity>
              </View>

              {/* Radio List for Financial Year (Screenshot 3) */}
              {statementPeriodType === 'fy' ? (
                <View style={styles.radioList}>
                  {['Current FY', 'FY 2025 - 2026', 'FY 2024 - 2025', 'FY 2023 - 2024', 'FY 2022 - 2023'].map(fy => {
                    const isSelected = selectedFY === fy;
                    return (
                      <TouchableOpacity
                        key={fy}
                        style={styles.radioRow}
                        onPress={() => setSelectedFY(fy)}
                        activeOpacity={0.7}
                      >
                        <SanctuaryText variant="label_lg" style={styles.radioLabel}>
                          {fy}
                        </SanctuaryText>
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                          {isSelected && <Check size={14} color="#FFF" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.radioList}>
                  {['Last 30 Days', 'Last 90 Days', 'Last 180 Days', 'Last 365 Days'].map(rg => {
                    const isSelected = selectedRange === rg;
                    return (
                      <TouchableOpacity
                        key={rg}
                        style={styles.radioRow}
                        onPress={() => setSelectedRange(rg)}
                        activeOpacity={0.7}
                      >
                        <SanctuaryText variant="label_lg" style={styles.radioLabel}>
                          {rg}
                        </SanctuaryText>
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                          {isSelected && <Check size={14} color="#FFF" strokeWidth={3} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* File Type Section (Screenshot 3) */}
              <SanctuaryText variant="label_lg" style={[styles.statementSectionTitle, { marginTop: 30 }]}>
                File Type
              </SanctuaryText>

              {/* PDF Option */}
              <TouchableOpacity
                style={styles.fileTypeRow}
                onPress={() => setSelectedFileType('PDF')}
                activeOpacity={0.7}
              >
                <View style={styles.fileTypeInfo}>
                  <SanctuaryText variant="label_lg" style={styles.fileTypeTitle}>PDF</SanctuaryText>
                  <SanctuaryText variant="body_sm" style={styles.fileTypeSub}>
                    Suitable for viewing on mobile and sharing
                  </SanctuaryText>
                </View>
                <View style={[styles.fileTypeCheck, selectedFileType === 'PDF' && styles.fileTypeCheckSelected]}>
                  {selectedFileType === 'PDF' && <Check size={14} color="#FFF" strokeWidth={3} />}
                </View>
              </TouchableOpacity>

              {/* CSV Option */}
              <TouchableOpacity
                style={styles.fileTypeRow}
                onPress={() => setSelectedFileType('CSV')}
                activeOpacity={0.7}
              >
                <View style={styles.fileTypeInfo}>
                  <SanctuaryText variant="label_lg" style={styles.fileTypeTitle}>CSV</SanctuaryText>
                  <SanctuaryText variant="body_sm" style={styles.fileTypeSub}>
                    Suitable for analysis in spreadsheets
                  </SanctuaryText>
                </View>
                <View style={[styles.fileTypeCheck, selectedFileType === 'CSV' && styles.fileTypeCheckSelected]}>
                  {selectedFileType === 'CSV' && <Check size={14} color="#FFF" strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Download Statement Button (Screenshot 3 - Purple) */}
            <View style={styles.filterBottomBar}>
              <TouchableOpacity
                style={styles.statementDownloadBtn}
                onPress={handleDownloadStatement}
                activeOpacity={0.85}
              >
                <SanctuaryText variant="label_lg" style={styles.applyBtnTxt}>
                  Download Statement
                </SanctuaryText>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* ══════════════════════════════════════════════════════════════════════
            INVOICE DETAIL MODAL (Screenshot 2 - Fixed Date & Time Display)
           ══════════════════════════════════════════════════════════════════════ */}
        <Modal
          visible={!!selectedBill}
          animationType="fade"
          transparent={true}
          statusBarTranslucent={true}
          onRequestClose={() => setSelectedBill(null)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={() => setSelectedBill(null)} 
            />
            <View style={styles.modalBox}>
              {selectedBill && (() => {
                const isPaid = ['paid', 'Paid'].includes(selectedBill.paymentStatus);
                const st = STATUS_CONFIG[selectedBill.paymentStatus] || STATUS_CONFIG.pending;
                const catCfg = CATEGORY_CONFIG[selectedBill.category] || CATEGORY_CONFIG.appointments;
                const CatIcon = catCfg.icon;

                // Accurate calculations
                const totalAmt = selectedBill.amount || 0;
                const paidAmt = selectedBill.paidAmount !== undefined ? selectedBill.paidAmount : (isPaid ? totalAmt : 0);
                const discountAmt = selectedBill.discountAmount || 0;
                const balanceAmt = selectedBill.balanceAmount !== undefined ? selectedBill.balanceAmount : (isPaid ? 0 : totalAmt);

                return (
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                      <View style={[styles.modalIconBox, { backgroundColor: catCfg.bg }]}>
                        <CatIcon size={16} color={catCfg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <SanctuaryText variant="headline_sm" style={styles.modalTitle}>
                          Invoice Detail
                        </SanctuaryText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
                          {/* Category Badge */}
                          <View style={[styles.typeBadge, { backgroundColor: catCfg.bg, borderColor: catCfg.borderColor }]}>
                            <SanctuaryText variant="label_sm" style={[styles.typeBadgeText, { color: catCfg.color, fontSize: 9 }]}>
                              {catCfg.badgeLabel.toUpperCase()}
                            </SanctuaryText>
                          </View>
                          <SanctuaryText variant="body_sm" style={{ color: '#64748B', fontSize: 10.5 }}>
                            {selectedBill.categoryLabel}
                          </SanctuaryText>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => setSelectedBill(null)} style={styles.modalClose}>
                        <X size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>

                    {/* Amount Banner */}
                    <LinearGradient
                      colors={isPaid ? ['#1E3A6E', '#2B5DB8'] : ['#854D0E', '#B45309']}
                      style={styles.amtBand}
                    >
                      <SanctuaryText variant="body_sm" style={styles.amtLabel}>
                        {catCfg.bannerTitle}
                      </SanctuaryText>
                      <SanctuaryText variant="headline_sm" style={styles.amtValue}>
                        ₹{totalAmt.toLocaleString()}
                      </SanctuaryText>
                      <View style={[styles.amtStatus, { backgroundColor: isPaid ? '#ECFDF5' : '#FFFBEB' }]}>
                        <SanctuaryText
                          variant="label_sm"
                          style={{ color: isPaid ? '#059669' : '#D97706', fontWeight: '900', fontSize: 9.5 }}
                        >
                          {st.label}
                        </SanctuaryText>
                      </View>
                    </LinearGradient>

                    {/* Itemized / Calculations Summary Box */}
                    <View style={styles.calcSummaryBox}>
                      <SanctuaryText variant="label_sm" style={styles.calcSummaryTitle}>
                        PAYMENT & BILLING SUMMARY
                      </SanctuaryText>

                      {/* Optional Itemized Listing */}
                      {selectedBill.category === 'lab' && Array.isArray(selectedBill.tests) && selectedBill.tests.length > 0 && (
                        <View style={styles.itemizedListingBox}>
                          <SanctuaryText variant="label_sm" style={{ color: '#64748B', marginBottom: 4 }}>
                            Investigation Tests ({selectedBill.tests.length}):
                          </SanctuaryText>
                          {selectedBill.tests.map((t: any, idx: number) => (
                            <View key={idx} style={styles.itemizedRow}>
                              <SanctuaryText variant="body_sm" style={{ color: '#1E293B', flex: 1 }} numberOfLines={1}>
                                • {t.testName || t.name || 'Diagnostic Test'}
                              </SanctuaryText>
                              <SanctuaryText variant="label_sm" style={{ color: '#1E293B' }}>
                                ₹{Number(t.price ?? t.cost ?? 0).toLocaleString()}
                              </SanctuaryText>
                            </View>
                          ))}
                        </View>
                      )}

                      {selectedBill.category === 'pharma' && Array.isArray(selectedBill.items) && selectedBill.items.length > 0 && (
                        <View style={styles.itemizedListingBox}>
                          <SanctuaryText variant="label_sm" style={{ color: '#64748B', marginBottom: 4 }}>
                            Dispensed Medicines ({selectedBill.items.length}):
                          </SanctuaryText>
                          {selectedBill.items.slice(0, 5).map((m: any, idx: number) => (
                            <View key={idx} style={styles.itemizedRow}>
                              <SanctuaryText variant="body_sm" style={{ color: '#1E293B', flex: 1 }} numberOfLines={1}>
                                • {m.name || m.medicineName || 'Medicine'} (x{m.qty || m.quantity || 1})
                              </SanctuaryText>
                              <SanctuaryText variant="label_sm" style={{ color: '#1E293B' }}>
                                ₹{Number(m.amount || m.total || (m.qty || m.quantity || 1) * (m.mrp || m.rate || 0)).toLocaleString()}
                              </SanctuaryText>
                            </View>
                          ))}
                          {selectedBill.items.length > 5 && (
                            <SanctuaryText variant="body_sm" style={{ color: '#64748B', fontStyle: 'italic', marginTop: 2 }}>
                              + {selectedBill.items.length - 5} more items on official tax invoice
                            </SanctuaryText>
                          )}
                        </View>
                      )}

                      {selectedBill.category === 'discharge' && (
                        <View style={styles.itemizedListingBox}>
                          <View style={styles.itemizedRow}>
                            <SanctuaryText variant="body_sm" style={{ color: '#64748B' }}>Bed / Room Charges:</SanctuaryText>
                            <SanctuaryText variant="label_sm" style={{ color: '#1E293B' }}>
                              ₹{Number(selectedBill.raw?.bedChargesTotal || 0).toLocaleString()}
                            </SanctuaryText>
                          </View>
                          <View style={styles.itemizedRow}>
                            <SanctuaryText variant="body_sm" style={{ color: '#64748B' }}>Treatment & Procedure Charges:</SanctuaryText>
                            <SanctuaryText variant="label_sm" style={{ color: '#1E293B' }}>
                              ₹{Number(selectedBill.raw?.extraChargesTotal || 0).toLocaleString()}
                            </SanctuaryText>
                          </View>
                          {selectedBill.raw?.advanceAmount ? (
                            <View style={styles.itemizedRow}>
                              <SanctuaryText variant="body_sm" style={{ color: '#64748B' }}>Advance Paid Deposit:</SanctuaryText>
                              <SanctuaryText variant="label_sm" style={{ color: '#059669' }}>
                                -₹{Number(selectedBill.raw.advanceAmount).toLocaleString()}
                              </SanctuaryText>
                            </View>
                          ) : null}
                        </View>
                      )}

                      {/* Financial Figures */}
                      <View style={styles.calcDivider} />
                      <View style={styles.calcRow}>
                        <SanctuaryText variant="body_sm" style={styles.calcLabel}>Total Bill Amount:</SanctuaryText>
                        <SanctuaryText variant="label_lg" style={styles.calcValue}>₹{totalAmt.toLocaleString()}</SanctuaryText>
                      </View>
                      {discountAmt > 0 && (
                        <View style={styles.calcRow}>
                          <SanctuaryText variant="body_sm" style={styles.calcLabel}>Discount Applied:</SanctuaryText>
                          <SanctuaryText variant="label_lg" style={[styles.calcValue, { color: '#059669' }]}>-₹{discountAmt.toLocaleString()}</SanctuaryText>
                        </View>
                      )}
                      <View style={styles.calcRow}>
                        <SanctuaryText variant="body_sm" style={styles.calcLabel}>Amount Paid:</SanctuaryText>
                        <SanctuaryText variant="label_lg" style={[styles.calcValue, { color: '#059669' }]}>₹{paidAmt.toLocaleString()}</SanctuaryText>
                      </View>
                      {balanceAmt > 0 && (
                        <View style={styles.calcRow}>
                          <SanctuaryText variant="body_sm" style={styles.calcLabel}>Remaining Balance Due:</SanctuaryText>
                          <SanctuaryText variant="label_lg" style={[styles.calcValue, { color: '#D97706' }]}>₹{balanceAmt.toLocaleString()}</SanctuaryText>
                        </View>
                      )}
                    </View>

                    {/* Metadata Details Rows */}
                    {[
                      { label: 'Doctor / Consultant', value: getDocName(selectedBill.doctor) },
                      { label: 'Hospital Facility',   value: selectedBill.hospital?.name || selectedBill.raw?.hospitalName || 'Hospital' },
                      { label: 'Billing Category',     value: selectedBill.categoryLabel },
                      { label: 'Date & Time',          value: selectedBill.fullDateTime },
                      { label: 'Payment Mode',         value: selectedBill.paymentMethod },
                      { label: 'MRN Number',           value: selectedBill.mrn || 'N/A' },
                      { label: 'Reference / Token',    value: selectedBill.appointmentId || selectedBill._id.slice(-8).toUpperCase() },
                      ...(selectedBill.admissionDate ? [{ label: 'Admission Date', value: dayjs(selectedBill.admissionDate).format('DD MMM YYYY') }] : []),
                      ...(selectedBill.dischargeDate ? [{ label: 'Discharge Date', value: dayjs(selectedBill.dischargeDate).format('DD MMM YYYY') }] : []),
                      ...(selectedBill.ipNo ? [{ label: 'IP / Room', value: `IP: ${selectedBill.ipNo} • ${selectedBill.bedNo || selectedBill.roomNo || ''}` }] : []),
                    ].map(row => (
                      <View key={row.label} style={styles.detailRow}>
                        <SanctuaryText variant="body_sm" style={styles.detailLabel}>
                          {row.label}
                        </SanctuaryText>
                        <SanctuaryText variant="label_lg" style={styles.detailValue} numberOfLines={1}>
                          {row.value}
                        </SanctuaryText>
                      </View>
                    ))}

                    {/* Action Buttons: Download PDF & Close */}
                    <View style={{ gap: 6, marginTop: 10, paddingHorizontal: 16 }}>
                      <TouchableOpacity
                        style={[styles.modalBtn, { backgroundColor: '#5F259E', paddingVertical: 8, margin: 0, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center' }]}
                        onPress={() => handleGenerateInvoicePdf(selectedBill)}
                        activeOpacity={0.8}
                        disabled={generatingPdf}
                      >
                        {generatingPdf ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <Download size={13} color="#FFF" />
                            <SanctuaryText variant="label_lg" style={styles.modalBtnTxt}>
                              DOWNLOAD TAX INVOICE (PDF)
                            </SanctuaryText>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalBtn, { backgroundColor: '#F1F5F9', paddingVertical: 7, margin: 0 }]}
                        onPress={() => setSelectedBill(null)}
                        activeOpacity={0.8}
                      >
                        <SanctuaryText variant="label_lg" style={[styles.modalBtnTxt, { color: '#64748B', fontSize: 11 }]}>
                          CLOSE
                        </SanctuaryText>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                );
              })()}
            </View>
          </View>
        </Modal>

        {/* ══════════════════════════════════════════════════════════════════════
            HELP MODAL (?)
           ══════════════════════════════════════════════════════════════════════ */}
        <Modal
          visible={isHelpOpen}
          animationType="fade"
          transparent={true}
          statusBarTranslucent={true}
          onRequestClose={() => setIsHelpOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={() => setIsHelpOpen(false)} 
            />
            <View style={[styles.modalBox, { padding: 24 }]}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                  <HelpCircle size={28} color="#5F259E" />
                </View>
                <SanctuaryText variant="headline_sm" style={{ color: '#1E293B', fontWeight: '800', textAlign: 'center' }}>
                  Billing & Statements Help
                </SanctuaryText>
              </View>

              <SanctuaryText variant="body_md" style={{ color: '#475569', lineHeight: 20, marginBottom: 16 }}>
                • All consultation payments and hospital invoice records are securely maintained in real-time.
                {'\n'}• You can filter records by month, payment status, and visit type.
                {'\n'}• Use "My Statements" to download comprehensive PDF or CSV summaries for any financial year.
                {'\n'}• For payment disputes or queries, contact hospital billing reception.
              </SanctuaryText>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#5F259E', marginTop: 10 }]}
                onPress={() => setIsHelpOpen(false)}
              >
                <SanctuaryText variant="label_lg" style={styles.modalBtnTxt}>
                  Got It
                </SanctuaryText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? 8 : 4,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statementsPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    backgroundColor: '#F8FAFC',
  },
  statementsPillTxt: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  helpIconBtn: {
    padding: 3,
  },

  /* ── Search Bar ── */
  searchSection: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    height: 38,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#1E293B',
    height: '100%',
  },
  searchDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 6,
  },
  filterBtn: {
    padding: 4,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -3,
    right: -4,
    backgroundColor: '#5F259E',
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeTxt: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },

  /* ── Active Filter Chips ── */
  activeFiltersRow: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 6,
  },
  activeFiltersScroll: {
    paddingHorizontal: 14,
    gap: 6,
  },
  clearAllChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  clearAllChipTxt: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterChipTxt: {
    color: '#5F259E',
    fontSize: 10,
    fontWeight: '700',
  },

  /* ── Outstanding Banner ── */
  outstandingBanner: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  outstandingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  outstandingIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  outstandingTextBox: {
    flex: 1,
  },
  outstandingTitle: {
    color: '#B45309',
    fontSize: 11.5,
    fontWeight: '800',
  },
  outstandingSubtitle: {
    color: '#92400E',
    fontSize: 9.5,
    fontWeight: '500',
  },
  outstandingPayBtn: {
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 6,
  },
  outstandingPayBtnTxt: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  /* ── Scroll List ── */
  scrollList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 20,
  },

  /* ── Month Grouping (Screenshot 4) ── */
  monthGroupContainer: {
    marginBottom: 6,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  monthTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  monthTotalWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthTotalAmt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },

  /* ── Transaction Row (Screenshot 4) ── */
  monthItemsBox: {
    backgroundColor: '#FFFFFF',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarPaid: {
    backgroundColor: '#F1F5F9',
  },
  avatarPending: {
    backgroundColor: '#FFFBEB',
  },
  avatarFailed: {
    backgroundColor: '#FEF2F2',
  },

  txInfo: {
    flex: 1,
    marginRight: 6,
  },
  txActionLabel: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 1,
  },
  txName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 1,
  },
  txDateTime: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 1,
  },
  txSubDetails: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '500',
  },

  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  txAmountPaid: {
    color: '#059669',
  },
  txAmountPending: {
    color: '#D97706',
  },
  txAmountFailed: {
    color: '#DC2626',
  },
  quickReceiptBtn: {
    backgroundColor: '#F3E8FF',
    padding: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  txStatusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txStatusText: {
    fontSize: 11,
  },

  /* ── Empty State ── */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
  },
  resetFilterBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
  },
  resetFilterTxt: {
    color: '#5F259E',
    fontWeight: '700',
    fontSize: 12,
  },

  /* ── FILTER MODAL (Screenshot 5) ── */
  filterModalSafe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterBackBtn: {
    padding: 4,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
    marginLeft: 16,
  },
  filterClearBtn: {
    padding: 4,
  },
  filterClearTxt: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 14,
  },

  filterSplitBody: {
    flex: 1,
    flexDirection: 'row',
  },
  filterSidebar: {
    width: '38%',
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  sidebarTab: {
    paddingVertical: 18,
    paddingHorizontal: 14,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  sidebarTabActive: {
    backgroundColor: '#FFFFFF',
  },
  sidebarTabTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  sidebarTabTxtActive: {
    fontWeight: '800',
    color: '#1E293B',
  },
  sidebarActiveDot: {
    position: 'absolute',
    right: 10,
    top: 22,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5F259E',
  },

  filterOptionsPane: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  optionsList: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  squareBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  squareBoxChecked: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },

  filterBottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  applyBtn: {
    backgroundColor: '#5F259E',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* ── STATEMENT MODAL (Screenshot 3) ── */
  statementBody: {
    flex: 1,
  },
  statementSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTxtActive: {
    fontWeight: '800',
    color: '#1E293B',
  },

  radioList: {
    marginTop: 4,
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },

  fileTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  fileTypeInfo: {
    flex: 1,
    paddingRight: 16,
  },
  fileTypeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  fileTypeSub: {
    fontSize: 12,
    color: '#64748B',
  },
  fileTypeCheck: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileTypeCheckSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },

  statementDownloadBtn: {
    backgroundColor: '#5F259E',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── INVOICE DETAIL MODAL (Screenshot 2) ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
    maxHeight: '86%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0,
    gap: 10,
  },
  modalIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    color: '#1E293B',
    fontWeight: '800',
    fontSize: 15,
  },
  modalClose: {
    padding: 4,
  },
  amtBand: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  amtLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  amtValue: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  amtStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 5.5,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  detailValue: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 11.5,
    maxWidth: '65%',
    textAlign: 'right',
  },
  modalBtn: {
    borderRadius: 8,
    backgroundColor: '#005AB5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnTxt: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.3,
  },

  /* ── Category Filter Tabs Bar ── */
  categoryFilterContainer: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
  },
  categoryFilterScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  categoryTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryTabChipActive: {
    backgroundColor: '#5F259E',
    borderColor: '#5F259E',
  },
  categoryTabChipTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  categoryTabChipTxtActive: {
    color: '#FFFFFF',
  },

  /* ── Transaction Item Category Badges ── */
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* ── Bill Detail Modal Calculations ── */
  calcSummaryBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  calcSummaryTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  itemizedListingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    marginBottom: 6,
  },
  itemizedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  calcDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  calcLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
  },
  calcValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
});

