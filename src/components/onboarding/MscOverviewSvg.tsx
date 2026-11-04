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

export default function MscOverviewSvg({ width, height }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(1000),
      ])
    );

    // Floating animation
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

    pulseLoop.start();
    floatLoop.start();

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
    };
  }, [pulseAnim, floatAnim]);

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
            <RadialGradient id="overviewBgGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.8" />
              <Stop offset="70%" stopColor="#F1F5F9" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>

            <LinearGradient id="phoneScreenOverview" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor="#F0F9FF" />
            </LinearGradient>

            <LinearGradient id="heartGradOverview" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#EF4444" />
              <Stop offset="100%" stopColor="#DC2626" />
            </LinearGradient>

            <LinearGradient id="badgeGradBlue" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#1E3A8A" />
              <Stop offset="100%" stopColor="#0284C7" />
            </LinearGradient>
          </Defs>

          {/* ── Soft Ambient Glow ── */}
          <Circle cx="170" cy="130" r="115" fill="url(#overviewBgGlow)" />

          {/* ── Central Smartphone Mockup (Abstract Modern Healthcare) ── */}
          <G id="CentralPhone">
            {/* Soft Phone Shadow */}
            <Rect x="110" y="44" width="120" height="206" rx="26" fill="#0F172A" opacity="0.12" />
            {/* Outer Dark Navy Bezel */}
            <Rect x="107" y="40" width="120" height="204" rx="24" fill="#0F2A4A" stroke="#1E3A8A" strokeWidth="2.5" />
            {/* Inner Display Screen */}
            <Rect x="112" y="45" width="110" height="194" rx="20" fill="url(#phoneScreenOverview)" />

            {/* Top Speaker Ear Notch */}
            <Rect x="146" y="52" width="32" height="4" rx="2" fill="#94A3B8" />

            {/* In-App Header with Official Logo */}
            <SvgImage
              href={require('../../../assets/image.png')}
              x="122"
              y="61"
              width="15"
              height="15"
              preserveAspectRatio="xMidYMid meet"
            />
            <SvgText x="140" y="72" fill="#0F2A4A" fontSize="7.5" fontWeight="bold">
              MSCureChain
            </SvgText>
            <Circle cx="204" cy="68" r="3.5" fill="#10B981" />

            {/* Central Heart Vitals Capsule */}
            <Rect x="122" y="82" width="90" height="74" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
            {/* Red Heart with Checkmark */}
            <Path
              d="M 167 96 C 160 87, 146 93, 146 106 C 146 118, 167 132, 167 132 C 167 132, 188 118, 188 106 C 188 93, 174 87, 167 96 Z"
              fill="url(#heartGradOverview)"
            />
            <Path
              d="M 160 106 L 165 111 L 175 101"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Live ECG Rhythm Wave */}
            <Path
              d="M 126 142 L 142 142 L 148 132 L 155 150 L 162 136 L 168 142 L 208 142"
              stroke="#0284C7"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* Connected Care Progress Bar */}
            <Rect x="122" y="166" width="90" height="10" rx="5" fill="#E0F2FE" />
            <Rect x="122" y="166" width="62" height="10" rx="5" fill="#0284C7" />
            <SvgText x="130" y="174" fill="#FFFFFF" fontSize="6.5" fontWeight="bold">
              MSCureChain Active
            </SvgText>

            {/* Bottom In-App Shortcut Bar */}
            <Rect x="122" y="186" width="42" height="26" rx="8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
            <Circle cx="134" cy="199" r="6" fill="#FDBA74" />
            <Rect x="144" y="194" width="16" height="3" rx="1.5" fill="#64748B" />
            <Rect x="144" y="200" width="12" height="3" rx="1.5" fill="#94A3B8" />

            <Rect x="170" y="186" width="42" height="26" rx="8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
            <Circle cx="182" cy="199" r="6" fill="#93C5FD" />
            <Rect x="192" y="194" width="16" height="3" rx="1.5" fill="#64748B" />
            <Rect x="192" y="200" width="12" height="3" rx="1.5" fill="#94A3B8" />

            {/* Home Navigation Dot */}
            <Circle cx="167" cy="226" r="4.5" fill="#CBD5E1" />
          </G>

          {/* ── Connected Service Satellite Badges Around Phone ── */}
          {/* Badge 1: Teleconsultation / Doctors (Top-Left) */}
          <G id="BadgeDoctors" transform="translate(18, 56)">
            <Rect x="0" y="0" width="82" height="52" rx="12" fill="#FFFFFF" stroke="#0284C7" strokeWidth="1.5" />
            <Circle cx="20" cy="26" r="12" fill="#E0F2FE" />
            <SvgText x="14" y="31" fill="#0284C7" fontSize="13">🩺</SvgText>
            <SvgText x="38" y="22" fill="#0F2A4A" fontSize="8" fontWeight="bold">Tele-OPD</SvgText>
            <SvgText x="38" y="32" fill="#64748B" fontSize="6.5">Doctor Consult</SvgText>
            <Circle cx="70" cy="12" r="3" fill="#10B981" />
          </G>
          {/* Dashed connector line to phone */}
          <Path d="M 100 82 L 115 86" stroke="#0284C7" strokeWidth="1.8" strokeDasharray="3 3" />

          {/* Badge 2: Digital Health ID Vault (Top-Right) */}
          <G id="BadgeVault" transform="translate(238, 62)">
            <Rect x="0" y="0" width="84" height="52" rx="12" fill="#FFFFFF" stroke="#10B981" strokeWidth="1.5" />
            <Circle cx="20" cy="26" r="12" fill="#ECFDF5" />
            <SvgText x="14" y="31" fill="#10B981" fontSize="13">🔐</SvgText>
            <SvgText x="38" y="22" fill="#0F2A4A" fontSize="8" fontWeight="bold">Health ID</SvgText>
            <SvgText x="38" y="32" fill="#64748B" fontSize="6.5">Encrypted Vault</SvgText>
            <Circle cx="72" cy="12" r="3" fill="#10B981" />
          </G>
          <Path d="M 238 88 L 223 92" stroke="#10B981" strokeWidth="1.8" strokeDasharray="3 3" />

          {/* Badge 3: Smart OPD Queue Tracker (Bottom-Left) */}
          <G id="BadgeQueue" transform="translate(16, 172)">
            <Rect x="0" y="0" width="86" height="52" rx="12" fill="#FFFFFF" stroke="#F97316" strokeWidth="1.5" />
            <Circle cx="20" cy="26" r="12" fill="#FFF7ED" />
            <SvgText x="14" y="31" fill="#F97316" fontSize="13">🎟️</SvgText>
            <SvgText x="38" y="22" fill="#0F2A4A" fontSize="8" fontWeight="bold">OPD Queue</SvgText>
            <SvgText x="38" y="32" fill="#64748B" fontSize="6.5">Token #14 Live</SvgText>
            <Circle cx="74" cy="12" r="3" fill="#F97316" />
          </G>
          <Path d="M 102 198 L 116 194" stroke="#F97316" strokeWidth="1.8" strokeDasharray="3 3" />

          {/* Badge 4: Verified Network Hospital (Bottom-Right) */}
          <G id="BadgeHospital" transform="translate(236, 172)">
            <Rect x="0" y="0" width="86" height="52" rx="12" fill="#FFFFFF" stroke="#8B5CF6" strokeWidth="1.5" />
            <Circle cx="20" cy="26" r="12" fill="#F5F3FF" />
            <SvgText x="14" y="31" fill="#8B5CF6" fontSize="13">🏥</SvgText>
            <SvgText x="38" y="22" fill="#0F2A4A" fontSize="8" fontWeight="bold">Hospital</SvgText>
            <SvgText x="38" y="32" fill="#64748B" fontSize="6.5">Network Direct</SvgText>
            <Circle cx="74" cy="12" r="3" fill="#10B981" />
          </G>
          <Path d="M 236 198 L 222 194" stroke="#8B5CF6" strokeWidth="1.8" strokeDasharray="3 3" />

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
