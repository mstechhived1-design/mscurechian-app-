import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import { MapPin, Globe, Star, ChevronRight } from 'lucide-react-native';
import { Hospital, formatDistance } from '@/services/paymentService';
import { SanctuaryText } from '@/components/SanctuaryComponents';
import { HospitalBuildingCarousel } from './HospitalBuildingCarousel';

interface HospitalDiscoveryCardProps {
  hospital: Hospital;
  distanceKm?: number;
  isSelected?: boolean;
  onSelect: () => void;
  showChevron?: boolean;
}

export const HospitalDiscoveryCard: React.FC<HospitalDiscoveryCardProps> = ({
  hospital,
  distanceKm,
  isSelected = false,
  onSelect,
  showChevron = true,
}) => {
  const ratingValue = (hospital.rating && hospital.rating > 0) ? hospital.rating.toFixed(1) : '4.4';
  const reviewsCount = hospital.reviewCount || 1200;
  const reviewsText = reviewsCount >= 1000 ? `${(reviewsCount / 1000).toFixed(1)}K` : reviewsCount;

  const handleOpenWebsite = (e: any) => {
    e.stopPropagation();
    if (!hospital.website) return;
    const url = hospital.website.startsWith('http') ? hospital.website : `https://${hospital.website}`;
    Linking.openURL(url).catch((err) => console.warn('Could not open website:', err));
  };

  const handleViewOnMap = (e: any) => {
    e.stopPropagation();
    // 1. Direct location / googleMapLink if saved
    if (hospital.locationLink || hospital.googleMapLink) {
      const url = hospital.locationLink || hospital.googleMapLink!;
      Linking.openURL(url).catch((err) => console.warn('Could not open map link:', err));
      return;
    }

    // 2. Exact coordinates
    if (hospital.location && typeof hospital.location.lat === 'number' && typeof hospital.location.lng === 'number') {
      const { lat, lng } = hospital.location;
      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      Linking.openURL(url).catch((err) => console.warn('Could not open maps:', err));
      return;
    }

    // 3. Fallback to physical address
    const fullAddress = [hospital.address, hospital.city, hospital.state].filter(Boolean).join(', ');
    if (fullAddress) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
      Linking.openURL(url).catch((err) => console.warn('Could not open maps:', err));
    }
  };

  // Building images array or fallback to logo if nothing else
  const buildingImages = (hospital.buildingImages && hospital.buildingImages.length > 0)
    ? hospital.buildingImages
    : (hospital.logo ? [hospital.logo] : []);

  const fullAddress = hospital.address || [hospital.street, hospital.city, hospital.state].filter(Boolean).join(', ') || 'Address available on inquiry';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onSelect}
      style={[styles.card, isSelected && styles.cardSelected]}
    >
      {/* Left: Building Carousel / Photograph */}
      <View style={styles.imageWrapper}>
        <HospitalBuildingCarousel
          images={buildingImages}
          width={105}
          height={92}
          borderRadius={12}
          onPress={onSelect}
        />
        {/* Subtle logo badge if available and distinct from building photos */}
        {hospital.logo && (!hospital.buildingImages || hospital.buildingImages.length === 0) ? null : hospital.logo ? (
          <View style={styles.logoBadge}>
            <Image source={{ uri: hospital.logo }} style={styles.logoImg} resizeMode="contain" />
          </View>
        ) : null}
      </View>

      {/* Right: Hospital Information */}
      <View style={styles.infoWrapper}>
        {/* Row 1: Name and Distance */}
        <View style={styles.nameRow}>
          <SanctuaryText variant="label_lg" style={styles.hospitalName} numberOfLines={2}>
            {hospital.name}
          </SanctuaryText>
          {distanceKm !== undefined && (
            <View style={styles.distanceBadge}>
              <MapPin size={10} color="#2563EB" />
              <SanctuaryText variant="label_sm" style={styles.distanceText}>
                {formatDistance(distanceKm)}
              </SanctuaryText>
            </View>
          )}
        </View>

        {/* Category */}
        <SanctuaryText variant="body_sm" style={styles.categoryText} numberOfLines={1}>
          {hospital.specialities?.[0] || hospital.specialties?.[0] ? `${hospital.specialities?.[0] || hospital.specialties?.[0]} & General Care` : 'Multi-Specialty Hospital'}
        </SanctuaryText>

        {/* Rating Row */}
        <View style={styles.ratingRow}>
          <Star size={12} color="#F59E0B" fill="#F59E0B" />
          <SanctuaryText variant="label_sm" style={styles.ratingText}>
            {ratingValue}
          </SanctuaryText>
          <SanctuaryText variant="body_sm" style={styles.reviewsText}>
            ({reviewsText} reviews)
          </SanctuaryText>
        </View>

        {/* Address */}
        <View style={styles.addressRow}>
          <MapPin size={11} color="#94A3B8" style={{ marginTop: 1.5 }} />
          <SanctuaryText variant="body_sm" style={styles.addressText} numberOfLines={2}>
            {fullAddress}
          </SanctuaryText>
        </View>

        {/* Action Buttons: Website & View on Map */}
        <View style={styles.actionsRow}>
          {hospital.website ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenWebsite}
              style={styles.actionBtn}
            >
              <Globe size={11} color="#2563EB" />
              <SanctuaryText variant="label_sm" style={styles.actionBtnText}>
                Website
              </SanctuaryText>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleViewOnMap}
            style={styles.actionBtn}
          >
            <MapPin size={11} color="#2563EB" />
            <SanctuaryText variant="label_sm" style={styles.actionBtnText}>
              View on Map
            </SanctuaryText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Right chevron indicator */}
      {showChevron && (
        <View style={styles.chevronWrapper}>
          <ChevronRight size={18} color="#94A3B8" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
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
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  logoBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    padding: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  infoWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 2,
  },
  hospitalName: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 13.5,
    flex: 1,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  distanceText: {
    color: '#2563EB',
    fontSize: 9.5,
    fontWeight: '800',
  },
  categoryText: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '500',
    marginBottom: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    marginBottom: 3,
  },
  ratingText: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '800',
  },
  reviewsText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 6,
  },
  addressText: {
    color: '#64748B',
    fontSize: 10,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnText: {
    color: '#1E40AF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  chevronWrapper: {
    paddingLeft: 4,
    paddingRight: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
