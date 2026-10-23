import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { SanctuaryText } from './SanctuaryComponents';

export interface ServiceItemConfig {
  id: string;
  label: string;
  sub: string;
  icon?: any;
  imageSource?: any;
  route: string;
  category: 'clinical' | 'tracker' | 'smart' | 'safety';
  gradient: [string, string];
  iconColor: string;
  badge?: string;
}

interface AnimatedServiceIconProps {
  item: ServiceItemConfig;
  onPress: () => void;
}

export default function AnimatedServiceIcon({ item, onPress }: AnimatedServiceIconProps) {
  const IconComponent = item.icon;

  // Touch press spring animation
  const pressScale = useRef(new Animated.Value(1)).current;

  // Dedicated micro-animation driving continuous movement
  const microAnim = useRef(new Animated.Value(0)).current;

  // Badge micro-pulse animation
  const badgeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;
    let badgeLoop: Animated.CompositeAnimation | null = null;

    // Start badge pulse if badge exists
    if (item.badge) {
      badgeLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(badgeAnim, {
            toValue: 1,
            duration: item.badge === 'SOS' || item.badge === 'LIVE' ? 700 : 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(badgeAnim, {
            toValue: 0,
            duration: item.badge === 'SOS' || item.badge === 'LIVE' ? 700 : 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      badgeLoop.start();
    }

    // Specialized unique micro-animation for EVERY service item
    switch (item.id) {
      case 'app':
        // Visit: Gentle appointment calendar floating nod
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 1300,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 1300,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'queue':
        // Live Queue: Calling ticket pulse and radar pass
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 350,
              easing: Easing.out(Easing.back(1.5)),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 450,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.delay(1000),
          ])
        );
        break;

      case 'rec':
        // Records: Medical folder page peek sway
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 1400,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: -1,
              duration: 1400,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 800,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'pay':
        // Billing: Gold credit card floating elevation & shine
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 1200,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 1200,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'vit':
        // Vitals: Realistic double-beat cardiac ECG heartbeat
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 130,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0.2,
              duration: 110,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0.8,
              duration: 130,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 180,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.delay(1200),
          ])
        );
        break;

      case 'bmi':
        // BMI Index: Weight scale balancing needle wobble
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 1100,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: -1,
              duration: 1100,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 800,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'diet':
        // Diet: Fresh nutrition bowl buoyant float
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 1150,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 1150,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'water':
        // Water Tracker: Hydrating buoyant water wave bobbing
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 1000,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'ai':
        // AI Symptoms: Holographic neural levitation & glow
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 1400,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 1400,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'med':
        // Medicines: Pill pack & bottle gentle tilt
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 1200,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: -1,
              duration: 1200,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'emid':
        // Emergency ID: Urgent flashing siren beacon pulse
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 450,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 450,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ])
        );
        break;

      case 'vault':
        // Emergency Vault: Heavy safe combination lock click & pulse
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.out(Easing.back(1.4)),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 800,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.delay(1200),
          ])
        );
        break;

      case 'fam':
        // Family Profiles: Loving family pulse & warm float
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 1250,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 1250,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );
        break;

      default:
        // Generic fallback subtle breathing for any future items
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(microAnim, {
              toValue: 1,
              duration: 1200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(microAnim, {
              toValue: 0,
              duration: 1200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        break;
    }

    if (animLoop) {
      animLoop.start();
    }

    return () => {
      if (animLoop) {
        animLoop.stop();
      }
      if (badgeLoop) {
        badgeLoop.stop();
      }
    };
  }, [item.id, item.badge]);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.88,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  // Compute transform for each item
  let animatedIconTransform: any[] = [];

  switch (item.id) {
    case 'app': {
      // Float up -3px with subtle tilt
      const translateY = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -3],
      });
      const rotate = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '2.5deg'],
      });
      animatedIconTransform = [{ translateY }, { rotate }];
      break;
    }

    case 'queue': {
      // Pulse scale 1 -> 1.10 with slight bounce
      const scale = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.10],
      });
      const rotate = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-3deg'],
      });
      animatedIconTransform = [{ scale }, { rotate }];
      break;
    }

    case 'rec': {
      // Dossier sway -3.5deg to 3.5deg
      const rotate = microAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-3.5deg', '0deg', '3.5deg'],
      });
      const translateY = microAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [-1.5, 0, -1.5],
      });
      animatedIconTransform = [{ rotate }, { translateY }];
      break;
    }

    case 'pay': {
      // Float up -3px and scale 1.05
      const translateY = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -3],
      });
      const scale = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.05],
      });
      animatedIconTransform = [{ translateY }, { scale }];
      break;
    }

    case 'vit': {
      // Cardiac ECG pulse
      const scale = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.15],
      });
      animatedIconTransform = [{ scale }];
      break;
    }

    case 'bmi': {
      // Needle balance tilt -4deg to 4deg
      const rotate = microAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-4deg', '0deg', '4deg'],
      });
      const scale = microAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [1.03, 1, 1.03],
      });
      animatedIconTransform = [{ rotate }, { scale }];
      break;
    }

    case 'diet': {
      // Nutrition bowl float
      const translateY = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -3],
      });
      const rotate = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '2deg'],
      });
      animatedIconTransform = [{ translateY }, { rotate }];
      break;
    }

    case 'water': {
      // Water buoyant wave bobbing
      const translateY = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -3.5],
      });
      const rotate = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-2.5deg'],
      });
      animatedIconTransform = [{ translateY }, { rotate }];
      break;
    }

    case 'ai': {
      // Holographic AI levitation & breathing
      const translateY = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -4],
      });
      const scale = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.08],
      });
      animatedIconTransform = [{ translateY }, { scale }];
      break;
    }

    case 'med': {
      // Medicines bottle tilt
      const rotate = microAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['-5deg', '0deg', '5deg'],
      });
      const translateY = microAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [-1.5, 0, -1.5],
      });
      animatedIconTransform = [{ rotate }, { translateY }];
      break;
    }

    case 'emid': {
      // Flashing siren scale 1 -> 1.12
      const scale = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.12],
      });
      animatedIconTransform = [{ scale }];
      break;
    }

    case 'vault': {
      // Vault safe lock nudge
      const scale = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.07],
      });
      const rotate = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '3deg'],
      });
      animatedIconTransform = [{ scale }, { rotate }];
      break;
    }

    case 'fam': {
      // Family heart pulse
      const scale = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.08],
      });
      const translateY = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -2],
      });
      animatedIconTransform = [{ scale }, { translateY }];
      break;
    }

    default: {
      const scale = microAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.06],
      });
      animatedIconTransform = [{ scale }];
      break;
    }
  }

  // Badge pulse transform
  const badgeScale = badgeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.14],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.colItem}
    >
      <Animated.View style={[styles.tileCard, { transform: [{ scale: pressScale }] }]}>
        <Animated.View style={[styles.iconInnerWrap, { transform: animatedIconTransform }]}>
          {item.imageSource ? (
            <Image
              source={item.imageSource}
              style={styles.imageIcon}
              resizeMode="contain"
            />
          ) : IconComponent ? (
            <IconComponent size={38} color={item.iconColor} />
          ) : null}
        </Animated.View>

        {/* Animated Category Mini Badge (e.g. LIVE, ECG, AI, SOS) */}
        {item.badge && (
          <Animated.View
            style={[
              styles.badgeWrap,
              { transform: [{ scale: badgeScale }] },
              item.badge === 'SOS' || item.badge === 'LIVE'
                ? { backgroundColor: '#EF4444' }
                : item.badge === 'ECG'
                ? { backgroundColor: '#059669' }
                : { backgroundColor: '#7C3AED' },
            ]}
          >
            <SanctuaryText variant="body_xs" style={styles.badgeText}>
              {item.badge}
            </SanctuaryText>
          </Animated.View>
        )}
      </Animated.View>

      <SanctuaryText variant="body_xs" style={styles.colLabel} numberOfLines={2}>
        {item.label}
      </SanctuaryText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  colItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  tileCard: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    // PhonePe style clean border & elevation
    borderWidth: 1,
    borderColor: '#EDF2F7',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
  },
  iconInnerWrap: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  colLabel: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 10.5,
    textAlign: 'center',
    lineHeight: 13,
    paddingHorizontal: 1,
  },
  badgeWrap: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
