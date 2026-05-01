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
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get(PATIENT_ENDPOINTS.DASHBOARD_DATA);
      const prof = res.data.data?.profile || res.data.profile;
      setProfile(prof);
      
      const h = parseFloat(prof?.user?.height || prof?.height);
      const w = parseFloat(prof?.user?.weight || prof?.weight);
      
      if (h && w) {
        const bmiVal = w / ((h / 100) * (h / 100));
        setBmi(Math.round(bmiVal * 10) / 10);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
                id: 'st2', name: 'Boiled Mashed Banana', calories: '105 kcal', protein: '1g', carbs: '27g', fats: '0.3g', prepTime: '2 min',
                why: 'High potassium and pectin help firm up stools.', tags: ['Binding'],
              },
              {
                id: 'st3', name: 'Chaas (Buttermilk)', calories: '40 kcal', protein: '2g', carbs: '4g', fats: '1g', prepTime: '2 min',
                why: 'Hydrates and aids in cooling the digestive tract.', tags: ['Hydrating'],
              }
            ]
          }
        ],
        fatigue: [
          {
            id: 'recovery_energy',
            title: 'Energy Revitalizers',
            icon: Zap,
            avoid: ['Caffeine', 'Sugary Snacks', 'Alcohol'],
            items: [
              {
                id: 'ft1', name: 'Sprouts Salad with Lemon', calories: '150 kcal', protein: '10g', carbs: '20g', fats: '1g', prepTime: '10 min',
                why: 'High protein and vitamins to rebuild strength.', tags: ['High Protein'],
              },
              {
                id: 'ft2', name: 'Mixed Dry Fruits', calories: '180 kcal', protein: '5g', carbs: '10g', fats: '14g', prepTime: '0 min',
                why: 'Healthy fats and minerals for long-lasting energy.', tags: ['Nutrient Dense'],
              }
            ]
          }
        ],
        acidity: [
          {
            id: 'recovery_acidity',
            title: 'Anti-Acidity Plan',
            icon: Leaf,
            avoid: ['Coffee', 'Citrus Fruits', 'Chilli'],
            items: [
              {
                id: 'ac1', name: 'Cold Milk (Sugarless)', calories: '100 kcal', protein: '6g', carbs: '8g', fats: '4g', prepTime: '1 min',
                why: 'Helps neutralize stomach acid and provides instant relief.', tags: ['Alkaline'],
              },
              {
                id: 'ac2', name: 'Oatmeal with Almonds', calories: '220 kcal', protein: '8g', carbs: '35g', fats: '6g', prepTime: '10 min',
                why: 'High fiber absorbs excess acid and stabilizes the gut.', tags: ['High Fiber'],
              },
              {
                id: 'ac3', name: 'Fennel (Saunf) Water', calories: '5 kcal', protein: '0g', carbs: '1g', fats: '0g', prepTime: '5 min',
                why: 'Known for its carminative properties that reduce gas.', tags: ['Digestive'],
              }
            ]
          }
        ],
        diabetes: [
          {
            id: 'recovery_diabetes',
            title: 'Low Glycemic Diet',
            icon: Activity,
            avoid: ['White Rice', 'Sugar', 'Sweets'],
            items: [
              {
                id: 'db1', name: 'Methi (Fenugreek) Thepla', calories: '180 kcal', protein: '6g', carbs: '25g', fats: '6g', prepTime: '20 min',
                why: 'Methi helps in improving insulin sensitivity.', tags: ['Low GI'],
              },
              {
                id: 'db2', name: 'Moong Dal Chilla', calories: '150 kcal', protein: '10g', carbs: '20g', fats: '4g', prepTime: '15 min',
                why: 'High protein and low carb option for blood sugar control.', tags: ['High Protein'],
              }
            ]
          }
        ]
      };
      return recoveryData[sickness] || [];
    }

    return [
      {
        id: 'breakfast',
        title: 'Indian Breakfast',
        icon: Sun,
        items: [
          {
            id: 'b1', name: isOverweight ? 'Idli with Sambar' : 'Masala Dosa with Ghee', calories: isOverweight ? '180 kcal' : '450 kcal', protein: '8g', carbs: '45g', fats: isOverweight ? '2g' : '22g', prepTime: '15 min',
            why: 'Fermented foods are great for gut health.', tags: ['Fermented'],
          },
          {
            id: 'b2', name: isOverweight ? 'Vegetable Poha' : 'Paneer Paratha', calories: isOverweight ? '220 kcal' : '380 kcal', protein: isOverweight ? '5g' : '18g', carbs: '40g', fats: isOverweight ? '4g' : '15g', prepTime: '10 min',
            why: 'Flattened rice is light; Paneer is protein-rich.', tags: ['Balanced'],
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

  if (loading) return <DigitalAtriumLoader />;

  const sicknessOptions: { type: SicknessType; label: string; icon: any; color: string }[] = [
    { type: 'cold',     label: 'Cold/Flu',    icon: Coffee,      color: '#F59E0B' },
    { type: 'fever',    label: 'Fever',       icon: Thermometer, color: '#EF4444' },
    { type: 'diarrhea', label: 'Stomach',     icon: Activity,    color: '#10B981' },
    { type: 'acidity',  label: 'Acidity',     icon: Flame,       color: '#EC4899' },
    { type: 'diabetes', label: 'Sugar Care',  icon: Droplet,     color: '#3B82F6' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <SanctuaryText variant="headline_sm" style={styles.headerTitle}>Dietary Care</SanctuaryText>
          <SanctuaryText variant="body_sm" style={styles.headerSub}>Personalized for your health</SanctuaryText>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Sparkles size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Sickness Check-in */}
        <View style={styles.checkInBox}>
          <SanctuaryText variant="label_lg" style={styles.sectionHeading}>How are you feeling today?</SanctuaryText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <TouchableOpacity 
              style={[styles.statusChip, sickness === 'none' && styles.statusChipActive]}
              onPress={() => setSickness('none')}
            >
              <Heart size={16} color={sickness === 'none' ? '#FFF' : COLORS.primary} />
              <SanctuaryText variant="label_sm" style={[styles.chipText, sickness === 'none' && styles.chipTextActive]}>Feeling Great</SanctuaryText>
            </TouchableOpacity>
            {sicknessOptions.map((opt) => (
              <TouchableOpacity 
                key={opt.type}
                style={[styles.statusChip, sickness === opt.type && { backgroundColor: opt.color }]}
                onPress={() => setSickness(opt.type)}
              >
                <opt.icon size={16} color={sickness === opt.type ? '#FFF' : '#64748B'} />
                <SanctuaryText variant="label_sm" style={[styles.chipText, sickness === opt.type && styles.chipTextActive]}>{opt.label}</SanctuaryText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Dynamic Banner */}
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
                {sickness !== 'none' ? `Healing: ${sickness.charAt(0).toUpperCase() + sickness.slice(1)}` : `BMI: ${bmi} (Normal)`}
              </SanctuaryText>
            </View>
            <View style={styles.bannerIcon}>
              {sickness !== 'none' ? <Activity color="#FFF" size={32} /> : <Zap color="#FFF" size={32} />}
            </View>
          </View>
          <View style={styles.bannerDivider} />
          <View style={styles.bannerFooter}>
            <Info size={14} color="rgba(255,255,255,0.6)" />
            <SanctuaryText variant="body_sm" style={styles.bannerAdvice}>
              {sickness !== 'none' ? 'Focusing on hydration and easy digestion.' : 'Maintaining balanced macros for energy.'}
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
                  <category.icon size={18} color="#64748B" />
                  <SanctuaryText variant="label_lg" style={styles.categoryTitle}>{category.title}</SanctuaryText>
                </View>
                {category.avoid && (
                  <View style={styles.avoidBadge}>
                    <AlertCircle size={12} color="#EF4444" />
                    <SanctuaryText variant="label_sm" style={styles.avoidText}>Avoid: {category.avoid[0]}</SanctuaryText>
                  </View>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
                {category.items.map((item) => (
                  <View key={item.id} style={styles.foodCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.nameWrap}>
                        <SanctuaryText variant="label_lg" style={styles.foodName}>{item.name}</SanctuaryText>
                        <View style={styles.timeWrap}>
                          <Clock size={10} color="#94A3B8" />
                          <SanctuaryText variant="body_sm" style={styles.timeText}>{item.prepTime}</SanctuaryText>
                        </View>
                      </View>
                      <View style={styles.calBadge}>
                        <Flame size={12} color="#F59E0B" />
                        <SanctuaryText variant="label_sm" style={styles.calText}>{item.calories}</SanctuaryText>
                      </View>
                    </View>

                    <View style={styles.macroRow}>
                      <View style={styles.macro}>
                        <SanctuaryText variant="label_sm" style={styles.macroVal}>{item.protein}</SanctuaryText>
                        <SanctuaryText variant="body_sm" style={styles.macroLabel}>Prot</SanctuaryText>
                      </View>
                      <View style={styles.macro}>
                        <SanctuaryText variant="label_sm" style={styles.macroVal}>{item.carbs}</SanctuaryText>
                        <SanctuaryText variant="body_sm" style={styles.macroLabel}>Carbs</SanctuaryText>
                      </View>
                      <View style={styles.macro}>
                        <SanctuaryText variant="label_sm" style={styles.macroVal}>{item.fats}</SanctuaryText>
                        <SanctuaryText variant="body_sm" style={styles.macroLabel}>Fats</SanctuaryText>
                      </View>
                    </View>

                    <SanctuaryText variant="body_sm" style={styles.whyTxt} numberOfLines={2}>{item.why}</SanctuaryText>
                    
                    <View style={styles.tagRow}>
                      {item.tags.map((tag, i) => (
                        <View key={i} style={styles.tag}><SanctuaryText variant="body_sm" style={styles.tagText}>{tag}</SanctuaryText></View>
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
            <View style={styles.tipIconWrap}><Droplet size={18} color="#3B82F6" /></View>
            <View style={styles.tipTextWrap}>
              <SanctuaryText variant="label_lg" style={styles.tipTitleTxt}>Sip, Don't Gulp</SanctuaryText>
              <SanctuaryText variant="body_sm" style={styles.tipBodyTxt}>Small, frequent sips of water or ORS are better for hydration during sickness.</SanctuaryText>
            </View>
          </View>
          <View style={styles.tipBox}>
            <View style={[styles.tipIconWrap, { backgroundColor: '#F0FDF4' }]}><Leaf size={18} color="#10B981" /></View>
            <View style={styles.tipTextWrap}>
              <SanctuaryText variant="label_lg" style={styles.tipTitleTxt}>Natural Antibiotics</SanctuaryText>
              <SanctuaryText variant="body_sm" style={styles.tipBodyTxt}>Include Garlic and Ginger in your meals to naturally fight off microbes.</SanctuaryText>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24, paddingBottom: 20, backgroundColor: '#FFF',
  },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  headerTitleWrap: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#1E293B' },
  headerSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  headerAction: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center' },

  scroll: { flex: 1 },
  checkInBox: { padding: 24 },
  sectionHeading: { color: '#1E293B', fontWeight: '800', marginBottom: 16 },
  chipRow: { gap: 12 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 44, borderRadius: 22, backgroundColor: '#FFF', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, marginRight: 10 },
  statusChipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  chipTextActive: { color: '#FFF' },

  banner: { marginHorizontal: 24, borderRadius: 28, padding: 24, overflow: 'hidden' },
  bannerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerLabel: { color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, fontWeight: '800' },
  bannerVal: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 4 },
  bannerIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  bannerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 20 },
  bannerFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerAdvice: { color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  contentSection: { padding: 24 },
  contentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  contentTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B' },
  linkText: { color: COLORS.primary, fontWeight: '700' },

  categoryWrap: { marginBottom: 32 },
  categoryLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  categoryInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryTitle: { color: '#475569', fontWeight: '800' },
  avoidBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  avoidText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },

  cardRow: { gap: 16 },
  foodCard: { width: width * 0.75, backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, marginRight: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  nameWrap: { flex: 1, marginRight: 12 },
  foodName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  timeText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  calBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  calText: { color: '#D97706', fontSize: 12, fontWeight: '800' },

  macroRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  macro: { alignItems: 'flex-start' },
  macroVal: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  macroLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginTop: 2 },
  whyTxt: { color: '#64748B', lineHeight: 20, fontSize: 13, marginBottom: 16 },
  tagRow: { flexDirection: 'row', gap: 8 },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { color: '#475569', fontSize: 11, fontWeight: '700' },

  tipsSection: { padding: 24, backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: 10 },
  tipsTitle: { fontSize: 16, fontWeight: '900', color: '#1E293B', marginBottom: 20 },
  tipBox: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  tipIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0F7FF', justifyContent: 'center', alignItems: 'center' },
  tipTextWrap: { flex: 1 },
  tipTitleTxt: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  tipBodyTxt: { fontSize: 13, color: '#64748B', lineHeight: 18, marginTop: 4 }
});
