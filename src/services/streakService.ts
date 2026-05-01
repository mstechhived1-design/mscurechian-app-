import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAK_KEY = 'mscurechain_health_streak';
const LAST_ACTIVITY_KEY = 'mscurechain_last_activity_date';

export interface StreakData {
  currentStreak: number;
  lastActivityDate: string | null;
  bestStreak: number;
}

export const streakService = {
  /**
   * Get current streak data
   */
  async getStreakData(): Promise<StreakData> {
    try {
      const [streak, lastDate, best] = await Promise.all([
        AsyncStorage.getItem(STREAK_KEY),
        AsyncStorage.getItem(LAST_ACTIVITY_KEY),
        AsyncStorage.getItem('mscurechain_best_streak'),
      ]);

      return {
        currentStreak: streak ? parseInt(streak) : 0,
        lastActivityDate: lastDate,
        bestStreak: best ? parseInt(best) : 0,
      };
    } catch (e) {
      console.error('[StreakService] Error getting streak:', e);
      return { currentStreak: 0, lastActivityDate: null, bestStreak: 0 };
    }
  },

  /**
   * Record a new activity and update streak
   */
  async recordActivity(): Promise<StreakData> {
    try {
      const data = await this.getStreakData();
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (data.lastActivityDate === today) {
        // Already recorded today, no change
        return data;
      }

      let newStreak = 1;

      if (data.lastActivityDate) {
        const lastDate = new Date(data.lastActivityDate);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (data.lastActivityDate === yesterdayStr) {
          // Continued from yesterday
          newStreak = data.currentStreak + 1;
        } else {
          // Gap in activity, reset to 1
          newStreak = 1;
        }
      }

      const newBest = Math.max(newStreak, data.bestStreak);

      await Promise.all([
        AsyncStorage.setItem(STREAK_KEY, newStreak.toString()),
        AsyncStorage.setItem(LAST_ACTIVITY_KEY, today),
        AsyncStorage.setItem('mscurechain_best_streak', newBest.toString()),
      ]);

      return {
        currentStreak: newStreak,
        lastActivityDate: today,
        bestStreak: newBest,
      };
    } catch (e) {
      console.error('[StreakService] Error recording activity:', e);
      return { currentStreak: 0, lastActivityDate: null, bestStreak: 0 };
    }
  }
};
