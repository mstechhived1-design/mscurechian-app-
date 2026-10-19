import React from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { SanctuaryText } from '../components/SanctuaryComponents';
import { COLORS } from '../constants/designSystem';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={COLORS.on_surface} size={24} />
        </TouchableOpacity>
        <SanctuaryText variant="headline_sm">Legal & Privacy</SanctuaryText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <SanctuaryText variant="title_lg" style={styles.sectionTitle}>Privacy Policy</SanctuaryText>
          <SanctuaryText variant="body_md" style={styles.date}>Last Updated: May 2024</SanctuaryText>
          
          <SanctuaryText variant="body_md" style={styles.paragraph}>
            At MSCureChain, we take your privacy seriously. This policy explains how we collect, use, and protect your personal and medical information.
          </SanctuaryText>

          <SanctuaryText variant="title_sm" style={styles.subTitle}>1. Information We Collect</SanctuaryText>
          <SanctuaryText variant="body_md" style={styles.paragraph}>
            • <SanctuaryText variant="label_lg">Personal Data:</SanctuaryText> Name, phone number, and email for account management.
            {"\n"}• <SanctuaryText variant="label_lg">Sensitive Health Data:</SanctuaryText> We collect health metrics including weight, height, BMI, blood group, vitals (Blood Pressure, Heart Rate), and clinical symptoms to provide health tracking features.
            {"\n"}• <SanctuaryText variant="label_lg">Location (ACCESS_FINE_LOCATION):</SanctuaryText> Used to find nearby healthcare providers and emergency services.
            {"\n"}• <SanctuaryText variant="label_lg">Camera Access (CAMERA):</SanctuaryText> Used for QR scanning and food item recognition.
            {"\n"}• <SanctuaryText variant="label_lg">Storage (WRITE_EXTERNAL_STORAGE):</SanctuaryText> Used to save your medical records and prescriptions.
          </SanctuaryText>

          <SanctuaryText variant="title_sm" style={styles.subTitle}>2. Medical Disclaimer</SanctuaryText>
          <SanctuaryText variant="body_md" style={styles.paragraph}>
            MSCureChain is an information management platform. Our AI tools and trackers provide health insights for informational purposes ONLY. This app is NOT a medical device and does NOT provide professional medical diagnosis or treatment.
          </SanctuaryText>

          <SanctuaryText variant="title_sm" style={styles.subTitle}>3. Data Deletion & Retention</SanctuaryText>
          <SanctuaryText variant="body_md" style={styles.paragraph}>
            You can delete your account permanently through the Profile → Settings menu. Upon deletion, your identity and clinical records are purged from our database within 7 days.
          </SanctuaryText>

          <SanctuaryText variant="title_sm" style={styles.subTitle}>4. Data Security</SanctuaryText>
          <SanctuaryText variant="body_md" style={styles.paragraph}>
            We use industry-standard encryption to protect your data. Your health records are shared only with the hospitals you specifically register with.
          </SanctuaryText>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <SanctuaryText variant="title_lg" style={styles.sectionTitle}>Terms of Service</SanctuaryText>
          
          <SanctuaryText variant="body_md" style={styles.paragraph}>
            By using MSCureChain, you agree that you are responsible for the information you provide and that the app is a tool for tracking and coordination, not a medical authority.
          </SanctuaryText>
        </View>

        <View style={styles.footer}>
          <SanctuaryText variant="body_sm" style={styles.footerText}>
            © 2024 MS-TECH-HIVE. All rights reserved.
          </SanctuaryText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: COLORS.primary,
    marginBottom: 4,
  },
  date: {
    color: '#999',
    marginBottom: 16,
    fontSize: 12,
  },
  subTitle: {
    marginTop: 20,
    marginBottom: 8,
    color: COLORS.on_surface,
  },
  paragraph: {
    lineHeight: 22,
    color: '#444',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 32,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    color: '#AAA',
  },
});
