import { StyleSheet, StatusBar, View, Text, Platform, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  X,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  Share2,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  Building2,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  Circle,
  CheckSquare,
  Square,
  Search,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  Heart,
  Activity,
  FileText,
} from 'lucide-react-native';

import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { SocketProvider } from './src/context/SocketContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import { COLORS } from './src/constants/designSystem';
import { DigitalAtriumLoader } from './src/components/SanctuaryComponents';
import './src/utils/i18n';

// Ignore known third-party library deprecation and Expo Go environment warnings
LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
  '[expo-notifications] Push notifications',
  'Push notifications (remote notifications) are unavailable in Expo Go',
]);

// ── Global Web Scroll & Layout Engine (Guarantees scrolling on PC, Mac, Tablet, Mobile) ──
if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
  const styleId = 'mscurechain-web-scroll-fix';
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.textContent = `
    html, body, #root, #root > div {
      height: 100% !important;
      max-height: 100vh !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }
    [data-focusable="true"], [tabindex] {
      outline: none;
    }
    * {
      box-sizing: border-box;
    }
    /* Force every React Native flex: 1 container to shrink to screen height and never expand past 100vh */
    div[style*="flex: 1"],
    div[class*="r-flex-13awgt0"] {
      min-height: 0 !important;
    }
    /* Ensure ScrollView containers can scroll smoothly with native scrollbars */
    div[class*="r-overflowY-156q2hu"],
    div[style*="overflow-y: auto"],
    div[style*="overflow-y: scroll"] {
      -webkit-overflow-scrolling: touch !important;
      overscroll-behavior-y: contain !important;
      min-height: 0 !important;
      flex: 1 1 0% !important;
    }
    /* Visible, sleek scrollbar on web so users can see position and drag scrollbar */
    ::-webkit-scrollbar {
      width: 8px !important;
      height: 8px !important;
      display: block !important;
    }
    ::-webkit-scrollbar-track {
      background: rgba(241, 245, 249, 0.6) !important;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(100, 116, 139, 0.5) !important;
      border-radius: 6px !important;
      border: 2px solid transparent !important;
      background-clip: content-box !important;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(71, 85, 105, 0.8) !important;
    }
  `;

  // Helper to find the nearest scrollable ancestor in DOM
  const findScrollContainer = (node: HTMLElement | null): HTMLElement | null => {
    while (node && node !== document.body && node !== document.documentElement) {
      const computed = window.getComputedStyle(node);
      const isScrollable = (computed.overflowY === 'auto' || computed.overflowY === 'scroll') && node.scrollHeight > node.clientHeight;
      if (isScrollable) return node;
      node = node.parentElement;
    }
    return null;
  };

  // Guarantee mouse wheel scrolling even when inner components intercept
  window.addEventListener(
    'wheel',
    (e: WheelEvent) => {
      const container = findScrollContainer(e.target as HTMLElement);
      if (container) {
        container.scrollTop += e.deltaY;
      }
    },
    { passive: true }
  );

  // Mouse Drag-To-Scroll (swipes like a mobile phone when dragging with desktop mouse)
  let isDown = false;
  let startY = 0;
  let startScrollTop = 0;
  let activeContainer: HTMLElement | null = null;

  window.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return;
    const container = findScrollContainer(e.target as HTMLElement);
    if (!container) return;
    activeContainer = container;
    isDown = true;
    startY = e.clientY;
    startScrollTop = container.scrollTop;
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDown || !activeContainer) return;
    const delta = e.clientY - startY;
    if (Math.abs(delta) > 3) {
      activeContainer.scrollTop = startScrollTop - delta;
    }
  });

  const endDrag = () => {
    isDown = false;
    activeContainer = null;
  };

  window.addEventListener('mouseup', endDrag);
  window.addEventListener('mouseleave', endDrag);
}

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    accent: COLORS.secondary,
    background: COLORS.surface,
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: { fontFamily: 'Inter_400Regular' },
    medium: { fontFamily: 'Inter_600SemiBold' },
  }
};

/**
 * Pure SVG Icon Renderer for React Native Paper.
 * Completely eliminates ExpoAsset.downloadAsync for MaterialCommunityIcons.ttf.
 */
const renderPaperIcon = (props: { name: any; color?: string; size?: number }) => {
  const { name, color = '#64748B', size = 20 } = props;

  if (typeof name !== 'string') {
    if (typeof name === 'function') {
      const CustomIcon = name;
      return <CustomIcon {...props} />;
    }
    return React.isValidElement(name) ? name : null;
  }

  switch (name) {
    case 'close':
    case 'close-circle':
    case 'close-circle-outline':
      return <X size={size} color={color} />;
    case 'calendar':
    case 'calendar-month':
      return <Calendar size={size} color={color} />;
    case 'ambulance':
      return <AlertTriangle size={size} color={color} />;
    case 'shield-alert':
      return <ShieldAlert size={size} color={color} />;
    case 'share-variant':
    case 'share':
      return <Share2 size={size} color={color} />;
    case 'account-alert':
    case 'account':
      return <User size={size} color={color} />;
    case 'phone':
      return <Phone size={size} color={color} />;
    case 'map-marker-radius':
    case 'map-marker':
      return <MapPin size={size} color={color} />;
    case 'check-circle':
    case 'check-circle-outline':
    case 'check':
      return <CheckCircle2 size={size} color={color} />;
    case 'hospital-building':
    case 'hospital':
      return <Building2 size={size} color={color} />;
    case 'alert-circle':
    case 'alert-circle-outline':
      return <AlertCircle size={size} color={color} />;
    case 'shield-lock':
      return <ShieldCheck size={size} color={color} />;
    case 'eye':
      return <Eye size={size} color={color} />;
    case 'eye-off':
      return <EyeOff size={size} color={color} />;
    case 'magnify':
      return <Search size={size} color={color} />;
    case 'arrow-left':
      return <ArrowLeft size={size} color={color} />;
    case 'chevron-down':
      return <ChevronDown size={size} color={color} />;
    case 'chevron-right':
      return <ChevronRight size={size} color={color} />;
    case 'radiobox-marked':
      return <CheckCircle2 size={size} color={color} />;
    case 'radiobox-blank':
      return <Circle size={size} color={color} />;
    case 'checkbox-marked':
      return <CheckSquare size={size} color={color} />;
    case 'checkbox-blank-outline':
      return <Square size={size} color={color} />;
    case 'clock-outline':
    case 'clock':
      return <Clock size={size} color={color} />;
    case 'heart':
      return <Heart size={size} color={color} />;
    case 'pulse':
      return <Activity size={size} color={color} />;
    case 'file-document':
      return <FileText size={size} color={color} />;
    default:
      return <Activity size={size} color={color} />;
  }
};

export default function App() {
  let [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return <DigitalAtriumLoader message="Launching MS CureChain..." subMessage="Digitalize the curing process" />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PaperProvider
          theme={theme}
          settings={{
            icon: renderPaperIcon as any,
          }}
        >
          <ErrorBoundary>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
            <NavigationContainer ref={navigationRef}>
              <SocketProvider>
                <AppNavigator />
              </SocketProvider>
            </NavigationContainer>
          </ErrorBoundary>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, height: '100%', minHeight: 0 },
});
