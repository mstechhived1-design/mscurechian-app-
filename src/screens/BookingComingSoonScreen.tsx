import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { CalendarClock, Stethoscope, Bell, Clock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { SanctuaryText } from '../components/SanctuaryComponents';
import { COLORS } from '../constants/designSystem';
import { ChevronLeft } from 'lucide-react-native';

const FEATURES = [
  { icon: Stethoscope, label: 'Choose Your Specialist', sub: 'Browse verified doctors by speciality' },
  { icon: CalendarClock, label: 'Real-Time Availability', sub: 'See live slot calendars instantly' },
  { icon: Bell, label: 'Instant Confirmations', sub: 'SMS & push alerts on every booking' },
];

export default function BookingComingSoonScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <SanctuaryText variant="headline_sm" style={styles.headerTitle}>Book a Visit</SanctuaryText>
        <View style={{ width: 40 }} />
      </View>

      {/* Main */}
      <View style={styles.body}>

        {/* Icon */}
        <View style={styles.iconWrap}>
          <CalendarClock size={40} color={COLORS.primary} />
        </View>

        {/* Badge */}
        <View style={styles.badge}>
          <Clock size={11} color={COLORS.primary} />
          <SanctuaryText variant="label_sm" style={styles.badgeTxt}>COMING SOON</SanctuaryText>
        </View>

        <SanctuaryText variant="headline_sm" style={styles.title}>
          Smart Appointment Booking
        </SanctuaryText>
        <SanctuaryText variant="body_md" style={styles.subtitle}>
          We're building a seamless consultation booking experience. Schedule appointments with specialists across all your registered hospitals — from one place.
        </SanctuaryText>

        {/* Feature list */}
        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <f.icon size={18} color={COLORS.primary} />
              </View>
              <View style={styles.featureText}>
                <SanctuaryText variant="label_lg" style={styles.featureLabel}>{f.label}</SanctuaryText>
                <SanctuaryText variant="body_sm" style={styles.featureSub}>{f.sub}</SanctuaryText>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.backCta} onPress={() => navigation.goBack()}>
          <SanctuaryText variant="label_lg" style={styles.backCtaTxt}>← Back to Visits</SanctuaryText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: '#1E293B', fontWeight: '900', fontSize: 18 },

  body: {
    flex: 1,
    padding: 28,
    paddingTop: 40,
  },

  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#EAF1FF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EAF1FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeTxt: { color: COLORS.primary, fontWeight: '900', fontSize: 10, letterSpacing: 1 },

  title: { color: '#1E293B', fontWeight: '900', fontSize: 24, lineHeight: 32, marginBottom: 10 },
  subtitle: { color: '#64748B', fontSize: 14, lineHeight: 22, fontWeight: '500', marginBottom: 32 },

  featureList: { gap: 20, marginBottom: 40 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  featureIcon: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#EAF1FF',
    justifyContent: 'center', alignItems: 'center',
  },
  featureText: { flex: 1 },
  featureLabel: { color: '#1E293B', fontWeight: '800', fontSize: 14, marginBottom: 2 },
  featureSub: { color: '#94A3B8', fontSize: 12, fontWeight: '500' },

  backCta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backCtaTxt: { color: COLORS.primary, fontWeight: '900', fontSize: 14 },
});
