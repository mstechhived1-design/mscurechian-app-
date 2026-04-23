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
  const [selectedHospitalIds, setSelectedHospitalIds] = useState<string[]>([]);
  const [manualLocation, setManualLocation] = useState('');
  const [nearestHospitals, setNearestHospitals] = useState<any[]>([]);

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

  const updateNearestHospitals = (currentLoc: any, hospitalList: any[]) => {
    if (!currentLoc || !hospitalList.length) return;
    
    const withDistance = hospitalList.map(h => {
      if (!h.location?.lat || !h.location?.lng) return { ...h, distance: 9999 };
      
      const d = calculateDistance(
        currentLoc.coords.latitude, 
        currentLoc.coords.longitude,
        h.location.lat, 
        h.location.lng
      );
      return { ...h, distance: d };
    });

    const sorted = [...withDistance].sort((a, b) => a.distance - b.distance);
    setNearestHospitals(sorted.slice(0, 3)); // Top 3 nearest
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
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

      const pData = profRes.data.data || profRes.data;
      const dData = dashRes.data.data || dashRes.data;
      const latestAppt = (dData.appointments || dData.appointments?.data || [])[0] || {};
      const combined = { ...pData, ...dData, ...latestAppt };

      // Get all hospitals the patient is registered with across all profiles
      const allLinkedHospitals = [
        ...(dData.profiles || []),
        pData 
      ].map((p: any) => p?.hospital?._id || p?.hospital).filter(Boolean);
      
      const uniqueRegisteredIds = Array.from(new Set(allLinkedHospitals));
      
      // Set default hospitals ONLY from profile registrations
      // For global patients with no registrations, we keep it empty so handleSignalPress opens the Modal/Form
      if (selectedHospitalIds.length === 0) {
        if (uniqueRegisteredIds.length > 0) {
          setSelectedHospitalIds(uniqueRegisteredIds as string[]);
        }
      }

      const excludes = [pData?.user?.mobile, pData?.mobile, pData?.user?.email, pData?.user?.name].filter(Boolean);
      const eName = combined.user?.emergencyContactName || findInObject(combined, ['emergencycontactname', 'emergencyname', 'kinname', 'guardianname', 'contactperson'], excludes);
      const ePhone = combined.user?.emergencyContactPhone || findInObject(combined, ['emergencycontactphone', 'emergencyphone', 'kinphone', 'guardianphone', 'emergencymobile', 'contactnumber'], excludes);

      setProfile({ ...combined, emergencyName: eName, emergencyPhone: ePhone });
      const currentLoc = await getPinpointLocation();
      if (currentLoc) {
        updateNearestHospitals(currentLoc, hList);
      }
    } catch (err) {
      console.error('[SOS] Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSignalPress = async () => {
    // If patient is already linked to a hospital (Registered via Hospital Admins)
    // We send an instant signal with automated details
    if (profile?.hospital || selectedHospitalIds.length > 0) {
      const confirmed = await new Promise((resolve) => {
        const hospitalNames = hospitals
          .filter(h => selectedHospitalIds.includes(h._id))
          .map(h => h.name)
          .join(', ');

        Alert.alert(
          'Instant SOS',
          `Send emergency signal to ${hospitalNames || 'your registered hospitals'}?`,
          [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { text: 'SEND SIGNAL', onPress: () => resolve(true), style: 'destructive' }
          ]
        );
      });

      if (confirmed) {
        // IDs are already set in selectedHospitalIds during fetchData
        // Set default emergency details
        setEmergencyType('MEDICAL');
        setSeverity('CRITICAL');
        setSymptoms('INSTANT SOS TRIGGERED BY PATIENT (MULTI-HOSPITAL)');
        
        // Activate immediately
        await activateSignal(true);
      }
    } else {
      // Global patient: show form so they can pick hospital and provide details
      setModalVisible(true);
    }
  };

  const activateSignal = async (isFastTrack = false) => {
    // Use either the current selected hospitals or the profile's linked hospital
    const targetIds = isFastTrack ? [profile?.hospital?._id || profile?.hospital] : selectedHospitalIds;

    if (!targetIds || targetIds.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one hospital to alert.');
      return;
    }

    try {
      setSubmitting(true);
      const loc = await getPinpointLocation();
      
      const payload = {
        emergencyType: emergencyType,
        description: symptoms || 'Urgent assistance requested via MSCureChain App',
        severity: severity.toLowerCase(),
        currentLocation: manualLocation || 'GPS Position Attached',
        targetHospitals: targetIds,
        hospitals: targetIds,
        hospitalIds: targetIds,
        lat: loc ? loc.coords.latitude : null,
        lng: loc ? loc.coords.longitude : null,
      };





      const response = await apiClient.post(EMERGENCY_ENDPOINTS.TRIGGER, payload);
      
      if (response.status === 200 || response.status === 201 || response.data?.success) {
        setSignalSent(true);
        // If it was a fast track, we might need to show the modal just for the success state
        if (isFastTrack) setModalVisible(true);
        
        setTimeout(() => {
          setModalVisible(false);
          setSignalSent(false);
        }, 3000);
      }
    } catch (err: any) {
      console.error('[SOS] Trigger Error:', err);
      Alert.alert('Failed to send signal', 'Please check your connection or call emergency services directly.');
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
      `🩸 Blood Group: ${profile?.user?.bloodGroup || profile?.bloodGroup || 'N/A'}`,
      `⚠️ Allergies: ${profile?.user?.allergies || profile?.allergies || 'None Recorded'}`,
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
         <TouchableOpacity 
            style={styles.sosCircle} 
            onPress={handleSignalPress} 
            activeOpacity={0.8}
            disabled={submitting}
          >
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

          <View style={[styles.infoSection, { marginTop: 20 }]}>
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
                        {nearestHospitals.length > 0 && (
                          <>
                            <View style={styles.sectionHeaderRow}>
                              <Text style={styles.inputLabel}>NEAREST HOSPITALS (TOP PRIORITY)</Text>
                              <Button 
                                compact 
                                onPress={() => {
                                  const nearIds = nearestHospitals.map(h => h._id);
                                  const allSelected = nearIds.every(id => selectedHospitalIds.includes(id));
                                  if (allSelected) {
                                    setSelectedHospitalIds(selectedHospitalIds.filter(id => !nearIds.includes(id)));
                                  } else {
                                    setSelectedHospitalIds(Array.from(new Set([...selectedHospitalIds, ...nearIds])));
                                  }
                                }}
                              >
                                {nearestHospitals.map(h => h._id).every(id => selectedHospitalIds.includes(id)) ? 'Deselect all' : 'Select all'}
                              </Button>
                            </View>
                            <View style={styles.hospitalGrid}>
                              {nearestHospitals.map(h => {
                                const isSelected = selectedHospitalIds.includes(h._id);
                                return (
                                  <TouchableOpacity 
                                    key={`near-${h._id}`} 
                                    style={[styles.hospSelect, isSelected && styles.hospSelectActive]}
                                      onPress={() => {
                                        if (isSelected) {
                                          setSelectedHospitalIds(selectedHospitalIds.filter(id => id !== h._id));
                                        } else {
                                          setSelectedHospitalIds([...selectedHospitalIds, h._id]);
                                        }
                                      }}
                                  >
                                    <View style={styles.hospTitleRow}>
                                        <IconButton icon="map-marker-radius" iconColor={isSelected ? '#006AF5' : '#E53E3E'} size={18} />
                                        <Text style={[styles.hospNameText, isSelected && { color: '#006AF5' }]} numberOfLines={1}>
                                          {h.name} ({h.distance.toFixed(1)}km)
                                        </Text>
                                    </View>
                                    {isSelected && <IconButton icon="check-circle" iconColor="#006AF5" size={18} />}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </>
                        )}

                        <View style={styles.sectionHeaderRow}>
                          <Text style={styles.inputLabel}>OTHER REGISTERED HOSPITALS</Text>
                          <Button 
                            compact 
                            onPress={() => {
                              const otherIds = hospitals.filter(h => !nearestHospitals.some(nh => nh._id === h._id)).map(h => h._id);
                              const allSelected = otherIds.every(id => selectedHospitalIds.includes(id));
                              if (allSelected) {
                                setSelectedHospitalIds(selectedHospitalIds.filter(id => !otherIds.includes(id)));
                              } else {
                                setSelectedHospitalIds(Array.from(new Set([...selectedHospitalIds, ...otherIds])));
                              }
                            }}
                          >
                            {hospitals.filter(h => !nearestHospitals.some(nh => nh._id === h._id)).map(h => h._id).every(id => selectedHospitalIds.includes(id)) ? 'Deselect all' : 'Select all'}
                          </Button>
                        </View>
                        <View style={styles.hospitalGrid}>
                           {hospitals
                             .filter(h => !nearestHospitals.some(nh => nh._id === h._id))
                             .map(h => {
                               const isSelected = selectedHospitalIds.includes(h._id);
                               return (
                                <TouchableOpacity 
                                   key={h._id} 
                                   style={[styles.hospSelect, isSelected && styles.hospSelectActive]}
                                   onPress={() => {
                                      if (isSelected) {
                                        setSelectedHospitalIds(selectedHospitalIds.filter(id => id !== h._id));
                                      } else {
                                        setSelectedHospitalIds([...selectedHospitalIds, h._id]);
                                      }
                                   }}
                                >
                                   <View style={styles.hospTitleRow}>
                                      <IconButton icon="hospital-building" iconColor={isSelected ? '#006AF5' : '#666'} size={18} />
                                      <Text style={[styles.hospNameText, isSelected && { color: '#006AF5' }]} numberOfLines={1}>
                                         {h.name}
                                      </Text>
                                   </View>
                                   {isSelected && <IconButton icon="check-circle" iconColor="#006AF5" size={18} />}
                                </TouchableOpacity>
                               );
                             })}
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
                           onPress={() => activateSignal(false)}
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
  hospNameText: { fontSize: 13, fontWeight: '700', color: '#334155', flex: 1 },
  areaInput: { backgroundColor: '#F8F9FA', borderRadius: 15, padding: 15, height: 100, textAlignVertical: 'top', borderWidth: 1.5, borderColor: '#E2E8F0', fontSize: 15, color: '#1E293B' },
  activateBtn: { marginTop: 25, backgroundColor: '#E53E3E', borderRadius: 15, elevation: 5, shadowColor: '#E53E3E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  activateBtnContent: { height: 60 },
  formRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  footerHint: { textAlign: 'center', fontSize: 11, color: '#64748B', marginTop: 20, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#38A169', marginTop: 20 },
  successSub: { color: '#666', textAlign: 'center', marginTop: 10 },
});

export default SOSScreen;
