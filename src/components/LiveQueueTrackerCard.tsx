import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Clock,
  ArrowRight,
  Stethoscope,
  ChevronRight,
  Radio,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/navigation/types';
import { apiClient, BOOKING_ENDPOINTS, PATIENT_ENDPOINTS } from '@/api';
import { socketService } from '@/services/socketService';
import { familyService } from '@/services/familyService';
import { SanctuaryText } from './SanctuaryComponents';

interface LiveQueueTrackerCardProps {
  onPress?: () => void;
  style?: any;
  currentPatientId?: string;
}

export default function LiveQueueTrackerCard({ onPress, style, currentPatientId }: LiveQueueTrackerCardProps) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [activeQueue, setActiveQueue] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [consultationElapsed, setConsultationElapsed] = useState<number>(0);

  const fetchActiveQueue = useCallback(async () => {
    try {
      const dashRes = await apiClient.get(PATIENT_ENDPOINTS.DASHBOARD_DATA);
      const rawData = dashRes.data?.data || dashRes.data;
      const appointments: any[] = Array.isArray(rawData?.appointments)
        ? rawData.appointments
        : (rawData?.appointments?.data || (Array.isArray(dashRes.data?.appointments) ? dashRes.data.appointments : []));

      const todayStr = new Date().toISOString().split('T')[0];
      const todayAppt = appointments.find((a: any) => {
        const aDate = a.date ? new Date(a.date).toISOString().split('T')[0] : '';
        return (
          (aDate === todayStr || ['in-progress', 'In-Progress'].includes(a.status) || a.queue_status === 'CURRENT' || a.queue_status === 'WAITING') &&
          ['confirmed', 'waiting', 'Booked', 'booked', 'in-progress', 'In-Progress', 'Arrived', 'arrived'].includes(a.status)
        );
      }) || appointments.find((a: any) => !['cancelled', 'Cancelled', 'completed', 'Completed'].includes(a.status));

      if (!todayAppt) {
        setActiveQueue(null);
        setLoading(false);
        return;
      }

      // Fetch dynamic queue details for this appointment
      const apptId = todayAppt._id || todayAppt.id || todayAppt.appointmentId;
      const queueRes = await apiClient.get(BOOKING_ENDPOINTS.LIVE_QUEUE(apptId));
      if (queueRes.data && queueRes.data.success) {
        setActiveQueue(queueRes.data);
      } else {
        // Fallback to basic appointment info
        setActiveQueue({
          appointmentId: apptId,
          doctor: {
            name: todayAppt.doctor?.user?.name ? `Dr. ${todayAppt.doctor.user.name}` : 'Attending Doctor',
            specialization: todayAppt.doctor?.specialization || 'OPD Consultation',
            roomNumber: 'Consultation Room 1',
          },
          patientToken: todayAppt.token_number || '1',
          currentlyServingToken: '1',
          patientsAhead: 0,
          estimatedWaitMinutes: 5,
          queueStatus: 'WAITING',
        });
      }
    } catch (err) {
      // Quiet fail if offline or error
      setActiveQueue(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveQueue(null);
    fetchActiveQueue();
  }, [currentPatientId]);

  useEffect(() => {
    fetchActiveQueue();

    // Listen to all real-time consultation and queue advancement events
    const handleQueueChange = () => {
      fetchActiveQueue();
    };

    const unsubProfile = familyService.onProfileChange(() => {
      setActiveQueue(null);
      fetchActiveQueue();
    });

    const unsub1 = socketService.on('queue_update', handleQueueChange);
    const unsub2 = socketService.on('queue_updated', handleQueueChange);
    const unsub3 = socketService.on('consultation_started', handleQueueChange);
    const unsub4 = socketService.on('consultation_paused', handleQueueChange);
    const unsub5 = socketService.on('consultation_resumed', handleQueueChange);
    const unsub6 = socketService.on('appointment_completed', handleQueueChange);
    const unsub7 = socketService.on('appointment:status_change', handleQueueChange);
    const unsub8 = socketService.on('appointment_status_changed', handleQueueChange);
    const unsub9 = socketService.on('dashboard:update', handleQueueChange);

    const interval = setInterval(fetchActiveQueue, 15000);

    return () => {
      unsubProfile();
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
      unsub8();
      unsub9();
      clearInterval(interval);
    };
  }, [fetchActiveQueue]);



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
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isCompleted = activeQueue?.queueStatus === 'COMPLETED';
  const isYourTurn = Boolean(
    !isCompleted &&
    activeQueue &&
    (
      ['IN_CONSULTATION', 'PAUSED'].includes(activeQueue?.queueStatus) ||
      (activeQueue.currentlyServingId && activeQueue.appointmentId && String(activeQueue.currentlyServingId) === String(activeQueue.appointmentId)) ||
      (activeQueue.currentlyServingToken && activeQueue.currentlyServingToken !== 'None' && String(activeQueue.patientToken).trim() === String(activeQueue.currentlyServingToken).trim())
    )
  );
  const isPaused = Boolean(
    activeQueue &&
    (
      (isYourTurn && (activeQueue.isPaused || activeQueue.queueStatus === 'PAUSED' || activeQueue.currentServingIsPaused)) ||
      (!isYourTurn && activeQueue.currentServingIsPaused)
    )
  );
  const isNext = Boolean(
    activeQueue &&
    !isPaused &&
    !isYourTurn &&
    !isCompleted &&
    (activeQueue?.queueStatus === 'NEXT' || (activeQueue?.patientsAhead <= 1 && !isYourTurn && !isCompleted))
  );

  useEffect(() => {
    if (!activeQueue) return;

    if (isCompleted) {
      if (activeQueue.consultationDuration) {
        setConsultationElapsed(activeQueue.consultationDuration);
      } else if (activeQueue.consultationStartTime && activeQueue.consultationEndTime) {
        const diff = Math.floor(
          (new Date(activeQueue.consultationEndTime).getTime() - new Date(activeQueue.consultationStartTime).getTime()) / 1000
        );
        setConsultationElapsed(Math.max(0, diff));
      }
      return;
    }

    if (isPaused) {
      // Freeze timer at the exact paused elapsed duration
      if (isYourTurn) {
        if (activeQueue.pausedAt && activeQueue.consultationStartTime) {
          const start = new Date(activeQueue.consultationStartTime).getTime();
          const paused = new Date(activeQueue.pausedAt).getTime();
          const pausedDurMs = (activeQueue.pausedDuration || 0) * 1000;
          const activeElapsed = Math.max(0, Math.floor((paused - start - pausedDurMs) / 1000));
          setConsultationElapsed(activeElapsed);
        } else if (activeQueue.consultationDuration) {
          setConsultationElapsed(activeQueue.consultationDuration);
        }
      } else if (activeQueue.currentServingIsPaused) {
        if (activeQueue.currentServingPausedAt && activeQueue.currentServingStartTime) {
          const start = new Date(activeQueue.currentServingStartTime).getTime();
          const paused = new Date(activeQueue.currentServingPausedAt).getTime();
          const pausedDurMs = (activeQueue.currentServingPausedDuration || 0) * 1000;
          const activeElapsed = Math.max(0, Math.floor((paused - start - pausedDurMs) / 1000));
          setConsultationElapsed(activeElapsed);
        } else if (activeQueue.currentServingDuration) {
          setConsultationElapsed(activeQueue.currentServingDuration);
        }
      }
      return; // Do NOT run interval while paused
    }

    const activeStartTimeStr = isYourTurn
      ? (activeQueue.consultationStartTime || activeQueue.calledTime)
      : (activeQueue.currentServingStartTime || (activeQueue.currentlyServingToken !== 'None' ? activeQueue.calledTime : null));

    if (!activeStartTimeStr) {
      setConsultationElapsed(0);
      return;
    }

    const startTimeMs = new Date(activeStartTimeStr).getTime();
    if (isNaN(startTimeMs)) return;

    const updateElapsed = () => {
      const pausedMs = (activeQueue.pausedDuration || 0) * 1000;
      const now = Date.now();
      const elapsedSec = Math.max(0, Math.floor((now - startTimeMs - pausedMs) / 1000));
      setConsultationElapsed(elapsedSec);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [
    activeQueue?.queueStatus,
    activeQueue?.consultationStartTime,
    activeQueue?.consultationEndTime,
    activeQueue?.consultationDuration,
    activeQueue?.currentServingStartTime,
    activeQueue?.calledTime,
    activeQueue?.pausedDuration,
    activeQueue?.isPaused,
    activeQueue?.pausedAt,
    activeQueue?.currentServingIsPaused,
    activeQueue?.currentServingPausedAt,
    activeQueue?.currentServingPausedDuration,
    isYourTurn,
    isCompleted,
    isPaused,
  ]);

  if (loading || !activeQueue) {
    return null; // Do not display if patient has no OPD appointment today
  }

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      activeOpacity={0.88}
      onPress={() => {
        if (onPress) {
          onPress();
        } else {
          navigation.navigate('LiveQueue', { appointmentId: activeQueue.appointmentId });
        }
      }}
    >
      <LinearGradient
        colors={
          isCompleted
            ? ['#475569', '#334155']
            : isPaused
            ? ['#D97706', '#92400E']
            : isYourTurn
            ? ['#059669', '#047857']
            : isNext
            ? ['#D97706', '#B45309']
            : ['#1E3A8A', '#2563EB']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {/* Top Meta: Live Status + Doctor */}
        <View style={styles.topRow}>
          <View style={styles.liveBadge}>
            <View style={[styles.pulseDot, isPaused && { backgroundColor: '#FBBF24' }]} />
            <SanctuaryText variant="label_sm" style={styles.liveBadgeTxt}>
              {isPaused ? 'OPD SESSION PAUSED' : 'LIVE OPD QUEUE'}
            </SanctuaryText>
          </View>

          <SanctuaryText variant="body_sm" style={styles.roomText}>
            {activeQueue.doctor.roomNumber}
          </SanctuaryText>
        </View>

        {/* Middle: Tokens Comparison */}
        <View style={styles.middleRow}>
          <View style={styles.doctorInfoCol}>
            <SanctuaryText variant="headline_sm" style={styles.docName} numberOfLines={1}>
              {activeQueue.doctor.name}
            </SanctuaryText>
            <SanctuaryText variant="body_sm" style={styles.docDept} numberOfLines={1}>
              {activeQueue.doctor.specialization}
            </SanctuaryText>
          </View>

          {/* Tokens Box */}
          <View style={styles.tokenPillsWrap}>
            <View style={styles.tokenPillMine}>
              <SanctuaryText variant="label_sm" style={styles.tokenLabel}>YOURS</SanctuaryText>
              <SanctuaryText variant="headline_sm" style={styles.tokenNum}>#{activeQueue.patientToken}</SanctuaryText>
            </View>

            <View style={styles.tokenPillCalling}>
              <SanctuaryText variant="label_sm" style={[styles.tokenLabel, { color: isPaused ? '#FDE68A' : '#BBF7D0' }]}>
                {isCompleted ? 'SERVED' : isPaused ? 'PAUSED' : 'CALLING'}
              </SanctuaryText>
              <SanctuaryText variant="headline_sm" style={[styles.tokenNum, { color: isPaused ? '#FBBF24' : '#4ADE80' }]}>
                #{activeQueue.currentlyServingToken}
              </SanctuaryText>
            </View>
          </View>
        </View>

        {/* Bottom Banner Strip */}
        <View style={styles.bottomStrip}>
          <View style={styles.statusRow}>
            <Clock size={13} color="#BFDBFE" />
            <SanctuaryText variant="label_sm" style={styles.statusTxt}>
              {isCompleted
                ? `✅ Completed at ${formatISTTime(activeQueue.consultationEndTime)} IST`
                : isPaused
                ? isYourTurn
                  ? `⏸ Consultation Paused (⏱ ${formatDuration(consultationElapsed)}) · Doctor will resume shortly`
                  : `⏸ Doctor Paused Token #${activeQueue.currentlyServingToken} (⏱ ${formatDuration(consultationElapsed)})`
                : isYourTurn
                ? `⭐ In consultation: ⏱ ${formatDuration(consultationElapsed)} · ${formatISTTime(activeQueue.consultationStartTime || activeQueue.calledTime)} IST`
                : isNext
                ? `🔔 Next! Token #${activeQueue.currentlyServingToken} inside (⏱ ${formatDuration(consultationElapsed)})`
                : `${activeQueue.patientsAhead} ahead · ~${activeQueue.estimatedWaitMinutes} mins wait`}
            </SanctuaryText>
          </View>

          <View style={styles.trackAction}>
            <SanctuaryText variant="label_sm" style={styles.trackActionTxt}>
              TRACK
            </SanctuaryText>
            <ChevronRight size={14} color="#FFF" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    marginVertical: 10,
  },
  gradient: {
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  liveBadgeTxt: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  roomText: {
    color: '#E0F2FE',
    fontSize: 11,
    fontWeight: '700',
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  docName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  docDept: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  tokenPillsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  tokenPillMine: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 52,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  tokenPillCalling: {
    backgroundColor: 'rgba(5, 150, 105, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 52,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.5)',
  },
  tokenLabel: {
    color: '#BFDBFE',
    fontSize: 8,
    fontWeight: '800',
  },
  tokenNum: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
  },
  bottomStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  statusTxt: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  trackAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trackActionTxt: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
});
