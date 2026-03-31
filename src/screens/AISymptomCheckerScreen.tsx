import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Text as RNText,
} from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Bot,
  Send,
  X,
  CalendarDays,
  Building2,
  CheckCircle2,
  Info,
  Stethoscope,
  HeartPulse,
} from 'lucide-react-native';
import { Avatar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { SanctuaryText } from '../components/SanctuaryComponents';
import { COLORS } from '../constants/designSystem';
import { apiClient, PATIENT_ENDPOINTS } from '@/api';

// IMPORT SYMPTOM DATABASE
import SYMPTOM_DATA from '../../assets/symptoms.json';
import RESPONSES_DATA from '../../assets/responses.json';

const { width } = Dimensions.get('window');

// Generate 8 most common chips from the JSON keys
const COMMON_SYMPTOMS = Object.keys(SYMPTOM_DATA).slice(0, 8);

const GENERAL_RESPONSES = [
  "Symptoms can sometimes be subtle and multifaceted. It's always wise to consult a specialist for a professional diagnostic workup.",
  "While your symptoms don't match a specific common pattern in our database, clinical evaluation is the gold standard for your health.",
  "The human body is complex. Your current history and physical presentation warrant a more detailed exam by a professional.",
  "Early clinical detection is the absolute key to effective treatment and peace of mind. Our care team is ready to assist.",
  "A formal medical consultation provides the clarity and thoroughness needed for a sustainable treatment plan."
];

interface Doctor {
  _id: string;
  user: { _id: string; name: string; avatar?: string };
  name?: string;
  hospital: { _id: string; name: string } | string | any;
  specialties: string[];
  department?: string;
  specialization?: string;
}

const MOCK_DOCS: Doctor[] = [
  { _id: 'mock1', user: { _id: 'u1', name: 'Dr. Sarah Connor', avatar: '' }, specialties: ['Neurology'], hospital: 'MediCare' },
  { _id: 'mock2', user: { _id: 'u2', name: 'Dr. James Wilson', avatar: '' }, specialties: ['Internal Medicine'], hospital: 'PulsePlus' },
  { _id: 'mock3', user: { _id: 'u3', name: 'Dr. Gregory House', avatar: '' }, specialties: ['Diagnostic Medicine'], hospital: 'General Hospital' },
  { _id: 'mock4', user: { _id: 'u4', name: 'Dr. Robert Chase', avatar: '' }, specialties: ['Surgery'], hospital: 'LifeLine' }
];

function getDocName(doc: any) {
  if (!doc) return 'Dr. Specialist';
  const name = doc?.user?.name || doc?.name || doc?.fullName || doc?.doctorName || 'Dr. Specialist';
  return name.trim();
}

function getSpecialty(doc: any): string {
  if (!doc) return 'Physician';
  return doc?.specialties?.[0] || doc?.department || doc?.specialization || doc?.specialty || 'General Physician';
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  doctors?: Doctor[];
  isQuestion?: boolean;
}

export default function AISymptomCheckerScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const scrollRef  = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: t('symptomChecker.hello') },
  ]);
  const [input, setInput] = useState('');
  const [selectedChips, setChips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [allDoctors, setDoctors] = useState<Doctor[]>(MOCK_DOCS);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeSearch, setActiveSearch] = useState<string | null>(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await apiClient.get(PATIENT_ENDPOINTS.DASHBOARD_DATA);
        const data = res.data?.data || res.data || {};
        const uniqueDocsMap = new Map<string, Doctor>();
        const apts = Array.isArray(data.appointments) ? data.appointments : (data.appointments?.data || []);
        apts.forEach((a: any) => { if (a.doctor?._id) uniqueDocsMap.set(a.doctor._id, a.doctor); });
        setDoctors(Array.from(uniqueDocsMap.values()));
      } catch (err) {}
    };
    init();
  }, []);

  const send = async (override?: string) => {
    const text = override || input.trim() || (selectedChips.length > 0 ? selectedChips.join(', ') : '');
    if (!text) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setChips([]);
    setLoading(true);

    if (activeSearch) {
        if (text.toLowerCase().includes('yes') || text.toLowerCase().includes('recommend')) {
            const sympInfo = (SYMPTOM_DATA as any)[activeSearch.toLowerCase()];
            const targetSpecs = sympInfo?.specialties?.map((s: string) => s.toLowerCase()) || [];
            const matched = allDoctors.filter(doc => {
                const docSpecs = (doc.specialties || []).map(s => s.toLowerCase());
                return docSpecs.some(s => targetSpecs.includes(s));
            }).slice(0, 4);

            await new Promise(r => setTimeout(r, 800));
            // Ensure we have at least SOME doctors to show
            const finalDoctors = matched.length > 0 ? matched : (allDoctors.length > 0 ? allDoctors.slice(0, 4) : MOCK_DOCS);
            
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                text: t('dashboard.recommendDoc'), 
                doctors: finalDoctors
            }]);
            setActiveSearch(null);
            setLoading(false);
            return;
        } else if (text.toLowerCase().includes('no')) {
            setMessages(prev => [...prev, { role: 'assistant', text: "No problem. I'm here if you have any other questions. Have a healthy day!" }]);
            setActiveSearch(null);
            setLoading(false);
            return;
        }
    }

    await new Promise(r => setTimeout(r, 1000));
    const lower = text.toLowerCase();
    
    // 1. CHECK PRIMARY SYMPTOMS
    let foundSymptom: any = null;
    let foundKey = "";
    Object.entries(SYMPTOM_DATA).forEach(([key, val]: [string, any]) => {
         if (lower.includes(key)) { foundSymptom = val; foundKey = key; }
    });

    if (foundSymptom) {
      setMessages(prev => [...prev, { role: 'assistant', text: `### ${t('symptomChecker.explanation')}\n${foundSymptom.explanation}\n\n### ${t('symptomChecker.advice')}\n${foundSymptom.advice}\n\n*${t('symptomChecker.recommendDoc')}*`, isQuestion: true }]);
      setActiveSearch(foundKey);
      setLoading(false);
      return;
    }

    // 2. CHECK FOLLOW-UP QUESTIONS (CONTINGENCY)
    let foundResponse = "";
    Object.entries(RESPONSES_DATA).forEach(([key, val]: [string, any]) => {
        if (lower.includes(key)) { foundResponse = val; }
    });

    if (foundResponse) {
        setMessages(prev => [...prev, { role: 'assistant', text: foundResponse }]);
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
        return;
    }

    // 3. GENERAL FALLBACK
    const randomMsg = GENERAL_RESPONSES[Math.floor(Math.random() * GENERAL_RESPONSES.length)];
    setMessages(prev => [...prev, { role: 'assistant', text: `${randomMsg}\n\n*${t('symptomChecker.recommendDoc')}*`, isQuestion: true }]);
    setActiveSearch("medicine");
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  };

  const renderBubbleText = (text: string, isUser: boolean) => {
    const parts = text.split(/(### EXPLANATION|### WHAT TO DO|\*Would you like me to recommend some doctors at your hospital for further evaluation?\*|\*Would you like to see our general specialists?\*)/g);
    return parts.map((part, i) => {
      if (part === "### EXPLANATION" || part === "### WHAT TO DO") {
        return (
          <View key={i} style={msgStyles.labelWrap}>
             {part.includes('EXPLANATION') ? <Info size={11} color="#4F46E5" /> : <Stethoscope size={11} color="#059669" />}
             <SanctuaryText variant="label_sm" style={{ color: part.includes('EXPLANATION') ? '#4F46E5' : '#059669', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}> {part.replace('### ', '')}</SanctuaryText>
          </View>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <SanctuaryText key={i} variant="label_lg" style={{ color: '#1E293B', fontStyle: 'italic', marginTop: 10, fontSize: 13 }}>{part.slice(1, -1)}</SanctuaryText>;
      }
      return <SanctuaryText key={i} variant="body_sm" style={{ color: isUser ? '#FFF' : '#334155', fontSize: 14, lineHeight: 18 }}>{part}</SanctuaryText>;
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><ChevronLeft size={22} color="#FFF" /></TouchableOpacity>
        <View style={styles.headerTitleArea}>
          <View style={{ alignItems: 'center' }}>
            <SanctuaryText variant="label_lg" style={{ color: '#FFF', fontSize: 16, fontWeight: '800' }}>{t('symptomChecker.title')}</SanctuaryText>
            <SanctuaryText variant="body_sm" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>{t('symptomChecker.sub')}</SanctuaryText>
          </View>
        </View>
        <TouchableOpacity onPress={() => { setMessages(messages.slice(0, 1)); setActiveSearch(null); }} style={styles.backBtn}><X size={18} color="#94A3B8" /></TouchableOpacity>
      </LinearGradient>

      <View style={styles.flex1}>
        <View style={styles.chatBg} />
        <ScrollView
          ref={scrollRef}
          style={styles.flex1}
          contentContainerStyle={styles.scrollInside}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m, i) => (
            <View key={i} style={[msgStyles.wrap, m.role === 'user' ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
              {m.role === 'assistant' && <View style={msgStyles.asstIcon}><HeartPulse size={10} color="#FFF" /></View>}
              <View style={[msgStyles.bubble, m.role === 'user' ? msgStyles.userBubble : msgStyles.asstBubble]}>
                 {m.role === 'user' ? 
                    <SanctuaryText variant="body_sm" style={{ color: '#FFF', fontSize: 14 }}>{m.text}</SanctuaryText> : 
                    renderBubbleText(m.text, false)
                 }
              </View>
              {m.role === 'assistant' && m.doctors && m.doctors.length > 0 && (
                <View style={styles.docArea}>
                  {m.doctors.map((d: any) => (
                    <TouchableOpacity key={d._id} style={styles.docCard} onPress={() => navigation.navigate('Appointments')}>
                      <Avatar.Image 
                        size={52} 
                        source={(d.user?.avatar || d.avatar) ? { uri: d.user?.avatar || d.avatar } : require('../../assets/Logo.jpeg')} 
                        style={{ backgroundColor: '#F1F5F9' }}
                      />
                      <View style={{ flex: 1, justifyContent: 'center' }}>
                        <RNText style={{ color: COLORS?.primary || '#1E1B4B', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 }}>
                          {getDocName(d)}
                        </RNText>
                        <RNText style={{ color: '#64748B', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 }}>
                          {getSpecialty(d)}
                        </RNText>
                      </View>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }}>
                        <CalendarDays size={20} color="#4F46E5" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {m.isQuestion && i === messages.length - 1 && (
                <View style={styles.quickReply}>
                   <TouchableOpacity style={styles.replyBtn} onPress={() => send("Yes, please recommend doctors")}>
                     <CheckCircle2 size={18} color="#059669" />
                     <SanctuaryText variant="label_sm" style={{ color: '#059669', fontWeight: '800', fontSize: 14 }}>{t('common.yes')}</SanctuaryText>
                   </TouchableOpacity>
                   <TouchableOpacity style={[styles.replyBtn, { borderColor: '#DC2626' }]} onPress={() => send("No, thank you")}>
                     <X size={18} color="#DC2626" />
                     <SanctuaryText variant="label_sm" style={{ color: '#DC2626', fontWeight: '800', fontSize: 14 }}>{t('common.no')}</SanctuaryText>
                   </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
          {loading && <ActivityIndicator color="#4F46E5" style={{ alignSelf: 'flex-start', margin: 15 }} />}
        </ScrollView>

        <View style={[styles.bottomContainer, { marginBottom: keyboardHeight > 0 ? keyboardHeight + 25 : 0 }]}>
           {!keyboardHeight && !input && (
                <View style={styles.chipRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                    {COMMON_SYMPTOMS.map((s: string) => (
                      <TouchableOpacity key={s} style={[styles.chip, selectedChips.includes(s) && styles.chipActive]} onPress={() => setChips(prev => prev.includes(s) ? prev.filter(c=>c!==s) : [...prev, s])}>
                        <SanctuaryText variant="label_sm" style={{ color: selectedChips.includes(s) ? '#FFF' : '#64748B', fontWeight: '800', fontSize: 12 }}>{s.toUpperCase()}</SanctuaryText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
           )}
           <View style={styles.inputAreaOuter}>
             <TextInput 
               style={styles.input} 
               placeholder={t('symptomChecker.placeholder')} 
               value={input} 
               onChangeText={setInput} 
               multiline
             />
             <TouchableOpacity style={styles.send} onPress={() => send()}><Send size={22} color="#FFF" /></TouchableOpacity>
           </View>
        </View>
      </View>
      <SafeAreaView style={{ backgroundColor: '#FFF' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  flex1: { flex: 1 },
  chatBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F9FAFB' },
  header: { padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1B4B', elevation: 8, height: Platform.OS === 'ios' ? 110 : 90 },
  headerTitleArea: { position: 'absolute', left: 0, right: 0, top: Platform.OS === 'ios' ? 55 : 35, bottom: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  scrollInside: { padding: 16, paddingBottom: 40 },
  bottomContainer: { backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  chipRow: { marginBottom: 10 },
  chip: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 25, 
    backgroundColor: '#FFF', 
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5', elevation: 4 },
  quickReply: { flexDirection: 'row', gap: 12, marginTop: 10, justifyContent: 'center' },
  replyBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    paddingHorizontal: 22, 
    paddingVertical: 14, 
    borderRadius: 18, 
    borderWidth: 2, 
    borderColor: '#10B981', 
    backgroundColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputAreaOuter: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 20 : 15 },
  input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 14, color: '#1E293B', borderWidth: 1, borderColor: '#F1F5F9' },
  send: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
  docArea: { marginTop: 15, gap: 12, paddingBottom: 10 },
  docCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 20, 
    gap: 15, 
    elevation: 3, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginVertical: 4,
    width: '95%'
  },
});

const msgStyles = StyleSheet.create({
  wrap: { marginBottom: 16, width: '100%' },
  bubble: { maxWidth: '85%', padding: 14, borderRadius: 20, elevation: 1 },
  userBubble: { backgroundColor: '#4F46E5', borderBottomRightRadius: 2 },
  asstBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  labelWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, marginBottom: 4 },
  asstIcon: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginBottom: 2, marginLeft: 2 },
});
