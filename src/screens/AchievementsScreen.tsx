import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  ArrowLeft, 
  Flame, 
  Trophy, 
  Calendar, 
  Star, 
  Zap, 
  Heart,
  Target
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SanctuaryText } from '../components/SanctuaryComponents';
import { COLORS } from '../constants/designSystem';
import { streakService, StreakData } from '../services/streakService';

const { width } = Dimensions.get('window');

export default function AchievementsScreen() {
  const navigation = useNavigation();
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    lastActivityDate: null,
    bestStreak: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await streakService.getStreakData();
    setStreakData(data);
  };

  const BADGES = [
    { id: 1, title: 'Starter', desc: '3 Day Streak', icon: <Star size={24} color="#FBBF24" />, unlocked: streakData.bestStreak >= 3 },
    { id: 2, title: 'Consistent', desc: '7 Day Streak', icon: <Zap size={24} color="#6366F1" />, unlocked: streakData.bestStreak >= 7 },
    { id: 3, title: 'Warrior', desc: '15 Day Streak', icon: <Trophy size={24} color="#10B981" />, unlocked: streakData.bestStreak >= 15 },
    { id: 4, title: 'Master', desc: '30 Day Streak', icon: <Flame size={24} color="#EF4444" />, unlocked: streakData.bestStreak >= 30 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={COLORS.on_surface} size={24} />
        </TouchableOpacity>
        <SanctuaryText variant="headline_sm">My Achievements</SanctuaryText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Streak Card */}
        <LinearGradient
          colors={['#FF5F6D', '#FFC371']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mainStreakCard}
        >
          <View style={styles.streakHeader}>
            <View style={styles.flameCircle}>
              <Flame size={40} color="#FFF" fill="#FFF" />
            </View>
            <View>
              <SanctuaryText variant="display_sm" style={styles.streakCount}>{streakData.currentStreak}</SanctuaryText>
              <SanctuaryText variant="label_lg" style={styles.streakLabel}>Day Streak</SanctuaryText>
            </View>
          </View>
          
          <View style={styles.streakMeta}>
            <View style={styles.metaItem}>
              <Trophy size={16} color="rgba(255,255,255,0.7)" />
              <SanctuaryText variant="label_sm" style={styles.metaTxt}>Best: {streakData.bestStreak} Days</SanctuaryText>
            </View>
            <View style={styles.metaItem}>
              <Calendar size={16} color="rgba(255,255,255,0.7)" />
              <SanctuaryText variant="label_sm" style={styles.metaTxt}>Last Active: {streakData.lastActivityDate || 'Never'}</SanctuaryText>
            </View>
          </View>
        </LinearGradient>

        {/* Badges Section */}
        <View style={styles.section}>
          <SanctuaryText variant="title_lg" style={styles.sectionTitle}>Milestones</SanctuaryText>
          <View style={styles.badgeGrid}>
            {BADGES.map((badge) => (
              <View key={badge.id} style={[styles.badgeCard, !badge.unlocked && styles.lockedBadge]}>
                <View style={[styles.badgeIcon, { backgroundColor: badge.unlocked ? '#F8FAFC' : '#F1F5F9' }]}>
                  {React.cloneElement(badge.icon as React.ReactElement, { 
                    color: badge.unlocked ? (badge.icon as any).props.color : '#94A3B8' 
                  })}
                </View>
                <SanctuaryText variant="label_lg" style={[styles.badgeTitle, !badge.unlocked && styles.lockedTxt]}>
                  {badge.title}
                </SanctuaryText>
                <SanctuaryText variant="body_sm" style={styles.badgeDesc}>{badge.desc}</SanctuaryText>
              </View>
            ))}
          </View>
        </View>

        {/* Weekly Progress Simulation */}
        <View style={styles.section}>
          <SanctuaryText variant="title_lg" style={styles.sectionTitle}>Weekly Consistency</SanctuaryText>
          <View style={styles.weekCard}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <View key={i} style={styles.dayCol}>
                <View style={[styles.dayCircle, i < 5 ? styles.activeDay : styles.inactiveDay]}>
                  {i < 5 && <Zap size={14} color="#FFF" />}
                </View>
                <SanctuaryText variant="label_sm" style={styles.dayLabel}>{day}</SanctuaryText>
              </View>
            ))}
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.insightCard}>
          <Target size={20} color={COLORS.primary} />
          <View style={styles.insightContent}>
            <SanctuaryText variant="label_lg" style={styles.insightTitle}>How to maintain your streak?</SanctuaryText>
            <SanctuaryText variant="body_sm" style={styles.insightBody}>
              Log your vitals or check your BMI every morning to keep your streak alive and unlock new badges!
            </SanctuaryText>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  scrollContent: {
    padding: 20,
  },
  mainStreakCard: {
    borderRadius: 28,
    padding: 24,
    marginBottom: 30,
    elevation: 8,
    shadowColor: '#FF5F6D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
  },
  flameCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakCount: {
    color: '#FFF',
    fontWeight: '900',
    lineHeight: 48,
  },
  streakLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
  },
  streakMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaTxt: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#1E293B',
    fontWeight: '900',
    marginBottom: 16,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeTitle: {
    color: '#1E293B',
    fontWeight: '800',
    marginBottom: 4,
  },
  badgeDesc: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 11,
  },
  lockedBadge: {
    opacity: 0.6,
    backgroundColor: '#F8FAFC',
  },
  lockedTxt: {
    color: '#94A3B8',
  },
  weekCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 8,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDay: {
    backgroundColor: COLORS.primary,
  },
  inactiveDay: {
    backgroundColor: '#E2E8F0',
  },
  dayLabel: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 10,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#EAF1FF',
    padding: 20,
    borderRadius: 24,
    gap: 16,
    marginBottom: 40,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    color: COLORS.primary,
    fontWeight: '900',
    marginBottom: 4,
  },
  insightBody: {
    color: '#1E3A8A',
    fontWeight: '600',
    lineHeight: 20,
  },
});
