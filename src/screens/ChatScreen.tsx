import React, { useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, IconButton, Avatar, Surface } from 'react-native-paper';
import { Send, Phone, Info } from 'lucide-react-native';
import { useRoute } from '@react-navigation/native';

const ChatScreen = () => {
  const route = useRoute<any>();
  const doctorName = route.params?.doctorName || 'Dr. Arjun Reddy';
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hello, how can I help you today?', sender: 'doctor', time: '10:00 AM' },
    { id: '2', text: 'I have some pain in my neck since yesterday.', sender: 'patient', time: '10:05 AM' },
  ]);

  const sendMsg = () => {
    if (!msg.trim()) return;
    setMessages([...messages, { 
      id: Date.now().toString(), 
      text: msg, 
      sender: 'patient', 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }]);
    setMsg('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerContent}>
          <Avatar.Text size={40} label={doctorName.substring(4, 6).toUpperCase()} style={styles.avatar} />
          <View style={styles.nameSection}>
            <Text variant="titleMedium" style={styles.name}>{doctorName}</Text>
            <Text variant="labelSmall" style={styles.status}>Online</Text>
          </View>
          <View style={styles.headerIcons}>
            <IconButton icon={() => <Phone size={20} color="#006AF5" />} />
            <IconButton icon={() => <Info size={20} color="#006AF5" />} />
          </View>
        </View>
      </Surface>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.msgBox, item.sender === 'patient' ? styles.patientMsg : styles.doctorMsg]}>
             <Text style={[styles.msgText, item.sender === 'patient' ? styles.patientText : styles.doctorText]}>
               {item.text}
             </Text>
             <Text style={styles.timeText}>{item.time}</Text>
          </View>
        )}
      />

      <View style={styles.inputArea}>
        <TextInput
          mode="outlined"
          placeholder="Type a message..."
          value={msg}
          onChangeText={setMsg}
          style={styles.input}
          outlineStyle={styles.inputOutline}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMsg}>
          <Send size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { paddingBottom: 10, paddingTop: 40, paddingHorizontal: 15, backgroundColor: '#FFF' },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: { backgroundColor: '#EBF4FF' },
  nameSection: { flex: 1, marginLeft: 12 },
  name: { fontWeight: 'bold' },
  status: { color: '#38A169', fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row' },
  list: { padding: 15, paddingBottom: 20 },
  msgBox: { maxWidth: '80%', padding: 12, borderRadius: 18, marginBottom: 10 },
  doctorMsg: { backgroundColor: '#FFF', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  patientMsg: { backgroundColor: '#006AF5', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  msgText: { fontSize: 15 },
  doctorText: { color: '#333' },
  patientText: { color: '#FFF' },
  timeText: { fontSize: 9, color: 'rgba(0,0,0,0.3)', marginTop: 4, textAlign: 'right' },
  inputArea: { flexDirection: 'row', padding: 15, backgroundColor: '#FFF', alignItems: 'center' },
  input: { flex: 1, height: 45, backgroundColor: '#FFF' },
  inputOutline: { borderRadius: 25, borderColor: '#DDD' },
  sendBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#006AF5', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
});

export default ChatScreen;
