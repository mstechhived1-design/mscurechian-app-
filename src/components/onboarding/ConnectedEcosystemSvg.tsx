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
} from 'react-native-svg';

interface Props {
  width: number;
  height: number;
}

export default function ConnectedEcosystemSvg({ width, height }: Props) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous subtle pulse ring animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // Continuous floating of node badges
    const floatLoop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, {
          toValue: -7,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim1, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const floatLoop2 = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, {
          toValue: 7,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim2, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    floatLoop1.start();
    floatLoop2.start();

    return () => {
      pulseLoop.stop();
      floatLoop1.stop();
      floatLoop2.stop();
    };
  }, [pulseAnim, floatAnim1, floatAnim2]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.25],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.65, 0.35, 0],
  });

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Background Animated Pulse Wave around center */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />

      {/* Main SVG Composition */}
      <Svg width={width} height={height} viewBox="0 0 340 280">
        <Defs>
          {/* Ambient Platform Shadow */}
          <RadialGradient id="platformShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#0284C7" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
          </RadialGradient>

          {/* Hospital Building Primary Gradient */}
          <LinearGradient id="hospitalGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E0F2FE" />
            <Stop offset="45%" stopColor="#BAE6FD" />
            <Stop offset="100%" stopColor="#38BDF8" />
          </LinearGradient>

          {/* Hospital Building Deep Facet Gradient */}
          <LinearGradient id="hospitalFacade" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#005AB5" />
            <Stop offset="100%" stopColor="#003E80" />
          </LinearGradient>

          {/* Hospital Windows Glow */}
          <LinearGradient id="windowGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#38BDF8" />
            <Stop offset="100%" stopColor="#7DD3FC" />
          </LinearGradient>

          {/* Doctor Badge Gradient */}
          <LinearGradient id="doctorBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0284C7" />
            <Stop offset="100%" stopColor="#0369A1" />
          </LinearGradient>

          {/* Patient Badge Gradient */}
          <LinearGradient id="patientBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#10B981" />
            <Stop offset="100%" stopColor="#059669" />
          </LinearGradient>

          {/* Records Badge Gradient */}
          <LinearGradient id="recordsBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#8B5CF6" />
            <Stop offset="100%" stopColor="#6D28D9" />
          </LinearGradient>

          {/* Pharmacy Badge Gradient */}
          <LinearGradient id="pharmacyBadgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#F59E0B" />
            <Stop offset="100%" stopColor="#D97706" />
          </LinearGradient>

          {/* Glowing Conduits */}
          <LinearGradient id="conduitGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#005AB5" stopOpacity="0.2" />
          </LinearGradient>
          <LinearGradient id="conduitGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#005AB5" stopOpacity="0.2" />
          </LinearGradient>
        </Defs>

        {/* ── Ground Platform Radial Glow ── */}
        <Circle cx="170" cy="210" r="95" fill="url(#platformShadow)" />

        {/* ── Interconnected Digital Arcs / Conduits ── */}
        <Path
          d="M 65 85 C 105 130, 140 145, 170 150"
          stroke="url(#conduitGrad1)"
          strokeWidth="2.5"
          strokeDasharray="4 4"
          fill="none"
        />
        <Path
          d="M 275 80 C 235 125, 200 145, 170 150"
          stroke="url(#conduitGrad1)"
          strokeWidth="2.5"
          strokeDasharray="4 4"
          fill="none"
        />
        <Path
          d="M 60 215 C 95 195, 135 185, 170 170"
          stroke="url(#conduitGrad2)"
          strokeWidth="2.5"
          strokeDasharray="4 4"
          fill="none"
        />
        <Path
          d="M 280 210 C 245 195, 205 185, 170 170"
          stroke="url(#conduitGrad2)"
          strokeWidth="2.5"
          strokeDasharray="4 4"
          fill="none"
        />

        {/* ── Center Modern Hospital Tower (MS CureChain Healthcare Core) ── */}
        <G transform="translate(125, 80)">
          {/* Main Tower Base shadow */}
          <Rect x="5" y="10" width="80" height="95" rx="14" fill="#0284C7" opacity="0.15" />
          
          {/* Main Tower Body */}
          <Rect x="0" y="5" width="90" height="100" rx="14" fill="url(#hospitalFacade)" />

          {/* Glass Atrium Curved Roof & Front Facade */}
          <Rect x="6" y="11" width="78" height="38" rx="8" fill="url(#hospitalGlassGrad)" opacity="0.95" />

          {/* Hospital Glowing Cross Shield on Front */}
          <Circle cx="45" cy="30" r="13" fill="#FFFFFF" />
          {/* Red/Blue Cross inside shield */}
          <Rect x="42" y="22" width="6" height="16" rx="2" fill="#005AB5" />
          <Rect x="37" y="27" width="16" height="6" rx="2" fill="#005AB5" />

          {/* Tower Floor Windows (Architectural Grid) */}
          <G opacity="0.85">
            <Rect x="12" y="56" width="16" height="8" rx="2" fill="url(#windowGlow)" />
            <Rect x="37" y="56" width="16" height="8" rx="2" fill="url(#windowGlow)" />
            <Rect x="62" y="56" width="16" height="8" rx="2" fill="url(#windowGlow)" />

            <Rect x="12" y="70" width="16" height="8" rx="2" fill="url(#windowGlow)" />
            <Rect x="37" y="70" width="16" height="8" rx="2" fill="url(#windowGlow)" />
            <Rect x="62" y="70" width="16" height="8" rx="2" fill="url(#windowGlow)" />
          </G>

          {/* Modern Entrance Canopy */}
          <Rect x="28" y="88" width="34" height="18" rx="4" fill="#E2E8F0" />
          <Rect x="34" y="94" width="22" height="12" rx="2" fill="#0F172A" />
        </G>

        {/* ── Active Ecosystem Telemetry Nodes (Satellite Badges) ── */}

        {/* Node 1: Top-Left - Doctor Consultation */}
        <G transform="translate(35, 55)">
          <Circle cx="30" cy="30" r="28" fill="#FFFFFF" stroke="#BAE6FD" strokeWidth="2" />
          <Circle cx="30" cy="30" r="22" fill="url(#doctorBadgeGrad)" />
          {/* Doctor icon: Head & Stethoscope */}
          <Circle cx="30" cy="23" r="5" fill="#FFFFFF" />
          <Path d="M 22 36 C 22 30, 38 30, 38 36 Z" fill="#FFFFFF" />
          {/* Stethoscope curl */}
          <Path d="M 26 27 C 26 33, 34 33, 34 27" stroke="#38BDF8" strokeWidth="1.5" fill="none" />
          {/* Pulse ring dot */}
          <Circle cx="48" cy="14" r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
        </G>

        {/* Node 2: Top-Right - Patient Mobile & Queue */}
        <G transform="translate(245, 50)">
          <Circle cx="30" cy="30" r="28" fill="#FFFFFF" stroke="#A7F3D0" strokeWidth="2" />
          <Circle cx="30" cy="30" r="22" fill="url(#patientBadgeGrad)" />
          {/* Smartphone device with pulse */}
          <Rect x="23" y="18" width="14" height="24" rx="3" fill="#FFFFFF" />
          <Rect x="25" y="21" width="10" height="15" rx="1" fill="#065F46" />
          {/* Heartbeat wave inside phone */}
          <Path d="M 26 28 L 28 28 L 29 25 L 31 31 L 32 28 L 34 28" stroke="#34D399" strokeWidth="1.2" fill="none" />
          <Circle cx="48" cy="14" r="5" fill="#0284C7" stroke="#FFFFFF" strokeWidth="1.5" />
        </G>

        {/* Node 3: Bottom-Left - Digital Records Vault */}
        <G transform="translate(30, 185)">
          <Circle cx="30" cy="30" r="28" fill="#FFFFFF" stroke="#DDD6FE" strokeWidth="2" />
          <Circle cx="30" cy="30" r="22" fill="url(#recordsBadgeGrad)" />
          {/* Document / Folder icon */}
          <Rect x="22" y="20" width="16" height="20" rx="3" fill="#FFFFFF" />
          <Rect x="25" y="24" width="10" height="2" rx="1" fill="#8B5CF6" />
          <Rect x="25" y="28" width="7" height="2" rx="1" fill="#8B5CF6" />
          <Path d="M 25 33 L 28 36 L 35 29" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </G>

        {/* Node 4: Bottom-Right - Pharmacy & Prescriptions */}
        <G transform="translate(250, 180)">
          <Circle cx="30" cy="30" r="28" fill="#FFFFFF" stroke="#FED7AA" strokeWidth="2" />
          <Circle cx="30" cy="30" r="22" fill="url(#pharmacyBadgeGrad)" />
          {/* Medicine Capsule / Pill */}
          <G transform="rotate(45, 30, 30)">
            <Rect x="24" y="21" width="12" height="9" rx="4" fill="#FFFFFF" />
            <Rect x="24" y="29" width="12" height="9" rx="4" fill="#EA580C" />
          </G>
        </G>

        {/* Floating Health Sparkles / Dots */}
        <Circle cx="120" cy="65" r="3" fill="#38BDF8" opacity="0.8" />
        <Circle cx="220" cy="75" r="2.5" fill="#10B981" opacity="0.8" />
        <Circle cx="105" cy="225" r="2" fill="#8B5CF6" opacity="0.7" />
        <Circle cx="230" cy="235" r="3" fill="#F59E0B" opacity="0.7" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#005AB5',
    backgroundColor: 'rgba(0, 90, 181, 0.08)',
  },
});
