import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Leaf,
  Flame,
  Zap,
  Info,
  Droplet,
  Moon,
  Sun,
  Thermometer,
  Coffee,
  Heart,
  Activity,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { RootStackParamList } from '@/navigation/types';
import { SanctuaryText, DigitalAtriumLoader } from '../components/SanctuaryComponents';
import { COLORS } from '../constants/designSystem';
import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { familyService } from '@/services/familyService';

const { width } = Dimensions.get('window');

type SicknessType = 'none' | 'cold' | 'fever' | 'diarrhea' | 'fatigue' | 'acidity' | 'diabetes';

interface FoodItem {
  id: string;
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  why: string;
  tags: string[];
  prepTime: string;
}

interface Category {
  id: string;
  title: string;
  icon: any;
  items: FoodItem[];
  avoid?: string[];
}

export default function FoodRecommendationScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [bmi, setBmi] = useState<number | null>(null);
  const [sickness, setSickness] = useState<SicknessType>('none');

  useEffect(() => {
    fetchProfile();

    const unsubProfile = familyService.onProfileChange(() => {
      fetchProfile();
    });

    return () => {
      unsubProfile();
    };
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(PATIENT_ENDPOINTS.DASHBOARD_DATA);
      const prof = res.data.data?.profile || res.data.profile;
      setProfile(prof);
      
      const hRaw = parseFloat(prof?.user?.height || prof?.height);
      const wRaw = parseFloat(prof?.user?.weight || prof?.weight);
      
      if (hRaw && wRaw && hRaw > 0 && wRaw > 0) {
        let hMeters = 0;
        if (hRaw < 3) {
          // Already in meters (e.g. 1.75)
          hMeters = hRaw;
        } else if (hRaw >= 3 && hRaw <= 8) {
          // In feet (e.g. 5.8)
          hMeters = hRaw * 0.3048;
        } else if (hRaw > 8 && hRaw <= 90) {
          // In inches (e.g. 68)
          hMeters = hRaw * 0.0254;
        } else if (hRaw > 90 && hRaw <= 260) {
          // In centimeters (e.g. 172)
          hMeters = hRaw / 100;
        } else {
          hMeters = hRaw > 100 ? hRaw / 100 : hRaw * 0.0254;
        }

        if (hMeters > 0) {
          const bmiVal = wRaw / (hMeters * hMeters);
          const rounded = Math.round(bmiVal * 10) / 10;
          if (rounded >= 10 && rounded <= 65) {
            setBmi(rounded);
          } else {
            setBmi(null);
          }
        } else {
          setBmi(null);
        }
      } else {
        setBmi(null);
      }
    } catch (e) {
      console.error(e);
      setBmi(null);
    } finally {
      setLoading(false);
    }
  };

  const getBmiCategory = (val: number | null): { label: string; color: string } => {
    if (!val) return { label: 'Not Recorded', color: '#64748B' };
    if (val < 18.5) return { label: 'Underweight', color: '#3B82F6' };
    if (val < 25) return { label: 'Normal', color: '#059669' };
    if (val < 30) return { label: 'Overweight', color: '#D97706' };
    return { label: 'Obese', color: '#DC2626' };
  };

  const getRecommendations = (): Category[] => {
    const isOverweight = bmi && bmi >= 25;

    if (sickness !== 'none') {
      const recoveryData: Record<SicknessType, Category[]> = {
        none: [],
        cold: [
          {
            id: 'recovery_flu',
            title: 'Immunity Boosters',
            icon: Heart,
            avoid: ['Cold Drinks', 'Ice Cream', 'Oily Food'],
            items: [
              {
                id: 'c1', name: 'Turmeric Milk (Haldi Doodh)', calories: '120 kcal', protein: '6g', carbs: '10g', fats: '5g', prepTime: '5 min',
                why: 'Natural antibiotic properties of turmeric help fight infection.', tags: ['Warm', 'Healing'],
              },
              {
                id: 'c2', name: 'Ginger Tulsi Tea', calories: '20 kcal', protein: '0g', carbs: '5g', fats: '0g', prepTime: '10 min',
                why: 'Ginger reduces inflammation while Tulsi boosts immunity.', tags: ['Soothing', 'Herbal'],
              },
              {
                id: 'c3', name: 'Pepper Rasam', calories: '80 kcal', protein: '2g', carbs: '15g', fats: '1g', prepTime: '15 min',
                why: 'Black pepper helps clear congestion and improves digestion.', tags: ['Spicy', 'Liquid'],
              }
            ]
          }
        ],
        fever: [
          {
            id: 'recovery_fever',
            title: 'Light Recovery Diet',
            icon: Thermometer,
            avoid: ['Spicy Curry', 'Heavy Paratha', 'Meat'],
            items: [
              {
                id: 'f1', name: 'Moong Dal Khichdi (Watery)', calories: '180 kcal', protein: '8g', carbs: '35g', fats: '1g', prepTime: '20 min',
                why: 'Easiest meal to digest when your body is fighting fever.', tags: ['Easy Digest', 'Light'],
              },
              {
                id: 'f2', name: 'Coconut Water', calories: '45 kcal', protein: '0g', carbs: '11g', fats: '0g', prepTime: '1 min',
                why: 'Replenishes essential electrolytes lost during sweating.', tags: ['Hydrating', 'Natural'],
              },
              {
                id: 'f3', name: 'Fresh Apple Puree', calories: '95 kcal', protein: '0g', carbs: '25g', fats: '0g', prepTime: '5 min',
                why: 'Provides gentle energy without straining the gut.', tags: ['Soft', 'Vitamin C'],
              }
            ]
          }
        ],
        diarrhea: [
          {
            id: 'recovery_gut',
            title: 'Stomach Soothers',
            icon: Droplet,
            avoid: ['Milk Products', 'Spices', 'Raw Veggies'],
            items: [
              {
                id: 'st1', name: 'Curd Rice (Thayir Sadam)', calories: '250 kcal', protein: '7g', carbs: '45g', fats: '4g', prepTime: '10 min',
                why: 'Probiotics in curd help restore healthy gut bacteria.', tags: ['Probiotic', 'Cooling'],
              },
              {
                id: 'st2', name: 'Boiled Potato Mash', calories: '130 kcal', protein: '3g', carbs: '30g', fats: '0g', prepTime: '15 min',
                why: 'Provides binding starch and is very gentle on an upset stomach.', tags: ['Bland', 'Binding'],
              },
              {
                id: 'st3', name: 'Electrolyte ORS Drink', calories: '50 kcal', protein: '0g', carbs: '12g', fats: '0g', prepTime: '2 min',
                why: 'Maintains fluid balance and prevents dehydration.', tags: ['Essential'],
              }
            ]
          }
        ],
        fatigue: [
          {
            id: 'recovery_energy',
            title: 'Sustained Energy',
            icon: Zap,
            avoid: ['Refined Sugar', 'White Bread', 'Excess Coffee'],
            items: [
              {
                id: 'ft1', name: 'Sprouted Moong Salad', calories: '160 kcal', protein: '12g', carbs: '24g', fats: '1g', prepTime: '10 min',
                why: 'Rich in B-vitamins, iron, and active enzymes to beat tiredness.', tags: ['Energizing', 'Raw'],
              },
              {
                id: 'ft2', name: 'Roasted Chana & Dates', calories: '190 kcal', protein: '8g', carbs: '38g', fats: '2g', prepTime: '2 min',
                why: 'Slow-release complex carbs prevent energy slumps.', tags: ['Quick Snack'],
              }
            ]
          }
        ],
        acidity: [
          {
            id: 'recovery_acid',
            title: 'Alkaline & Cooling',
            icon: Flame,
            avoid: ['Tomatoes', 'Citrus', 'Fried Snacks', 'Tea'],
            items: [
              {
                id: 'ac1', name: 'Cold Low-Fat Milk', calories: '110 kcal', protein: '7g', carbs: '10g', fats: '3g', prepTime: '1 min',
                why: 'Instant neutralizer for stomach acid.', tags: ['Cooling'],
              },
              {
                id: 'ac2', name: 'Fennel Seed (Saunf) Water', calories: '15 kcal', protein: '0g', carbs: '3g', fats: '0g', prepTime: '5 min',
                why: 'Soothes gastric lining and reduces bloating.', tags: ['Digestive'],
              }
            ]
          }
        ],
        diabetes: [
          {
            id: 'recovery_sugar',
            title: 'Low Glycemic Options',
            icon: Activity,
            avoid: ['White Rice', 'Potatoes', 'Sweets', 'Fruit Juices'],
            items: [
              {
                id: 'db1', name: 'Besan Chilla with Methi', calories: '210 kcal', protein: '11g', carbs: '28g', fats: '5g', prepTime: '15 min',
                why: 'Fenugreek slows glucose absorption while gram flour provides steady protein.', tags: ['Low GI'],
              },
              {
                id: 'db2', name: 'Bitter Gourd (Karela) Stir Fry', calories: '90 kcal', protein: '3g', carbs: '12g', fats: '3g', prepTime: '20 min',
                why: 'Contains polypeptide-p that naturally supports healthy blood sugar.', tags: ['Active'],
              }
            ]
          }
        ]
      };
      return recoveryData[sickness] || [];
    }

    // Default Daily Diet Plan based on BMI
    return [
      {
        id: 'breakfast',
        title: 'Indian Breakfast',
        icon: Sun,
        items: [
          {
            id: 'b1', name: isOverweight ? 'Oats Vegetable Upma' : 'Idli with Sambar', calories: isOverweight ? '220 kcal' : '180 kcal', protein: '8g', carbs: '45g', fats: '2g', prepTime: '15 min',
            why: 'Fermented foods are great for gut health.', tags: ['Fermented'],
          },
          {
            id: 'b2', name: isOverweight ? 'Poha with Peanuts & Veggies' : 'Egg/Paneer Bhurji + Roti', calories: isOverweight ? '260 kcal' : '380 kcal', protein: isOverweight ? '6g' : '18g', carbs: '42g', fats: '8g', prepTime: '15 min',
            why: 'High satiety protein fuels morning productivity.', tags: ['Protein'],
          }
        ]
      },
      {
        id: 'lunch',
        title: 'Balanced Indian Thali',
        icon: Zap,
        items: [
          {
            id: 'l1', name: isOverweight ? '2 Roti + Dal + Mix Veg' : '3 Roti + Dal Makhani + Paneer', calories: isOverweight ? '350 kcal' : '650 kcal', protein: '14g', carbs: '55g', fats: '10g', prepTime: '30 min',
            why: 'Balanced combination of carbs and fiber.', tags: ['Hearty'],
          },
          {
            id: 'l2', name: isOverweight ? 'Brown Rice + Curd + Salad' : 'Jeera Rice + Dal Tadka + Chicken', calories: isOverweight ? '300 kcal' : '550 kcal', protein: '12g', carbs: '48g', fats: '6g', prepTime: '25 min',
            why: 'Complete amino acid profile with lentils.', tags: ['Nutritious'],
          }
        ]
      },
      {
        id: 'dinner',
        title: 'Light & Restorative',
        icon: Moon,
        items: [
          {
            id: 'd1', name: isOverweight ? 'Moong Dal Khichdi' : 'Vegetable Biryani with Raita', calories: isOverweight ? '250 kcal' : '450 kcal', protein: '10g', carbs: '42g', fats: '4g', prepTime: '20 min',
            why: 'Gentle on the digestive system for better sleep.', tags: ['Light'],
          }
        ]
      }
    ];
  };

  if (loading) return <DigitalAtriumLoader message="Personalizing dietary care..." />;

  const sicknessOptions: { type: SicknessType; label: string; icon: any; color: string }[] = [
    { type: 'cold',     label: 'Cold/Flu',    icon: Coffee,      color: '#F59E0B' },
    { type: 'fever',    label: 'Fever',       icon: Thermometer, color: '#EF4444' },
    { type: 'diarrhea', label: 'Stomach',     icon: Activity,    color: '#10B981' },
    { type: 'acidity',  label: 'Acidity',     icon: Flame,       color: '#EC4899' },
    { type: 'diabetes', label: 'Sugar Care',  icon: Droplet,     color: '#3B82F6' },
  ];

  const bmiCategory = getBmiCategory(bmi);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <SanctuaryText variant="headline_sm" style={styles.headerTitle}>Dietary Care</SanctuaryText>
          <SanctuaryText variant="body_sm" style={styles.headerSub}>
            {profile?.user?.name ? `Personalized for ${profile.user.name}` : 'Personalized for your health'}
          </SanctuaryText>
        </View>
        <TouchableOpacity 
          style={styles.headerAction}
          onPress={() => navigation.navigate('BMICalculator')}
        >
          <Sparkles size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Sickness Check-in */}
        <View style={styles.checkInBox}>
          <SanctuaryText variant="label_lg" style={styles.sectionHeading}>How are you feeling today?</SanctuaryText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <TouchableOpacity 
              style={[styles.statusChip, sickness === 'none' && styles.statusChipActive]}
              onPress={() => setSickness('none')}
            >
              <Heart size={15} color={sickness === 'none' ? '#FFF' : COLORS.primary} />
              <SanctuaryText variant="label_sm" style={[styles.chipText, sickness === 'none' && styles.chipTextActive]}>Feeling Great</SanctuaryText>
            </TouchableOpacity>
            {sicknessOptions.map((opt) => (
              <TouchableOpacity 
                key={opt.type}
                style={[styles.statusChip, sickness === opt.type && { backgroundColor: opt.color }]}
                onPress={() => setSickness(opt.type)}
              >
                <opt.icon size={15} color={sickness === opt.type ? '#FFF' : '#64748B'} />
                <SanctuaryText variant="label_sm" style={[styles.chipText, sickness === opt.type && styles.chipTextActive]}>{opt.label}</SanctuaryText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Dynamic Compact Health Insight Banner */}
        <LinearGradient 
          colors={sickness !== 'none' ? ['#1E293B', '#0F172A'] : [COLORS.primary, '#1E40AF']} 
          start={{x: 0, y: 0}} end={{x: 1, y: 1}}
          style={styles.banner}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerLeft}>
              <SanctuaryText variant="label_sm" style={styles.bannerLabel}>
                {sickness !== 'none' ? 'RECOVERY PROTOCOL' : 'HEALTH INSIGHT'}
              </SanctuaryText>
              <SanctuaryText variant="headline_sm" style={styles.bannerVal}>
                {sickness !== 'none' 
                  ? `Healing: ${sickness.charAt(0).toUpperCase() + sickness.slice(1)}` 
                  : bmi 
                  ? `BMI: ${bmi} (${bmiCategory.label})` 
                  : 'BMI: Not Recorded'}
              </SanctuaryText>
            </View>
            <View style={styles.bannerIcon}>
              {sickness !== 'none' ? <Activity color="#FFF" size={24} /> : <Zap color="#FFF" size={24} />}
            </View>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerFooter}>
            <Info size={13} color="rgba(255,255,255,0.7)" />
            <SanctuaryText variant="body_sm" style={styles.bannerAdvice}>
              {sickness !== 'none' 
                ? 'Focusing on hydration and easy digestion.' 
                : !bmi 
                ? 'Tap View BMI to record height & weight.' 
                : bmi < 18.5 
                ? 'Focusing on nutrient-dense, healthy mass foods.' 
                : bmi < 25 
                ? 'Maintaining balanced macros and steady energy.' 
                : 'Focusing on high fiber, lean protein, and portion control.'}
            </SanctuaryText>
          </View>
        </LinearGradient>

        {/* Recommendations Section */}
        <View style={styles.contentSection}>
          <View style={styles.contentHeader}>
            <SanctuaryText variant="headline_sm" style={styles.contentTitle}>Recommended for You</SanctuaryText>
            <TouchableOpacity onPress={() => navigation.navigate('BMICalculator')}>
              <SanctuaryText variant="label_sm" style={styles.linkText}>View BMI</SanctuaryText>
            </TouchableOpacity>
          </View>

          {getRecommendations().map((category) => (
            <View key={category.id} style={styles.categoryWrap}>
              <View style={styles.categoryLabelRow}>
                <View style={styles.categoryInfo}>
                  <category.icon size={16} color="#64748B" />
                  <SanctuaryText variant="label_lg" style={styles.categoryTitle}>{category.title}</SanctuaryText>
                </View>
                {category.avoid && (
                  <View style={styles.avoidBadge}>
                    <AlertCircle size={11} color="#EF4444" />
                    <SanctuaryText variant="label_sm" style={styles.avoidText}>Avoid: {category.avoid.join(', ')}</SanctuaryText>
                  </View>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
                {category.items.map((food) => (
                  <View key={food.id} style={styles.foodCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.nameWrap}>
                        <SanctuaryText variant="label_lg" style={styles.foodName}>{food.name}</SanctuaryText>
                        <View style={styles.timeWrap}>
                          <Clock size={11} color="#94A3B8" />
                          <SanctuaryText variant="body_sm" style={styles.timeText}>{food.prepTime}</SanctuaryText>
                        </View>
                      </View>
                      <View style={styles.calBadge}>
                        <Flame size={12} color="#D97706" />
                        <SanctuaryText variant="label_sm" style={styles.calText}>{food.calories}</SanctuaryText>
                      </View>
                    </View>

                    <View style={styles.macroRow}>
                      <View style={styles.macro}>
                        <SanctuaryText variant="body_xs" style={styles.macroVal}>{food.protein}</SanctuaryText>
                        <SanctuaryText variant="body_xs" style={styles.macroLabel}>Prot</SanctuaryText>
                      </View>
                      <View style={styles.macro}>
                        <SanctuaryText variant="body_xs" style={styles.macroVal}>{food.carbs}</SanctuaryText>
                        <SanctuaryText variant="body_xs" style={styles.macroLabel}>Carbs</SanctuaryText>
                      </View>
                      <View style={styles.macro}>
                        <SanctuaryText variant="body_xs" style={styles.macroVal}>{food.fats}</SanctuaryText>
                        <SanctuaryText variant="body_xs" style={styles.macroLabel}>Fats</SanctuaryText>
                      </View>
                    </View>

                    <SanctuaryText variant="body_xs" style={styles.whyText} numberOfLines={2}>
                      {food.why}
                    </SanctuaryText>

                    <View style={styles.tagRow}>
                      {food.tags.map(t => (
                        <View key={t} style={styles.tagBadge}>
                          <SanctuaryText variant="body_xs" style={styles.tagText}>{t}</SanctuaryText>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          ))}
        </View>

        {/* Pro Tips Section */}
        <View style={styles.tipsSection}>
          <SanctuaryText variant="label_lg" style={styles.tipsTitle}>Pro Recovery Tips</SanctuaryText>
          <View style={styles.tipBox}>
            <View style={styles.tipIconWrap}><Droplet size={16} color="#3B82F6" /></View>
            <View style={styles.tipTextWrap}>
              <SanctuaryText variant="label_md" style={styles.tipTitleTxt}>Sip, Don't Gulp</SanctuaryText>
              <SanctuaryText variant="body_sm" style={styles.tipBodyTxt}>Small, frequent sips of water or ORS are better for hydration during recovery.</SanctuaryText>
            </View>
          </View>
          <View style={styles.tipBox}>
            <View style={[styles.tipIconWrap, { backgroundColor: '#F0FDF4' }]}><Leaf size={16} color="#10B981" /></View>
            <View style={styles.tipTextWrap}>
              <SanctuaryText variant="label_md" style={styles.tipTitleTxt}>Natural Antibiotics</SanctuaryText>
              <SanctuaryText variant="body_sm" style={styles.tipBodyTxt}>Include Garlic and Ginger in meals to naturally fight microbes and boost immunity.</SanctuaryText>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  headerTitleWrap: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  headerSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  headerAction: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DBEAFE' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  checkInBox: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  sectionHeading: { color: '#1E293B', fontWeight: '800', fontSize: 14, marginBottom: 10 },
  chipRow: { gap: 8, paddingRight: 16 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 4 },
  statusChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 11.5, fontWeight: '700', color: '#64748B' },
  chipTextActive: { color: '#FFF' },

  banner: { marginHorizontal: 16, marginTop: 6, borderRadius: 20, padding: 16, overflow: 'hidden' },
  bannerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerLeft: { flex: 1, marginRight: 12 },
  bannerLabel: { color: 'rgba(255,255,255,0.7)', letterSpacing: 1, fontWeight: '800', fontSize: 10 },
  bannerVal: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 3 },
  bannerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  bannerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 12 },
  bannerFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerAdvice: { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 11.5, flex: 1 },

  contentSection: { paddingHorizontal: 16, paddingTop: 18 },
  contentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  contentTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  linkText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },

  categoryWrap: { marginBottom: 20 },
  categoryLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryTitle: { color: '#334155', fontWeight: '800', fontSize: 13 },
  avoidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  avoidText: { color: '#EF4444', fontSize: 10, fontWeight: '700' },

  cardRow: { gap: 12, paddingRight: 16 },
  foodCard: { width: Math.min(width - 50, 260), backgroundColor: '#FFF', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, marginRight: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  nameWrap: { flex: 1, marginRight: 8 },
  foodName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  timeText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  calBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  calText: { color: '#D97706', fontSize: 11, fontWeight: '800' },

  macroRow: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  macro: { alignItems: 'flex-start' },
  macroVal: { fontSize: 12, fontWeight: '800', color: '#1E293B' },
  macroLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '600', marginTop: 1 },

  whyText: { color: '#64748B', fontSize: 11, lineHeight: 15, marginBottom: 10 },
  tagRow: { flexDirection: 'row', gap: 6 },
  tagBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  tagText: { color: '#475569', fontSize: 9.5, fontWeight: '700' },

  tipsSection: { paddingHorizontal: 16, paddingTop: 4 },
  tipsTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  tipBox: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 10, alignItems: 'center' },
  tipIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  tipTextWrap: { flex: 1 },
  tipTitleTxt: { fontSize: 12.5, fontWeight: '800', color: '#1E293B' },
  tipBodyTxt: { fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 15 },
});
