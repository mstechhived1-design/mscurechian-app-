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

export default function MscScanShareSvg({ width, height }: Props) {
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const badgeFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Scan laser movement
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 65,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Floating Token Badge
    const badgeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgeFloatAnim, {
          toValue: -5,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(badgeFloatAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    scanLoop.start();
    badgeLoop.start();

    return () => {
      scanLoop.stop();
      badgeLoop.stop();
    };
  }, [scanLineAnim, badgeFloatAnim]);

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox="0 0 340 280" fill="none">
        <Defs>
          <RadialGradient id="cloudBgScanClean" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.8" />
            <Stop offset="70%" stopColor="#F1F5F9" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>

          <LinearGradient id="beamGradClean" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#F97316" stopOpacity="0.1" />
            <Stop offset="50%" stopColor="#F97316" stopOpacity="0.45" />
            <Stop offset="100%" stopColor="#F97316" stopOpacity="0.1" />
          </LinearGradient>

          <LinearGradient id="kioskSurface" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#0284C7" />
            <Stop offset="100%" stopColor="#1E3A8A" />
          </LinearGradient>
        </Defs>

        {/* ── Soft Ambient Background ── */}
        <Path
          d="M 50 140 C 30 70, 90 40, 170 45 C 240 35, 300 70, 290 140 C 300 220, 230 250, 160 250 C 90 255, 30 210, 50 140 Z"
          fill="url(#cloudBgScanClean)"
        />

        {/* ── Hospital Registration Kiosk Counter on Left ── */}
        <G id="HospitalCounter">
          <Rect x="36" y="146" width="108" height="106" rx="8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
          <Path d="M 32 146 L 148 146 L 142 136 L 38 136 Z" fill="url(#kioskSurface)" />

          {/* Medical Shield Logo */}
          <Circle cx="90" cy="195" r="20" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
          <Rect x="86" y="184" width="8" height="22" rx="2" fill="#0284C7" />
          <Rect x="79" y="191" width="22" height="8" rx="2" fill="#0284C7" />

          {/* QR Stand Display */}
          <Rect x="65" y="78" width="50" height="60" rx="6" fill="#FFFFFF" stroke="#0F2A4A" strokeWidth="2" />
          <Rect x="87" y="138" width="6" height="10" fill="#94A3B8" />
          <Rect x="78" y="146" width="24" height="3" rx="1.5" fill="#64748B" />

          {/* QR Pattern on Stand */}
          <Rect x="72" y="85" width="36" height="36" fill="#0F172A" rx="2" />
          <Rect x="75" y="88" width="30" height="30" fill="#FFFFFF" rx="1" />
          <Rect x="78" y="91" width="8" height="8" fill="#0F172A" />
          <Rect x="93" y="91" width="8" height="8" fill="#0F172A" />
          <Rect x="78" y="106" width="8" height="8" fill="#0F172A" />
          <Rect x="88" y="101" width="4" height="4" fill="#0F172A" />
          <Rect x="95" y="108" width="5" height="5" fill="#0F172A" />
          <SvgText x="69" y="131" fill="#1E3A8A" fontSize="5.2" fontWeight="bold">
            SCAN & SHARE
          </SvgText>
        </G>

        {/* ── Scanning Laser Beam ── */}
        <Path
          d="M 120 102 L 185 78 L 185 178 L 120 114 Z"
          fill="url(#beamGradClean)"
        />

        {/* ── Modern Smartphone Scanner on Right ── */}
        <G id="SmartphoneScanner">
          {/* Subtle Hand Silhouette / Tech Stand Base */}
          <Rect x="200" y="188" width="28" height="64" rx="4" fill="#E2E8F0" opacity="0.6" />

          {/* Phone Body */}
          <Rect
            x="175"
            y="65"
            width="68"
            height="128"
            rx="14"
            fill="#0F2A4A"
            stroke="#1E3A8A"
            strokeWidth="3"
          />
          <Rect x="178" y="69" width="62" height="120" rx="11" fill="#FFFFFF" />

          {/* Viewfinder Target */}
          <Rect x="186" y="84" width="46" height="46" rx="6" fill="#F8FAFC" stroke="#0284C7" strokeWidth="1" strokeDasharray="3 3" />
          <Path d="M 188 90 L 188 86 L 192 86" stroke="#F97316" strokeWidth="2.2" fill="none" />
          <Path d="M 230 90 L 230 86 L 226 86" stroke="#F97316" strokeWidth="2.2" fill="none" />
          <Path d="M 188 124 L 188 128 L 192 128" stroke="#F97316" strokeWidth="2.2" fill="none" />
          <Path d="M 230 124 L 230 128 L 226 128" stroke="#F97316" strokeWidth="2.2" fill="none" />

          {/* Red Laser Scanning Line */}
          <Rect x="187" y="106" width="44" height="2" fill="#EF4444" />

          {/* Official MSCureChain Logo on scanner screen */}
          <Circle cx="209" cy="76" r="6" fill="#FFFFFF" />
          <SvgImage
            href={require('../../../assets/image.png')}
            x="203"
            y="70"
            width="12"
            height="12"
            preserveAspectRatio="xMidYMid meet"
          />
          <SvgText x="184" y="145" fill="#1E3A8A" fontSize="5.5" fontWeight="bold">
            MSCureChain Profile
          </SvgText>
          <Rect x="186" y="152" width="46" height="8" rx="4" fill="#10B981" />
          <SvgText x="190" y="158" fill="#FFFFFF" fontSize="5" fontWeight="bold">
            Profile Shared!
          </SvgText>
        </G>

        {/* ── Generated Token Pass Badge Floating Top-Right ── */}
        <G id="GeneratedTokenBadge">
          <Rect
            x="195"
            y="20"
            width="128"
            height="48"
            rx="10"
            fill="#FFFFFF"
            stroke="#10B981"
            strokeWidth="2"
          />
          <Circle cx="214" cy="44" r="11" fill="#10B981" />
          <Path d="M 210 44 L 213 47 L 220 40" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />

          <SvgText x="230" y="37" fill="#10B981" fontSize="7.5" fontWeight="bold">
            TOKEN GENERATED
          </SvgText>
          <SvgText x="230" y="51" fill="#0F172A" fontSize="13" fontWeight="bold">
            OPD #24
          </SvgText>
          <SvgText x="230" y="60" fill="#64748B" fontSize="6.5">
            Zero Waiting Check-in
          </SvgText>
        </G>

        {/* Ground Floor Shadow */}
        <Path d="M 25 258 Q 170 268 315 258" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
