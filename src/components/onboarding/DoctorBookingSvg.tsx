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

export default function DoctorBookingSvg({ width, height }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const slotPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Gentle floating translation for the phone preview card
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
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

    // Subtle breathing pulse on the selected booking slot
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(slotPulseAnim, {
          toValue: 1.05,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slotPulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    pulseLoop.start();

    return () => {
      floatLoop.stop();
      pulseLoop.stop();
    };
  }, [floatAnim, slotPulseAnim]);

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
            {/* Soft Ambient Card Shadow */}
            <RadialGradient id="cardShadow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#005AB5" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#005AB5" stopOpacity="0" />
            </RadialGradient>

            {/* Main Phone Device Glass Gradient */}
            <LinearGradient id="phoneCardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="100%" stopColor="#F8FAFC" />
            </LinearGradient>

            {/* Doctor Avatar 3D Gradient */}
            <LinearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#60A5FA" />
              <Stop offset="50%" stopColor="#2563EB" />
              <Stop offset="100%" stopColor="#1E3A8A" />
            </LinearGradient>

            {/* Button Gradient */}
            <LinearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#005AB5" />
              <Stop offset="100%" stopColor="#2273D9" />
            </LinearGradient>

            {/* Active Date Pill Gradient */}
            <LinearGradient id="activeDateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#005AB5" />
              <Stop offset="100%" stopColor="#0284C7" />
            </LinearGradient>

            {/* Gold Star Gradient */}
            <LinearGradient id="goldStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FCD34D" />
              <Stop offset="100%" stopColor="#F59E0B" />
            </LinearGradient>

            {/* ECG Pulse Gradient */}
            <LinearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#38BDF8" stopOpacity="0.2" />
              <Stop offset="50%" stopColor="#10B981" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#005AB5" stopOpacity="0.2" />
            </LinearGradient>
          </Defs>

          {/* Card Base Shadow */}
          <Circle cx="170" cy="255" r="95" fill="url(#cardShadow)" />

          {/* ── Background Clinic Discovery Halo / Map Elements ── */}
          <G opacity="0.6">
            <Circle cx="70" cy="45" r="30" fill="#E0F2FE" />
            <Circle cx="280" cy="60" r="22" fill="#DCFCE7" />
            {/* Hospital Map Pin */}
            <G transform="translate(62, 34)">
              <Path d="M 8 0 C 3.6 0 0 3.6 0 8 C 0 14 8 22 8 22 C 8 22 16 14 16 8 C 16 3.6 12.4 0 8 0 Z" fill="#005AB5" />
              <Circle cx="8" cy="8" r="3" fill="#FFFFFF" />
            </G>
            {/* Verified Hospital Chip */}
            <G transform="translate(235, 48)">
              <Rect x="0" y="0" width="80" height="20" rx="10" fill="#10B981" opacity="0.15" />
              <SvgText x="40" y="14" fill="#065F46" fontSize="10" fontWeight="700" textAnchor="middle">
                Verified Hub
              </SvgText>
            </G>
          </G>

          {/* ── Central Discovery & Booking Mobile Interface ── */}
          <G transform="translate(45, 20)">
            {/* Phone Card Frame with Outer Stroke */}
            <Rect
              x="0"
              y="0"
              width="250"
              height="225"
              rx="20"
              fill="url(#phoneCardGrad)"
              stroke="#E2E8F0"
              strokeWidth="1.5"
            />

            {/* Doctor Profile Header Row */}
            <G transform="translate(16, 16)">
              {/* Avatar circle */}
              <Circle cx="24" cy="24" r="24" fill="url(#avatarGrad)" />
              {/* Doctor silhouette inside avatar */}
              <Circle cx="24" cy="18" r="7" fill="#FFFFFF" />
              <Path d="M 12 37 C 12 28, 36 28, 36 37 Z" fill="#FFFFFF" />
              {/* Small Stethoscope on avatar */}
              <Path d="M 21 21 C 21 27, 27 27, 27 21" stroke="#38BDF8" strokeWidth="1.2" fill="none" />
              <Circle cx="27" cy="27" r="1.5" fill="#38BDF8" />

              {/* Doctor Details */}
              <SvgText x="58" y="18" fill="#0F172A" fontSize="14" fontWeight="700">
                Dr. Ramesh
              </SvgText>
              <SvgText x="58" y="32" fill="#64748B" fontSize="10" fontWeight="500">
                General Physician • MBBS
              </SvgText>
              <SvgText x="58" y="44" fill="#005AB5" fontSize="9" fontWeight="600">
                Horizin Hospital
              </SvgText>

              {/* Rating Star Badge */}
              <G transform="translate(170, 4)">
                <Rect x="0" y="0" width="44" height="20" rx="6" fill="#FEF3C7" />
                <Path
                  d="M 10 5 L 11.5 8.5 L 15 9 L 12.5 11.5 L 13 15 L 10 13 L 7 15 L 7.5 11.5 L 5 9 L 8.5 8.5 Z"
                  fill="url(#goldStarGrad)"
                />
                <SvgText x="28" y="14" fill="#92400E" fontSize="10" fontWeight="700">
                  5.0
                </SvgText>
              </G>
            </G>

            {/* Divider Line */}
            <Path d="M 16 75 L 234 75" stroke="#F1F5F9" strokeWidth="1.5" />

            {/* Date Selection Bar */}
            <G transform="translate(16, 85)">
              <SvgText x="0" y="12" fill="#334155" fontSize="10" fontWeight="600">
                Select Date
              </SvgText>

              {/* Date Pills */}
              <G transform="translate(0, 20)">
                {/* Pill 1 - Active Date */}
                <Rect x="0" y="0" width="62" height="30" rx="8" fill="url(#activeDateGrad)" />
                <SvgText x="31" y="14" fill="#FFFFFF" fontSize="9" fontWeight="600" textAnchor="middle">
                  TODAY
                </SvgText>
                <SvgText x="31" y="24" fill="#FFFFFF" fontSize="9" fontWeight="800" textAnchor="middle">
                  26 OCT
                </SvgText>

                {/* Pill 2 - Inactive Date */}
                <Rect x="70" y="0" width="62" height="30" rx="8" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
                <SvgText x="101" y="14" fill="#64748B" fontSize="9" fontWeight="600" textAnchor="middle">
                  FRI
                </SvgText>
                <SvgText x="101" y="24" fill="#1E293B" fontSize="9" fontWeight="700" textAnchor="middle">
                  27 OCT
                </SvgText>

                {/* Pill 3 - Inactive Date */}
                <Rect x="140" y="0" width="62" height="30" rx="8" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
                <SvgText x="171" y="14" fill="#64748B" fontSize="9" fontWeight="600" textAnchor="middle">
                  SAT
                </SvgText>
                <SvgText x="171" y="24" fill="#1E293B" fontSize="9" fontWeight="700" textAnchor="middle">
                  28 OCT
                </SvgText>
              </G>
            </G>

            {/* Available Time Slots Section */}
            <G transform="translate(16, 145)">
              <SvgText x="0" y="10" fill="#334155" fontSize="10" fontWeight="600">
                Available Slots
              </SvgText>

              <G transform="translate(0, 18)">
                {/* Slot 1: Highlighted Available Slot */}
                <Rect
                  x="0"
                  y="0"
                  width="100"
                  height="26"
                  rx="6"
                  fill="#ECFDF5"
                  stroke="#10B981"
                  strokeWidth="1.5"
                />
                <Circle cx="12" cy="13" r="3" fill="#10B981" />
                <SvgText x="58" y="17" fill="#065F46" fontSize="10" fontWeight="700" textAnchor="middle">
                  10:30 AM (Open)
                </SvgText>

                {/* Slot 2 */}
                <Rect
                  x="110"
                  y="0"
                  width="98"
                  height="26"
                  rx="6"
                  fill="#F8FAFC"
                  stroke="#CBD5E1"
                  strokeWidth="1"
                />
                <SvgText x="159" y="17" fill="#64748B" fontSize="10" fontWeight="600" textAnchor="middle">
                  11:30 AM
                </SvgText>
              </G>
            </G>

            {/* Bottom Book Button */}
            <G transform="translate(16, 198)">
              <Rect x="0" y="0" width="218" height="20" rx="6" fill="url(#btnGrad)" />
              <SvgText x="109" y="14" fill="#FFFFFF" fontSize="10" fontWeight="700" textAnchor="middle">
                Book Appointment →
              </SvgText>
            </G>
          </G>

          {/* ── Dynamic ECG Heartbeat Stream along Bottom ── */}
          <Path
            d="M 20 255 L 75 255 L 85 240 L 95 270 L 105 245 L 115 255 L 225 255 L 235 242 L 245 268 L 255 255 L 320 255"
            stroke="url(#ecgGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
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
  animatedCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
