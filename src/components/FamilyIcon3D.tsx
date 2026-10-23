import React from 'react';
import { View, StyleSheet } from 'react-native';
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

interface FamilyIcon3DProps {
  size?: number;
}

export default function FamilyIcon3D({ size = 44 }: FamilyIcon3DProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Base Platform Shadow */}
          <RadialGradient id="famShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#0F172A" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
          </RadialGradient>

          {/* Father Avatar Gradient (Navy / Deep Azure 3D sphere) */}
          <RadialGradient id="fatherGrad" cx="35%" cy="30%" r="65%">
            <Stop offset="0%" stopColor="#60A5FA" />
            <Stop offset="45%" stopColor="#2563EB" />
            <Stop offset="90%" stopColor="#1E3A8A" />
            <Stop offset="100%" stopColor="#172554" />
          </RadialGradient>

          {/* Mother Avatar Gradient (Rose / Orchid Violet 3D sphere) */}
          <RadialGradient id="motherGrad" cx="35%" cy="30%" r="65%">
            <Stop offset="0%" stopColor="#F472B6" />
            <Stop offset="45%" stopColor="#DB2777" />
            <Stop offset="90%" stopColor="#9D174D" />
            <Stop offset="100%" stopColor="#831843" />
          </RadialGradient>

          {/* Child Avatar Gradient (Sunny Cyan / Emerald 3D sphere) */}
          <RadialGradient id="childGrad" cx="35%" cy="30%" r="65%">
            <Stop offset="0%" stopColor="#6EE7B7" />
            <Stop offset="45%" stopColor="#10B981" />
            <Stop offset="90%" stopColor="#047857" />
            <Stop offset="100%" stopColor="#064E3B" />
          </RadialGradient>

          {/* Golden Heart Shield 3D Gradient */}
          <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FDE047" />
            <Stop offset="50%" stopColor="#EAB308" />
            <Stop offset="100%" stopColor="#CA8A04" />
          </LinearGradient>

          {/* Specular White Highlight */}
          <LinearGradient id="specular" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Soft Base Shadow */}
        <Circle cx="50" cy="88" r="32" fill="url(#famShadow)" />

        {/* ── Father (Center Left) ── */}
        <G>
          {/* Father Body */}
          <Path
            d="M 16 78 C 16 58, 44 58, 44 78 Z"
            fill="url(#fatherGrad)"
          />
          {/* Father Head */}
          <Circle cx="30" cy="44" r="16" fill="url(#fatherGrad)" />
          {/* Father Specular Shine */}
          <Circle cx="26" cy="38" r="5" fill="url(#specular)" />
          {/* Father Hair Arc */}
          <Path
            d="M 18 42 C 18 30, 40 30, 42 42 C 38 35, 22 35, 18 42 Z"
            fill="#1E293B"
          />
        </G>

        {/* ── Mother (Center Right) ── */}
        <G>
          {/* Mother Body */}
          <Path
            d="M 44 80 C 44 60, 72 60, 72 80 Z"
            fill="url(#motherGrad)"
          />
          {/* Mother Head */}
          <Circle cx="58" cy="46" r="15" fill="url(#motherGrad)" />
          {/* Mother Specular Shine */}
          <Circle cx="54" cy="41" r="4.5" fill="url(#specular)" />
          {/* Mother Hair / Bangs */}
          <Path
            d="M 45 46 C 45 32, 69 32, 71 46 C 65 37, 51 37, 45 46 Z"
            fill="#581C87"
          />
        </G>

        {/* ── Child (Front Center) ── */}
        <G>
          {/* Child Body */}
          <Path
            d="M 34 84 C 34 68, 64 68, 64 84 Z"
            fill="url(#childGrad)"
          />
          {/* Child Head */}
          <Circle cx="49" cy="62" r="12" fill="url(#childGrad)" />
          {/* Child Specular Shine */}
          <Circle cx="46" cy="58" r="3.5" fill="url(#specular)" />
        </G>

        {/* ── 3D Golden Heart Badge at Bottom Right ── */}
        <G transform="translate(62, 58) scale(0.38)">
          {/* Heart Drop Shadow */}
          <Path
            d="M 30 15 C 30 5, 45 0, 50 15 C 55 0, 70 5, 70 15 C 70 30, 50 45, 50 50 C 50 45, 30 30, 30 15 Z"
            fill="#000000"
            opacity="0.25"
            transform="translate(2, 4)"
          />
          {/* Heart Main Body */}
          <Path
            d="M 30 15 C 30 5, 45 0, 50 15 C 55 0, 70 5, 70 15 C 70 30, 50 45, 50 50 C 50 45, 30 30, 30 15 Z"
            fill="url(#goldGrad)"
          />
          {/* Heart Specular Shine */}
          <Path
            d="M 34 16 C 34 9, 44 5, 48 15 C 44 9, 36 10, 34 16 Z"
            fill="#FFFFFF"
            opacity="0.8"
          />
        </G>
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
