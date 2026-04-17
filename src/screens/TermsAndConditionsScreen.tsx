/**
 * TermsAndConditionsScreen
 *
 * Displays the full MS CureChain Terms & Conditions document including
 * special clauses for patient appointment booking.
 *
 * Can be reached from:
 *  - Profile / Settings
 *  - The T&C link inside the BookAppointment review step
 */

import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  ChevronLeft,
  Shield,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { SanctuaryText } from '@/components/SanctuaryComponents';
import { COLORS } from '@/constants/designSystem';

// ─── Section Data ─────────────────────────────────────────────────────────────

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
      'The Software is intended for use only by hospitals, clinics, and healthcare organizations.',
      'You represent and warrant that you are legally authorized to access the Software and are acting within your assigned role.',
      'If you are accepting these Terms on behalf of an organization, you confirm that you have the authority to bind that organization.',
    ],
  },
  {
    id: 's3',
    number: '3',
    title: 'Scope of Services',
    content: [
      'Patient registration',
      'OPD/IPD workflows',
      'Billing & invoicing',
      'Pharmacy & lab workflows',
      'Reports & audit logs',
      'MS CureChain does NOT provide medical advice, diagnosis, treatment, or clinical judgment.',
    ],
  },
  {
    id: 's4',
    number: '4',
    title: 'Patient Appointment Booking',
    content: [
      'Appointment bookings made through the MS CureChain patient app are subject to doctor availability and hospital schedule.',
      'Fees paid for appointment booking are eligible for a refund only if the cancellation is made at least 24 hours before the scheduled slot. Approved refunds will be credited back to the original payment method within 24 hours.',
      'Appointments are confirmed only after successful payment. An unconfirmed (pending payment) slot may be released to other patients.',
      'You must arrive at least 10 minutes before your scheduled appointment time. Late arrivals may result in rescheduling at the hospital\'s discretion.',
      'You are responsible for providing accurate personal and medical information during booking.',
      'MS CureChain is a technology platform only and is NOT responsible for the clinical quality of the consultation.',
      'Cancellation or rescheduling requests must be made at least 24 hours in advance. Last-minute cancellations may incur a cancellation fee as per hospital policy.',
      'Appointment reminders are sent via push notification and SMS as a courtesy. Non-receipt of a reminder does not excuse non-attendance.',
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
      'Access is granted only to authorized users created by the hospital.',
      'You are responsible for maintaining confidentiality of login credentials and for all actions performed using your account.',
      'Unauthorized access must be reported immediately.',
      'MS Tech Hive is not responsible for losses caused by compromised credentials.',
    ],
  },
  {
    id: 's6',
    number: '7',
    title: 'Acceptable Use Policy',
    content: [
      'Do NOT share accounts or passwords.',
      'Do NOT upload false, misleading, or unlawful data.',
      'Do NOT attempt to reverse engineer or copy the Software.',
      'Do NOT circumvent security controls.',
      'Do NOT use the Software outside healthcare operations.',
      'Do NOT introduce malware, scripts, or harmful code.',
      'Violation may lead to immediate suspension or termination.',
    ],
  },
  {
    id: 's7',
    number: '8',
    title: 'Data Ownership & Responsibility',
    content:
      'All patient and hospital data entered into MS CureChain belongs exclusively to the hospital. MS Tech Hive acts only as a data processor and technology provider. The hospital is solely responsible for data accuracy, lawful collection, patient consent, and data retention policies.',
  },
  {
    id: 's8',
    number: '9',
    title: 'Data Protection & Privacy',
    content:
      'MS Tech Hive implements reasonable administrative, technical, and organizational safeguards. Data may be stored on secure servers, primarily located in India. By using the Software, you consent to processing of data as per applicable Indian laws, including the Digital Personal Data Protection Act, 2023.',
  },
  {
    id: 's9',
    number: '10',
    title: 'Third-Party Services',
    content: [
      'The Software may integrate with SMS gateways, payment gateways, and cloud hosting providers.',
      'MS Tech Hive is not responsible for outages, errors, or failures of third-party services.',
    ],
  },
  {
    id: 's10',
    number: '11',
    title: 'Regulatory & Medical Disclaimer',
    content: [
      'MS CureChain is a technology enablement platform only.',
      'MS Tech Hive does NOT guarantee NABH accreditation.',
      'MS Tech Hive does NOT guarantee ABDM or Ayushman compliance.',
      'MS Tech Hive does NOT ensure audit success.',
      'All regulatory compliance obligations rest solely with the hospital.',
    ],
    highlight: true,
  },
  {
    id: 's11',
    number: '12',
    title: 'Service Availability & Modifications',
    content:
      'The Software is provided on a best-effort basis. MS Tech Hive may modify features, release updates, or temporarily suspend services for maintenance. No uninterrupted or error-free service is guaranteed.',
  },
  {
    id: 's12',
    number: '13',
    title: 'Fees & Payments',
    content:
      'Fees are payable as per agreed commercial terms. Failure to pay may result in suspension, data access restriction, or termination.',
  },
  {
    id: 's13',
    number: '14',
    title: 'Intellectual Property',
    content:
      'MS CureChain, including all source code, UI, workflows, trademarks, and documentation, is the exclusive intellectual property of MS Tech Hive Pvt. Ltd. No license is granted except for limited use under these Terms.',
  },
  {
    id: 's14',
    number: '15',
    title: 'Disclaimer of Warranties',
    content:
      'The Software is provided "AS IS" and "AS AVAILABLE". MS Tech Hive disclaims all warranties, express or implied, including fitness for a particular purpose.',
  },
  {
    id: 's15',
    number: '16',
    title: 'Limitation of Liability',
    content: [
      'MS Tech Hive is not liable for indirect or consequential damages.',
      'Not liable for medical outcomes or regulatory penalties.',
      'Total liability is capped at fees paid in the preceding six (6) months.',
    ],
  },
  {
    id: 's16',
    number: '17',
    title: 'Governing Law & Dispute Resolution',
    content:
      'These Terms are governed by Indian law. Disputes shall be resolved by arbitration under the Arbitration and Conciliation Act, 1996.',
  },
  {
    id: 's17',
    number: '18',
    title: 'Contact Information',
    content: 'legal@mscurechain.com\nsupport@mscurechain.com',
  },
];

const PRIVACY_SECTIONS: Section[] = [
  {
    id: 'p1',
    number: '1',
    title: 'Introduction',
    content: 'MS Tech Hive Private Limited (“MS Tech Hive”, “we”, “us”, “our”) owns and operates MS CureChain Hospital Management System and its mobile applications. This policy explains what information we collect, how we use it, and how it is protected.',
  },
  {
    id: 'p2',
    number: '2',
    title: 'Who This Policy Applies To',
    content: [
      'Patients using the MS CureChain Mobile Application.',
      'Authorized healthcare providers interacting with patient data.',
      'Guardians managing accounts for minors or dependents.',
    ],
  },
  {
    id: 'p3',
    number: '3',
    title: 'Roles & Responsibility',
    content: [
      'Hospital / Healthcare Provider → Data Controller.',
      'MS Tech Hive Pvt. Ltd. → Data Processor.',
      'Patient → Data Owner.',
    ],
  },
  {
    id: 'p4',
    number: '4',
    title: 'Information We Collect',
    content: [
      'Personal Info: Name, Age, Gender, Contact Details.',
      'Health Data: Appointment history, Medical records, Lab reports, Prescriptions, Vitals.',
      'Usage Data: Device info, IP address, Push tokens.',
    ],
    highlight: true,
  },
  {
    id: 'p5',
    number: '5',
    title: 'How We Use Information',
    content: [
      'Enable appointment bookings and health record access.',
      'Send reminders and alerts.',
      'Provide emergency SOS and hospital location services.',
      'We DO NOT sell your personal health data to third-party marketers.',
    ],
  },
  {
    id: 'p6',
    number: '6',
    title: 'Data Storage & Security',
    content: [
      'Data is hosted primarily within India on secure servers.',
      'Reasonable encryption for data at rest and in transit.',
      'Strict role-based access control.',
    ],
  },
  {
    id: 'p7',
    number: '7',
    title: 'Data Sharing',
    content: [
      'With the hospital/laboratory providing treatment.',
      'With integrated payment gateways for fee processing.',
      'When required by government regulatory bodies (ABDM).',
    ],
  },
  {
    id: 'p8',
    number: '8',
    title: 'App Permissions',
    content: [
      'Camera/Gallery for document uploads.',
      'Location for finding nearby hospitals.',
      'Notifications for alerts.',
    ],
  },
  {
    id: 'p9',
    number: '9',
    title: 'Contact Information',
    content: 'privacy@mscurechain.com\nlegal@mscurechain.com',
  },
];

// ─── Collapsible Section ──────────────────────────────────────────────────────

function AccordionSection({ section }: { section: Section }) {
  const [open, setOpen] = useState(
    section.highlight || section.id === 's1' || section.id === 's4',
  );

  const isHighlighted = !!section.highlight;
  const contentItems = Array.isArray(section.content)
    ? section.content
    : [section.content];

  return (
    <View
      style={[
        Sty.card,
        isHighlighted && Sty.cardHighlight,
      ]}
    >
      <TouchableOpacity
        style={Sty.cardHeader}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.75}
      >
        <View
          style={[
            Sty.numberBadge,
            isHighlighted && Sty.numberBadgeHighlight,
          ]}
        >
          <SanctuaryText
            variant="label_sm"
            style={[
              Sty.numberTxt,
              isHighlighted && { color: '#fff' },
            ]}
          >
            {section.number}
          </SanctuaryText>
        </View>

        <SanctuaryText
          variant="label_lg"
          style={[
            Sty.cardTitle,
            isHighlighted && Sty.cardTitleHighlight,
          ]}
          numberOfLines={2}
        >
          {section.title}
        </SanctuaryText>

        {open ? (
          <ChevronUp size={16} color={isHighlighted ? '#1E40AF' : '#94A3B8'} />
        ) : (
          <ChevronDown size={16} color="#94A3B8" />
        )}
      </TouchableOpacity>

      {open && (
        <View style={Sty.cardBody}>
          {Array.isArray(section.content) ? (
            contentItems.map((item, idx) => (
              <View key={idx} style={Sty.bulletRow}>
                <View style={Sty.bullet} />
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function TermsAndConditionsScreen() {
  const navigation = useNavigation();
  const route = useRoute<TCTabRouteProp>();
  const scrollRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(route.params?.initialTab || 'terms');

  const currentSections = activeTab === 'terms' ? SECTIONS : PRIVACY_SECTIONS;

  return (
    <View style={Sty.root}>

      {/* ── Header ── */}
      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        style={Sty.header}
      >
        <TouchableOpacity
          style={Sty.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ChevronLeft size={22} color="#fff" />
        </TouchableOpacity>

        <View style={Sty.headerCenter}>
          <View style={Sty.headerIconWrap}>
            <Shield size={24} color="#60A5FA" />
          </View>
          <SanctuaryText variant="headline_sm" style={Sty.headerTitle}>
            Terms &amp; Privacy
          </SanctuaryText>
          <SanctuaryText variant="body_sm" style={Sty.headerSub}>
            MS CureChain · MS Tech Hive Pvt. Ltd.
          </SanctuaryText>
        </View>
      </LinearGradient>

      {/* ── Tabs ── */}
      <View style={Sty.tabBar}>
        <TouchableOpacity 
          style={[Sty.tabItem, activeTab === 'terms' && Sty.tabActive]}
          onPress={() => setActiveTab('terms')}
        >
          <SanctuaryText variant="label_sm" style={[Sty.tabTxt, activeTab === 'terms' && Sty.tabTxtActive]}>
            Terms of Service
          </SanctuaryText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[Sty.tabItem, activeTab === 'privacy' && Sty.tabActive]}
          onPress={() => setActiveTab('privacy')}
        >
          <SanctuaryText variant="label_sm" style={[Sty.tabTxt, activeTab === 'privacy' && Sty.tabTxtActive]}>
            Privacy Policy
          </SanctuaryText>
        </TouchableOpacity>
      </View>

      {/* ── Last Updated banner ── */}
      <View style={Sty.updateBanner}>
        <AlertCircle size={13} color="#D97706" />
        <SanctuaryText variant="label_sm" style={Sty.updateTxt}>
          Last Updated: April 2025 · Effective immediately upon login or booking
        </SanctuaryText>
      </View>

      {/* ── Highlight Notice ── */}
      <View style={Sty.noticeBand}>
        <CheckCircle2 size={15} color="#059669" />
        <SanctuaryText variant="body_sm" style={Sty.noticeTxt}>
          Section 4 covers Patient Appointment Booking terms — please read before confirming.
        </SanctuaryText>
      </View>

      {/* ── Content ── */}
      <ScrollView
        ref={scrollRef}
        style={Sty.scroll}
        contentContainerStyle={Sty.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Product header */}
        <View style={Sty.productHeader}>
          <FileText size={18} color={COLORS.primary} />
          <SanctuaryText variant="label_lg" style={Sty.productName}>
            MS CureChain – Hospital Management System
          </SanctuaryText>
        </View>
        <SanctuaryText variant="body_sm" style={Sty.productTagline}>
          A Product of MS Tech Hive Private Limited
        </SanctuaryText>

        {currentSections.map((sec) => (
          <AccordionSection key={sec.id} section={sec} />
        ))}

        {/* Footer */}
        <View style={Sty.footer}>
          <SanctuaryText variant="body_sm" style={Sty.footerTxt}>
            By using the MS CureChain patient app you confirm you have read and accepted all the terms above.
          </SanctuaryText>
          <SanctuaryText variant="label_sm" style={Sty.footerEmail}>
            📧 legal@mscurechain.com
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
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    paddingVertical: 14,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabTxt: {
    color: '#64748B',
    fontWeight: '600',
  },
  tabTxtActive: {
    color: COLORS.primary,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerCenter: { alignItems: 'center' },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(96,165,250,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 20,
    textAlign: 'center',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  // Banners
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  updateTxt: { color: '#92400E', fontSize: 11, fontWeight: '600', flex: 1 },

  noticeBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  noticeTxt: { color: '#065F46', fontSize: 12, fontWeight: '600', flex: 1 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Product header
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    marginTop: 4,
  },
  productName: {
    color: '#1E293B',
    fontWeight: '900',
    fontSize: 14,
    flex: 1,
  },
  productTagline: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 18,
    marginLeft: 2,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHighlight: {
    borderColor: '#BFDBFE',
    backgroundColor: '#F0F7FF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#EAF1FF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  numberBadgeHighlight: { backgroundColor: COLORS.primary },
  numberTxt: { color: COLORS.primary, fontSize: 11, fontWeight: '900' },
  cardTitle: {
    flex: 1,
    color: '#1E293B',
    fontWeight: '800',
    fontSize: 14,
  },
  cardTitleHighlight: { color: '#1E40AF' },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },

  // Content
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  bulletTxt: { color: '#475569', fontSize: 13, lineHeight: 20, flex: 1 },
  plainTxt: { color: '#475569', fontSize: 13, lineHeight: 22 },

  // Footer
  footer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 8,
  },
  footerTxt: { color: '#64748B', fontSize: 12, textAlign: 'center', lineHeight: 19 },
  footerEmail: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});
