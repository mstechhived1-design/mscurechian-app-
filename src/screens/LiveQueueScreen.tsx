import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Clock,
  User,
  Building2,
  Stethoscope,
  ChevronLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Bell,
  ArrowRight,
  MapPin,
  Calendar,
  Volume2,
  Pause,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/navigation/types';
import { apiClient, BOOKING_ENDPOINTS, PATIENT_ENDPOINTS } from '@/api';
import { socketService } from '@/services/socketService';
import { familyService } from '@/services/familyService';
import { COLORS } from '../constants/designSystem';
import { SanctuaryText } from '../components/SanctuaryComponents';

const { width } = Dimensions.get('window');

interface LiveQueueData {
  appointmentId: string;
  doctor: {
    id: string;
    name: string;
    specialization: string;
    department: string;
    roomNumber: string;
  };
  hospital: {
    id: string;
    name: string;
  };
  patientToken: string;
  currentlyServingToken: string;
  currentlyServingId?: string | null;
  queueStatus: 'WAITING' | 'NEXT' | 'IN_CONSULTATION' | 'PAUSED' | 'COMPLETED';
  patientsAhead: number;
  totalWaitingToday: number;
  totalCompletedToday: number;
  totalInQueueToday: number;
  estimatedWaitMinutes: number;
  averageMinutesPerPatient: number;
  appointmentTime: string;
  calledTime?: string | null;
  consultationStartTime?: string | null;
  consultationEndTime?: string | null;
  consultationDuration?: number;
  currentServingStartTime?: string | null;
  currentServingEndTime?: string | null;
  currentServingDuration?: number;
  isPaused?: boolean;
  pausedAt?: string | null;
  pausedDuration?: number;
  currentServingIsPaused?: boolean;
  currentServingPausedAt?: string | null;
  currentServingPausedDuration?: number;
  lastUpdated: string;
}

export default function LiveQueueScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'LiveQueue'>>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queueData, setQueueData] = useState<LiveQueueData | null>(null);
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const previousStatusRef = useRef<string>('');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const passedAppointmentId = route.params?.appointmentId;

  const fetchLiveQueue = useCallback(async (isPull = false) => {
    try {
      if (isPull && !loading) {
        setRefreshing(true);
      }

      let apptId = passedAppointmentId;

      // If no appointmentId is provided, look up the patient's active appointment for today
      if (!apptId) {
        const dashRes = await apiClient.get(PATIENT_ENDPOINTS.DASHBOARD_DATA);
        const rawData = dashRes.data?.data || dashRes.data;
        const appointments: any[] = Array.isArray(rawData?.appointments)
          ? rawData.appointments
          : (rawData?.appointments?.data || (Array.isArray(dashRes.data?.appointments) ? dashRes.data.appointments : []));

        // Find today's active or upcoming appointment
        const todayStr = new Date().toISOString().split('T')[0];
        const activeAppt = appointments.find((a: any) => {
          const aDate = a.date ? new Date(a.date).toISOString().split('T')[0] : '';
          return (aDate === todayStr || ['in-progress', 'In-Progress'].includes(a.status) || a.queue_status === 'CURRENT' || a.queue_status === 'WAITING') && !['cancelled', 'Cancelled'].includes(a.status);
        }) || appointments.find((a: any) => !['cancelled', 'Cancelled', 'completed', 'Completed'].includes(a.status)) || appointments[0];

        if (activeAppt) {
          apptId = activeAppt._id || activeAppt.id || activeAppt.appointmentId;
        }
      }

      if (!apptId) {
        setQueueData(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Fetch dynamic doctor queue from backend
      const res = await apiClient.get(BOOKING_ENDPOINTS.LIVE_QUEUE(apptId));
      if (res.data && res.data.success) {
        const newData: LiveQueueData = res.data;
        setQueueData(newData);

        // Check if status changed to NEXT or IN_CONSULTATION or PAUSED or COMPLETED to alert patient
        if (
          previousStatusRef.current &&
          previousStatusRef.current !== newData.queueStatus
        ) {
          if (newData.queueStatus === 'NEXT') {
            Alert.alert(
              '🔔 You are Next in Line!',
              `Token #${newData.patientToken}: Please proceed toward ${newData.doctor.roomNumber}. Doctor will call you shortly.`
            );
          } else if (newData.queueStatus === 'IN_CONSULTATION') {
            Alert.alert(
              '⭐ Your Turn Now!',
              `Doctor is ready for you in ${newData.doctor.roomNumber}. Please enter.`
            );
          } else if (newData.queueStatus === 'PAUSED') {
            Alert.alert(
              '⏸️ Consultation Paused',
              `The doctor has temporarily paused the session. It will resume shortly.`
            );
          } else if (newData.queueStatus === 'COMPLETED') {
            Alert.alert(
              '✅ Consultation Completed',
              `Your consultation with ${newData.doctor.name} has concluded.`
            );
          }
        }
        previousStatusRef.current = newData.queueStatus;
      }
    } catch (err: any) {
      // 404 means no active queue / appointment for today
      if (err?.response?.status === 404 || err?.message?.includes('Appointment not found')) {
        setQueueData(null);
      } else {
        console.warn('[LiveQueue] Fetch queue error:', err?.message || err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [passedAppointmentId]);

  useEffect(() => {
    fetchLiveQueue();

    // 10-second heartbeat poll as a fallback guarantee
    pollTimerRef.current = setInterval(() => {
      fetchLiveQueue();
    }, 10000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [fetchLiveQueue]);

  // Real-time WebSocket listeners for doctor consultation state changes (start, pause, resume, stop)
  useEffect(() => {
    const handleQueueAdvancement = (payload?: any) => {
      console.log('[LiveQueue] Real-time queue event received:', payload);
      fetchLiveQueue();
    };

    const unsub1 = socketService.on('queue_update', handleQueueAdvancement);
    const unsub2 = socketService.on('queue_updated', handleQueueAdvancement);
    const unsub3 = socketService.on('consultation_started', handleQueueAdvancement);
    const unsub4 = socketService.on('consultation_paused', handleQueueAdvancement);
    const unsub5 = socketService.on('consultation_resumed', handleQueueAdvancement);
    const unsub6 = socketService.on('appointment_completed', handleQueueAdvancement);
    const unsub7 = socketService.on('appointment:status_change', handleQueueAdvancement);
    const unsub8 = socketService.on('appointment_status_changed', handleQueueAdvancement);
    const unsub9 = socketService.on('dashboard:update', handleQueueAdvancement);

    const unsubProfile = familyService.onProfileChange(() => {
      fetchLiveQueue(false);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
      unsub8();
      unsub9();
      unsubProfile();
    };
  }, [fetchLiveQueue]);

  useFocusEffect(
    useCallback(() => {
      fetchLiveQueue(false);
    }, [fetchLiveQueue])
  );

  const [consultationElapsed, setConsultationElapsed] = useState<number>(0);

  const formatISTTime = (iso?: string | null) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return null;
    }
  };

  const formatDuration = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isCompleted = queueData?.queueStatus === 'COMPLETED';
  const isMyTurn = Boolean(
    !isCompleted &&
    queueData &&
    (
      ['IN_CONSULTATION', 'PAUSED'].includes(queueData.queueStatus) ||
      (queueData.currentlyServingId && queueData.appointmentId && String(queueData.currentlyServingId) === String(queueData.appointmentId)) ||
      (queueData.currentlyServingToken && queueData.currentlyServingToken !== 'None' && String(queueData.patientToken).trim() === String(queueData.currentlyServingToken).trim())
    )
  );
  const isPaused = Boolean(
    queueData &&
    (
      (isMyTurn && (queueData.isPaused || queueData.queueStatus === 'PAUSED' || queueData.currentServingIsPaused)) ||
      (!isMyTurn && queueData.currentServingIsPaused)
    )
  );

  const isNextInLine = Boolean(
    queueData &&
    !isPaused &&
    !isMyTurn &&
    !isCompleted &&
    (queueData.queueStatus === 'NEXT' || (queueData.patientsAhead <= 1 && !isMyTurn && !isCompleted))
  );

  // Live ticking timer for consultation elapsed time
  useEffect(() => {
    if (!queueData) return;

    if (isCompleted) {
      if (queueData.consultationDuration) {
        setConsultationElapsed(queueData.consultationDuration);
      } else if (queueData.consultationStartTime && queueData.consultationEndTime) {
        const diff = Math.floor(
          (new Date(queueData.consultationEndTime).getTime() - new Date(queueData.consultationStartTime).getTime()) / 1000
        );
        setConsultationElapsed(Math.max(0, diff));
      }
      return;
    }

    if (isPaused) {
      // Freeze timer at the exact paused elapsed duration
      if (isMyTurn) {
        if (queueData.pausedAt && queueData.consultationStartTime) {
          const start = new Date(queueData.consultationStartTime).getTime();
          const paused = new Date(queueData.pausedAt).getTime();
          const pausedDurMs = (queueData.pausedDuration || 0) * 1000;
          const activeElapsed = Math.max(0, Math.floor((paused - start - pausedDurMs) / 1000));
          setConsultationElapsed(activeElapsed);
        } else if (queueData.consultationDuration) {
          setConsultationElapsed(queueData.consultationDuration);
        }
      } else if (queueData.currentServingIsPaused) {
        if (queueData.currentServingPausedAt && queueData.currentServingStartTime) {
          const start = new Date(queueData.currentServingStartTime).getTime();
          const paused = new Date(queueData.currentServingPausedAt).getTime();
          const pausedDurMs = (queueData.currentServingPausedDuration || 0) * 1000;
          const activeElapsed = Math.max(0, Math.floor((paused - start - pausedDurMs) / 1000));
          setConsultationElapsed(activeElapsed);
        } else if (queueData.currentServingDuration) {
          setConsultationElapsed(queueData.currentServingDuration);
        }
      }
      return; // Do NOT run interval while paused
    }

    const activeStartTimeStr = isMyTurn
      ? (queueData.consultationStartTime || queueData.calledTime)
      : (queueData.currentServingStartTime || (queueData.currentlyServingToken !== 'None' ? queueData.calledTime : null));

    if (!activeStartTimeStr) {
      setConsultationElapsed(0);
      return;
    }

    const startTimeMs = new Date(activeStartTimeStr).getTime();
    if (isNaN(startTimeMs)) return;

    const updateElapsed = () => {
      const pausedMs = (queueData.pausedDuration || 0) * 1000;
      const now = Date.now();
      const elapsedSec = Math.max(0, Math.floor((now - startTimeMs - pausedMs) / 1000));
      setConsultationElapsed(elapsedSec);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [
    queueData?.queueStatus,
    queueData?.consultationStartTime,
    queueData?.consultationEndTime,
    queueData?.consultationDuration,
    queueData?.currentServingStartTime,
    queueData?.calledTime,
    queueData?.pausedDuration,
    queueData?.isPaused,
    queueData?.pausedAt,
    queueData?.currentServingIsPaused,
    queueData?.currentServingPausedAt,
    queueData?.currentServingPausedDuration,
    isMyTurn,
    isCompleted,
    isPaused,
  ]);

  const getStatusColor = () => {
    if (isCompleted) return '#64748B';
    if (isPaused) return '#D97706';
    if (isMyTurn) return '#059669';
    if (isNextInLine) return '#D97706';
    return '#2563EB';
  };

  const getStatusBadgeText = () => {
    if (!queueData) return '';
    if (isCompleted) {
      const endStr = formatISTTime(queueData.consultationEndTime);
      return `✅ CONSULTATION COMPLETED${endStr ? ` · ${endStr}` : ''}`;
    }
    if (isPaused) {
      if (isMyTurn) {
        return `⏸ CONSULTATION PAUSED · PLEASE STAND BY`;
      } else {
        return `⏸ DOCTOR PAUSED SESSION (Token #${queueData.currentlyServingToken}) · WILL RESUME SHORTLY`;
      }
    }
    if (isMyTurn) {
      return `⭐ NOW SERVING YOUR TOKEN #${queueData.patientToken}`;
    }
    if (isNextInLine) {
      return `🔔 YOU ARE NEXT IN LINE (Token #${queueData.currentlyServingToken} is inside)`;
    }
    if (queueData.patientsAhead > 1) {
      return `⏳ ${queueData.patientsAhead} PATIENTS AHEAD OF YOU`;
    }
    return `WAITING IN QUEUE · TOKEN #${queueData.patientToken}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Screen Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={18} color="#0F172A" />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <SanctuaryText variant="headline_sm" style={styles.topTitle}>
            Live OPD Queue & Token
          </SanctuaryText>
          <SanctuaryText variant="body_sm" style={styles.topSubtitle}>
            Real-Time Doctor Queue Tracker
          </SanctuaryText>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchLiveQueue(true)}
          disabled={refreshing}
          accessibilityLabel="Refresh Queue"
        >
          <RefreshCw size={15} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          !loading ? (
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchLiveQueue(true)} colors={['#2563EB']} />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <SanctuaryText variant="body_sm" style={{ color: '#64748B', marginTop: 12 }}>
              Connecting to live doctor queue...
            </SanctuaryText>
          </View>
        ) : !queueData ? (
          <View style={styles.emptyContainer}>
            <Clock size={48} color="#CBD5E1" />
            <SanctuaryText variant="label_lg" style={styles.emptyTitle}>
              No Active OPD Queue Found
            </SanctuaryText>
            <SanctuaryText variant="body_sm" style={styles.emptySub}>
              You do not have a scheduled hospital visit for today. Once an appointment is booked and checked-in, your live token tracker will appear here.
            </SanctuaryText>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => navigation.navigate('Appointments')}
            >
              <SanctuaryText variant="label_lg" style={{ color: '#FFF' }}>
                View Appointments
              </SanctuaryText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── LIVE HERO TOKEN BOARD ── */}
            <View style={styles.heroBoardCard}>
              <LinearGradient
                colors={['#1E3A8A', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                {/* Doctor & Room Header */}
                <View style={styles.boardTopRow}>
                  <View style={{ flex: 1 }}>
                    <SanctuaryText variant="body_sm" style={styles.boardHospName}>
                      {queueData.hospital.name}
                    </SanctuaryText>
                    <SanctuaryText variant="headline_sm" style={styles.boardDocName}>
                      {queueData.doctor.name}
                    </SanctuaryText>
                    <SanctuaryText variant="body_sm" style={styles.boardDept}>
                      {queueData.doctor.specialization} · {queueData.doctor.roomNumber}
                    </SanctuaryText>
                  </View>

                  <View style={styles.liveIndicator}>
                    <View style={styles.livePulseDot} />
                    <SanctuaryText variant="label_sm" style={styles.liveText}>
                      LIVE
                    </SanctuaryText>
                  </View>
                </View>

                {/* Dual Token Circles */}
                <View style={styles.tokensDualRow}>
                  {/* Left: Your Token */}
                  <View style={styles.tokenCardBox}>
                    <SanctuaryText variant="label_sm" style={styles.tokenCardLabel}>
                      YOUR TOKEN
                    </SanctuaryText>
                    <SanctuaryText variant="headline_sm" style={styles.tokenCardNumber}>
                      #{queueData.patientToken}
                    </SanctuaryText>
                    <SanctuaryText variant="body_sm" style={styles.tokenCardTime}>
                      {queueData.appointmentTime}
                    </SanctuaryText>
                  </View>

                  <View style={styles.tokenArrowDivider}>
                    <ArrowRight size={16} color="#BFDBFE" />
                  </View>

                  {/* Right: Currently Calling */}
                  <View style={[styles.tokenCardBox, styles.tokenCardBoxCurrent]}>
                    <SanctuaryText variant="label_sm" style={[styles.tokenCardLabel, { color: '#DCFCE7' }]}>
                      NOW SERVING
                    </SanctuaryText>
                    <SanctuaryText variant="headline_sm" style={[styles.tokenCardNumber, { color: '#4ADE80' }]}>
                      #{queueData.currentlyServingToken}
                    </SanctuaryText>
                    <SanctuaryText variant="body_sm" style={[styles.tokenCardTime, { color: isPaused ? '#FDE68A' : '#BBF7D0' }]}>
                      {isCompleted ? 'Completed' : isPaused ? 'Paused' : 'In Consultation'}
                    </SanctuaryText>
                  </View>
                </View>

                {/* Dynamic Live Consultation Timer & IST Block */}
                {(isMyTurn || Boolean(queueData.currentServingStartTime) || isCompleted) && (
                  <View
                    style={[
                      styles.liveConsultationBar,
                      isPaused && { borderColor: 'rgba(245, 158, 11, 0.4)', backgroundColor: 'rgba(30, 27, 75, 0.55)' },
                    ]}
                  >
                    <View
                      style={[
                        styles.liveTimerPill,
                        isPaused && { backgroundColor: 'rgba(180, 83, 9, 0.4)', borderColor: '#F59E0B' },
                      ]}
                    >
                      {isPaused ? (
                        <Pause size={12} color="#FBBF24" />
                      ) : (
                        <Clock size={12} color="#4ADE80" />
                      )}
                      <SanctuaryText
                        variant="label_sm"
                        style={[
                          styles.liveTimerPillTxt,
                          isPaused && { color: '#FBBF24' },
                        ]}
                      >
                        {formatDuration(consultationElapsed)}
                      </SanctuaryText>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <SanctuaryText
                        variant="label_sm"
                        style={[
                          styles.liveConsultationTitle,
                          isPaused && { color: '#FDE68A' },
                        ]}
                      >
                        {isCompleted
                          ? 'CONSULTATION CONCLUDED'
                          : isPaused
                          ? 'CONSULTATION TEMPORARILY PAUSED'
                          : isMyTurn
                          ? 'YOUR CONSULTATION IS LIVE'
                          : `DOCTOR CONSULTING TOKEN #${queueData.currentlyServingToken}`}
                      </SanctuaryText>
                      <SanctuaryText variant="body_sm" style={styles.liveConsultationTime}>
                        {isCompleted
                          ? `Finished at ${formatISTTime(queueData.consultationEndTime)} · Total: ${formatDuration(consultationElapsed)}`
                          : isPaused
                          ? 'Doctor has paused this session. Please stand by, resuming shortly.'
                          : isMyTurn
                          ? `Started at ${formatISTTime(queueData.consultationStartTime || queueData.calledTime)}`
                          : `Started at ${formatISTTime(queueData.currentServingStartTime || queueData.calledTime)}`}
                      </SanctuaryText>
                    </View>
                  </View>
                )}

                {/* Status Alert Banner */}
                <View
                  style={[
                    styles.statusPillBanner,
                    { backgroundColor: getStatusColor() },
                  ]}
                >
                  <SanctuaryText variant="label_lg" style={styles.statusPillTxt}>
                    {getStatusBadgeText()}
                  </SanctuaryText>
                </View>
              </LinearGradient>

              {/* Dynamic Wait Estimate Strip */}
              <View style={styles.estimateStrip}>
                <View style={styles.estimateCol}>
                  <SanctuaryText variant="label_sm" style={styles.estimateLabel}>
                    ESTIMATED WAIT
                  </SanctuaryText>
                  <SanctuaryText variant="headline_sm" style={styles.estimateVal}>
                    ~{queueData.estimatedWaitMinutes} Mins
                  </SanctuaryText>
                </View>

                <View style={styles.estimateDivider} />

                <View style={styles.estimateCol}>
                  <SanctuaryText variant="label_sm" style={styles.estimateLabel}>
                    PATIENTS AHEAD
                  </SanctuaryText>
                  <SanctuaryText variant="headline_sm" style={[styles.estimateVal, { color: '#2563EB' }]}>
                    {queueData.patientsAhead}
                  </SanctuaryText>
                </View>

                <View style={styles.estimateDivider} />

                <View style={styles.estimateCol}>
                  <SanctuaryText variant="label_sm" style={styles.estimateLabel}>
                    AVG TIME / PATIENT
                  </SanctuaryText>
                  <SanctuaryText variant="headline_sm" style={styles.estimateVal}>
                    {queueData.averageMinutesPerPatient} Mins
                  </SanctuaryText>
                </View>
              </View>
            </View>

            {/* ── QUEUE ADVANCEMENT STEP PROGRESS ── */}
            <View style={styles.sectionCard}>
              <SanctuaryText variant="label_lg" style={styles.sectionHeaderTitle}>
                Queue Progression Timeline
              </SanctuaryText>

              <View style={styles.timelineBox}>
                {[
                  {
                    title: 'Token Assigned & Checked In',
                    sub: `Token #${queueData.patientToken} generated for OPD queue`,
                    done: true,
                    active: false,
                  },
                  {
                    title: 'Waiting in Hall',
                    sub: queueData.patientsAhead > 1
                      ? `${queueData.patientsAhead} patients ahead of you`
                      : 'You are moving close to the door',
                    done: isNextInLine || isMyTurn || isCompleted,
                    active: !isNextInLine && !isMyTurn && !isCompleted && queueData.queueStatus === 'WAITING',
                  },
                  {
                    title: 'Next in Line',
                    sub: isNextInLine
                      ? `Token #${queueData.currentlyServingToken} is in consultation · Please wait outside door`
                      : 'Wait right outside the consultation room door',
                    done: isMyTurn || isCompleted,
                    active: isNextInLine,
                  },
                  {
                    title: 'Inside Consultation Room',
                    sub: isCompleted
                      ? 'Consultation finished'
                      : isPaused
                      ? `Session paused by Dr. ${queueData.doctor.name} (⏱ ${formatDuration(consultationElapsed)}) · Will resume shortly`
                      : isMyTurn
                      ? `Consulting with ${queueData.doctor.name} · Started: ${formatISTTime(queueData.consultationStartTime || queueData.calledTime)} (⏱ ${formatDuration(consultationElapsed)})`
                      : queueData.currentServingStartTime
                      ? `Doctor consulting Token #${queueData.currentlyServingToken} · Started: ${formatISTTime(queueData.currentServingStartTime)}`
                      : `Consulting with ${queueData.doctor.name}`,
                    done: isCompleted,
                    active: isMyTurn,
                  },
                  {
                    title: 'Consultation Complete',
                    sub: isCompleted && queueData.consultationEndTime
                      ? `Finished at ${formatISTTime(queueData.consultationEndTime)} · Duration: ${formatDuration(consultationElapsed)}`
                      : 'Prescriptions and lab orders generated',
                    done: isCompleted,
                    active: isCompleted,
                  },
                ].map((step, idx) => (
                  <View key={idx} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View
                        style={[
                          styles.timelineDot,
                          step.done && styles.timelineDotDone,
                          step.active && styles.timelineDotActive,
                        ]}
                      >
                        {step.done ? (
                          <CheckCircle2 size={13} color="#FFF" />
                        ) : (
                          <View style={styles.timelineInnerDot} />
                        )}
                      </View>
                      {idx < 4 && (
                        <View
                          style={[
                            styles.timelineLine,
                            step.done && styles.timelineLineDone,
                          ]}
                        />
                      )}
                    </View>

                    <View style={styles.timelineRight}>
                      <SanctuaryText
                        variant="label_md"
                        style={[
                          styles.stepTitle,
                          step.active && { color: '#2563EB', fontWeight: '900' },
                        ]}
                      >
                        {step.title}
                      </SanctuaryText>
                      <SanctuaryText variant="body_sm" style={styles.stepSub}>
                        {step.sub}
                      </SanctuaryText>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* ── TODAY'S CLINIC STATS CARD ── */}
            <View style={styles.sectionCard}>
              <SanctuaryText variant="label_lg" style={styles.sectionHeaderTitle}>
                Today's Doctor OPD Stats
              </SanctuaryText>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <SanctuaryText variant="headline_sm" style={styles.statNumber}>
                    {queueData.totalInQueueToday}
                  </SanctuaryText>
                  <SanctuaryText variant="body_sm" style={styles.statLabel}>
                    Total Booked
                  </SanctuaryText>
                </View>

                <View style={styles.statBox}>
                  <SanctuaryText variant="headline_sm" style={[styles.statNumber, { color: '#059669' }]}>
                    {queueData.totalCompletedToday}
                  </SanctuaryText>
                  <SanctuaryText variant="body_sm" style={styles.statLabel}>
                    Completed
                  </SanctuaryText>
                </View>

                <View style={styles.statBox}>
                  <SanctuaryText variant="headline_sm" style={[styles.statNumber, { color: '#D97706' }]}>
                    {queueData.totalWaitingToday}
                  </SanctuaryText>
                  <SanctuaryText variant="body_sm" style={styles.statLabel}>
                    Currently Waiting
                  </SanctuaryText>
                </View>
              </View>

              <View style={styles.noticeBox}>
                <Bell size={16} color="#2563EB" />
                <SanctuaryText variant="body_sm" style={styles.noticeText}>
                  Keep this screen open or keep notifications active. Your device will notify you as soon as your token is called by the doctor.
                </SanctuaryText>
              </View>
            </View>
          </>
        )}
      </ScrollView>
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  topSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  scrollContent: {
    padding: 12,
    paddingBottom: 28,
  },
  centerContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  bookBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },

  /* Hero Board */
  heroBoardCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    elevation: 3,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 10,
  },
  heroGradient: {
    padding: 14,
  },
  boardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  boardHospName: {
    color: '#BFDBFE',
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  boardDocName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 1,
  },
  boardDept: {
    color: '#E0F2FE',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 4,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  /* Dual Token Row */
  tokensDualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  tokenCardBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  tokenCardBoxCurrent: {
    backgroundColor: 'rgba(5, 150, 105, 0.25)',
    borderColor: 'rgba(74, 222, 128, 0.5)',
  },
  tokenCardLabel: {
    color: '#BFDBFE',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tokenCardNumber: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
    marginVertical: 1,
  },
  tokenCardTime: {
    color: '#E0F2FE',
    fontSize: 10,
    fontWeight: '600',
  },
  tokenArrowDivider: {
    paddingHorizontal: 6,
  },

  liveConsultationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  liveTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#059669',
    gap: 3,
  },
  liveTimerPillTxt: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  liveConsultationTitle: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  liveConsultationTime: {
    color: '#CBD5E1',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },

  statusPillBanner: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statusPillTxt: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* Estimate Strip */
  estimateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  estimateCol: {
    flex: 1,
    alignItems: 'center',
  },
  estimateLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  estimateVal: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 1,
  },
  estimateDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },

  /* Sections */
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  sectionHeaderTitle: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '900',
    marginBottom: 10,
  },

  /* Timeline */
  timelineBox: {
    paddingLeft: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 42,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 22,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotDone: {
    backgroundColor: '#059669',
  },
  timelineDotActive: {
    backgroundColor: '#2563EB',
    borderWidth: 2.5,
    borderColor: '#BFDBFE',
  },
  timelineInnerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#94A3B8',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: '#059669',
  },
  timelineRight: {
    flex: 1,
    marginLeft: 10,
    paddingBottom: 10,
  },
  stepTitle: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '800',
  },
  stepSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  noticeText: {
    flex: 1,
    color: '#1E40AF',
    fontSize: 11,
    lineHeight: 15,
  },
});
