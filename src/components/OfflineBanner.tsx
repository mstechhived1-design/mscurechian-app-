import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { WifiOff, ShieldAlert, ChevronRight, CheckCircle2, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/navigation/types';
import { offlineVaultService } from '@/services/offlineVaultService';

interface OfflineBannerProps {
  style?: any;
  showWhenOnline?: boolean;
}

export default function OfflineBanner({ style, showWhenOnline = false }: OfflineBannerProps) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [isOnline, setIsOnline] = useState<boolean>(offlineVaultService.isOnline());
  const [justReconnected, setJustReconnected] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(offlineVaultService.isOnline() ? 0 : 1));

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = offlineVaultService.addNetworkListener((online) => {
      if (online && !isOnline) {
        // Device just came back online!
        setJustReconnected(true);
        setIsDismissed(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // Auto hide after 3 seconds of reconnection
        reconnectTimer = setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start(() => {
            setJustReconnected(false);
          });
        }, 3200);
      } else if (!online) {
        setIsDismissed(false);
        setJustReconnected(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }

      setIsOnline(online);
    });

    return () => {
      unsubscribe();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [isOnline]);

  if (isDismissed) return null;
  if (isOnline && !justReconnected && !showWhenOnline) return null;

  const handleOpenVault = () => {
    try {
      navigation.navigate('OfflineVault');
    } catch (e) {
      console.warn('[OfflineBanner] Failed to navigate to OfflineVault:', e);
    }
  };

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        justReconnected ? styles.bannerSuccess : styles.bannerOffline,
        { opacity: fadeAnim },
        style,
      ]}
    >
      <TouchableOpacity
        style={styles.contentRow}
        activeOpacity={0.85}
        onPress={justReconnected ? undefined : handleOpenVault}
      >
        <View style={styles.iconCircle}>
          {justReconnected ? (
            <CheckCircle2 size={16} color="#166534" />
          ) : (
            <WifiOff size={16} color="#991B1B" />
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={justReconnected ? styles.titleSuccess : styles.titleOffline}>
            {justReconnected
              ? 'Back Online — Records Synced'
              : 'Zero-Signal Mode Active'}
          </Text>
          <Text style={justReconnected ? styles.subSuccess : styles.subOffline}>
            {justReconnected
              ? 'Cloud sync restored'
              : 'Offline Emergency Vault is ready'}
          </Text>
        </View>

        {!justReconnected && (
          <View style={styles.actionPill}>
            <Text style={styles.actionPillText}>Open Vault</Text>
            <ChevronRight size={14} color="#991B1B" />
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dismissBtn}
        onPress={() => setIsDismissed(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={14} color={justReconnected ? '#166534' : '#991B1B'} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  bannerOffline: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bannerSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  titleOffline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  subOffline: {
    fontSize: 11,
    color: '#B91C1C',
  },
  titleSuccess: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  subSuccess: {
    fontSize: 11,
    color: '#15803D',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginRight: 6,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
    marginRight: 2,
  },
  dismissBtn: {
    padding: 4,
  },
});
