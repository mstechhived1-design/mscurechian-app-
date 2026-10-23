/**
 * MSCureChain Patient App — Family Members & Dependent Profiles Service
 *
 * Manages multiple patient profiles registered under the SAME mobile number
 * (e.g. Father, Mother, Children with different names, DOBs, genders, and MRNs).
 *
 * Capabilities:
 * - Automatically fetches all linked family members sharing the same mobile phone
 * - 1-Tap profile switching with secure token refresh & immediate data context switch
 * - Offline cache support so family members are accessible in zero-signal areas
 * - Register new dependents (Child, Spouse, Parent) under the primary mobile number
 * - Profile change notification event bus
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, PATIENT_ENDPOINTS, saveAuthTokens } from '@/api';

export const FAMILY_STORAGE_KEYS = {
  MEMBERS_CACHE: 'mscurechain_family_members_cache_v1',
  ACTIVE_MEMBER_ID: 'mscurechain_active_family_member_id',
  RELATIONS_MAP: 'mscurechain_family_relations_map_v2',
} as const;

export type BloodRelation =
  // Immediate Family
  | 'Father'
  | 'Mother'
  | 'Son'
  | 'Daughter'
  // Spouse
  | 'Husband'
  | 'Wife'
  | 'Spouse'
  // Detailed Sibling Hierarchy
  | 'Elder Brother'
  | 'Younger Brother'
  | 'Elder Sister'
  | 'Younger Sister'
  | 'Brother'
  | 'Sister'
  // Grandparents
  | 'Grandfather (Paternal)'
  | 'Grandmother (Paternal)'
  | 'Grandfather (Maternal)'
  | 'Grandmother (Maternal)'
  | 'Grandfather'
  | 'Grandmother'
  // Grandchildren
  | 'Grandson'
  | 'Granddaughter'
  // Extended Family
  | 'Uncle'
  | 'Aunt'
  | 'Nephew'
  | 'Niece'
  | 'Cousin'
  // In-Laws & Legal
  | 'Father-in-law'
  | 'Mother-in-law'
  | 'Brother-in-law'
  | 'Sister-in-law'
  | 'Son-in-law'
  | 'Daughter-in-law'
  | 'Guardian'
  | 'Other Relative';

export interface RelationCategory {
  title: string;
  options: BloodRelation[];
}

export const CATEGORIZED_RELATIONS: RelationCategory[] = [
  {
    title: 'Siblings (Elder / Younger)',
    options: ['Elder Brother', 'Younger Brother', 'Elder Sister', 'Younger Sister', 'Brother', 'Sister'],
  },
  {
    title: 'Parents & Children',
    options: ['Father', 'Mother', 'Son', 'Daughter'],
  },
  {
    title: 'Spouse & Partner',
    options: ['Husband', 'Wife', 'Spouse'],
  },
  {
    title: 'Grandparents & Grandchildren',
    options: [
      'Grandfather (Paternal)',
      'Grandmother (Paternal)',
      'Grandfather (Maternal)',
      'Grandmother (Maternal)',
      'Grandfather',
      'Grandmother',
      'Grandson',
      'Granddaughter',
    ],
  },
  {
    title: 'Extended Blood Family',
    options: ['Uncle', 'Aunt', 'Nephew', 'Niece', 'Cousin'],
  },
  {
    title: 'In-Laws & Legal Guardians',
    options: [
      'Father-in-law',
      'Mother-in-law',
      'Brother-in-law',
      'Sister-in-law',
      'Son-in-law',
      'Daughter-in-law',
      'Guardian',
      'Other Relative',
    ],
  },
];

export const BLOOD_RELATION_OPTIONS: BloodRelation[] = CATEGORIZED_RELATIONS.flatMap((c) => c.options);

export interface FamilyMember {
  _id: string;
  name: string;
  mobile: string;
  gender: string;
  age?: number;
  ageUnit?: string;
  dateOfBirth?: string;
  bloodGroup: string;
  mrn: string;
  hospital?: {
    name: string;
    address?: string;
    logo?: string;
  } | null;
  relationship: string;
  isCurrent: boolean;
  allergies?: string;
  conditions?: string;
  avatar?: string;
}

export interface NewFamilyMemberPayload {
  name: string;
  relationship: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  age?: number;
  ageUnit?: 'Years' | 'Months';
  bloodGroup?: string;
  allergies?: string;
  conditions?: string;
}

type ProfileChangeListener = (newActiveId: string) => void;
type RelationsChangeListener = () => void;

class FamilyService {
  private changeListeners: Set<ProfileChangeListener> = new Set();

  /**
   * Fetch all family members sharing the same mobile number.
   * If offline or API fails, returns cached members from local storage.
   */
  public async getFamilyMembers(forceRefresh = false): Promise<FamilyMember[]> {
    try {
      const response = await apiClient.get(PATIENT_ENDPOINTS.FAMILY_MEMBERS);
      if (response.data?.success && Array.isArray(response.data?.members)) {
        const members: FamilyMember[] = response.data.members;
        await AsyncStorage.setItem(
          FAMILY_STORAGE_KEYS.MEMBERS_CACHE,
          JSON.stringify(members)
        );
        return members;
      }
    } catch (err: any) {
      console.warn('[FamilyService] API load warning, using local cache:', err?.message);
    }

    // Fallback to offline cache
    return this.getCachedFamilyMembers();
  }

  /**
   * Read cached family members from device flash storage
   */
  public async getCachedFamilyMembers(): Promise<FamilyMember[]> {
    try {
      const cached = await AsyncStorage.getItem(FAMILY_STORAGE_KEYS.MEMBERS_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[FamilyService] Failed to read cache:', e);
    }
    return [];
  }

  /**
   * Add a new dependent / family member sharing the primary phone number
   */
  public async addFamilyMember(payload: NewFamilyMemberPayload): Promise<{
    success: boolean;
    message: string;
    member?: FamilyMember;
  }> {
    try {
      const response = await apiClient.post(PATIENT_ENDPOINTS.ADD_FAMILY_MEMBER, payload);
      if (response.data?.success && response.data?.member) {
        // Refresh cache
        await this.getFamilyMembers(true);
        return {
          success: true,
          message: response.data.message || `${payload.name} added to your family circle`,
          member: response.data.member,
        };
      }
      return {
        success: false,
        message: response.data?.message || 'Failed to add family member',
      };
    } catch (err: any) {
      console.error('[FamilyService] Add member error:', err);
      return {
        success: false,
        message: err?.response?.data?.message || err?.message || 'Could not connect to hospital server',
      };
    }
  }

  /**
   * Switch the active patient authentication context to another family member.
   * Updates access/refresh tokens and triggers global app reload.
   */
  public async switchActiveProfile(targetPatientId: string): Promise<{
    success: boolean;
    message: string;
    user?: any;
  }> {
    try {
      const response = await apiClient.post(PATIENT_ENDPOINTS.SWITCH_PROFILE(targetPatientId));
      if (response.data?.success && response.data?.tokens) {
        const { accessToken, refreshToken } = response.data.tokens;
        await saveAuthTokens(accessToken, refreshToken);
        await AsyncStorage.setItem(FAMILY_STORAGE_KEYS.ACTIVE_MEMBER_ID, targetPatientId);

        // Update activeHospitalId for the target patient
        const targetHospitalId = response.data.user?.hospitals?.[0] || response.data.user?.hospital;
        if (targetHospitalId && targetHospitalId !== 'global') {
          await AsyncStorage.setItem('activeHospitalId', targetHospitalId.toString());
        } else {
          await AsyncStorage.removeItem('activeHospitalId');
        }

        // Update local cached members so isCurrent updates immediately
        const cached = await this.getCachedFamilyMembers();
        if (cached.length > 0) {
          const updated = cached.map((m) => ({
            ...m,
            isCurrent: m._id === targetPatientId,
          }));
          await AsyncStorage.setItem(
            FAMILY_STORAGE_KEYS.MEMBERS_CACHE,
            JSON.stringify(updated)
          );
        }

        // Notify active subscribers (e.g. Dashboard, Appointments, Reports)
        this.notifyChange(targetPatientId);

        return {
          success: true,
          message: response.data.message || 'Profile switched successfully',
          user: response.data.user,
        };
      }
      return {
        success: false,
        message: response.data?.message || 'Failed to switch profile',
      };
    } catch (err: any) {
      console.error('[FamilyService] Switch profile error:', err);
      return {
        success: false,
        message: err?.response?.data?.message || err?.message || 'Could not switch patient profile',
      };
    }
  }

  /**
   * Get the currently active patient ID
   */
  public async getActivePatientId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(FAMILY_STORAGE_KEYS.ACTIVE_MEMBER_ID);
    } catch {
      return null;
    }
  }

  private relationsListeners: Set<RelationsChangeListener> = new Set();

  /**
   * Get full relations mapping from persistent storage:
   * Record<fromPatientId, Record<targetPatientId, relationString>>
   */
  public async getRelationsMap(): Promise<Record<string, Record<string, string>>> {
    try {
      const raw = await AsyncStorage.getItem(FAMILY_STORAGE_KEYS.RELATIONS_MAP);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[FamilyService] Failed to read relations map:', e);
    }
    return {};
  }

  /**
   * Get all relations configured for a specific active member
   */
  public async getRelationsForMember(memberId: string): Promise<Record<string, string>> {
    const all = await this.getRelationsMap();
    return all[memberId] || {};
  }

  /**
   * Validate blood relation rules:
   * 1. Gender constraints
   * 2. Age constraints (Elder must be older, Younger must be younger, etc.)
   * 3. Max single Father, Mother, Spouse / Husband / Wife
   */
  public validateBloodRelation(
    fromMember: FamilyMember,
    targetMember: FamilyMember,
    relation: BloodRelation,
    existingRelations: Record<string, string>
  ): { valid: boolean; error?: string } {
    if (fromMember._id === targetMember._id) {
      return { valid: false, error: 'Cannot set relation to yourself' };
    }

    const targetGender = (targetMember.gender || '').toLowerCase();
    const fromAge = fromMember.age || 0;
    const targetAge = targetMember.age || 0;

    const femaleOnly: BloodRelation[] = [
      'Mother',
      'Daughter',
      'Sister',
      'Elder Sister',
      'Younger Sister',
      'Wife',
      'Grandmother',
      'Grandmother (Paternal)',
      'Grandmother (Maternal)',
      'Granddaughter',
      'Aunt',
      'Niece',
      'Mother-in-law',
      'Sister-in-law',
      'Daughter-in-law',
    ];

    const maleOnly: BloodRelation[] = [
      'Father',
      'Son',
      'Brother',
      'Elder Brother',
      'Younger Brother',
      'Husband',
      'Grandfather',
      'Grandfather (Paternal)',
      'Grandfather (Maternal)',
      'Grandson',
      'Uncle',
      'Nephew',
      'Father-in-law',
      'Brother-in-law',
      'Son-in-law',
    ];

    // 1. Gender validation
    if (targetGender.includes('male') && !targetGender.includes('female')) {
      if (femaleOnly.includes(relation)) {
        return { valid: false, error: `${targetMember.name} is male and cannot be set as "${relation}".` };
      }
    } else if (targetGender.includes('female')) {
      if (maleOnly.includes(relation)) {
        return { valid: false, error: `${targetMember.name} is female and cannot be set as "${relation}".` };
      }
    }

    // 2. Uniqueness validation: only 1 Father, 1 Mother, 1 Spouse/Husband/Wife
    const singleFather = ['Father'];
    const singleMother = ['Mother'];
    const singleSpouse = ['Spouse', 'Husband', 'Wife'];

    for (const [otherId, rel] of Object.entries(existingRelations)) {
      if (otherId !== targetMember._id) {
        if (singleFather.includes(relation) && singleFather.includes(rel as BloodRelation)) {
          return { valid: false, error: `You already have another family member set as your Father.` };
        }
        if (singleMother.includes(relation) && singleMother.includes(rel as BloodRelation)) {
          return { valid: false, error: `You already have another family member set as your Mother.` };
        }
        if (singleSpouse.includes(relation) && singleSpouse.includes(rel as BloodRelation)) {
          return { valid: false, error: `You already have another family member set as your spouse/partner.` };
        }
      }
    }

    // 3. Age validation
    if (fromAge > 0 && targetAge > 0) {
      // Must be older than active user
      if (
        [
          'Elder Brother',
          'Elder Sister',
          'Father',
          'Mother',
          'Grandfather',
          'Grandfather (Paternal)',
          'Grandfather (Maternal)',
          'Grandmother',
          'Grandmother (Paternal)',
          'Grandmother (Maternal)',
          'Father-in-law',
          'Mother-in-law',
        ].includes(relation)
      ) {
        if (targetAge <= fromAge) {
          return {
            valid: false,
            error: `${relation} (${targetMember.name}, ${targetAge} yrs) must be older than you (${fromMember.name}, ${fromAge} yrs).`,
          };
        }
      }

      // Must be younger than active user
      if (
        [
          'Younger Brother',
          'Younger Sister',
          'Son',
          'Daughter',
          'Grandson',
          'Granddaughter',
        ].includes(relation)
      ) {
        if (targetAge >= fromAge) {
          return {
            valid: false,
            error: `${relation} (${targetMember.name}, ${targetAge} yrs) must be younger than you (${fromMember.name}, ${fromAge} yrs).`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Set relation and automatically apply reciprocal inverse relation
   */
  public async setRelation(
    fromMember: FamilyMember,
    targetMember: FamilyMember,
    relation: BloodRelation
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const map = await this.getRelationsMap();
      const fromRelations = map[fromMember._id] || {};

      const validation = this.validateBloodRelation(fromMember, targetMember, relation, fromRelations);
      if (!validation.valid) {
        return { success: false, message: validation.error };
      }

      // 1. Set direct relation: fromMember -> targetMember
      if (!map[fromMember._id]) map[fromMember._id] = {};
      map[fromMember._id][targetMember._id] = relation;

      // 2. Compute and set reciprocal relation: targetMember -> fromMember
      const fromGender = (fromMember.gender || '').toLowerCase();
      const isFromMale = fromGender.includes('male') && !fromGender.includes('female');
      const isFromFemale = fromGender.includes('female');

      let reciprocal: BloodRelation | null = null;

      // Siblings (Elder / Younger)
      if (relation === 'Elder Brother' || relation === 'Elder Sister') {
        reciprocal = isFromFemale ? 'Younger Sister' : isFromMale ? 'Younger Brother' : 'Younger Brother';
      } else if (relation === 'Younger Brother' || relation === 'Younger Sister') {
        reciprocal = isFromFemale ? 'Elder Sister' : isFromMale ? 'Elder Brother' : 'Elder Brother';
      } else if (relation === 'Brother' || relation === 'Sister') {
        reciprocal = isFromFemale ? 'Sister' : isFromMale ? 'Brother' : 'Other Relative';
      }
      // Parents & Children
      else if (relation === 'Father' || relation === 'Mother') {
        reciprocal = isFromFemale ? 'Daughter' : isFromMale ? 'Son' : 'Other Relative';
      } else if (relation === 'Son' || relation === 'Daughter') {
        reciprocal = isFromFemale ? 'Mother' : isFromMale ? 'Father' : 'Other Relative';
      }
      // Spouse
      else if (relation === 'Husband') {
        reciprocal = 'Wife';
      } else if (relation === 'Wife') {
        reciprocal = 'Husband';
      } else if (relation === 'Spouse') {
        reciprocal = isFromFemale ? 'Husband' : isFromMale ? 'Wife' : 'Spouse';
      }
      // Grandparents & Grandchildren
      else if (
        relation === 'Grandfather' ||
        relation === 'Grandmother' ||
        relation === 'Grandfather (Paternal)' ||
        relation === 'Grandfather (Maternal)' ||
        relation === 'Grandmother (Paternal)' ||
        relation === 'Grandmother (Maternal)'
      ) {
        reciprocal = isFromFemale ? 'Granddaughter' : isFromMale ? 'Grandson' : 'Other Relative';
      } else if (relation === 'Grandson' || relation === 'Granddaughter') {
        reciprocal = isFromFemale ? 'Grandmother' : isFromMale ? 'Grandfather' : 'Other Relative';
      }
      // Extended Family
      else if (relation === 'Uncle' || relation === 'Aunt') {
        reciprocal = isFromFemale ? 'Niece' : isFromMale ? 'Nephew' : 'Other Relative';
      } else if (relation === 'Nephew' || relation === 'Niece') {
        reciprocal = isFromFemale ? 'Aunt' : isFromMale ? 'Uncle' : 'Other Relative';
      } else if (relation === 'Cousin') {
        reciprocal = 'Cousin';
      }
      // In-Laws
      else if (relation === 'Father-in-law' || relation === 'Mother-in-law') {
        reciprocal = isFromFemale ? 'Daughter-in-law' : isFromMale ? 'Son-in-law' : 'Other Relative';
      } else if (relation === 'Son-in-law' || relation === 'Daughter-in-law') {
        reciprocal = isFromFemale ? 'Mother-in-law' : isFromMale ? 'Father-in-law' : 'Other Relative';
      } else if (relation === 'Brother-in-law' || relation === 'Sister-in-law') {
        reciprocal = isFromFemale ? 'Sister-in-law' : isFromMale ? 'Brother-in-law' : 'Other Relative';
      }

      if (reciprocal) {
        if (!map[targetMember._id]) map[targetMember._id] = {};
        map[targetMember._id][fromMember._id] = reciprocal;
      }

      await AsyncStorage.setItem(FAMILY_STORAGE_KEYS.RELATIONS_MAP, JSON.stringify(map));
      this.notifyRelationsChange();
      return { success: true, message: `Relationship set to ${relation}` };
    } catch (err: any) {
      console.error('[FamilyService] setRelation error:', err);
      return { success: false, message: err?.message || 'Failed to save relation' };
    }
  }

  /**
   * Calculate relation string to display for a member relative to the active user
   */
  public getRelativeRelation(
    activeMemberId: string,
    targetMember: FamilyMember,
    relationsMap: Record<string, Record<string, string>>
  ): string {
    if (targetMember.isCurrent || targetMember._id === activeMemberId) {
      return 'SELF';
    }

    // Check custom mapping
    const custom = relationsMap[activeMemberId]?.[targetMember._id];
    if (custom) {
      return custom.toUpperCase();
    }

    // Fallback to existing server/default relation
    if (targetMember.relationship && targetMember.relationship !== 'SELF') {
      return targetMember.relationship.toUpperCase();
    }

    return 'FAMILY MEMBER';
  }

  /**
   * Subscribe to relation changes
   */
  public onRelationsChange(listener: RelationsChangeListener): () => void {
    this.relationsListeners.add(listener);
    return () => {
      this.relationsListeners.delete(listener);
    };
  }

  private notifyRelationsChange() {
    this.relationsListeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.error('[FamilyService] Relations listener error:', e);
      }
    });
  }

  /**
   * Subscribe to profile switches
   */
  public onProfileChange(listener: ProfileChangeListener): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  private notifyChange(newId: string) {
    this.changeListeners.forEach((l) => {
      try {
        l(newId);
      } catch (e) {
        console.error('[FamilyService] Listener error:', e);
      }
    });
  }
}

export const familyService = new FamilyService();
