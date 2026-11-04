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

export default function MscSearchSvg({ width, height }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle 3D floating animation
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
            {/* Soft Ambient Background Aura */}
            <RadialGradient id="cloudBgGlobe3D" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.85" />
              <Stop offset="70%" stopColor="#F1F5F9" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>

            <LinearGradient id="nodePillGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor="#F8FAFC" />
            </LinearGradient>
          </Defs>

          {/* ── Soft Ambient Backdrop ── */}
          <Path
            d="M 25 140 C 15 50, 85 30, 170 35 C 255 25, 325 55, 315 140 C 320 225, 245 265, 170 260 C 85 265, 15 220, 25 140 Z"
            fill="url(#cloudBgGlobe3D)"
          />

          {/* ── The 3D Globe Image Asset (assets/globe.png) ── */}
          <SvgImage
            href={require('../../../assets/globe.png')}
            x="70"
            y="6"
            width="200"
            height="200"
            preserveAspectRatio="xMidYMid meet"
          />

          {/* ── Floating Found Hospital Info Card (Bottom Center) ── */}
          <G id="FoundHospitalTag" transform="translate(68, 210)">
            <Rect
              x="0"
              y="0"
              width="204"
              height="40"
              rx="12"
              fill="url(#nodePillGrad)"
              stroke="#0284C7"
              strokeWidth="1.5"
            />
            <Circle cx="20" cy="20" r="11" fill="#E0F2FE" />
            <SvgText x="14" y="25" fill="#0284C7" fontSize="13">🏥</SvgText>
            <SvgText x="38" y="16" fill="#0F2A4A" fontSize="8.5" fontWeight="bold">
              MSCureChain Network Hospital
            </SvgText>
            <SvgText x="38" y="28" fill="#64748B" fontSize="7">
              1.2 km away  •  Emergency OPD Available
            </SvgText>
            <Circle cx="190" cy="20" r="4" fill="#10B981" />
          </G>

          {/* Ground Platform Baseline */}
          <Path d="M 40 265 Q 170 272 300 265" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
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
