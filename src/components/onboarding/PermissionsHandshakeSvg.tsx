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

export default function PermissionsHandshakeSvg({ width, height }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
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
        <Svg width={width} height={height} viewBox="0 0 340 240" fill="none">
          <Defs>
            <RadialGradient id="handshakeCloud" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#F1F5F9" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Soft background shape */}
          <Circle cx="170" cy="120" r="100" fill="url(#handshakeCloud)" />

          {/* ── Floating Badge 1: Top Photos Badge (Red card with mountains) ── */}
          <G id="PhotoBadge" transform="rotate(-6 145 35)">
            <Rect x="120" y="10" width="36" height="26" rx="3" fill="#EF4444" opacity="0.85" />
            <Path d="M 124 30 L 133 20 L 140 27 L 148 18 L 152 30 Z" fill="#FCA5A5" />
            <Circle cx="146" cy="16" r="2.5" fill="#FEF08A" />

            <Rect x="142" y="16" width="32" height="24" rx="3" fill="#DC2626" />
            <Path d="M 146 34 L 153 25 L 160 31 L 166 22 L 170 34 Z" fill="#FCA5A5" />
            <Circle cx="164" cy="20" r="2" fill="#FEF08A" />
          </G>

          {/* ── Floating Badge 2: Center Checkmark Bubble ── */}
          <G id="CheckmarkBubble" transform="translate(150, 42)">
            {/* Bubble Outline */}
            <Path
              d="M 15 5 C 28 5, 38 15, 38 27 C 38 39, 28 47, 15 47 C 11 47, 7 46, 3 43 L -3 47 L -1 40 C -4 36, -6 32, -6 27 C -6 15, 4 5, 15 5 Z"
              fill="#FFFFFF"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            {/* Dark Checkmark */}
            <Path
              d="M 10 27 L 16 33 L 26 21"
              stroke="#0F172A"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>

          {/* ── Floating Badge 3: Left Video Card ── */}
          <G id="VideoBadge" transform="rotate(-12 45 68)">
            <Rect x="25" y="55" width="32" height="22" rx="4" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.2" />
            <Path d="M 38 61 L 46 66 L 38 71 Z" fill="#64748B" />
          </G>

          {/* ── Floating Badge 4: Far Left Mobile Checklist Card ── */}
          <G id="PhoneChecklist" transform="rotate(15 35 130)">
            <Rect x="20" y="105" width="28" height="46" rx="4" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
            <Circle cx="34" cy="110" r="1.5" fill="#94A3B8" />
            {/* List items with orange dots */}
            <Circle cx="26" cy="119" r="2" fill="#EA580C" />
            <Rect x="30" y="118" width="13" height="2" rx="1" fill="#CBD5E1" />

            <Circle cx="26" cy="127" r="2" fill="#EA580C" />
            <Rect x="30" y="126" width="13" height="2" rx="1" fill="#CBD5E1" />

            <Circle cx="26" cy="135" r="2" fill="#EA580C" />
            <Rect x="30" y="134" width="13" height="2" rx="1" fill="#CBD5E1" />

            <Circle cx="26" cy="143" r="2" fill="#EA580C" />
            <Rect x="30" y="142" width="13" height="2" rx="1" fill="#CBD5E1" />
          </G>

          {/* ── Floating Badge 5: Right Post-it / Memo ── */}
          <G id="MemoNote" transform="rotate(8 280 60)">
            <Rect x="260" y="50" width="30" height="34" rx="2" fill="#F87171" opacity="0.9" />
            {/* Memo Lines */}
            <Rect x="265" y="58" width="20" height="2" rx="1" fill="#FEE2E2" />
            <Rect x="265" y="64" width="20" height="2" rx="1" fill="#FEE2E2" />
            <Rect x="265" y="70" width="14" height="2" rx="1" fill="#FEE2E2" />
          </G>

          {/* ── Person Left (Citizen in Blue/Gray Shirt) ── */}
          <G id="CitizenLeft">
            {/* Trousers */}
            <Path d="M 68 200 L 72 240 L 95 240 L 98 200 Z" fill="#0F172A" />
            <Path d="M 100 200 L 102 240 L 122 240 L 120 200 Z" fill="#0F172A" />

            {/* Torso / Gray-Blue Shirt */}
            <Path
              d="M 64 200 L 70 115 C 72 105, 116 105, 118 115 L 124 200 Z"
              fill="#475569"
            />

            {/* Right Arm extending forward for Handshake */}
            <Path
              d="M 112 125 L 158 152 L 154 162 L 108 140 Z"
              fill="#475569"
            />
            {/* Hand */}
            <Circle cx="160" cy="156" r="6.5" fill="#FBBF24" />

            {/* Left Arm by side */}
            <Path d="M 68 122 L 64 165 L 72 165 L 76 130 Z" fill="#475569" />
            <Circle cx="67" cy="168" r="5" fill="#FBBF24" />

            {/* Head */}
            <Circle cx="104" cy="92" r="17" fill="#FBBF24" />
            {/* Wavy Dark Hair */}
            <Path
              d="M 88 92 C 86 75, 102 68, 115 70 C 124 72, 126 84, 122 96 C 117 90, 110 93, 104 96 C 98 94, 92 98, 88 92 Z"
              fill="#0F172A"
            />
            {/* Smile / Eye */}
            <Circle cx="112" cy="90" r="1.5" fill="#0F172A" />
            <Path d="M 110 97 Q 115 101 120 97" stroke="#0F172A" strokeWidth="1.2" fill="none" />
          </G>

          {/* ── Person Right (Healthcare Representative in Orange Suit) ── */}
          <G id="RepresentativeRight">
            {/* Trousers */}
            <Path d="M 205 200 L 208 240 L 228 240 L 230 200 Z" fill="#0F172A" />
            <Path d="M 234 200 L 235 240 L 255 240 L 254 200 Z" fill="#0F172A" />

            {/* Orange Suit Blazer */}
            <Path
              d="M 202 200 L 208 115 C 212 105, 256 105, 260 115 L 264 200 Z"
              fill="#EA580C"
            />
            {/* Inner White Shirt V-Neck */}
            <Path d="M 226 112 L 233 134 L 240 112 Z" fill="#FFFFFF" />

            {/* Left Arm extending forward for Handshake */}
            <Path
              d="M 212 128 L 168 152 L 172 162 L 216 142 Z"
              fill="#EA580C"
            />
            {/* Hand */}
            <Circle cx="166" cy="156" r="6.5" fill="#FBBF24" />

            {/* Right Arm */}
            <Path d="M 258 122 L 264 165 L 256 165 L 252 130 Z" fill="#EA580C" />
            <Circle cx="260" cy="168" r="5" fill="#FBBF24" />

            {/* Head */}
            <Circle cx="230" cy="88" r="17" fill="#FBBF24" />
            {/* Dark Curly Hair */}
            <Path
              d="M 214 88 C 212 70, 230 65, 242 67 C 252 70, 252 82, 248 94 C 242 88, 236 90, 230 94 C 224 92, 218 95, 214 88 Z"
              fill="#0F172A"
            />
            {/* Smile / Eye */}
            <Circle cx="223" cy="86" r="1.5" fill="#0F172A" />
            <Path d="M 219 93 Q 224 97 229 93" stroke="#0F172A" strokeWidth="1.2" fill="none" />
          </G>

          {/* ── Handshake Clasp Detail ── */}
          <Path
            d="M 158 150 C 162 148, 168 148, 172 152 L 168 162 C 164 164, 158 162, 156 158 Z"
            fill="#FBBF24"
            stroke="#D97706"
            strokeWidth="1"
          />
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

