import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Building2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface HospitalBuildingCarouselProps {
  images?: string[];
  width?: number;
  height?: number;
  borderRadius?: number;
  onPress?: () => void;
}

export const HospitalBuildingCarousel: React.FC<HospitalBuildingCarouselProps> = ({
  images = [],
  width = 110,
  height = 96,
  borderRadius = 14,
  onPress,
}) => {
  const validImages = (images || []).filter((img) => typeof img === 'string' && img.trim().length > 0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (validImages.length <= 1) return;

    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((prev) => (prev + 1) % validImages.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }).start();
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [validImages.length, fadeAnim]);

  const handleNext = () => {
    if (validImages.length <= 1) {
      if (onPress) onPress();
      return;
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex((prev) => (prev + 1) % validImages.length);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  };

  // 1. Fallback when no building images exist
  if (validImages.length === 0) {
    return (
      <View style={[styles.container, { width, height, borderRadius }]}>
        <LinearGradient
          colors={['#E0E7FF', '#C7D2FE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.placeholder}
        >
          <Building2 size={32} color="#4F46E5" />
        </LinearGradient>
      </View>
    );
  }

  // 2. Exactly one image: display cleanly without indicators or transitions
  if (validImages.length === 1) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.container, { width, height, borderRadius }]}
      >
        <Image
          source={{ uri: validImages[0] }}
          style={styles.image}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  // 3. Multiple images: auto-rotating carousel with crossfade & indicator dots
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handleNext}
      style={[styles.container, { width, height, borderRadius }]}
    >
      <Animated.Image
        source={{ uri: validImages[currentIndex] }}
        style={[styles.image, { opacity: fadeAnim }]}
        resizeMode="cover"
      />

      {/* Subtle indicator dots */}
      <View style={styles.dotsRow}>
        {validImages.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              idx === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    position: 'relative',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 5,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 12,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
});
