import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  ChevronLeft,
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  Calendar,
  Pill,
  FlaskConical,
  Building2,
  ShieldAlert,
  Clock,
  ChevronRight,
  Sparkles,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react-native';

import { useSocket, LiveNotification } from '@/context/SocketContext';
import { RootStackParamList } from '@/navigation/types';
import { SanctuaryText } from '@/components/SanctuaryComponents';
import { COLORS } from '@/constants/designSystem';

type NotificationCategory = 'all' | 'appointments' | 'prescriptions' | 'reports' | 'notices';

interface CategoryTab {
  id: NotificationCategory;
  label: string;
  icon: any;
}

const CATEGORY_TABS: CategoryTab[] = [
  { id: 'all', label: 'All', icon: Bell },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'reports', label: 'Lab Reports', icon: FlaskConical },
  { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
  { id: 'notices', label: 'Hospital Notices', icon: Building2 },
];

export default function NotificationCenterScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const {
    notifications,
    unreadCount,
    markNotificationRead,
    markAllRead,
    deleteNotification,
    clearAllNotifications,
    refreshNotifications,
    isConnected,
  } = useSocket();

  const [activeTab, setActiveTab] = useState<NotificationCategory>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  /**
   * Categorize notification based on type string or message content
   */
  const getCategory = (notif: LiveNotification): NotificationCategory => {
    const type = (notif.type || '').toLowerCase();
    const msg = (notif.message || '').toLowerCase();

    if (
      type.includes('appointment') ||
      type.includes('queue') ||
      type.includes('booking') ||
      msg.includes('appointment') ||
      msg.includes('token') ||
      msg.includes('consultation') ||
      msg.includes('doctor')
    ) {
      return 'appointments';
    }

    if (
      type.includes('lab') ||
      type.includes('report') ||
      type.includes('test') ||
      msg.includes('lab') ||
      msg.includes('report') ||
      msg.includes('diagnostic') ||
      msg.includes('blood test')
    ) {
      return 'reports';
    }

    if (
      type.includes('prescription') ||
      type.includes('medicine') ||
      type.includes('drug') ||
      msg.includes('prescription') ||
      msg.includes('medication') ||
      msg.includes('dosage')
    ) {
      return 'prescriptions';
    }

    return 'notices';
  };

  /**
   * Filtered notifications based on active category tab
   */
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter((item) => getCategory(item) === activeTab);
  }, [notifications, activeTab]);

  /**
   * Visual metadata (Icon, background color, label) per notification
   */
  const getNotificationTheme = (notif: LiveNotification) => {
    const category = getCategory(notif);
    const type = (notif.type || '').toLowerCase();

    if (type.includes('emergency') || type.includes('sos')) {
      return {
        icon: ShieldAlert,
        color: '#DC2626',
        bg: '#FEF2F2',
        tag: 'EMERGENCY ALERT',
      };
    }

    switch (category) {
      case 'appointments':
        return {
          icon: Calendar,
          color: '#006AF5',
          bg: '#EFF6FF',
          tag: 'APPOINTMENT',
        };
      case 'reports':
        return {
          icon: FlaskConical,
          color: '#DC2626',
          bg: '#FEF2F2',
          tag: 'LAB REPORT',
        };
      case 'prescriptions':
        return {
          icon: Pill,
          color: '#7C3AED',
          bg: '#F5F3FF',
          tag: 'PRESCRIPTION',
        };
      case 'notices':
      default:
        return {
          icon: Building2,
          color: '#D97706',
          bg: '#FFFBEB',
          tag: 'HOSPITAL NOTICE',
        };
    }
  };

  /**
   * Formats timestamp into clean human-friendly relative or IST time
   */
  const formatNotificationTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;

      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  /**
   * Handle item click: mark as read and deep link to the relevant screen
   */
  const handleNotificationPress = async (item: LiveNotification) => {
    if (!item.isRead) {
      await markNotificationRead(item._id);
    }

    const category = getCategory(item);
    if (category === 'appointments') {
      if (item.type.includes('queue') || (item.message && item.message.toLowerCase().includes('token'))) {
        navigation.navigate('LiveQueue', { appointmentId: item.relatedId });
      } else {
        navigation.navigate('Appointments');
      }
    } else if (category === 'reports') {
      navigation.navigate('Reports');
    } else if (category === 'prescriptions') {
      navigation.navigate('MedicineReminder');
    }
  };

  /**
   * Confirm and clear all notifications
   */
  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to remove all notifications? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllNotifications();
          },
        },
      ]
    );
  };

  /**
   * Delete single notification with prompt
   */
  const handleDeleteItem = (id: string) => {
    Alert.alert('Remove Notification', 'Do you want to delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNotification(id);
        },
      },
    ]);
  };

  const renderNotificationItem = ({ item }: { item: LiveNotification }) => {
    const theme = getNotificationTheme(item);
    const IconComponent = theme.icon;
    const timeFormatted = formatNotificationTime(item.createdAt);

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Unread Accent Bar */}
        {!item.isRead && <View style={styles.unreadAccentBar} />}

        {/* Thematic Icon */}
        <View style={[styles.iconBox, { backgroundColor: theme.bg }]}>
          <IconComponent size={20} color={theme.color} />
        </View>

        {/* Content */}
        <View style={styles.contentWrap}>
          <View style={styles.tagRow}>
            <View style={[styles.tagBadge, { backgroundColor: theme.bg }]}>
              <SanctuaryText variant="label_sm" style={[styles.tagText, { color: theme.color }]}>
                {theme.tag}
              </SanctuaryText>
            </View>
            <View style={styles.timeWrap}>
              <Clock size={11} color="#94A3B8" style={{ marginRight: 4 }} />
              <SanctuaryText variant="label_sm" style={styles.timeText}>
                {timeFormatted}
              </SanctuaryText>
            </View>
          </View>

          <SanctuaryText
            variant="body_md"
            style={[styles.messageText, !item.isRead && styles.messageTextUnread]}
          >
            {item.message}
          </SanctuaryText>
        </View>

        {/* Right Action: Delete Button */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteItem(item._id)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Trash2 size={15} color="#94A3B8" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top App Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <View style={styles.titleRow}>
            <SanctuaryText variant="headline_sm" style={styles.screenTitle}>
              Notifications
            </SanctuaryText>
            {unreadCount > 0 && (
              <View style={styles.unreadPill}>
                <SanctuaryText variant="label_sm" style={styles.unreadPillText}>
                  {unreadCount} NEW
                </SanctuaryText>
              </View>
            )}
          </View>
          <View style={styles.liveSyncRow}>
            <View
              style={[
                styles.liveSyncDot,
                { backgroundColor: isConnected ? '#22C55E' : '#94A3B8' },
              ]}
            />
            <SanctuaryText variant="label_sm" style={styles.liveSyncText}>
              {isConnected ? 'Real-time connected' : 'Connecting...'}
            </SanctuaryText>
          </View>
        </View>

        {/* Header Action Buttons */}
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={markAllRead}
              accessibilityLabel="Mark all as read"
            >
              <CheckCheck size={18} color="#006AF5" />
            </TouchableOpacity>
          )}

          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={handleClearAll}
              accessibilityLabel="Clear all notifications"
            >
              <Trash2 size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Filter Tabs ── */}
      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORY_TABS}
          keyExtractor={(tab) => tab.id}
          contentContainerStyle={styles.tabsList}
          renderItem={({ item }) => {
            const isSelected = activeTab === item.id;
            const TabIcon = item.icon;
            const count =
              item.id === 'all'
                ? notifications.length
                : notifications.filter((n) => getCategory(n) === item.id).length;

            return (
              <TouchableOpacity
                style={[styles.tabPill, isSelected && styles.tabPillActive]}
                onPress={() => setActiveTab(item.id)}
                activeOpacity={0.8}
              >
                <TabIcon
                  size={14}
                  color={isSelected ? '#FFFFFF' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <SanctuaryText
                  variant="label_md"
                  style={[styles.tabLabel, isSelected && styles.tabLabelActive]}
                >
                  {item.label}
                </SanctuaryText>
                {count > 0 && (
                  <View
                    style={[
                      styles.tabCountBadge,
                      isSelected && styles.tabCountBadgeActive,
                    ]}
                  >
                    <SanctuaryText
                      variant="label_sm"
                      style={[
                        styles.tabCountText,
                        isSelected && styles.tabCountTextActive,
                      ]}
                    >
                      {count}
                    </SanctuaryText>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* ── Notification List ── */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item._id}
        renderItem={renderNotificationItem}
        contentContainerStyle={[
          styles.listContent,
          filteredNotifications.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#006AF5']}
            tintColor="#006AF5"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <CheckCircle2 size={40} color="#006AF5" />
            </View>
            <SanctuaryText variant="headline_sm" style={styles.emptyTitle}>
              You're all caught up!
            </SanctuaryText>
            <SanctuaryText variant="body_md" style={styles.emptySub}>
              {activeTab === 'all'
                ? 'No notifications yet. Any appointment reminders, doctor prescriptions, or lab results will appear right here.'
                : `No notifications in ${CATEGORY_TABS.find((t) => t.id === activeTab)?.label}.`}
            </SanctuaryText>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
    borderRadius: 8,
  },
  titleWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  screenTitle: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  unreadPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  unreadPillText: {
    color: '#006AF5',
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 0.4,
  },
  liveSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
    gap: 4,
  },
  liveSyncDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  liveSyncText: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Tabs */
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabsList: {
    paddingHorizontal: 14,
    gap: 6,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillActive: {
    backgroundColor: '#006AF5',
    borderColor: '#006AF5',
  },
  tabLabel: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 11,
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 4,
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabCountText: {
    color: '#475569',
    fontSize: 8.5,
    fontWeight: '800',
  },
  tabCountTextActive: {
    color: '#FFFFFF',
  },

  /* List */
  listContent: {
    padding: 12,
    paddingBottom: 30,
    gap: 8,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
    position: 'relative',
  },
  notifCardUnread: {
    backgroundColor: '#F8FAFF',
    borderColor: '#BFDBFE',
    shadowOpacity: 0.06,
  },
  unreadAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#006AF5',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentWrap: {
    flex: 1,
    paddingRight: 6,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  messageText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  messageTextUnread: {
    color: '#0F172A',
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 4,
    alignSelf: 'center',
  },

  /* Empty state */
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  emptyTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
  },
});
