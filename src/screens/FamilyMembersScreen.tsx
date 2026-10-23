import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import {
  ChevronLeft,
  Users,
  UserCheck,
  Baby,
  Heart,
  User,
  CheckCircle2,
  X,
  ShieldCheck,
  Stethoscope,
  Phone,
  Edit3,
  AlertTriangle,
  Info,
  Check,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/navigation/types';
import {
  familyService,
  FamilyMember,
  BloodRelation,
  BLOOD_RELATION_OPTIONS,
  CATEGORIZED_RELATIONS,
} from '@/services/familyService';

export default function FamilyMembersScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [primaryPhone, setPrimaryPhone] = useState<string>('');
  const [relationsMap, setRelationsMap] = useState<Record<string, Record<string, string>>>({});

  // Relation Edit Modal State
  const [relationModalVisible, setRelationModalVisible] = useState(false);
  const [editingTargetMember, setEditingTargetMember] = useState<FamilyMember | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<BloodRelation>('Other Relative');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [savingRelation, setSavingRelation] = useState(false);

  useEffect(() => {
    loadMembers();

    const unsubRel = familyService.onRelationsChange(() => {
      loadMembers();
    });
    const unsubProf = familyService.onProfileChange(() => {
      loadMembers();
    });

    return () => {
      unsubRel();
      unsubProf();
    };
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const [data, relMap] = await Promise.all([
        familyService.getFamilyMembers(true),
        familyService.getRelationsMap(),
      ]);
      setMembers(data);
      setRelationsMap(relMap);
      if (data.length > 0) {
        setPrimaryPhone(data[0].mobile || '');
      }
    } catch (e) {
      console.warn('[FamilyMembersScreen] Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchProfile = async (member: FamilyMember) => {
    if (member.isCurrent) return;

    try {
      setSwitchingId(member._id);
      const res = await familyService.switchActiveProfile(member._id);
      if (res.success) {
        Alert.alert(
          'Profile Switched',
          `You are now viewing health records for ${member.name}.`,
          [
            {
              text: 'Go to Dashboard',
              onPress: () => navigation.navigate('Dashboard'),
            },
            {
              text: 'Stay Here',
              onPress: () => loadMembers(),
            },
          ]
        );
      } else {
        Alert.alert('Switch Error', res.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not switch profile');
    } finally {
      setSwitchingId(null);
    }
  };

  const currentActiveMember = members.find((m) => m.isCurrent) || members[0] || null;

  const handleOpenEditRelation = (target: FamilyMember) => {
    if (!currentActiveMember) return;
    setEditingTargetMember(target);

    // Look up existing relationship or default
    const existing = relationsMap[currentActiveMember._id]?.[target._id] as BloodRelation | undefined;
    const initialRelation: BloodRelation = existing || (
      target.relationship && BLOOD_RELATION_OPTIONS.includes(target.relationship as BloodRelation)
        ? (target.relationship as BloodRelation)
        : 'Other Relative'
    );

    setSelectedRelation(initialRelation);

    // Initial validation check
    const existingMap = relationsMap[currentActiveMember._id] || {};
    const check = familyService.validateBloodRelation(currentActiveMember, target, initialRelation, existingMap);
    setValidationError(check.valid ? null : (check.error || null));

    setRelationModalVisible(true);
  };

  const handleSelectRelationOption = (rel: BloodRelation) => {
    setSelectedRelation(rel);
    if (currentActiveMember && editingTargetMember) {
      const existingMap = relationsMap[currentActiveMember._id] || {};
      const check = familyService.validateBloodRelation(currentActiveMember, editingTargetMember, rel, existingMap);
      setValidationError(check.valid ? null : (check.error || 'Invalid relationship'));
    }
  };

  const handleSaveRelation = async () => {
    if (!currentActiveMember || !editingTargetMember) return;

    if (validationError) {
      Alert.alert('Validation Notice', validationError);
      return;
    }

    try {
      setSavingRelation(true);
      const res = await familyService.setRelation(
        currentActiveMember,
        editingTargetMember,
        selectedRelation
      );

      if (res.success) {
        setRelationModalVisible(false);
        await loadMembers();
        Alert.alert(
          'Relationship Saved',
          `${editingTargetMember.name} is now set as your ${selectedRelation}.\n\nWhen ${editingTargetMember.name} logs in, you will automatically be linked in return.`
        );
      } else {
        Alert.alert('Cannot Save Relation', res.message || 'Validation failed');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update relationship');
    } finally {
      setSavingRelation(false);
    }
  };

  const getRelationBadgeColor = (rel: string) => {
    const r = rel.toLowerCase();
    if (r.includes('self')) return { bg: '#DBEAFE', text: '#1D4ED8' };
    if (r.includes('spouse') || r.includes('wife') || r.includes('husband')) {
      return { bg: '#FCE7F3', text: '#BE185D' };
    }
    if (r.includes('child') || r.includes('son') || r.includes('daughter')) {
      return { bg: '#CCFBF1', text: '#0F766E' };
    }
    if (r.includes('father') || r.includes('mother') || r.includes('parent')) {
      return { bg: '#FEF3C7', text: '#B45309' };
    }
    if (r.includes('brother') || r.includes('sister')) {
      return { bg: '#EDE9FE', text: '#6D28D9' };
    }
    if (r.includes('grand')) {
      return { bg: '#E0E7FF', text: '#3730A3' };
    }
    if (r.includes('uncle') || r.includes('aunt') || r.includes('cousin') || r.includes('nephew') || r.includes('niece')) {
      return { bg: '#F3E8FF', text: '#7E22CE' };
    }
    if (r.includes('law')) {
      return { bg: '#FFEDD5', text: '#C2410C' };
    }
    return { bg: '#F1F5F9', text: '#475569' };
  };

  const getRelationIcon = (rel: string) => {
    const r = rel.toLowerCase();
    if (r.includes('child') || r.includes('son') || r.includes('daughter')) {
      return <Baby size={22} color="#0D9488" />;
    }
    if (r.includes('spouse') || r.includes('wife') || r.includes('husband')) {
      return <Heart size={22} color="#E11D48" />;
    }
    return <User size={22} color="#2563EB" />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* ── Top Header (Clean, no Add button) ────────────────────────────── */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Family Health Circle</Text>
          <Text style={styles.headerSub}>
            Multiple patients linked to same mobile
          </Text>
        </View>

        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Info Banner ───────────────────────────────────────────── */}
        <LinearGradient
          colors={['#1E3A8A', '#2563EB', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconBox}>
              <Users size={24} color="#FFF" />
            </View>
            <View style={styles.heroPill}>
              <ShieldCheck size={12} color="#93C5FD" />
              <Text style={styles.heroPillText}>Shared Family Account</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Family Members & Dependents</Text>
          <Text style={styles.heroSub}>
            All patient profiles linked to this phone number. View records, switch active profile, or customize each member's relation relative to you.
          </Text>

          {primaryPhone ? (
            <View style={styles.phoneChip}>
              <Phone size={12} color="#BFDBFE" />
              <Text style={styles.phoneChipText}>
                Linked Primary Mobile: +91 {primaryPhone}
              </Text>
            </View>
          ) : null}
        </LinearGradient>

        {/* ── Profiles Section ───────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Linked Patient Profiles ({members.length})
          </Text>
          <Text style={styles.sectionSub}>
            {currentActiveMember
              ? `Relations are shown relative to active profile: ${currentActiveMember.name}`
              : "Tap 'Switch Profile' to view that member's records"}
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.centerLoadingText}>Loading family profiles...</Text>
          </View>
        ) : members.length === 0 ? (
          <View style={styles.emptyCard}>
            <Users size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Family Members Linked</Text>
            <Text style={styles.emptySub}>
              No other patient profiles are registered under this mobile number in hospital records.
            </Text>
          </View>
        ) : (
          members.map((m) => {
            const isCurrent = m.isCurrent;
            const isSwitching = switchingId === m._id;
            const activeId = currentActiveMember?._id || '';
            const displayRelation = familyService.getRelativeRelation(activeId, m, relationsMap);
            const badgeStyle = getRelationBadgeColor(displayRelation);

            return (
              <View
                key={m._id}
                style={[
                  styles.memberItemCard,
                  isCurrent && styles.memberItemCardActive,
                ]}
              >
                <View style={styles.cardHeaderRow}>
                  <View style={styles.memberAvatarCircle}>
                    {getRelationIcon(displayRelation)}
                  </View>

                  <View style={styles.memberMetaWrap}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberNameText}>
                        {m.name}
                      </Text>

                      <TouchableOpacity
                        style={[
                          styles.relTag,
                          { backgroundColor: badgeStyle.bg },
                        ]}
                        activeOpacity={isCurrent ? 1 : 0.7}
                        onPress={() => {
                          if (!isCurrent) handleOpenEditRelation(m);
                        }}
                      >
                        <Text
                          style={[
                            styles.relTagText,
                            { color: badgeStyle.text },
                          ]}
                        >
                          {displayRelation}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.memberSubText}>
                      MRN: <Text style={styles.mrnBold}>{m.mrn}</Text> •{' '}
                      {m.age ? `${m.age} Yrs` : m.gender} • Blood: {m.bloodGroup}
                    </Text>
                  </View>
                </View>

                {/* Additional Clinical Info */}
                {(m.allergies || m.conditions) ? (
                  <View style={styles.clinicalNotesStrip}>
                    {m.allergies ? (
                      <Text style={styles.clinicalNoteItem} numberOfLines={1}>
                        ⚠️ Allergies: {m.allergies}
                      </Text>
                    ) : null}
                    {m.conditions ? (
                      <Text style={styles.clinicalNoteItem} numberOfLines={1}>
                        🩺 Conditions: {m.conditions}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {/* Action Buttons */}
                <View style={styles.cardActionRow}>
                  {isCurrent ? (
                    <View style={styles.activePill}>
                      <CheckCircle2 size={14} color="#166534" />
                      <Text style={styles.activePillText}>Active Profile</Text>
                    </View>
                  ) : (
                    <View style={styles.actionLeftGroup}>
                      <TouchableOpacity
                        style={styles.switchBtn}
                        onPress={() => handleSwitchProfile(m)}
                        disabled={isSwitching}
                      >
                        {isSwitching ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <>
                            <UserCheck size={14} color="#FFF" />
                            <Text style={styles.switchBtnText}>Switch Profile</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.editRelBtn}
                        onPress={() => handleOpenEditRelation(m)}
                      >
                        <Edit3 size={13} color="#2563EB" />
                        <Text style={styles.editRelBtnText}>Set Relation</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.bookForBtn}
                    onPress={() => {
                      navigation.navigate('BookAppointment');
                    }}
                  >
                    <Stethoscope size={13} color="#2563EB" />
                    <Text style={styles.bookForBtnText}>Book OPD</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Set Family Relation Modal (Customizable with Blood Relation Validations) ── */}
      <Modal
        visible={relationModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRelationModalVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={Platform.OS === 'ios' ? 45 : 70}
            tint="dark"
            style={StyleSheet.absoluteFill}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => setRelationModalVisible(false)}
              activeOpacity={1}
            />
          </BlurView>

          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Set Family Relationship</Text>
                <Text style={styles.sheetSub}>
                  How is {editingTargetMember?.name} related to you?
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setRelationModalVisible(false)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {/* Context Summary Box */}
              <View style={styles.contextSummaryBox}>
                <View style={styles.contextRow}>
                  <Text style={styles.contextLabel}>Current Active User:</Text>
                  <Text style={styles.contextValue}>
                    {currentActiveMember?.name} ({currentActiveMember?.gender || 'N/A'}, {currentActiveMember?.age ? `${currentActiveMember.age}y` : '--'})
                  </Text>
                </View>
                <View style={styles.contextRow}>
                  <Text style={styles.contextLabel}>Target Member:</Text>
                  <Text style={styles.contextValue}>
                    {editingTargetMember?.name} ({editingTargetMember?.gender || 'N/A'}, {editingTargetMember?.age ? `${editingTargetMember.age}y` : '--'})
                  </Text>
                </View>
              </View>

              {/* Validation Error Banner */}
              {validationError ? (
                <View style={styles.validationErrorBanner}>
                  <AlertTriangle size={16} color="#DC2626" />
                  <Text style={styles.validationErrorText}>
                    {validationError}
                  </Text>
                </View>
              ) : null}

              {/* Categorized Relationship Chips */}
              <Text style={styles.formLabel}>Select Blood / Family Relation</Text>
              {CATEGORIZED_RELATIONS.map((cat) => (
                <View key={cat.title} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>{cat.title}</Text>
                  <View style={styles.chipsGrid}>
                    {cat.options.map((rel) => {
                      const isSel = selectedRelation === rel;
                      return (
                        <TouchableOpacity
                          key={rel}
                          style={[
                            styles.chipGridItem,
                            isSel && styles.chipGridItemActive,
                          ]}
                          onPress={() => handleSelectRelationOption(rel)}
                          activeOpacity={0.7}
                        >
                          {isSel && (
                            <Check size={13} color="#FFF" style={{ marginRight: 4 }} />
                          )}
                          <Text
                            style={[
                              styles.chipGridItemText,
                              isSel && styles.chipGridItemTextActive,
                            ]}
                          >
                            {rel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              {/* Helpful Reciprocity Note */}
              <View style={styles.reciprocalNoteBox}>
                <Info size={14} color="#2563EB" />
                <Text style={styles.reciprocalNoteText}>
                  Setting this relationship will automatically link the reciprocal relation (e.g. if set as Father, they will automatically see you as their Son/Daughter when they log in).
                </Text>
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={[
                  styles.saveRelationBtn,
                  Boolean(validationError) && styles.saveRelationBtnDisabled,
                ]}
                onPress={handleSaveRelation}
                disabled={Boolean(validationError) || savingRelation}
              >
                {savingRelation ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <CheckCircle2 size={18} color="#FFF" />
                    <Text style={styles.saveRelationBtnText}>
                      Save Relationship
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFF',
  },
  backBtn: {
    padding: 6,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
      default: {},
    }),
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  heroPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DBEAFE',
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  heroSub: {
    fontSize: 12,
    color: '#BFDBFE',
    lineHeight: 18,
    marginTop: 4,
  },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  phoneChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 6,
  },
  sectionHeader: {
    marginBottom: 14,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  centerLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  centerLoadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748B',
  },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  memberItemCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  memberItemCardActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#F8FAFC',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  memberMetaWrap: {
    marginLeft: 12,
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  relTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  relTagText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  memberSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  mrnBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  clinicalNotesStrip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  clinicalNoteItem: {
    fontSize: 11,
    color: '#334155',
    marginVertical: 1,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    marginLeft: 4,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  switchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 4,
  },
  editRelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editRelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    marginLeft: 4,
  },
  bookForBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bookForBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 6,
  },
  formScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  contextSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  contextLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  contextValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  validationErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  validationErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
    lineHeight: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chipGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  chipGridItemActive: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  chipGridItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  chipGridItemTextActive: {
    color: '#FFF',
  },
  reciprocalNoteBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 8,
    marginBottom: 20,
  },
  reciprocalNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  saveRelationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
  },
  saveRelationBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  saveRelationBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
});
