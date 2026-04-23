import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { X, Zap, ZapOff } from 'lucide-react-native';

import { RootStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/designSystem';
import { SanctuaryText } from '@/components/SanctuaryComponents';

const { width } = Dimensions.get('window');
const SCAN_SIZE = width * 0.7;

export default function QRScannerScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  
  // Animation for the scanning line
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
        requestPermission();
    }
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: SCAN_SIZE - 2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [permission]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      console.log('[QRScanner] Scanned Data:', data);
      
      let doctorId = '';
      let hospitalId = '';

      // Support JSON format: {"doctorId": "...", "hospitalId": "..."}
      if (data.startsWith('{')) {
        const json = JSON.parse(data);
        doctorId = json.doctorId;
        hospitalId = json.hospitalId;
      } 
      // Support URL format: mscurechain://book?doctorId=...&hospitalId=...
      else if (data.includes('?')) {
        const query = data.split('?')[1];
        const urlParams = new URLSearchParams(query);
        doctorId = urlParams.get('doctorId') || '';
        hospitalId = urlParams.get('hospitalId') || '';
      }

      if (doctorId && hospitalId) {
        Alert.alert(
          'Doctor Scanned',
          'We found the doctor. Proceed to booking?',
          [
            { text: 'Cancel', onPress: () => setScanned(false), style: 'cancel' },
            { 
              text: 'Book Now', 
              onPress: () => navigation.replace('BookAppointment', { doctorId, hospitalId }) 
            }
          ]
        );
      } else if (hospitalId) {
        Alert.alert(
          'Hospital Scanned',
          'We found the hospital. View available doctors?',
          [
            { text: 'Cancel', onPress: () => setScanned(false), style: 'cancel' },
            { 
              text: 'View Doctors', 
              onPress: () => navigation.replace('BookAppointment', { hospitalId }) 
            }
          ]
        );
      } else {
        throw new Error('Invalid QR code for booking.');
      }
    } catch (error: any) {
      Alert.alert('Invalid QR Code', 'This QR code is not recognized for appointment booking.', [
        { text: 'Try Again', onPress: () => setScanned(false) }
      ]);
    }
  };

  if (!permission) {
    return <View style={styles.base} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <SanctuaryText variant="headline_sm" style={styles.msg}>Camera Access Denied</SanctuaryText>
        <SanctuaryText variant="body_md" style={styles.subMsg}>We need camera access to scan QR codes.</SanctuaryText>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <SanctuaryText variant="label_lg" style={styles.btnTxt}>Grant Permission</SanctuaryText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.base}>
      <StatusBar barStyle="light-content" />
      
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          {/* Top Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <X size={28} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.torchBtn} onPress={() => setTorch(!torch)}>
              {torch ? <Zap size={24} color="#FFD700" /> : <ZapOff size={24} color="#FFF" />}
            </TouchableOpacity>
          </View>

          {/* Scanner Viewport */}
          <View style={styles.viewfinderContainer}>
             <View style={styles.viewfinder}>
                {/* Corner Accents */}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                
                {/* Animated Scanning Line */}
                <Animated.View 
                   style={[
                     styles.scanLine, 
                     { transform: [{ translateY: scanAnim }] }
                   ]} 
                />
             </View>
          </View>

          {/* Bottom Footer Info */}
          <View style={styles.footer}>
            <SanctuaryText variant="headline_sm" style={styles.guideTitle}>Scan Doctor QR</SanctuaryText>
            <SanctuaryText variant="body_md" style={styles.guideSub}>
              Align the doctor's booking QR code inside the frame to jump to appointment booking.
            </SanctuaryText>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

// Helper for styles
const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#FFF' },
  msg: { color: '#1A1C1E', marginBottom: 12 },
  subMsg: { color: '#666', textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnTxt: { color: '#FFF' },
  
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 40 },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  torchBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  
  viewfinderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewfinder: { width: SCAN_SIZE, height: SCAN_SIZE, borderRadius: 20, overflow: 'hidden' },
  
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#FFF', borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 20 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 20 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 20 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 20 },
  
  scanLine: { width: '100%', height: 2, backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 },
  
  footer: { padding: 40, backgroundColor: 'transparent', alignItems: 'center' },
  guideTitle: { color: '#FFF', marginBottom: 8 },
  guideSub: { color: '#CCC', textAlign: 'center', fontSize: 13, lineHeight: 20 },
});
