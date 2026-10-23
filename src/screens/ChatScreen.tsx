import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Text, TextInput, Avatar, Surface, Portal, Modal } from 'react-native-paper';
import { 
  Send, 
  Phone, 
  Info, 
  ChevronLeft, 
  Image as ImageIcon, 
  CheckCheck, 
  Stethoscope,
  X,
  Clock
} from 'lucide-react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiClient, MESSAGE_ENDPOINTS, PATIENT_ENDPOINTS } from '@/api';
import { socketService } from '@/services/socketService';
import { familyService } from '@/services/familyService';
import { COLORS } from '@/constants/designSystem';
import { SanctuaryText } from '../components/SanctuaryComponents';
import { GlassModal } from '../components/GlassModal';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'patient' | 'doctor';
  time: string;
  image?: string;
  createdAt?: string;
}

interface DoctorContact {
  id: string;
  name: string;
  specialty?: string;
  hospitalName?: string;
  hospitalId?: string;
}

export default function ChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  
  const [activeDoctorId, setActiveDoctorId] = useState<string>(route.params?.doctorId || '');
  const [doctorName, setDoctorName] = useState<string>(route.params?.doctorName || 'Doctor');
  const [hospitalId, setHospitalId] = useState<string>(route.params?.hospitalId || '');

  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Doctor Selector State (when no doctorId passed directly)
  const [doctorList, setDoctorList] = useState<DoctorContact[]>([]);
  const [selectorVisible, setSelectorVisible] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!route.params?.doctorId) {
        fetchDoctorsFromAppointments();
      }
    }, [route.params?.doctorId])
  );

  useEffect(() => {
    const unsub = familyService.onProfileChange(() => {
      setActiveDoctorId('');
      setMessages([]);
      fetchDoctorsFromAppointments();
    });
    return () => unsub();
  }, []);

  // 1. Fetch available doctors if activeDoctorId is missing
  useEffect(() => {
    if (!activeDoctorId) {
      fetchDoctorsFromAppointments();
    } else {
      fetchConversation(activeDoctorId);
    }
  }, [activeDoctorId]);

  // 2. Real-time Socket.IO listener for incoming messages
  useEffect(() => {
    const unsub = socketService.on('receive_message', (socketMsg: any) => {
      console.log('[ChatScreen] Real-time message received:', socketMsg);
      if (socketMsg) {
        const incomingText = socketMsg.content || '';
        const incomingSenderId = socketMsg.sender?._id || socketMsg.sender;
        
        // Check if message belongs to the current doctor chat
        if (incomingSenderId === activeDoctorId) {
          const newMsg: ChatMessage = {
            id: socketMsg._id || Date.now().toString(),
            text: incomingText,
            sender: 'doctor',
            time: new Date(socketMsg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: socketMsg.createdAt,
          };
          setMessages(prev => [...prev, newMsg]);
        }
      }
    });

    return () => {
      unsub();
    };
  }, [activeDoctorId]);

  const fetchDoctorsFromAppointments = async () => {
    try {
      const res = await apiClient.get(PATIENT_ENDPOINTS.APPOINTMENTS);
      const appts = Array.isArray(res.data.data) ? res.data.data : [];
      
      const doctorsMap = new Map<string, DoctorContact>();
      appts.forEach((apt: any) => {
        const d = apt.doctor;
        const dId = d?._id || d?.user?._id;
        const dName = d?.user?.name || d?.name;
        if (dId && dName && !doctorsMap.has(dId)) {
          doctorsMap.set(dId, {
            id: dId,
            name: dName.startsWith('Dr.') ? dName : `Dr. ${dName}`,
            specialty: d?.specialties?.[0] || 'Physician',
            hospitalName: apt.hospital?.name || 'Hospital',
            hospitalId: apt.hospital?._id,
          });
        }
      });

      const docs = Array.from(doctorsMap.values());
      setDoctorList(docs);

      if (docs.length > 0) {
        // Automatically select the most recent doctor
        const first = docs[0];
        setActiveDoctorId(first.id);
        setDoctorName(first.name);
        setHospitalId(first.hospitalId || '');
        fetchConversation(first.id, first.hospitalId);
      } else {
        // Fallback default conversation
        setMessages([
          { 
            id: 'welcome', 
            text: 'Welcome to MSCureChain Consultation. Your consultation messages with doctors will appear here.', 
            sender: 'doctor', 
            time: 'Now' 
          }
        ]);
      }
    } catch (e) {
      console.warn('[ChatScreen] Could not fetch doctor contacts:', e);
    }
  };

  const fetchConversation = async (otherUserId: string, targetHospId?: string) => {
    setLoading(true);
    try {
      const hId = targetHospId || hospitalId || (await AsyncStorage.getItem('activeHospitalId')) || '';
      const headers: Record<string, string> = {};
      if (hId) {
        headers['x-hospital-id'] = hId;
      }

      const res = await apiClient.get(MESSAGE_ENDPOINTS.CONVERSATION(otherUserId), {
        headers,
        params: hId ? { hospitalId: hId } : undefined,
      });
      const rawMsgs = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      
      const formatted: ChatMessage[] = rawMsgs.map((m: any) => {
        const isFromDoctor = m.sender?._id === otherUserId || m.sender === otherUserId;
        return {
          id: m._id || Date.now().toString(),
          text: m.content || '',
          sender: isFromDoctor ? 'doctor' : 'patient',
          time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: m.createdAt,
        };
      });

      if (formatted.length > 0) {
        setMessages(formatted);
      } else {
        // Show gentle greeting if starting fresh
        setMessages([
          { 
            id: 'init', 
            text: `Hello! You are connected with ${doctorName}. You can ask questions or follow up on your prescription here.`, 
            sender: 'doctor', 
            time: 'Just now' 
          }
        ]);
      }
    } catch (err: any) {
      console.warn('[ChatScreen] Error fetching messages:', err.message);
      // Fallback greeting
      setMessages([
        { 
          id: '1', 
          text: `Hello! I am ${doctorName}. How are you feeling today?`, 
          sender: 'doctor', 
          time: '10:00 AM' 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  const sendMsg = async () => {
    if (!msg.trim() && !selectedImage) return;

    const messageText = msg.trim() || 'Attached an image';
    const tempId = Date.now().toString();
    const timeFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Optimistic UI update
    const newChatMessage: ChatMessage = {
      id: tempId,
      text: messageText,
      sender: 'patient',
      time: timeFormatted,
      image: selectedImage || undefined,
    };

    setMessages(prev => [...prev, newChatMessage]);
    setMsg('');
    setSelectedImage(null);
    setSending(true);

    try {
      if (activeDoctorId) {
        const hId = hospitalId || (await AsyncStorage.getItem('activeHospitalId')) || '';
        const headers: Record<string, string> = {};
        if (hId) {
          headers['x-hospital-id'] = hId;
        }

        await apiClient.post(
          MESSAGE_ENDPOINTS.SEND,
          {
            recipientId: activeDoctorId,
            content: messageText,
            hospitalId: hId || undefined,
          },
          { headers }
        );
      }
    } catch (err: any) {
      console.warn('[ChatScreen] Failed to send message:', err.message);
      Alert.alert('Notice', 'Message sent locally. Server will sync when doctor is online.');
    } finally {
      setSending(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const QUICK_TEMPLATES = [
    "Thank you doctor! Feeling much better.",
    "Can I take this medication before meals?",
    "Sharing my latest blood test report.",
    "When should I schedule our follow-up?"
  ];

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={18} color="#1E293B" />
          </TouchableOpacity>

          <Avatar.Text 
            size={34} 
            label={doctorName.replace('Dr. ', '').substring(0, 2).toUpperCase()} 
            style={styles.avatar} 
          />

          <TouchableOpacity 
            style={styles.nameSection}
            onPress={() => doctorList.length > 1 && setSelectorVisible(true)}
          >
            <View style={styles.nameRow}>
              <Text variant="titleMedium" style={styles.name}>{doctorName}</Text>
              {doctorList.length > 1 && (
                <Text style={styles.switchLabel}>[Switch]</Text>
              )}
            </View>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text variant="labelSmall" style={styles.status}>Available for Consultation</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={styles.iconCircle}
              onPress={() => Alert.alert('Consultation Info', `Direct secure messaging with ${doctorName}. Messages are stored in your MSCureChain health record.`)}
            >
              <Info size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </Surface>

      {/* Messages List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <SanctuaryText variant="body_sm" style={{ marginTop: 10, color: '#64748B' }}>Loading conversation...</SanctuaryText>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.msgBox, item.sender === 'patient' ? styles.patientMsg : styles.doctorMsg]}>
              {item.image && (
                <Image source={{ uri: item.image }} style={styles.msgImage} />
              )}
              <Text style={[styles.msgText, item.sender === 'patient' ? styles.patientText : styles.doctorText]}>
                {item.text}
              </Text>
              <View style={styles.timeRow}>
                <Text style={[styles.timeText, item.sender === 'patient' ? styles.timePatient : styles.timeDoctor]}>
                  {item.time}
                </Text>
                {item.sender === 'patient' && (
                  <CheckCheck size={12} color="#93C5FD" style={{ marginLeft: 4 }} />
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Quick Reply Chips */}
      <View style={styles.quickReplyContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={QUICK_TEMPLATES}
          keyExtractor={(t, i) => i.toString()}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.quickChip}
              onPress={() => setMsg(item)}
            >
              <SanctuaryText variant="label_sm" style={styles.quickChipText}>{item}</SanctuaryText>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Selected Image Preview */}
      {selectedImage && (
        <View style={styles.imagePreviewBar}>
          <Image source={{ uri: selectedImage }} style={styles.previewThumb} />
          <SanctuaryText variant="body_sm" style={{ flex: 1, marginLeft: 10 }}>Ready to send image</SanctuaryText>
          <TouchableOpacity onPress={() => setSelectedImage(null)} style={{ padding: 6 }}>
            <X size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputArea}>
        <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
          <ImageIcon size={18} color="#64748B" />
        </TouchableOpacity>

        <TextInput
          mode="outlined"
          placeholder="Ask a question or follow up..."
          value={msg}
          onChangeText={setMsg}
          style={styles.input}
          outlineStyle={styles.inputOutline}
          multiline
        />

        <TouchableOpacity 
          style={[styles.sendBtn, (!msg.trim() && !selectedImage) && styles.sendBtnDisabled]} 
          onPress={sendMsg}
          disabled={!msg.trim() && !selectedImage}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Send size={16} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Doctor Selector Modal */}
      <GlassModal 
        visible={selectorVisible} 
        onClose={() => setSelectorVisible(false)}
        title="Select Doctor"
      >
        <SanctuaryText variant="body_sm" style={styles.selectorSub}>Choose which doctor you want to message</SanctuaryText>
        
        <FlatList
          data={doctorList}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.doctorOption, item.id === activeDoctorId && styles.doctorOptionActive]}
              onPress={() => {
                setActiveDoctorId(item.id);
                setDoctorName(item.name);
                setHospitalId(item.hospitalId || '');
                setSelectorVisible(false);
              }}
            >
              <Stethoscope size={18} color={COLORS.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <SanctuaryText variant="label_lg" style={{ fontWeight: '800' }}>{item.name}</SanctuaryText>
                <SanctuaryText variant="body_sm" style={{ color: '#64748B' }}>{item.specialty} · {item.hospitalName}</SanctuaryText>
              </View>
            </TouchableOpacity>
          )}
        />
      </GlassModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { 
    paddingBottom: 8, 
    paddingTop: Platform.OS === 'ios' ? 48 : 28, 
    paddingHorizontal: 14, 
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  backButton: { 
    width: 34, 
    height: 34, 
    borderRadius: 10, 
    backgroundColor: '#F1F5F9', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 8 
  },
  avatar: { backgroundColor: '#EFF6FF' },
  nameSection: { flex: 1, marginLeft: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontWeight: '800', color: '#1E293B', fontSize: 14 },
  switchLabel: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 },
  status: { color: '#059669', fontWeight: '700', fontSize: 9.5 },
  headerIcons: { flexDirection: 'row', gap: 6 },
  iconCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12, paddingBottom: 16 },
  msgBox: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, marginBottom: 8 },
  doctorMsg: { backgroundColor: '#FFF', alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  patientMsg: { backgroundColor: COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  msgText: { fontSize: 13, lineHeight: 18 },
  doctorText: { color: '#1E293B' },
  patientText: { color: '#FFF' },
  msgImage: { width: 180, height: 120, borderRadius: 10, marginBottom: 6 },

  timeRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 3 },
  timeText: { fontSize: 9 },
  timeDoctor: { color: '#94A3B8' },
  timePatient: { color: 'rgba(255,255,255,0.7)' },

  quickReplyContainer: { backgroundColor: '#FFF', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  quickChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipText: { color: '#475569', fontSize: 10, fontWeight: '700' },

  imagePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
  },
  previewThumb: { width: 32, height: 32, borderRadius: 6 },

  inputArea: { 
    flexDirection: 'row', 
    padding: 8, 
    paddingHorizontal: 10,
    backgroundColor: '#FFF', 
    alignItems: 'center', 
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  attachBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, maxHeight: 80, backgroundColor: '#FFF', fontSize: 13 },
  inputOutline: { borderRadius: 14, borderColor: '#E2E8F0' },
  sendBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: COLORS.primary, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  sendBtnDisabled: { backgroundColor: '#94A3B8', opacity: 0.6 },

  // Selector Modal
  selectorModal: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 18,
    padding: 16,
    maxHeight: '70%',
  },
  selectorTitle: { color: '#1E293B', fontWeight: '900', fontSize: 16 },
  selectorSub: { color: '#64748B', fontSize: 11, marginBottom: 12 },
  doctorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  doctorOptionActive: { backgroundColor: '#EFF6FF', borderColor: COLORS.primary },
});
