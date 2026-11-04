/**
 * TermsAndConditionsScreen
 *
 * Displays the full MS CureChain Terms & Conditions & Privacy Policy document
 * styled to professional healthcare standards with simple, elegant flash cards.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  ChevronLeft,
  Shield,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
} from 'lucide-react-native';
import { SanctuaryText } from '@/components/SanctuaryComponents';
import { COLORS } from '@/constants/designSystem';
import { RootStackParamList } from '@/navigation/types';

type TCTabRouteProp = RouteProp<RootStackParamList, 'TermsAndConditions'>;

interface Section {
  id: string;
  number: string;
  title: string;
  content: string | string[];
  highlight?: boolean;
}

const SECTIONS: Section[] = [
  {
    id: 's1',
    number: '1',
    title: 'Introduction',
    content:
      'These Terms & Conditions ("Terms") govern your access to and use of MS CureChain, a hospital management software platform ("Software") owned and operated by MS Tech Hive Private Limited, a company incorporated under the Companies Act, 2013, India.\n\nBy accessing, logging into, or using MS CureChain, you confirm that you have read, understood, and agree to be bound by these Terms, our Privacy Policy, and all applicable agreements.\n\nIf you do not agree, you must not access or use the Software.',
  },
  {
    id: 's2',
    number: '2',
    title: 'Eligibility & Authority',
    content: [
      'The Software is intended for use by patients, registered hospitals, clinics, and authorized healthcare organizations.',
      'You represent and warrant that you are legally authorized to access the Software and are acting within your assigned role.',
      'If you are accepting these Terms on behalf of an organization, you confirm that you have the authority to bind that organization.',
    ],
  },
  {
    id: 's3',
    number: '3',
    title: 'Scope of Services',
    content: [
      'Patient profile & family member health management',
      'Doctor discovery & OPD/IPD appointment booking',
      'Electronic prescriptions & medication dose tracking',
      'Diagnostic lab test records & discharge summaries',
      'Offline emergency medical vault for critical care access',
      'MS CureChain is a secure technology platform and does NOT directly provide medical advice, diagnosis, treatment, or clinical judgment.',
    ],
  },
  {
    id: 's4',
    number: '4',
    title: 'Patient Appointment Booking & 24-Hr Refund Policy',
    content: [
      'Appointment bookings made through the MS CureChain patient app are subject to doctor availability and hospital schedule.',
      'Fees paid for appointment booking are eligible for a 100% full refund if the cancellation is made at least 24 hours before the scheduled slot. Approved refunds will be credited back to your original payment method within 24 hours.',
      'Appointments are confirmed only after successful payment. An unconfirmed (pending payment) slot may be released to other patients.',
      'You must arrive at least 10 minutes before your scheduled appointment time. Late arrivals may result in rescheduling at the hospital\'s discretion.',
      'You are responsible for providing accurate personal and medical information during booking.',
      'In case of hospital-side cancellation or doctor unavailability, a full refund is automatically initiated within 24 hours.',
      'Appointment reminders are sent via push notification and SMS as a courtesy service.',
    ],
    highlight: true,
  },
  {
    id: 's4_refund',
    number: '5',
    title: 'Cancellation & Refunds',
    content: [
      'Cancellation requests for appointments must be submitted through the app at least 24 hours prior to the scheduled time.',
      'Approved refunds for valid cancellations will be processed and credited back to the original source of payment within 24 hours.',
      'No refunds will be provided for "No-Shows" or cancellations made less than 24 hours before the appointment.',
      'In case of doctor unavailability or hospital-side cancellation, a full refund will be automatically initiated and credited within 24 hours.',
    ],
    highlight: true,
  },
  {
    id: 's5',
    number: '6',
    title: 'Account Registration & Security',
    content: [
      'Access is granted only to registered patients and authorized users.',
      'You are responsible for maintaining confidentiality of login credentials and for all actions performed using your account.',
      'Unauthorized access or security incidents must be reported immediately to support@mscurechain.com.',
      'MS Tech Hive is not responsible for losses caused by compromised user device credentials.',
    ],
  },
  {
    id: 's6',
    number: '7',
    title: 'Acceptable Use Policy',
    content: [
      'Do NOT share accounts or passwords with unauthorized third parties.',
      'Do NOT upload false, misleading, or unlawful health documents.',
      'Do NOT attempt to reverse engineer, decompile, or copy the Software.',
      'Do NOT circumvent security controls, authentication systems, or rate limits.',
      'Do NOT use the Software outside authorized healthcare operations.',
      'Do NOT introduce malware, scripts, or harmful code.',
      'Violation may lead to immediate suspension or termination of your account.',
    ],
  },
  {
    id: 's7',
    number: '8',
    title: 'Data Ownership & Responsibility',
    content:
      'All patient and hospital data entered into MS CureChain belongs exclusively to the patient and respective hospital. MS Tech Hive acts only as a secure data processor and technology provider. The hospital and patient maintain ownership of their clinical history.',
  },
  {
    id: 's8',
    number: '9',
    title: 'Data Protection & Encryption',
    content:
      'MS Tech Hive implements industry-standard AES-256 bit encryption and TLS 1.3 transit security. Data is hosted strictly on secure servers located in India. By using the Software, you consent to processing of data as per applicable Indian laws, including the Digital Personal Data Protection Act (DPDPA), 2023.',
  },
  {
    id: 's9',
    number: '10',
    title: 'Third-Party Services',
    content: [
      'The Software integrates with secure SMS gateways, certified payment gateways, and cloud infrastructure providers.',
      'MS Tech Hive is not liable for temporary carrier SMS delivery delays or external bank payment gateway downtime.',
    ],
  },
  {
    id: 's10',
    number: '11',
    title: 'Regulatory & Medical Disclaimer',
    content: [
      'MS CureChain is a digital technology enablement platform only.',
      'Medical care, diagnosis, and prescription treatments are provided solely by certified healthcare practitioners.',
      'In cases of severe emergency, patients are advised to visit the nearest emergency room immediately.',
    ],
  },
  {
    id: 's11',
    number: '12',
    title: 'Service Availability & Modifications',
    content:
      'The Software is provided on a high-availability best-effort basis. MS Tech Hive may release regular security patches, UI enhancements, or scheduled maintenance updates.',
  },
  {
    id: 's12',
    number: '13',
    title: 'Intellectual Property',
    content:
      'MS CureChain, including all branding, source code, UI designs, workflows, and documentation, is the exclusive intellectual property of MS Tech Hive Pvt. Ltd.',
  },
  {
    id: 's13',
    number: '14',
    title: 'Limitation of Liability',
    content: [
      'MS Tech Hive is not liable for indirect or consequential damages.',
      'Not liable for medical outcomes resulting from practitioner consultations.',
      'Total technology liability is capped as per agreed platform terms.',
    ],
  },
  {
    id: 's14',
    number: '15',
    title: 'Governing Law & Dispute Resolution',
    content:
      'These Terms are governed by Indian law. Disputes shall be resolved amicably or by arbitration under the Arbitration and Conciliation Act, 1996, in accordance with Indian jurisdiction.',
  },
  {
    id: 's15',
    number: '16',
    title: 'Contact Information',
    content: 'Email: support@mscurechain.com\nLegal: legal@mscurechain.com\nWebsite: https://mscurechain.com',
  },
];

const PRIVACY_SECTIONS: Section[] = [
  {
    id: 'p1',
    number: '1',
    title: 'Introduction & Scope',
    content:
      'MS Tech Hive Private Limited (“MS Tech Hive”, “we”, “us”, “our”) owns and operates MS CureChain Hospital Management System and its mobile applications. This policy explains what information we collect, how we use it, and how it is protected. Our data protection protocols are designed in strict compliance with the Digital Personal Data Protection Act (DPDPA), 2023, and global healthcare privacy standards.',
  },
  {
    id: 'p2',
    number: '2',
    title: 'Information We Collect',
    content: [
      'Personal Identifiers: Full Name, 10-digit Mobile Number, Email Address, Gender, and Date of Birth.',
      'Clinical & Health Data: Medical history, blood group, allergies, vitals (BP, Heart Rate, SpO2), prescribed medicines, and diagnostic lab test reports.',
      'Family Profile Data: Linked family dependent names, relationships, and emergency contact details.',
      'Appointment & Billing Details: Doctor consultation history, hospital visits, and transaction invoices.',
      'Device Security Data: Hardware identifier, OS version, and push notification tokens to ensure authorized access.',
    ],
    highlight: true,
  },
  {
    id: 'p3',
    number: '3',
    title: 'App Permissions & Transparency',
    content: [
      'CAMERA (android.permission.CAMERA): Used exclusively for scanning hospital doctor QR codes and capturing optional prescription/Aadhaar documents. We do NOT record, stream, or retain background camera feeds.',
      'LOCATION (android.permission.ACCESS_FINE_LOCATION): Used to calculate distance and recommend nearby verified hospitals in your area.',
      'STORAGE (android.permission.WRITE_EXTERNAL_STORAGE): Allows you to download lab test PDFs, medical receipts, and prescription slips to your device.',
      'NOTIFICATIONS: Delivers critical medicine reminders, consultation call alerts, and appointment status updates.',
    ],
    highlight: true,
  },
  {
    id: 'p4',
    number: '4',
    title: 'Zero-Data Selling Guarantee',
    content: [
      'We do NOT sell, rent, or trade your personal health data with advertisers, third-party brokers, or pharmaceutical marketers.',
      'Your medical records are shared only with the specific doctor, hospital, or diagnostic lab with whom you book an appointment.',
      'All data processing complies strictly with Indian statutory regulations and the DPDPA, 2023.',
    ],
    highlight: true,
  },
  {
    id: 'p5',
    number: '5',
    title: 'Data Sovereignty & Encryption',
    content:
      'All patient data is stored within certified enterprise data centers located in India. We employ end-to-end TLS 1.3 transit encryption and AES-256 bit rest encryption for all sensitive health records, ensuring uncompromised security.',
  },
  {
    id: 'p-deletion',
    number: '6',
    title: 'Right to Erasure & Account Deletion',
    content:
      'You hold full control over your digital identity. You may request permanent account deletion at any time via Profile → Delete Account. Upon confirmation, your authentication credentials, personal profile, and associated app vault records are permanently purged.',
    highlight: true,
  },
  {
    id: 'p6',
    number: '7',
    title: 'Data Protection Officer Contact',
    content:
      'For privacy inquiries, grievance redressal, or data audit requests, please reach our Data Protection Officer at privacy@mscurechain.com.',
  },
];

// ─── Collapsible Flash Card Component ──────────────────────────────────────────

function AccordionSection({ section }: { section: Section }) {
  const [open, setOpen] = useState(
    section.highlight || section.id === 's1' || section.id === 's4' || section.id === 'p1' || section.id === 'p2',
  );

  const isHighlighted = !!section.highlight;
  const contentItems = Array.isArray(section.content)
    ? section.content
    : [section.content];

  return (
    <View
      style={[
        Sty.flashCard,
        isHighlighted && Sty.flashCardHighlighted,
        open && Sty.flashCardOpen,
      ]}
    >
      <TouchableOpacity
        style={Sty.cardHeader}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <View
          style={[
            Sty.numberPill,
            isHighlighted && Sty.numberPillHighlighted,
          ]}
        >
          <SanctuaryText
            variant="label_sm"
            style={[
              Sty.numberTxt,
              isHighlighted && Sty.numberTxtHighlighted,
            ]}
          >
            {section.number}
          </SanctuaryText>
        </View>

        <SanctuaryText
          variant="label_lg"
          style={[
            Sty.cardTitle,
            isHighlighted && Sty.cardTitleHighlighted,
          ]}
          numberOfLines={2}
        >
          {section.title}
        </SanctuaryText>

        <View style={Sty.chevronWrap}>
          {open ? (
            <ChevronUp size={18} color={isHighlighted ? '#1769E0' : '#64748B'} />
          ) : (
            <ChevronDown size={18} color="#94A3B8" />
          )}
        </View>
      </TouchableOpacity>

      {open && (
        <View style={Sty.cardBody}>
          <View style={Sty.bodyDivider} />
          {Array.isArray(section.content) ? (
            contentItems.map((item, idx) => (
              <View key={idx} style={Sty.bulletRow}>
                <View
                  style={[
                    Sty.bulletDot,
                    isHighlighted && { backgroundColor: '#1769E0' },
                  ]}
                />
                <SanctuaryText variant="body_sm" style={Sty.bulletTxt}>
                  {item}
                </SanctuaryText>
              </View>
            ))
          ) : (
            <SanctuaryText variant="body_sm" style={Sty.plainTxt}>
              {section.content as string}
            </SanctuaryText>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen Component ───────────────────────────────────────────────────

export default function TermsAndConditionsScreen() {
  const navigation = useNavigation();
  const route = useRoute<TCTabRouteProp>();
  const scrollRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(
    route.params?.initialTab || 'terms',
  );

  const currentSections = activeTab === 'terms' ? SECTIONS : PRIVACY_SECTIONS;

  return (
    <View style={Sty.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Top Header: Clean, Professional White ── */}
      <View style={Sty.headerBar}>
        <TouchableOpacity
          style={Sty.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={Sty.headerCenter}>
          <View style={Sty.headerTitleRow}>
            <Shield size={18} color="#1769E0" strokeWidth={2.4} />
            <SanctuaryText variant="headline_sm" style={Sty.headerTitle}>
              Terms &amp; Privacy
            </SanctuaryText>
          </View>
          <SanctuaryText variant="body_xs" style={Sty.headerSub}>
            MS CureChain · MS Tech Hive Pvt. Ltd.
          </SanctuaryText>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* ── Segment Tabs: Clean Minimalist ── */}
      <View style={Sty.tabContainer}>
        <View style={Sty.tabPillWrap}>
          <TouchableOpacity
            style={[Sty.tabPill, activeTab === 'terms' && Sty.tabPillActive]}
            onPress={() => {
              setActiveTab('terms');
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }}
            activeOpacity={0.8}
          >
            <FileText
              size={15}
              color={activeTab === 'terms' ? '#1769E0' : '#64748B'}
            />
            <SanctuaryText
              variant="label_sm"
              style={[Sty.tabTxt, activeTab === 'terms' && Sty.tabTxtActive]}
            >
              Terms of Service
            </SanctuaryText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[Sty.tabPill, activeTab === 'privacy' && Sty.tabPillActive]}
            onPress={() => {
              setActiveTab('privacy');
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }}
            activeOpacity={0.8}
          >
            <Lock
              size={15}
              color={activeTab === 'privacy' ? '#1769E0' : '#64748B'}
            />
            <SanctuaryText
              variant="label_sm"
              style={[Sty.tabTxt, activeTab === 'privacy' && Sty.tabTxtActive]}
            >
              Privacy Policy
            </SanctuaryText>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content Area with Flash Cards ── */}
      <ScrollView
        ref={scrollRef}
        style={Sty.scroll}
        contentContainerStyle={Sty.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtle, Professional Trust Banner */}
        <View style={Sty.trustBanner}>
          <View style={Sty.trustChipsRow}>
            <View style={Sty.trustChipGold}>
              <AlertCircle size={12} color="#B45309" />
              <SanctuaryText variant="label_sm" style={Sty.trustChipGoldTxt}>
                Updated April 2026
              </SanctuaryText>
            </View>

            <View style={Sty.trustChipGreen}>
              <CheckCircle2 size={12} color="#059669" />
              <SanctuaryText variant="label_sm" style={Sty.trustChipGreenTxt}>
                DPDPA 2023 Compliant
              </SanctuaryText>
            </View>
          </View>

          <SanctuaryText variant="body_xs" style={Sty.trustNoticeTxt}>
            {activeTab === 'terms'
              ? 'Section 4 details Patient Appointment Booking & 24-hr refund guidelines.'
              : 'Zero-data-selling guarantee: Your medical records are encrypted and protected.'}
          </SanctuaryText>
        </View>

        {/* Section List: Simple, Elegant Flash Cards */}
        {currentSections.map((sec) => (
          <AccordionSection key={sec.id} section={sec} />
        ))}

        {/* Professional Footer Card */}
        <View style={Sty.footerCard}>
          <Shield size={22} color="#1769E0" />
          <SanctuaryText variant="label_md" style={Sty.footerTitle}>
            MS CureChain Healthcare Network
          </SanctuaryText>
          <SanctuaryText variant="body_xs" style={Sty.footerTxt}>
            Questions regarding our policies or data protection? Reach our compliance team directly.
          </SanctuaryText>
          <SanctuaryText variant="label_sm" style={Sty.footerEmail}>
            📧 support@mscurechain.com
          </SanctuaryText>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const Sty = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ── Top Header (Professional White, No Deep Blue) ──
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 17,
  },
  headerSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },

  // ── Tab Bar ──
  tabContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabPillWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabPillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabTxt: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '600',
  },
  tabTxtActive: {
    color: '#1769E0',
    fontWeight: '800',
  },

  // ── Content Scroll ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 36,
  },

  // ── Trust & Policy Notice Banner ──
  trustBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
  },
  trustChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  trustChipGold: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trustChipGoldTxt: {
    color: '#92400E',
    fontSize: 10.5,
    fontWeight: '700',
  },
  trustChipGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trustChipGreenTxt: {
    color: '#065F46',
    fontSize: 10.5,
    fontWeight: '700',
  },
  trustNoticeTxt: {
    color: '#475569',
    fontSize: 11.5,
    lineHeight: 17,
  },

  // ── Professional Flash Cards ──
  flashCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  flashCardHighlighted: {
    borderColor: '#BFDBFE',
    backgroundColor: '#FAFCFF',
  },
  flashCardOpen: {
    borderColor: '#93C5FD',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  numberPill: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  numberPillHighlighted: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  numberTxt: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  numberTxtHighlighted: {
    color: '#1769E0',
  },
  cardTitle: {
    flex: 1,
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 13.5,
    letterSpacing: -0.2,
  },
  cardTitleHighlighted: {
    color: '#1E40AF',
  },
  chevronWrap: {
    width: 24,
    alignItems: 'center',
  },
  bodyDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 0,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#94A3B8',
    marginTop: 6.5,
    flexShrink: 0,
  },
  bulletTxt: {
    color: '#334155',
    fontSize: 12.5,
    lineHeight: 19,
    flex: 1,
  },
  plainTxt: {
    color: '#334155',
    fontSize: 12.5,
    lineHeight: 20,
  },

  // ── Footer Card ──
  footerCard: {
    marginTop: 10,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 6,
  },
  footerTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13.5,
    marginTop: 4,
  },
  footerTxt: {
    color: '#64748B',
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 17,
  },
  footerEmail: {
    color: '#1769E0',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 4,
  },
});
