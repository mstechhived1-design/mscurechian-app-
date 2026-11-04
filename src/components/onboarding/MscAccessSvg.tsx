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
  Image as SvgImage,
} from 'react-native-svg';

interface Props {
  width: number;
  height: number;
}

export default function MscAccessSvg({ width, height }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    return () => floatLoop.stop();
  }, [floatAnim]);

  return (
    <View style={[styles.container, { width, height }]}>
      <Animated.View
        style={{
          width,
          height,
          transform: [{ translateY: floatAnim }],
        }}
      >
        <Svg width={width} height={height} viewBox="0 0 340 280" fill="none">
          <Defs>
            <RadialGradient id="cloudBgAccessClean" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.85" />
              <Stop offset="70%" stopColor="#F1F5F9" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>

            <LinearGradient id="screenGradClean" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor="#F0F9FF" />
            </LinearGradient>
          </Defs>

          {/* ── Soft Ambient Glow ── */}
          <Circle cx="170" cy="130" r="115" fill="url(#cloudBgAccessClean)" />

          {/* ── Central Smartphone Mockup (Upright, Clean & Modern) ── */}
          <G id="CentralSmartphone">
            {/* Phone Shadow */}
            <Rect x="110" y="44" width="120" height="206" rx="26" fill="#0F172A" opacity="0.12" />
            {/* Outer Navy Bezel */}
            <Rect x="107" y="40" width="120" height="204" rx="24" fill="#0F2A4A" stroke="#1E3A8A" strokeWidth="2.5" />
            {/* Screen */}
            <Rect x="112" y="45" width="110" height="194" rx="20" fill="url(#screenGradClean)" />

            {/* Top Ear Speaker Notch */}
            <Rect x="146" y="52" width="32" height="4" rx="2" fill="#94A3B8" />

            {/* Central MSCureChain Seal Badge */}
            <Circle cx="167" cy="100" r="26" fill="#FFFFFF" stroke="#1E3A8A" strokeWidth="2.2" />

            {/* Official MSCureChain Brand Logo Image */}
            <SvgImage
              href={require('../../../assets/image.png')}
              x="145"
              y="78"
              width="44"
              height="44"
              preserveAspectRatio="xMidYMid meet"
            />

            {/* Brand Title: MSCureChain */}
            <SvgText
              x="134"
              y="136"
              fill="#0F2A4A"
              fontSize="10"
              fontWeight="bold"
            >
              MSCureChain
            </SvgText>

            {/* Search Pill Bar */}
            <Rect x="122" y="146" width="90" height="16" rx="8" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1" />
            <Circle cx="134" cy="154" r="3.5" fill="#0284C7" />
            <Rect x="144" y="152" width="56" height="4" rx="2" fill="#94A3B8" />

            {/* Mini Health Records Feed inside Phone */}
            <Rect x="122" y="170" width="90" height="16" rx="5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
            <Circle cx="132" cy="178" r="4" fill="#10B981" />
            <Rect x="142" y="175" width="58" height="3" rx="1.5" fill="#64748B" />
            <Rect x="142" y="180" width="38" height="2.5" rx="1" fill="#94A3B8" />

            <Rect x="122" y="192" width="90" height="16" rx="5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
            <Circle cx="132" cy="200" r="4" fill="#0284C7" />
            <Rect x="142" y="197" width="54" height="3" rx="1.5" fill="#64748B" />
            <Rect x="142" y="202" width="42" height="2.5" rx="1" fill="#94A3B8" />

            {/* Bottom Nav Dot */}
            <Circle cx="167" cy="226" r="4.5" fill="#CBD5E1" />
          </G>

          {/* ── Layered Modern Floating Medical Record Cards ── */}
          {/* Card 1: Diagnostic Lab Reports (Top-Left) */}
          <G id="LabCard" transform="translate(14, 52)">
            <Rect x="0" y="0" width="86" height="54" rx="12" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.5" />
            <Circle cx="20" cy="27" r="12" fill="#E0F2FE" />
            <SvgText x="14" y="32" fill="#0284C7" fontSize="13">🧪</SvgText>
            <SvgText x="38" y="22" fill="#0F2A4A" fontSize="8" fontWeight="bold">Lab Reports</SvgText>
            <SvgText x="38" y="32" fill="#64748B" fontSize="6.5">Blood Test CBC</SvgText>
            <SvgText x="38" y="42" fill="#10B981" fontSize="6" fontWeight="bold">PDF Ready</SvgText>
          </G>
          <Path d="M 100 78 L 114 82" stroke="#0284C7" strokeWidth="1.8" strokeDasharray="3 3" />

          {/* Card 2: Digital Prescriptions (Top-Right) */}
          <G id="RxCard" transform="translate(240, 56)">
            <Rect x="0" y="0" width="86" height="54" rx="12" fill="#FFFFFF" stroke="#10B981" strokeWidth="1.5" />
            <Circle cx="20" cy="27" r="12" fill="#ECFDF5" />
            <SvgText x="14" y="32" fill="#10B981" fontSize="13">💊</SvgText>
            <SvgText x="38" y="22" fill="#0F2A4A" fontSize="8" fontWeight="bold">Prescriptions</SvgText>
            <SvgText x="38" y="32" fill="#64748B" fontSize="6.5">Dr. Consultation</SvgText>
            <SvgText x="38" y="42" fill="#10B981" fontSize="6" fontWeight="bold">Active Rx</SvgText>
          </G>
          <Path d="M 240 82 L 226 86" stroke="#10B981" strokeWidth="1.8" strokeDasharray="3 3" />

          {/* Card 3: Immunization Pass (Bottom-Left) */}
          <G id="VaccineCard" transform="translate(14, 168)">
            <Rect x="0" y="0" width="86" height="54" rx="12" fill="#FFFFFF" stroke="#F97316" strokeWidth="1.5" />
            <Circle cx="20" cy="27" r="12" fill="#FFF7ED" />
            <SvgText x="14" y="32" fill="#F97316" fontSize="13">💉</SvgText>
            <SvgText x="38" y="22" fill="#0F2A4A" fontSize="8" fontWeight="bold">Immunization</SvgText>
            <SvgText x="38" y="32" fill="#64748B" fontSize="6.5">Vaccination Pass</SvgText>
            <SvgText x="38" y="42" fill="#10B981" fontSize="6" fontWeight="bold">Verified</SvgText>
          </G>
          <Path d="M 100 196 L 114 192" stroke="#F97316" strokeWidth="1.8" strokeDasharray="3 3" />

          {/* Card 4: Inpatient Discharge Summaries (Bottom-Right) */}
          <G id="DischargeCard" transform="translate(240, 168)">
            <Rect x="0" y="0" width="86" height="54" rx="12" fill="#FFFFFF" stroke="#8B5CF6" strokeWidth="1.5" />
            <Circle cx="20" cy="27" r="12" fill="#F5F3FF" />
            <SvgText x="14" y="32" fill="#8B5CF6" fontSize="13">📁</SvgText>
            <SvgText x="38" y="22" fill="#0F2A4A" fontSize="8" fontWeight="bold">Discharge</SvgText>
            <SvgText x="38" y="32" fill="#64748B" fontSize="6.5">Hospital Record</SvgText>
            <SvgText x="38" y="42" fill="#10B981" fontSize="6" fontWeight="bold">Saved in Vault</SvgText>
          </G>
          <Path d="M 240 196 L 226 192" stroke="#8B5CF6" strokeWidth="1.8" strokeDasharray="3 3" />

          {/* Ground Platform Baseline */}
          <Path d="M 50 265 Q 170 272 290 265" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
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
});
