import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Star, GraduationCap, Briefcase, User, Sparkles } from 'lucide-react-native';
import {
  Doctor,
  getDoctorDisplayName,
  getDoctorSpecialty,
  getDoctorSpecialtiesList,
  getDoctorExperience,
  getDoctorImage,
  formatCurrency,
} from '@/services/paymentService';
import { SanctuaryText } from '@/components/SanctuaryComponents';
import { COLORS } from '@/constants/designSystem';

interface DoctorDiscoveryCardProps {
  doctor: Doctor;
  onBook: () => void;
  isSelected?: boolean;
}

export const DoctorDiscoveryCard: React.FC<DoctorDiscoveryCardProps> = ({
  doctor,
  onBook,
  isSelected = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const photoUrl = getDoctorImage(doctor);

  const displayName = getDoctorDisplayName(doctor);
  const specialty = getDoctorSpecialty(doctor);
  const experienceYears = getDoctorExperience(doctor);

  // Qualifications string
  const qualificationsText = doctor.qualifications && doctor.qualifications.length > 0
    ? doctor.qualifications.join(', ')
    : 'MBBS';

  // Derived condition tags for patient-friendly display
  const tags = React.useMemo(() => {
    // If doctor has explicit assigned specialties, use them as primary tags
    const explicit = (doctor.specialties || []).filter((s) => s && s.trim());
    if (explicit.length > 1) {
      return explicit.slice(0, 3);
    }

    const s = specialty.toLowerCase();
    if (s.includes('cardio') || s.includes('heart')) return ['Heart Care', 'BP & ECG', 'Cardiology'];
    if (s.includes('ortho') || s.includes('bone') || s.includes('joint')) return ['Bone & Joint', 'Fracture', 'Orthopedics'];
    if (s.includes('gynec') || s.includes('obstet') || s.includes('women')) return ['Pregnancy Care', 'Women Health', 'Gynecology'];
    if (s.includes('pediat') || s.includes('child')) return ['Child Health', 'Vaccination', 'Pediatrics'];
    if (s.includes('derma') || s.includes('skin')) return ['Skin Care', 'Acne & Allergy', 'Dermatology'];
    if (s.includes('ent') || s.includes('ear') || s.includes('throat')) return ['Ear & Throat', 'Sinus', 'ENT Specialist'];
    if (s.includes('neuro') || s.includes('brain')) return ['Neurology', 'Headache', 'Nerve Care'];
    if (s.includes('ophthal') || s.includes('eye')) return ['Eye Care', 'Vision', 'Ophthalmology'];
    if (s.includes('dent') || s.includes('teeth')) return ['Dental Care', 'Oral Health', 'Teeth'];
    if (s.includes('gastro')) return ['Digestive Care', 'Liver Health', 'Gastroenterology'];
    if (s.includes('pulmo') || s.includes('chest') || s.includes('lung')) return ['Chest Care', 'Asthma', 'Pulmonology'];
    if (s.includes('oncol')) return ['Cancer Care', 'Oncology', 'Consultation'];
    if (s.includes('uro') || s.includes('nephro')) return ['Kidney Care', 'Urinary Care', 'Nephrology'];
    if (s.includes('physio')) return ['Physiotherapy', 'Rehabilitation', 'Pain Relief'];
    if (s.includes('surg')) return ['General Surgery', 'Minor Surgery', 'Consultation'];
    if (explicit.length === 1) {
      return [explicit[0], 'General Health', 'Consultation'];
    }
    return ['General Health', 'Fever & Infection', 'Primary Care'];
  }, [specialty, doctor.specialties]);

  const ratingValue = (doctor.rating && doctor.rating > 0) ? doctor.rating.toFixed(1) : '4.6';
  const reviewsCount = doctor.reviewCount || 320;

  return (
    <View style={[styles.card, isSelected && styles.cardSelected]}>
      {/* Top Section: Photo + Doctor Info */}
      <View style={styles.topRow}>
        {/* Left: Doctor Photo */}
        <View style={styles.photoContainer}>
          {photoUrl && !imgError ? (
            <Image
              source={{ uri: photoUrl }}
              style={styles.photo}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={styles.fallbackAvatar}>
              <User size={30} color="#64748B" />
            </View>
          )}
        </View>

        {/* Right: Info */}
        <View style={styles.infoCol}>
          {/* Name & Rating */}
          <View style={styles.nameHeader}>
            <SanctuaryText variant="label_lg" style={styles.doctorName} numberOfLines={2}>
              {displayName}
            </SanctuaryText>
            <View style={styles.ratingBadge}>
              <Star size={11} color="#D97706" fill="#D97706" />
              <SanctuaryText variant="label_sm" style={styles.ratingText}>
                {ratingValue}
              </SanctuaryText>
              <SanctuaryText variant="body_sm" style={styles.reviewsText}>
                ({reviewsCount})
              </SanctuaryText>
            </View>
          </View>

          {/* Specialty */}
          <SanctuaryText variant="body_sm" style={styles.specialtyText} numberOfLines={2}>
            {specialty}
          </SanctuaryText>

          {/* Qualifications */}
          <View style={styles.metaRow}>
            <GraduationCap size={13} color="#64748B" style={{ marginTop: 1 }} />
            <SanctuaryText variant="body_sm" style={styles.metaText} numberOfLines={2}>
              {qualificationsText}
            </SanctuaryText>
          </View>

          {/* Experience */}
          <View style={styles.metaRow}>
            <Briefcase size={13} color="#64748B" style={{ marginTop: 1 }} />
            <SanctuaryText variant="body_sm" style={styles.metaText} numberOfLines={2}>
              {experienceYears > 0 ? `${experienceYears} years experience` : 'Experienced Practitioner'}
            </SanctuaryText>
          </View>
        </View>
      </View>

      {/* Tags Row */}
      <View style={styles.tagsRow}>
        {tags.map((tag, idx) => (
          <View key={idx} style={styles.tagPill}>
            <SanctuaryText variant="label_sm" style={styles.tagText}>
              {tag}
            </SanctuaryText>
          </View>
        ))}
      </View>

      {/* Bottom Row: Consultation Fee + Book Appointment Button */}
      <View style={styles.bottomRow}>
        <View style={styles.feeCol}>
          <SanctuaryText variant="headline_sm" style={styles.feeAmount}>
            {formatCurrency(doctor.consultationFee || 500)}
          </SanctuaryText>
          <SanctuaryText variant="body_sm" style={styles.feeLabel}>
            Consultation Fee
          </SanctuaryText>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onBook}
          style={styles.bookBtn}
        >
          <SanctuaryText variant="label_lg" style={styles.bookBtnText}>
            Book Appointment
          </SanctuaryText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#F8FAFF',
  },
  topRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  photoContainer: {
    width: 76,
    height: 76,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  nameHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 2,
  },
  doctorName: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 1,
  },
  ratingText: {
    color: '#B45309',
    fontSize: 10.5,
    fontWeight: '800',
  },
  reviewsText: {
    color: '#B45309',
    fontSize: 9.5,
    fontWeight: '500',
  },
  specialtyText: {
    color: '#64748B',
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 2,
  },
  metaText: {
    color: '#64748B',
    fontSize: 10.5,
    lineHeight: 15,
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 12,
    paddingTop: 4,
  },
  tagPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  tagText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  feeCol: {
    justifyContent: 'center',
  },
  feeAmount: {
    color: '#059669',
    fontWeight: '900',
    fontSize: 16,
  },
  feeLabel: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '600',
  },
  bookBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
