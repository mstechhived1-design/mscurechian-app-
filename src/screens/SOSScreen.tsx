import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Dimensions, ScrollView, Share, Alert, TextInput } from 'react-native';
import { Text, Surface, IconButton, Avatar, Portal, Modal, Button, ActivityIndicator, Divider, SegmentedButtons } from 'react-native-paper';
import { Phone, ShieldAlert, MapPin, Zap, User, ChevronRight, X, AlertTriangle, Send, CheckCircle2 } from 'lucide-react-native';
import { apiClient, PATIENT_ENDPOINTS, EMERGENCY_ENDPOINTS } from '@/api';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

const SOSScreen = () => {
  const { t } = useTranslation();
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [signalSent, setSignalSent] = useState(false);

  // Form State
  const [emergencyType, setEmergencyType] = useState('Medical');
  const [severity, setSeverity] = useState('HIGH');
  const [symptoms, setSymptoms] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<any>(null);
  const [manualLocation, setManualLocation] = useState('');

  const emergencyTypes = ['MEDICAL', 'ACCIDENT', 'HEART_ATTACK', 'BREATHING', 'OTHER'];
  const severityLevels = [
    { value: 'CRITICAL', label: 'CRITICAL', color: '#E53E3E' },
    { value: 'HIGH', label: 'HIGH', color: '#F6AD55' },
    { value: 'MEDIUM', label: 'MEDIUM', color: '#4299E1' },
    { value: 'LOW', label: 'LOW', color: '#A0AEC0' },
  ];


  const getPinpointLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);

      // Perform reverse geocoding to get human-readable address
      const [addressObj] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (addressObj) {
         const addr = `${addressObj.name || ''} ${addressObj.street || ''}, ${addressObj.city || ''}, ${addressObj.region || ''}`.replace(/,,/g, ',').trim();
         setManualLocation(addr);
      }

      return loc;
    } catch (e) {
      console.error('Location Reverse Fetch Error:', e);
      return null;
    }
  };


  const findInObject = (obj: any, keywords: string[], excludeValues: any[] = []): any => {
    if (!obj) return null;
    const valuesToExclude = excludeValues.map(v => String(v).toLowerCase().trim());
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      const val = obj[key];
      const valStr = String(val).toLowerCase().trim();
      if (keywords.some(kw => lowerKey.includes(kw))) {
        if (typeof val === 'string' || typeof val === 'number') {
           if (!valuesToExclude.includes(valStr)) return val;
        }
      }
    }
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const found = findInObject(obj[key], keywords, excludeValues);
        if (found) return found;
      }
    }
    return null;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hospRes, profRes, dashRes] = await Promise.all([
        apiClient.get(PATIENT_ENDPOINTS.HOSPITALS),
        apiClient.get(PATIENT_ENDPOINTS.PROFILE).catch(() => ({ data: {} })),
        apiClient.get(PATIENT_ENDPOINTS.DASHBOARD_DATA).catch(() => ({ data: {} }))
      ]);
      
      const hList = hospRes.data.data || hospRes.data || [];
      setHospitals(hList);
      if (hList.length > 0) setSelectedHospital(hList[0]);

      const pData = profRes.data.data || profRes.data;
      const dData = dashRes.data.data || dashRes.data;
      const latestAppt = (dData.appointments || dData.appointments?.data || [])[0] || {};
      const combined = { ...pData, ...dData, ...latestAppt };

      // Set default hospital from profile if available
      if (combined.hospital && !selectedHospital) {
         setSelectedHospital({ _id: combined.hospital });
      } else if (hList.length > 0 && !selectedHospital) {
         setSelectedHospital(hList[0]);
      }

      const excludes = [pData?.user?.mobile, pData?.mobile, pData?.user?.email, pData?.user?.name].filter(Boolean);
      const eName = findInObject(combined, ['emergencycontactname', 'emergencyname', 'kinname', 'guardianname', 'contactperson'], excludes);
      const ePhone = findInObject(combined, ['emergencycontactphone', 'emergencyphone', 'kinphone', 'guardianphone', 'emergencymobile', 'contactnumber'], excludes);

      setProfile({ ...combined, emergencyName: eName, emergencyPhone: ePhone });
      getPinpointLocation();
    } catch (err) {
      console.error('[SOS] Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activateSignal = async () => {
    if (!selectedHospital) {
      Alert.alert('Selection Required', 'Please select a hospital to alert.');
      return;
    }

    try {
      setSubmitting(true);
      const loc = await getPinpointLocation();
      
      // POST /emergency/requests/patient payload based on Postman Mockup
      // FINAL FIX - Based on Server Validation Error:
      // emergencyType, description, severity, currentLocation are the required keys.
      const payload = {
        emergencyType: emergencyType,
        description: symptoms || 'Urgent assistance requested via MSCureChain App',
        severity: severity.toLowerCase(),
        currentLocation: manualLocation || 'GPS Position Attached',
        // 'targetHospitals' plural as indicated by error message
        targetHospitals: [selectedHospital._id],
        // 'hospitals' plural as a common fallback
        hospitals: [selectedHospital._id],
        // 'hospitalIds' plural as a common fallback
        hospitalIds: [selectedHospital._id],
        // 'targetHospitalId' singular just in case
        targetHospitalId: selectedHospital._id,
        // Including coordinates as extras just in case
        lat: loc ? loc.coords.latitude : null,
        lng: loc ? loc.coords.longitude : null,
      };





      const response = await apiClient.post(EMERGENCY_ENDPOINTS.TRIGGER, payload);
      
      // Some server versions return 201 or 200 without a 'success' boolean
      if (response.status === 200 || response.status === 201 || response.data?.success) {
        setSignalSent(true);
        setTimeout(() => {
          setModalVisible(false);
          setSignalSent(false);
        }, 3000);
      }
    } catch (err: any) {
      console.log('--- 🚨 SOS DEBUG START (VERSION 10.42) 🚨 ---');
      console.log('Status:', err.status || err.response?.status);
      console.log('Error Data (Direct):', JSON.stringify(err.response?.data));
      console.log('Error Property (Interceptor):', JSON.stringify(err.error));
      console.log('--- 🚨 SOS DEBUG END 🚨 ---');

      const detailedError = err.error || err.response?.data;
      Alert.alert(
        'Signal Status (422)', 
        detailedError ? JSON.stringify(detailedError) : 'Server rejected the request format. Please contact hospital support.'
      );
    } finally {
      setSubmitting(false);
    }



  };

  const callAmbulance = () => {
     Alert.alert('Emergency Call', 'Dial National Ambulance (108)?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 108', onPress: () => Linking.openURL('tel:108'), style: 'destructive' }
     ]);
  };

  const shareSOS = async () => {
    const loc = await getPinpointLocation();
    const mapUrl = loc 
      ? `https://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}` 
      : 'No GPS Signal (Enable Location Services)';
    
    // Constructing a high-detail professional medical alert
    const message = [
      '🚨 EMERGENCY MEDICAL SOS (MSCureChain) 🚨',
      '====================================',
      'IMMEDIATE ASSISTANCE REQUIRED',
      '',
      `👤 Patient: ${profile?.user?.name || 'NOT SPECIFIED'}`,
      `🆔 MRN: #${profile?.mrn || 'N/A'}`,
      `🩸 Blood Group: ${profile?.bloodGroup || 'N/A'}`,
      `⚠️ Allergies: ${profile?.allergies || 'None Recorded'}`,
      '',
      '📍 CRITICAL: EXACT PINPOINT (Open for Map):',
      mapUrl,
      '',
      '🏠 LIVE TRACKING ADDRESS:',
      manualLocation || 'Fetching precise street address...',
      '',
      '====================================',
      'I am in distress and need help. Please respond immediately!'
    ].join('\n');


    try {
      await Share.share({ 
        message, 
        title: 'MSCureChain SOS Alert'
      });
    } catch (error: any) {
       console.error('[SOS] Share Error:', error.message);
    }
  };


  return (
    <View style={styles.container}>
      {/* Red Pulse Header */}
      <Surface style={styles.header} elevation={4}>
         <View style={styles.headerIconBg}>
           <ShieldAlert size={40} color="#FFF" />
         </View>
         <Text variant="headlineMedium" style={styles.headerTitle}>{t('sos.title')}</Text>
         <Text variant="bodyLarge" style={styles.headerSub}>{t('sos.sub')}</Text>
      </Surface>

      <ScrollView contentContainerStyle={styles.content}>
         <TouchableOpacity style={styles.sosCircle} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <View style={styles.ripple1} />
            <View style={styles.ripple2} />
            <Surface style={styles.innerCircle} elevation={5}>
               <Zap size={60} color="#FFF" fill="#FFF" />
               <Text style={styles.sosBtnText}>SIGNAL</Text>
            </Surface>
         </TouchableOpacity>

         <View style={styles.btnRow}>
            <TouchableOpacity style={styles.assistBtn} onPress={callAmbulance}>
               <IconButton icon="ambulance" iconColor="#E53E3E" style={{ backgroundColor: '#FFF5F5' }} />
               <View style={styles.assistTexts}>
                  <Text style={styles.assistTitle}>Call 108</Text>
                  <Text style={styles.assistSub}>{t('sos.emergencyCall')}</Text>
               </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.assistBtn} onPress={shareSOS}>
               <IconButton icon="share-variant" iconColor="#006AF5" style={{ backgroundColor: '#EBF4FF' }} />
               <View style={styles.assistTexts}>
                  <Text style={styles.assistTitle}>{t('common.emergency')}</Text>
                  <Text style={styles.assistSub}>{t('sos.activeSignal')}</Text>
               </View>
            </TouchableOpacity>
         </View>

         <View style={styles.infoSection}>
            <Text style={styles.sectionLabel}>EMERGENCY CONTACT</Text>
            <Surface style={styles.infoCard} elevation={2}>
               <View style={styles.cardInfoRow}>
                  <Avatar.Icon size={40} icon="account-alert" style={styles.contactAvatar} />
                  <View style={styles.contactDetails}>
                     <Text style={styles.contactName}>{profile?.emergencyName || 'No Contact Found'}</Text>
                     <Text style={styles.contactPhone}>{profile?.emergencyPhone || 'Register at Reception'}</Text>
                  </View>
                  <IconButton 
                    icon="phone" 
                    mode="contained" 
                    containerColor="#E53E3E" 
                    iconColor="#FFF" 
                    onPress={() => profile?.emergencyPhone && Linking.openURL(`tel:${profile.emergencyPhone}`)} 
                  />
               </View>
            </Surface>
         </View>
      </ScrollView>

      {/* EMERGENCY FORM MODAL (Matches Mockup) */}
      <Portal>
         <Modal 
            visible={modalVisible} 
            onDismiss={() => !submitting && setModalVisible(false)} 
            contentContainerStyle={styles.modalContainer}
         >
            <Surface style={styles.modalContent}>
               {signalSent ? (
                  <View style={styles.successContainer}>
                     <CheckCircle2 size={80} color="#38A169" />
                     <Text style={styles.successTitle}>{t('sos.activeSignal')}</Text>
                     <Text style={styles.successSub}>{t('sos.connecting')}</Text>
                  </View>
               ) : (
                  <ScrollView style={{ flex: 1 }}>
                     {/* Form Header */}
                     <View style={styles.formHeader}>
                        <View style={styles.formTitleRow}>
                           <Zap size={24} color="#FFF" />
                           <View>
                              <Text style={styles.formHeaderText}>{t('sos.title')}</Text>
                              <Text style={styles.formHeaderSub}>{t('sos.sub')}</Text>
                           </View>
                        </View>
                        <IconButton icon="close" iconColor="#FFF" size={24} onPress={() => setModalVisible(false)} />
                     </View>

                     <View style={styles.formBody}>
                        {/* Type & Severity */}
                        <View style={styles.formRow}>
                           <View style={{ flex: 1.2 }}>
                              <Text style={styles.inputLabel}>EMERGENCY TYPE *</Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                                 {emergencyTypes.map(t => (
                                    <TouchableOpacity 
                                       key={t} 
                                       style={[styles.typeBadge, emergencyType === t && styles.typeBadgeActive]}
                                       onPress={() => setEmergencyType(t)}
                                    >
                                       <Text style={[styles.typeText, emergencyType === t && styles.typeTextActive]}>{t}</Text>
                                    </TouchableOpacity>
                                 ))}
                              </ScrollView>
                           </View>
                        </View>

                        <Text style={styles.inputLabel}>SEVERITY LEVEL</Text>
                        <View style={styles.severityGrid}>
                           {severityLevels.map(s => (
                              <TouchableOpacity 
                                 key={s.value} 
                                 style={[
                                    styles.severityBtn, 
                                    severity === s.value && { backgroundColor: s.color, borderColor: s.color }
                                 ]}
                                 onPress={() => setSeverity(s.value)}
                              >
                                 <Text style={[styles.severityText, severity === s.value && { color: '#FFF' }]}>{s.label}</Text>
                              </TouchableOpacity>
                           ))}
                        </View>

                        {/* Location */}
                        <Text style={styles.inputLabel}>CURRENT LOCATION *</Text>
                        <View style={styles.locationInputBox}>
                           <MapPin size={18} color="#E53E3E" />
                           <TextInput 
                              style={styles.textInput}
                              placeholder="Fetching precise location..."
                              placeholderTextColor="#999"
                              value={manualLocation}
                              onChangeText={setManualLocation}
                           />

                        </View>

                        {/* Hospital Picker */}
                        <Text style={styles.inputLabel}>ALERT HOSPITALS *</Text>
                        <View style={styles.hospitalGrid}>
                           {hospitals.map(h => (
                              <TouchableOpacity 
                                 key={h._id} 
                                 style={[styles.hospSelect, selectedHospital?._id === h._id && styles.hospSelectActive]}
                                 onPress={() => setSelectedHospital(h)}
                              >
                                 <View style={styles.hospTitleRow}>
                                    <IconButton icon="hospital-building" size={16} />
                                    <Text style={[styles.hospNameText, selectedHospital?._id === h._id && { color: '#006AF5' }]} numberOfLines={1}>
                                       {h.name}
                                    </Text>
                                 </View>
                                 {selectedHospital?._id === h._id && <IconButton icon="check-circle" iconColor="#006AF5" size={16} />}
                              </TouchableOpacity>
                           ))}
                        </View>

                        {/* Symptoms */}
                        <Text style={styles.inputLabel}>SYMPTOMS / SITUATION *</Text>
                        <TextInput 
                           style={styles.areaInput}
                           multiline
                           placeholder="Briefly explain..."
                           value={symptoms}
                           onChangeText={setSymptoms}
                        />

                        {/* Submit */}
                        <Button 
                           mode="contained" 
                           style={styles.activateBtn} 
                           contentStyle={styles.activateBtnContent}
                           loading={submitting}
                           disabled={submitting}
                           onPress={activateSignal}
                        >
                           <Send size={20} color="#FFF" />  ACTIVATE SIGNAL
                        </Button>
                        <Text style={styles.footerHint}>IMMEDIATE ALERT WILL BE SENT TO HOSPITAL HELPDESK</Text>
                     </View>
                  </ScrollView>
               )}
            </Surface>
         </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { 
     backgroundColor: '#E53E3E', 
     paddingTop: 60, 
     paddingBottom: 30, 
     alignItems: 'center', 
     borderBottomLeftRadius: 30,
     borderBottomRightRadius: 30,
  },
  headerIconBg: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontWeight: 'bold', color: '#FFF' },
  headerSub: { color: 'rgba(255,255,255,0.8)' },
  content: { alignItems: 'center', padding: 20 },
  sosCircle: {
     width: 180,
     height: 180,
     justifyContent: 'center',
     alignItems: 'center',
     marginVertical: 40,
  },
  innerCircle: {
     width: 140,
     height: 140,
     borderRadius: 70,
     backgroundColor: '#E53E3E',
     justifyContent: 'center',
     alignItems: 'center',
     elevation: 10,
  },
  sosBtnText: { color: '#FFF', fontWeight: 'bold', letterSpacing: 2, marginTop: 5 },
  ripple1: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(229, 62, 62, 0.1)' },
  ripple2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(229, 62, 62, 0.05)' },
  btnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 30 },
  assistBtn: { 
     flexDirection: 'row', 
     alignItems: 'center', 
     backgroundColor: '#FFF', 
     padding: 10, 
     borderRadius: 15,
     width: '48%',
     elevation: 2,
  },
  assistTexts: { flex: 1 },
  assistTitle: { fontWeight: 'bold', fontSize: 13 },
  assistSub: { fontSize: 10, color: '#666' },
  infoSection: { width: '100%' },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#888', marginBottom: 10, paddingLeft: 5 },
  infoCard: { padding: 15, borderRadius: 20, backgroundColor: '#FFF' },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center' },
  contactAvatar: { backgroundColor: '#FEE2E2' },
  contactDetails: { flex: 1, marginLeft: 15 },
  contactName: { fontWeight: 'bold', fontSize: 16 },
  contactPhone: { fontSize: 12, color: '#666' },

  // Form Styles
  modalContainer: { height: height * 0.9, backgroundColor: 'transparent' },
  modalContent: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  formHeader: { backgroundColor: '#E53E3E', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTitleRow: { flexDirection: 'row', alignItems: 'center' },
  formHeaderText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  formHeaderSub: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 'bold' },
  formBody: { padding: 20 },
  inputLabel: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 8, marginTop: 15 },
  typeScroll: { marginBottom: 10 },
  typeBadge: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F0F0F0', marginRight: 10 },
  typeBadgeActive: { backgroundColor: '#E53E3E' },
  typeText: { fontSize: 13, color: '#333' },
  typeTextActive: { color: '#FFF' },
  severityGrid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  severityBtn: { width: '48%', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#EEE', marginBottom: 10, alignItems: 'center' },
  severityText: { fontWeight: 'bold', fontSize: 12, color: '#666' },
  locationInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: '#EEE' },
  textInput: { flex: 1, padding: 12, fontSize: 14 },
  hospitalGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  hospSelect: { width: '48%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 15, marginBottom: 10, paddingHorizontal: 5, borderWidth: 1, borderColor: '#EEE' },
  hospSelectActive: { borderColor: '#006AF5', backgroundColor: '#F0F7FF' },
  hospTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  hospNameText: { fontSize: 11, fontWeight: 'bold', color: '#555' },
  areaInput: { backgroundColor: '#F8F9FA', borderRadius: 15, padding: 15, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#EEE' },
  activateBtn: { marginTop: 20, backgroundColor: '#E53E3E', borderRadius: 15 },
  activateBtnContent: { height: 55 },
  formRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  footerHint: { textAlign: 'center', fontSize: 10, color: '#888', marginTop: 15, fontWeight: 'bold' },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#38A169', marginTop: 20 },
  successSub: { color: '#666', textAlign: 'center', marginTop: 10 },
});

export default SOSScreen;



