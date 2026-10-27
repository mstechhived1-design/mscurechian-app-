import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Building2, Stethoscope, HeartPulse, ShieldCheck } from 'lucide-react-native';
import { SanctuaryText } from '@/components/SanctuaryComponents';
import { COLORS } from '@/constants/designSystem';

interface AttractiveDiscoveryLoaderProps {
  type?: 'hospitals' | 'doctors';
  title?: string;
  subtitle?: string;
}

export const AttractiveDiscoveryLoader: React.FC<AttractiveDiscoveryLoaderProps> = ({
  type = 'hospitals',
  title,
  subtitle,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0.8)).current;
  const rippleOpacity = useRef(new Animated.Value(0.7)).current;
  const shimmerAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    // Pulse animation for central emblem
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Expanding soft concentric ripple
    const rippleLoop = Animated.loop(
      Animated.parallel([
        Animated.timing(rippleAnim, {
          toValue: 1.45,
          duration: 2000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(rippleOpacity, {
            toValue: 0.1,
            duration: 1600,
            useNativeDriver: true,
          }),
          Animated.timing(rippleOpacity, {
            toValue: 0.7,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // Shimmer for skeleton card placeholders
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.85,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    rippleLoop.start();
    shimmerLoop.start();

    return () => {
      pulseLoop.stop();
      rippleLoop.stop();
      shimmerLoop.stop();
    };
  }, [pulseAnim, rippleAnim, rippleOpacity, shimmerAnim]);

  const defaultTitle =
    type === 'hospitals'
      ? 'Finding Trusted Hospitals'
      : 'Finding Specialist Doctors';

  const defaultSubtitle =
    type === 'hospitals'
      ? 'Loading your hospitals and doctors to book appointment for your favorite hospital...'
      : 'Loading your doctors and available consultation schedules...';

  return (
    <View style={styles.container}>
      {/* Central Animated Medical Emblem */}
      <View style={styles.emblemWrapper}>
        <Animated.View
          style={[
            styles.rippleRing,
            {
              transform: [{ scale: rippleAnim }],
              opacity: rippleOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.emblemCircle,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {type === 'hospitals' ? (
            <Building2 size={32} color="#FFFFFF" strokeWidth={2.2} />
          ) : (
            <Stethoscope size={32} color="#FFFFFF" strokeWidth={2.2} />
          )}
        </Animated.View>
      </View>

      {/* Warm Reassuring Messages (Strictly No Emojis, No Tech Words) */}
      <View style={styles.textContainer}>
        <SanctuaryText variant="headline_sm" style={styles.titleText}>
          {title || defaultTitle}
        </SanctuaryText>

        <SanctuaryText variant="body_md" style={styles.subtitleText}>
          {subtitle || defaultSubtitle}
        </SanctuaryText>

        <View style={styles.badgeRow}>
          <ShieldCheck size={14} color="#059669" />
          <SanctuaryText variant="label_sm" style={styles.badgeText}>
            Verified Medical Care • Real-Time Availability
          </SanctuaryText>
        </View>
      </View>

      {/* Shimmering Skeleton Card Previews */}
      <View style={styles.skeletonContainer}>
        {[1, 2].map((item) => (
          <Animated.View
            key={item}
            style={[styles.skeletonCard, { opacity: shimmerAnim }]}
          >
            <View style={styles.skeletonPhoto} />
            <View style={styles.skeletonInfo}>
              <View style={[styles.skeletonBar, { width: '80%', height: 16 }]} />
              <View style={[styles.skeletonBar, { width: '55%', height: 12, marginTop: 8 }]} />
              <View style={[styles.skeletonBar, { width: '92%', height: 11, marginTop: 10 }]} />
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemWrapper: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  rippleRing: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#DBEAFE',
  },
  emblemCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 26,
  },
  titleText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleText: {
    color: '#475569',
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '700',
  },
  skeletonContainer: {
    width: '100%',
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  skeletonPhoto: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  skeletonInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  skeletonBar: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
  },
});
