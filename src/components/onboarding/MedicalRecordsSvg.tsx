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

export default function MedicalRecordsSvg({ width, height }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shieldScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle floating translation for the document stack
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -7,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle scale breathing for the security shield lock
    const shieldLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shieldScaleAnim, {
          toValue: 1.08,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shieldScaleAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    shieldLoop.start();

    return () => {
      floatLoop.stop();
      shieldLoop.stop();
    };
  }, [floatAnim, shieldScaleAnim]);

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
            {/* Ambient Platform Shadow */}
            <RadialGradient id="vaultShadow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#005AB5" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#005AB5" stopOpacity="0" />
            </RadialGradient>

            {/* Folder 3D Back Gradient */}
            <LinearGradient id="folderBackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#005AB5" />
              <Stop offset="100%" stopColor="#00356B" />
            </LinearGradient>

            {/* Folder Front Flap Glass Gradient */}
            <LinearGradient id="folderFrontGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#0284C7" stopOpacity="0.9" />
            </LinearGradient>

            {/* Document 1 (Lab Report) Gradient */}
            <LinearGradient id="doc1Grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor="#F8FAFC" />
            </LinearGradient>

            {/* Document 2 (Rx Prescription) Gradient */}
            <LinearGradient id="doc2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor="#F0FDF4" />
            </LinearGradient>

            {/* Security Shield Golden/Cyan Gradient */}
            <LinearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#10B981" />
              <Stop offset="100%" stopColor="#059669" />
            </LinearGradient>

            {/* Bar Chart Gradients */}
            <LinearGradient id="chartGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#005AB5" />
              <Stop offset="100%" stopColor="#38BDF8" />
            </LinearGradient>
            <LinearGradient id="chartGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#10B981" />
              <Stop offset="100%" stopColor="#34D399" />
            </LinearGradient>
          </Defs>

          {/* Platform Shadow */}
          <Circle cx="170" cy="255" r="95" fill="url(#vaultShadow)" />

          {/* ── Background Stacked Digital Records Folder & Documents ── */}

          {/* Folder Back Body */}
          <G transform="translate(45, 45)">
            {/* Folder Tab */}
            <Path d="M 0 10 L 45 10 L 60 0 L 120 0 L 130 10 L 250 10 L 250 170 L 0 170 Z" fill="url(#folderBackGrad)" />
          </G>

          {/* Layered Document 2: Rx Prescription (Angled slightly right) */}
          <G transform="translate(140, 25) rotate(6)">
            <Rect x="0" y="0" width="130" height="155" rx="10" fill="url(#doc2Grad)" stroke="#BBF7D0" strokeWidth="1.5" />
            {/* Header: Rx Symbol */}
            <SvgText x="14" y="24" fill="#16A34A" fontSize="18" fontWeight="800">
              ℞
            </SvgText>
            <SvgText x="38" y="22" fill="#1E293B" fontSize="10" fontWeight="700">
              Prescription
            </SvgText>
            <SvgText x="38" y="32" fill="#64748B" fontSize="8" fontWeight="500">
              Dr. Ramesh • Active
            </SvgText>

            <Path d="M 14 42 L 116 42" stroke="#E2E8F0" strokeWidth="1" />

            {/* Dosage item 1 */}
            <Rect x="14" y="50" width="102" height="18" rx="4" fill="#F0FDF4" />
            <Circle cx="24" cy="59" r="4" fill="#10B981" />
            <SvgText x="34" y="62" fill="#166534" fontSize="8" fontWeight="700">
              Amoxicillin 500mg
            </SvgText>

            {/* Dosage item 2 */}
            <Rect x="14" y="74" width="102" height="18" rx="4" fill="#F8FAFC" />
            <Circle cx="24" cy="83" r="4" fill="#0284C7" />
            <SvgText x="34" y="86" fill="#334155" fontSize="8" fontWeight="700">
              Paracetamol 650mg
            </SvgText>

            {/* Doctor Signature scribble */}
            <Path d="M 70 120 C 80 110, 90 125, 100 115 C 105 110, 115 118, 120 112" stroke="#005AB5" strokeWidth="1.5" fill="none" />
            <SvgText x="90" y="132" fill="#64748B" fontSize="7" fontWeight="600" textAnchor="middle">
              Authorized Sign
            </SvgText>
          </G>

          {/* Layered Document 1: Main Lab Report (Centered, prominent) */}
          <G transform="translate(60, 50)">
            <Rect x="0" y="0" width="180" height="165" rx="12" fill="url(#doc1Grad)" stroke="#CBD5E1" strokeWidth="1.2" />

            {/* Report Header */}
            <G transform="translate(14, 16)">
              {/* Report Badge */}
              <Rect x="0" y="0" width="28" height="28" rx="6" fill="#E0F2FE" />
              <Path d="M 8 7 L 20 7 L 20 21 L 8 21 Z M 11 11 L 17 11 M 11 15 L 15 15" stroke="#005AB5" strokeWidth="1.5" fill="none" />

              <SvgText x="36" y="14" fill="#0F172A" fontSize="12" fontWeight="700">
                Blood Analysis
              </SvgText>
              <SvgText x="36" y="25" fill="#64748B" fontSize="9" fontWeight="500">
                Diagnostic Lab Report
              </SvgText>

              {/* Status Tag: Normal */}
              <G transform="translate(110, 2)">
                <Rect x="0" y="0" width="42" height="16" rx="8" fill="#DCFCE7" />
                <SvgText x="21" y="11" fill="#15803D" fontSize="8" fontWeight="800" textAnchor="middle">
                  NORMAL
                </SvgText>
              </G>
            </G>

            <Path d="M 14 55 L 166 55" stroke="#F1F5F9" strokeWidth="1.5" />

            {/* Test Metrics & Progress Bars */}
            <G transform="translate(14, 66)">
              {/* Metric 1: Hemoglobin */}
              <SvgText x="0" y="10" fill="#334155" fontSize="9" fontWeight="600">
                Hemoglobin (14.2 g/dL)
              </SvgText>
              <Rect x="0" y="16" width="152" height="7" rx="3.5" fill="#E2E8F0" />
              <Rect x="0" y="16" width="125" height="7" rx="3.5" fill="url(#chartGrad1)" />

              {/* Metric 2: Platelet Count */}
              <SvgText x="0" y="38" fill="#334155" fontSize="9" fontWeight="600">
                Platelets (280,000 /µL)
              </SvgText>
              <Rect x="0" y="44" width="152" height="7" rx="3.5" fill="#E2E8F0" />
              <Rect x="0" y="44" width="110" height="7" rx="3.5" fill="url(#chartGrad2)" />

              {/* Mini ECG Graph Wave */}
              <G transform="translate(0, 60)">
                <Rect x="0" y="0" width="152" height="24" rx="4" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
                <Path
                  d="M 6 12 L 35 12 L 42 4 L 48 20 L 54 8 L 60 12 L 95 12 L 102 5 L 108 19 L 114 12 L 146 12"
                  stroke="#005AB5"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </G>
            </G>
          </G>

          {/* Folder Front Translucent Glass Flap (Creates 3D Depth) */}
          <G transform="translate(45, 155)">
            <Path
              d="M 0 0 L 250 0 C 250 0, 250 45, 250 60 C 250 66, 244 72, 238 72 L 12 72 C 6 72, 0 66, 0 60 Z"
              fill="url(#folderFrontGrad)"
            />
          </G>

          {/* ── 256-Bit Vault Encryption Shield Lock (Floating Front-Left) ── */}
          <G transform="translate(30, 160)">
            <Circle cx="26" cy="26" r="26" fill="#FFFFFF" stroke="#BAE6FD" strokeWidth="2" />
            <Circle cx="26" cy="26" r="21" fill="url(#shieldGrad)" />
            {/* Lock Shackle */}
            <Path d="M 21 21 L 21 16 C 21 13, 31 13, 31 16 L 31 21" stroke="#FFFFFF" strokeWidth="2.2" fill="none" />
            {/* Lock Body */}
            <Rect x="18" y="21" width="16" height="12" rx="3" fill="#FFFFFF" />
            {/* Keyhole dot */}
            <Circle cx="26" cy="26" r="1.8" fill="#047857" />
            <Path d="M 26 27 L 26 30" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
          </G>

          {/* ── Floating Synchronized Cloud Pill (Top-Right) ── */}
          <G transform="translate(205, 175)">
            <Rect x="0" y="0" width="105" height="26" rx="13" fill="#FFFFFF" stroke="#005AB5" strokeWidth="1.5" />
            <Circle cx="13" cy="13" r="4" fill="#005AB5" />
            <SvgText x="58" y="17" fill="#005AB5" fontSize="9" fontWeight="700" textAnchor="middle">
              Instant Access ✓
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
