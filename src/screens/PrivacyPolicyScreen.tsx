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
            • <SanctuaryText variant="label_lg">Camera Access (android.permission.CAMERA):</SanctuaryText> This app requires access to your camera to enable the QR Scanner for doctor discovery and appointment booking, and for scanning food items. We do not store camera data without your explicit action.
            {"\n"}• <SanctuaryText variant="label_lg">Location (android.permission.ACCESS_FINE_LOCATION):</SanctuaryText> Used to find nearby healthcare providers.
            {"\n"}• <SanctuaryText variant="label_lg">Storage (android.permission.WRITE_EXTERNAL_STORAGE):</SanctuaryText> Used to download and save medical reports and prescriptions.
            {"\n"}• <SanctuaryText variant="label_lg">Health Data:</SanctuaryText> We collect vitals and dietary logs to provide health insights.
          </SanctuaryText>

          <SanctuaryText variant="title_sm" style={styles.subTitle}>2. Data Security</SanctuaryText>
          <SanctuaryText variant="body_md" style={styles.paragraph}>
            We use AES-256 bit encryption to protect your data. All patient and hospital data belongs exclusively to you and the respective hospital.
          </SanctuaryText>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <SanctuaryText variant="title_lg" style={styles.sectionTitle}>Terms & Conditions</SanctuaryText>
          
          <SanctuaryText variant="body_md" style={styles.paragraph}>
            By using MSCureChain, you agree to the following terms:
          </SanctuaryText>

          <SanctuaryText variant="title_sm" style={styles.subTitle}>1. Medical Advice</SanctuaryText>
          <SanctuaryText variant="body_md" style={styles.paragraph}>
            MSCureChain provides health tracking and coordination tools. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician.
          </SanctuaryText>

          <SanctuaryText variant="title_sm" style={styles.subTitle}>2. User Responsibility</SanctuaryText>
          <SanctuaryText variant="body_md" style={styles.paragraph}>
            You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.
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
