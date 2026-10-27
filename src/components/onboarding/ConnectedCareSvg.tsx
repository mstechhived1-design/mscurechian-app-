import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
  Circle,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

interface Props {
  width: number;
  height: number;
}

export default function ConnectedCareSvg({ width, height }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const heartScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle floating translation for the central care scene
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -7,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Heartbeat rhythmic pulse
    const heartLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartScaleAnim, {
          toValue: 1.15,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartScaleAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartScaleAnim, {
          toValue: 1.1,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartScaleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(600),
      ])
    );

    floatLoop.start();
    heartLoop.start();

    return () => {
      floatLoop.stop();
      heartLoop.stop();
    };
  }, [floatAnim, heartScaleAnim]);

  return (
    <View style={[styles.container, { width, height }]}>
      <Animated.View
        style={[
          styles.animatedCard,
          {
            transform: [{ translateY: floatAnim }],
          },
        ]}
      >
        <Svg width={width} height={height} viewBox="0 0 340 280">
          <Defs>
            {/* Ambient Radial Platform Shadow */}
            <RadialGradient id="careShadow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#005AB5" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#005AB5" stopOpacity="0" />
            </RadialGradient>

            {/* Central Heart Shield Glow */}
            <RadialGradient id="heartGlow" cx="50%" cy="40%" r="60%">
              <Stop offset="0%" stopColor="#E0F2FE" stopOpacity="0.8" />
              <Stop offset="70%" stopColor="#BAE6FD" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>

            {/* Doctor Avatar Gradient */}
            <RadialGradient id="docGrad" cx="35%" cy="30%" r="65%">
              <Stop offset="0%" stopColor="#38BDF8" />
              <Stop offset="50%" stopColor="#0284C7" />
              <Stop offset="100%" stopColor="#0369A1" />
            </RadialGradient>

            {/* Patient Avatar Gradient */}
            <RadialGradient id="patGrad" cx="35%" cy="30%" r="65%">
              <Stop offset="0%" stopColor="#34D399" />
              <Stop offset="50%" stopColor="#10B981" />
              <Stop offset="100%" stopColor="#047857" />
            </RadialGradient>

            {/* Family Child Avatar Gradient */}
            <RadialGradient id="childGrad" cx="35%" cy="30%" r="65%">
              <Stop offset="0%" stopColor="#F472B6" />
              <Stop offset="50%" stopColor="#EC4899" />
              <Stop offset="100%" stopColor="#BE185D" />
            </RadialGradient>

            {/* Heart Vitals Red Gradient */}
            <LinearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#EF4444" />
              <Stop offset="100%" stopColor="#DC2626" />
            </LinearGradient>

            {/* Connecting Telemetry Ribbon */}
            <LinearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#005AB5" stopOpacity="0.6" />
              <Stop offset="50%" stopColor="#10B981" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#EC4899" stopOpacity="0.6" />
            </LinearGradient>
          </Defs>

          {/* Platform Shadow */}
          <Circle cx="170" cy="250" r="95" fill="url(#careShadow)" />

          {/* Central Protective Care Aura Circle */}
          <Circle cx="170" cy="130" r="80" fill="url(#heartGlow)" />
          <Circle cx="170" cy="130" r="80" stroke="#BAE6FD" strokeWidth="1.5" strokeDasharray="5 5" fill="none" />

          {/* ── Interconnected Care Conduit Ribbon ── */}
          <Path
            d="M 105 130 C 130 90, 210 90, 235 130 C 210 170, 130 170, 105 130 Z"
            stroke="url(#ribbonGrad)"
            strokeWidth="2"
            fill="none"
          />

          {/* ── Central Avatars Triad (Doctor, Patient, Family) ── */}

          {/* Avatar 1: Doctor (Left) */}
          <G transform="translate(80, 100)">
            <Circle cx="26" cy="26" r="26" fill="#FFFFFF" stroke="#38BDF8" strokeWidth="2" />
            <Circle cx="26" cy="26" r="22" fill="url(#docGrad)" />
            {/* Doctor Head & Lab Coat */}
            <Circle cx="26" cy="20" r="6" fill="#FFFFFF" />
            <Path d="M 16 35 C 16 28, 36 28, 36 35 Z" fill="#FFFFFF" />
            {/* Stethoscope */}
            <Path d="M 23 23 C 23 28, 29 28, 29 23" stroke="#BAE6FD" strokeWidth="1.5" fill="none" />
          </G>

          {/* Avatar 2: Patient (Right) */}
          <G transform="translate(208, 100)">
            <Circle cx="26" cy="26" r="26" fill="#FFFFFF" stroke="#34D399" strokeWidth="2" />
            <Circle cx="26" cy="26" r="22" fill="url(#patGrad)" />
            {/* Patient Head & Torso */}
            <Circle cx="26" cy="20" r="6" fill="#FFFFFF" />
            <Path d="M 16 35 C 16 28, 36 28, 36 35 Z" fill="#FFFFFF" />
            {/* Smile / Health Heart */}
            <Circle cx="26" cy="26" r="1.5" fill="#FFFFFF" />
          </G>

          {/* Avatar 3: Family Dependent (Center Bottom) */}
          <G transform="translate(148, 140)">
            <Circle cx="22" cy="22" r="22" fill="#FFFFFF" stroke="#F472B6" strokeWidth="2" />
            <Circle cx="22" cy="22" r="18" fill="url(#childGrad)" />
            <Circle cx="22" cy="17" r="5" fill="#FFFFFF" />
            <Path d="M 14 30 C 14 24, 30 24, 30 30 Z" fill="#FFFFFF" />
          </G>

          {/* Central Heart Shield Emblem */}
          <G transform="translate(156, 100)">
            <Circle cx="14" cy="14" r="14" fill="#FFFFFF" stroke="#FEE2E2" strokeWidth="1.5" />
            <Path
              d="M 14 8 C 11.5 5, 7 6.5 7 10.5 C 7 14.5 14 19 14 19 C 14 19 21 14.5 21 10.5 C 21 6.5 16.5 5 14 8 Z"
              fill="url(#heartGrad)"
            />
          </G>

          {/* ── Floating Real-Time Care Card 1: Vitals (Top-Left) ── */}
          <G transform="translate(25, 30)">
            <Rect x="0" y="0" width="120" height="38" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.2" />
            {/* Heart Icon with pulse wave */}
            <Circle cx="20" cy="19" r="11" fill="#FEE2E2" />
            <Path
              d="M 20 15 C 18.5 13, 16 14, 16 16 C 16 18.5 20 21.5 20 21.5 C 20 21.5 24 18.5 24 16 C 24 14 21.5 13 20 15 Z"
              fill="#EF4444"
            />
            <SvgText x="38" y="17" fill="#0F172A" fontSize="11" fontWeight="800">
              72 BPM
            </SvgText>
            <SvgText x="38" y="28" fill="#16A34A" fontSize="8" fontWeight="600">
              Vitals Normal • Live
            </SvgText>
          </G>

          {/* ── Floating Care Card 2: Doctor Live Consultation Message (Top-Right) ── */}
          <G transform="translate(195, 30)">
            <Rect x="0" y="0" width="128" height="42" rx="10" fill="#005AB5" />
            <Circle cx="16" cy="16" r="4" fill="#34D399" />
            <SvgText x="26" y="16" fill="#FFFFFF" fontSize="8" fontWeight="700">
              Dr. Ramesh • Active
            </SvgText>
            <SvgText x="12" y="30" fill="#E0F2FE" fontSize="8" fontWeight="500">
              "Your recovery is on track!"
            </SvgText>
            {/* Speech bubble tail */}
            <Path d="M 30 42 L 35 48 L 42 42 Z" fill="#005AB5" />
          </G>

          {/* ── Floating Care Card 3: Next Visit Reminder (Bottom-Center) ── */}
          <G transform="translate(90, 215)">
            <Rect x="0" y="0" width="160" height="30" rx="15" fill="#FFFFFF" stroke="#005AB5" strokeWidth="1.5" />
            <Circle cx="16" cy="15" r="5" fill="#005AB5" />
            {/* Checkmark in circle */}
            <Path d="M 14 15 L 15.5 17 L 18.5 13" stroke="#FFFFFF" strokeWidth="1.2" fill="none" />
            <SvgText x="88" y="19" fill="#005AB5" fontSize="9" fontWeight="700" textAnchor="middle">
              Continuous Care Network ✓
            </SvgText>
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
