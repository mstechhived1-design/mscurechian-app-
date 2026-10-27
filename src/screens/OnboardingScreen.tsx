import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Pressable,
  Image,
  Easing,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ArrowRight, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react-native';

import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/designSystem';
import { setOnboardingCompleted } from '@/services/onboardingService';

import ConnectedEcosystemSvg from '@/components/onboarding/ConnectedEcosystemSvg';
import DoctorBookingSvg from '@/components/onboarding/DoctorBookingSvg';
import MedicalRecordsSvg from '@/components/onboarding/MedicalRecordsSvg';
import ConnectedCareSvg from '@/components/onboarding/ConnectedCareSvg';

interface OnboardingCardItem {
  id: string;
  headline: string;
  description: string;
  badge: string;
  component: (props: { width: number; height: number }) => React.ReactElement;
}

const ONBOARDING_CARDS: OnboardingCardItem[] = [
  {
    id: 'card-1',
    headline: 'Your Healthcare, Connected',
    description: 'One platform for your healthcare journey.',
    badge: 'HEALTHCARE ECOSYSTEM',
    component: (props) => <ConnectedEcosystemSvg {...props} />,
  },
  {
    id: 'card-2',
    headline: 'The Right Doctor, Within Reach',
    description: 'Discover hospitals, explore doctors and book appointments with ease.',
    badge: 'DOCTOR DISCOVERY & BOOKING',
    component: (props) => <DoctorBookingSvg {...props} />,
  },
  {
    id: 'card-3',
    headline: 'Your Health Records, Organized',
    description: 'Access your medical reports, prescriptions and visit history in one place.',
    badge: 'DIGITAL MEDICAL VAULT',
    component: (props) => <MedicalRecordsSvg {...props} />,
  },
  {
    id: 'card-4',
    headline: 'Connected Care for Every Visit',
    description: 'Stay connected with your healthcare providers and manage your healthcare journey.',
    badge: 'CONTINUOUS PATIENT CARE',
    component: (props) => <ConnectedCareSvg {...props} />,
  },
];

export default function OnboardingScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<any>(null);
  const isNavigatingRef = useRef(false);

  // Entrance animation values
  const entranceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth 600ms entrance animation
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entranceAnim]);

  // Handle completion (either by Skip or Get Started)
  const handleComplete = useCallback(async () => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    try {
      await setOnboardingCompleted();
    } catch (e) {
      console.warn('[Onboarding] Error persisting completion flag:', e);
    }

    // Reset navigation so Onboarding is discarded from stack history
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }, [navigation]);

  // Handle Next button press
  const handleNext = useCallback(() => {
    if (activeIndex < ONBOARDING_CARDS.length - 1) {
      const nextIndex = activeIndex + 1;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setActiveIndex(nextIndex);
    } else {
      handleComplete();
    }
  }, [activeIndex, handleComplete]);

  // Sync activeIndex on momentum scroll end
  const onMomentumScrollEnd = useCallback(
    (e: any) => {
      const contentOffsetX = e.nativeEvent.contentOffset.x;
      const newIndex = Math.round(contentOffsetX / screenWidth);
      if (newIndex >= 0 && newIndex < ONBOARDING_CARDS.length) {
        setActiveIndex(newIndex);
      }
    },
    [screenWidth]
  );

  // Responsive hero dimensions
  const heroWidth = Math.min(screenWidth - 32, 340);
  const heroHeight = Math.min(screenHeight * 0.38, 280);

  // Entrance interpolations
  const entranceOpacity = entranceAnim;
  const entranceScale = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });
  const entranceTranslateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });

  // Skip button opacity: visible on cards 0, 1, 2; fades out on card 3
  const skipOpacity = scrollX.interpolate({
    inputRange: [screenWidth * 1.8, screenWidth * 2.8, screenWidth * 3],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  const renderCardItem = ({ item, index }: { item: OnboardingCardItem; index: number }) => {
    // Subtle parallax effect on card content during horizontal swipe
    const inputRange = [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth];

    const visualTranslateX = scrollX.interpolate({
      inputRange,
      outputRange: [screenWidth * 0.18, 0, -screenWidth * 0.18],
      extrapolate: 'clamp',
    });

    const textTranslateX = scrollX.interpolate({
      inputRange,
      outputRange: [screenWidth * 0.1, 0, -screenWidth * 0.1],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.cardContainer, { width: screenWidth }]}>
        {/* Animated Hero SVG Visual Container */}
        <Animated.View
          style={[
            styles.heroVisualWrapper,
            {
              width: heroWidth,
              height: heroHeight,
              transform: [{ translateX: visualTranslateX }],
            },
          ]}
        >
          {item.component({ width: heroWidth, height: heroHeight })}
        </Animated.View>

        {/* Text & Typography Container */}
        <Animated.View
          style={[
            styles.textSection,
            {
              transform: [{ translateX: textTranslateX }],
            },
          ]}
        >
          {/* Subtle Category Badge */}
          <View style={styles.badgeContainer}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>

          {/* Headline */}
          <Text style={styles.headlineText} numberOfLines={2} adjustsFontSizeToFit>
            {item.headline}
          </Text>

          {/* Description */}
          <Text style={styles.descriptionText}>{item.description}</Text>
        </Animated.View>
      </View>
    );
  };

  const isLastCard = activeIndex === ONBOARDING_CARDS.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Soft Healthcare Ambient Gradient Background ── */}
      <LinearGradient
        colors={['#EFF6FF', '#E0F2FE', '#F8FAFC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative subtle ambient backdrop glows */}
      <View style={styles.ambientGlowTopRight} pointerEvents="none" />
      <View style={styles.ambientGlowBottomLeft} pointerEvents="none" />

      {/* ── Header: MS CureChain Logo & Skip Button ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../../assets/image.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
          <View style={styles.brandTextCol}>
            <Text style={styles.brandTitle}>MS CureChain</Text>
            <Text style={styles.brandSubtitle}>Patient Portal</Text>
          </View>
        </View>

        {/* Skip Action on the first 3 cards */}
        <Animated.View
          style={{ opacity: skipOpacity }}
          pointerEvents={isLastCard ? 'none' : 'auto'}
        >
          <TouchableOpacity
            onPress={handleComplete}
            activeOpacity={0.7}
            style={styles.skipButton}
            accessibilityLabel="Skip onboarding"
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>Skip</Text>
            <ChevronRight size={14} color="#64748B" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ── Main Carousel with Smooth Initial Entrance ── */}
      <Animated.View
        style={[
          styles.carouselWrapper,
          {
            opacity: entranceOpacity,
            transform: [{ scale: entranceScale }, { translateY: entranceTranslateY }],
          },
        ]}
      >
        <Animated.FlatList
          ref={flatListRef}
          data={ONBOARDING_CARDS}
          keyExtractor={(item) => item.id}
          renderItem={renderCardItem}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={styles.flatList}
        />
      </Animated.View>

      {/* ── Bottom Controls: Pagination & Navigation CTA ── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Animated Expanding Pill Pagination Indicators (100% Native Driver Compatible) */}
        <View style={styles.paginationRow}>
          {ONBOARDING_CARDS.map((_, i) => {
            const inputRange = [(i - 1) * screenWidth, i * screenWidth, (i + 1) * screenWidth];

            const dotScaleX = scrollX.interpolate({
              inputRange,
              outputRange: [0.33, 1, 0.33],
              extrapolate: 'clamp',
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0, 1, 0],
              extrapolate: 'clamp',
            });

            return (
              <View key={`indicator-slot-${i}`} style={styles.dotSlot}>
                {/* Inactive Dot Base */}
                <View style={styles.inactiveDot} />
                {/* Active Expanding Pill (animates via scaleX & opacity on native UI thread) */}
                <Animated.View
                  style={[
                    styles.activePill,
                    {
                      opacity: dotOpacity,
                      transform: [{ scaleX: dotScaleX }],
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* Action Button: Next (Cards 1–3) -> Get Started (Card 4) */}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.ctaButton,
            isLastCard ? styles.ctaButtonLast : styles.ctaButtonNext,
            pressed && styles.ctaButtonPressed,
          ]}
          accessibilityLabel={isLastCard ? 'Get Started' : 'Next page'}
          accessibilityRole="button"
        >
          <Text style={styles.ctaButtonText}>{isLastCard ? 'Get Started' : 'Next'}</Text>
          {isLastCard ? (
            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} style={styles.ctaIcon} />
          ) : (
            <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} style={styles.ctaIcon} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    position: 'relative',
  },
  ambientGlowTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
  },
  ambientGlowBottomLeft: {
    position: 'absolute',
    bottom: 60,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
    zIndex: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#005AB5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  brandLogo: {
    width: 30,
    height: 30,
  },
  brandTextCol: {
    marginLeft: 10,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#005AB5',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_600SemiBold',
    marginTop: -1,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(203, 213, 225, 0.6)',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_600SemiBold',
  },
  carouselWrapper: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroVisualWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  textSection: {
    alignItems: 'center',
    maxWidth: 340,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 90, 181, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#005AB5',
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#005AB5',
    letterSpacing: 0.8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
  headlineText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 31,
    marginBottom: 10,
    letterSpacing: -0.4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Manrope_800ExtraBold',
  },
  descriptionText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_400Regular',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.6)',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotSlot: {
    width: 26,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  inactiveDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  activePill: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 22,
    shadowColor: '#005AB5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonNext: {
    backgroundColor: COLORS.primary,
    minWidth: 110,
  },
  ctaButtonLast: {
    backgroundColor: '#005AB5',
    minWidth: 145,
  },
  ctaButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
  ctaIcon: {
    marginLeft: 6,
  },
});
