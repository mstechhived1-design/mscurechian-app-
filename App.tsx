import { StyleSheet, StatusBar, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
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

import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { SocketProvider } from './src/context/SocketContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import { COLORS } from './src/constants/designSystem';
import { DigitalAtriumLoader } from './src/components/SanctuaryComponents';
import './src/utils/i18n';

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
    return <DigitalAtriumLoader />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
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
  root: { flex: 1 },
});
