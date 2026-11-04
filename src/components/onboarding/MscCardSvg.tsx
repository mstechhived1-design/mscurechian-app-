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

export default function MscCardSvg({ width, height }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2400,
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
            <RadialGradient id="cloudBgCardClean" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.85" />
              <Stop offset="70%" stopColor="#F1F5F9" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>

            <LinearGradient id="mscHeaderGradClean" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#0F2A4A" />
              <Stop offset="60%" stopColor="#1E3A8A" />
              <Stop offset="100%" stopColor="#0284C7" />
            </LinearGradient>

            <LinearGradient id="chipGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#FDE047" />
              <Stop offset="100%" stopColor="#D97706" />
            </LinearGradient>
          </Defs>

          {/* ── Soft Background Shape ── */}
          <Path
            d="M 30 130 C 10 50, 70 30, 170 35 C 270 25, 330 60, 320 140 C 320 230, 260 265, 170 260 C 70 265, 10 210, 30 130 Z"
            fill="url(#cloudBgCardClean)"
          />

          {/* ── Floating 3D Digital Health Pass (Centerpiece) ── */}
          <G id="HealthPassCenter">
            {/* Soft Ambient Depth Shadow */}
            <Rect
              x="26"
              y="48"
              width="288"
              height="174"
              rx="18"
              fill="#0F172A"
              opacity="0.14"
            />
            {/* Crisp Card Body */}
            <Rect
              x="24"
              y="44"
              width="288"
              height="170"
              rx="16"
              fill="#FFFFFF"
              stroke="#CBD5E1"
              strokeWidth="1.8"
            />

            {/* Header Ribbon */}
            <Rect
              x="25"
              y="45"
              width="286"
              height="44"
              rx="15"
              fill="url(#mscHeaderGradClean)"
            />
            <Rect x="25" y="74" width="286" height="15" fill="url(#mscHeaderGradClean)" />

            {/* MSCureChain Official Brand Logo */}
            <Circle cx="46" cy="66" r="13" fill="#FFFFFF" />
            <SvgImage
              href={require('../../../assets/image.png')}
              x="35"
              y="55"
              width="22"
              height="22"
              preserveAspectRatio="xMidYMid meet"
            />
            <SvgText
              x="64"
              y="62"
              fill="#FFFFFF"
              fontSize="10"
              fontWeight="bold"
            >
              MS CureChain Health Network
            </SvgText>
            <SvgText
              x="64"
              y="73"
              fill="#93C5FD"
              fontSize="7.5"
            >
              Unified Patient Digital Health Pass
            </SvgText>

            {/* Top-Right Red Brand Pill */}
            <Rect x="228" y="56" width="70" height="18" rx="4" fill="#DC2626" />
            <SvgText
              x="233"
              y="68"
              fill="#FFFFFF"
              fontSize="7.5"
              fontWeight="bold"
            >
              MSCURECHAIN
            </SvgText>

            {/* ── Card Content ── */}
            {/* Smart EMV Chip */}
            <Rect x="44" y="98" width="28" height="22" rx="4" fill="url(#chipGrad)" stroke="#B45309" strokeWidth="0.8" />
            <Path d="M 44 109 L 72 109" stroke="#92400E" strokeWidth="0.8" />
            <Path d="M 58 98 L 58 120" stroke="#92400E" strokeWidth="0.8" />

            {/* Patient Name */}
            <SvgText
              x="44"
              y="136"
              fill="#0F172A"
              fontSize="13"
              fontWeight="bold"
            >
              Suresh Kumar
            </SvgText>

            {/* Details Table */}
            <SvgText
              x="44"
              y="150"
              fill="#0F2A4A"
              fontSize="7.5"
              fontWeight="bold"
            >
              MSCureChain ID: 91-4820-2910-1849
            </SvgText>
            <SvgText
              x="44"
              y="161"
              fill="#64748B"
              fontSize="7.2"
            >
              Health Address: suresh@mscurechain
            </SvgText>
            <SvgText
              x="44"
              y="172"
              fill="#64748B"
              fontSize="7.2"
            >
              DOB: 04/05/1990  •  Gender: Male
            </SvgText>
            <SvgText
              x="44"
              y="183"
              fill="#64748B"
              fontSize="7.2"
            >
              Mobile: +91 97112XXXXX
            </SvgText>

            {/* Verified Digital Security Hologram Badge */}
            <Rect x="44" y="192" width="90" height="14" rx="4" fill="#ECFDF5" stroke="#10B981" strokeWidth="0.8" />
            <Circle cx="52" cy="199" r="3.5" fill="#10B981" />
            <Path d="M 50.5 199 L 52 200.5 L 54.5 197.5" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" />
            <SvgText x="58" y="202" fill="#065F46" fontSize="6.5" fontWeight="bold">
              Cryptographically Verified
            </SvgText>

            {/* ── High-Resolution QR Code Block on Right ── */}
            <Rect
              x="214"
              y="98"
              width="84"
              height="84"
              rx="8"
              fill="#F8FAFC"
              stroke="#CBD5E1"
              strokeWidth="1.2"
            />
            {/* Target Brackets */}
            <Path d="M 218 106 L 218 102 L 222 102" stroke="#0F2A4A" strokeWidth="2" fill="none" />
            <Path d="M 294 106 L 294 102 L 290 102" stroke="#0F2A4A" strokeWidth="2" fill="none" />
            <Path d="M 218 174 L 218 178 L 222 178" stroke="#0F2A4A" strokeWidth="2" fill="none" />
            <Path d="M 294 174 L 294 178 L 290 178" stroke="#0F2A4A" strokeWidth="2" fill="none" />

            {/* QR Corner Markers */}
            <Rect x="224" y="108" width="18" height="18" fill="#0F172A" rx="2" />
            <Rect x="227" y="111" width="12" height="12" fill="#FFFFFF" rx="1" />
            <Rect x="230" y="114" width="6" height="6" fill="#0F172A" />

            <Rect x="270" y="108" width="18" height="18" fill="#0F172A" rx="2" />
            <Rect x="273" y="111" width="12" height="12" fill="#FFFFFF" rx="1" />
            <Rect x="276" y="114" width="6" height="6" fill="#0F172A" />

            <Rect x="224" y="154" width="18" height="18" fill="#0F172A" rx="2" />
            <Rect x="227" y="157" width="12" height="12" fill="#FFFFFF" rx="1" />
            <Rect x="230" y="160" width="6" height="6" fill="#0F172A" />

            {/* Internal QR Data Cells */}
            <Rect x="246" y="108" width="6" height="6" fill="#0F172A" />
            <Rect x="256" y="114" width="8" height="5" fill="#0F172A" />
            <Rect x="246" y="124" width="8" height="6" fill="#0F172A" />
            <Rect x="258" y="128" width="6" height="8" fill="#0F172A" />
            <Rect x="270" y="134" width="8" height="6" fill="#0F172A" />
            <Rect x="246" y="142" width="6" height="8" fill="#0F172A" />
            <Rect x="256" y="148" width="8" height="6" fill="#0F172A" />
            <Rect x="276" y="148" width="6" height="8" fill="#0F172A" />
            <Rect x="246" y="160" width="8" height="6" fill="#0F172A" />
            <Rect x="258" y="166" width="6" height="6" fill="#0F172A" />
            <Rect x="270" y="162" width="8" height="6" fill="#0F172A" />

            <SvgText x="225" y="196" fill="#1E3A8A" fontSize="6.5" fontWeight="bold">
              Scan for Instant Pass
            </SvgText>
          </G>

          {/* Ground Platform Baseline */}
          <Path d="M 40 255 Q 170 262 300 255" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
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
