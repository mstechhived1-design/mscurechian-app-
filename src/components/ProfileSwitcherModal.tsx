import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Text } from 'react-native-paper';
import {
  Users,
  UserCheck,
  Plus,
  X,
  ChevronRight,
  ShieldAlert,
  User,
  Heart,
  Baby,
  Calendar,
  Check,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/navigation/types';
import { familyService, FamilyMember } from '@/services/familyService';

interface ProfileSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  onSwitched?: (member: FamilyMember) => void;
}

export default function ProfileSwitcherModal({
  visible,
  onClose,
  onSwitched,
}: ProfileSwitcherModalProps) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [relationsMap, setRelationsMap] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    if (visible) {
      loadFamily();
    }
  }, [visible]);

  const loadFamily = async () => {
    setLoading(true);
    try {
      const [data, relMap] = await Promise.all([
        familyService.getFamilyMembers(true),
        familyService.getRelationsMap(),
      ]);
      setMembers(data);
      setRelationsMap(relMap);
    } catch (e) {
      console.warn('[ProfileSwitcherModal] Load family warning:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = async (member: FamilyMember) => {
    if (member.isCurrent) {
      onClose();
      return;
    }

    try {
      setSwitchingId(member._id);
      const res = await familyService.switchActiveProfile(member._id);
      if (res.success) {
        onSwitched?.(member);
        onClose();
      } else {
        Alert.alert('Switch Failed', res.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to switch profile context');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleOpenManager = () => {
    onClose();
    try {
      navigation.navigate('FamilyMembers' as any);
    } catch (e) {
      console.warn('[ProfileSwitcherModal] Navigate to FamilyMembers error:', e);
    }
  };

  // Helper for relationship icon
  const getRelationIcon = (rel: string, gender: string) => {
    const r = rel.toLowerCase();
    if (r.includes('child') || r.includes('son') || r.includes('daughter') || r.includes('kid')) {
      return <Baby size={18} color="#0D9488" />;
    }
    if (r.includes('spouse') || r.includes('wife') || r.includes('husband')) {
      return <Heart size={18} color="#E11D48" />;
    }
    return <User size={18} color="#2563EB" />;
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 45 : 70}
          tint="dark"
          style={StyleSheet.absoluteFill}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </BlurView>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconCircle}>
                <Users size={20} color="#2563EB" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.modalTitle}>Switch Patient Profile</Text>
                <Text style={styles.modalSub}>
                  Linked under family mobile number
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Members List */}
          <ScrollView
            style={styles.membersScroll}
            contentContainerStyle={styles.membersScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Fetching family profiles...</Text>
              </View>
            ) : members.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Users size={32} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Single Patient Profile</Text>
                <Text style={styles.emptySub}>
                  No other dependents are currently linked to this mobile number. You can add your children, spouse, or parents below.
                </Text>
              </View>
            ) : (
              (() => {
                const activeMember = members.find((item) => item.isCurrent);
                const activeId = activeMember?._id || '';

                return members.map((m) => {
                  const isSelected = m.isCurrent;
                  const isSwitching = switchingId === m._id;
                  const displayRelation = familyService.getRelativeRelation(activeId, m, relationsMap);

                  return (
                    <TouchableOpacity
                      key={m._id}
                      style={[
                        styles.memberCard,
                        isSelected && styles.memberCardActive,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleSelectMember(m)}
                      disabled={isSwitching}
                    >
                      <View style={styles.memberLeft}>
                        <View
                          style={[
                            styles.avatarBox,
                            isSelected && styles.avatarBoxActive,
                          ]}
                        >
                          {getRelationIcon(displayRelation, m.gender)}
                        </View>

                        <View style={styles.memberInfo}>
                          <View style={styles.nameRow}>
                            <Text style={styles.memberName}>
                              {m.name}
                            </Text>
                            <View
                              style={[
                                styles.relationBadge,
                                isSelected && styles.relationBadgeActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.relationBadgeText,
                                  isSelected && styles.relationBadgeTextActive,
                                ]}
                              >
                                {displayRelation}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.memberDetails}>
                            MRN: <Text style={{ fontWeight: '700', color: '#0F172A' }}>{m.mrn}</Text> •{' '}
                            {m.age ? `${m.age} Yrs` : m.gender} • {m.bloodGroup}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.memberRight}>
                        {isSwitching ? (
                          <ActivityIndicator size="small" color="#2563EB" />
                        ) : isSelected ? (
                          <View style={styles.checkCircle}>
                            <Check size={14} color="#FFF" />
                          </View>
                        ) : (
                          <ChevronRight size={18} color="#94A3B8" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                });
              })()
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.addMemberBtn}
              onPress={handleOpenManager}
            >
              <Users size={18} color="#2563EB" />
              <Text style={styles.addMemberText}>
                Manage Family Relations
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      default: {},
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  membersScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  membersScrollContent: {
    paddingBottom: 16,
  },
  loadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  memberCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarBoxActive: {
    borderColor: '#93C5FD',
    backgroundColor: '#DBEAFE',
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  relationBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  relationBadgeActive: {
    backgroundColor: '#2563EB',
  },
  relationBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
  },
  relationBadgeTextActive: {
    color: '#FFF',
  },
  memberDetails: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  memberRight: {
    marginLeft: 6,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 12,
  },
  addMemberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    marginLeft: 6,
  },
});
