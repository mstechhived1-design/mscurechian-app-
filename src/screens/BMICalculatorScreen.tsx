import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Scale, Info, Flame, Utensils, Dumbbell, Zap, TrendingUp, Heart, Target, Calendar, ShieldAlert } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { SanctuaryText } from '../components/SanctuaryComponents';
import { COLORS } from '../constants/designSystem';
import { streakService } from '@/services/streakService';
import { apiClient, PATIENT_ENDPOINTS } from '@/api';
import { familyService } from '@/services/familyService';

const { width } = Dimensions.get('window');

type Unit = 'metric' | 'imperial';
type FitnessGoal = 'bulk' | 'lean' | 'maintain';

interface Suggestion {
  title: string;
  items: string[];
  icon: any;
}

interface BmiResult {
  bmi: number;
  category: string;
  color: string;
  gradient: [string, string];
  advice: string;
  diet: Suggestion;
  fitness: Suggestion;
  targets: { label: string; value: string; icon: any }[];
  fitnessScore: number;
  exerciseFrequency: string;
}

const CATEGORIES = [
  { label: 'Underweight', range: '< 18.5',  color: '#3B82F6', gradient: ['#1D4ED8', '#3B82F6'] as [string,string] },
  { label: 'Normal',      range: '18.5–24.9',color: '#059669', gradient: ['#065F46', '#059669'] as [string,string] },
  { label: 'Overweight',  range: '25–29.9',  color: '#D97706', gradient: ['#92400E', '#D97706'] as [string,string] },
  { label: 'Obese',       range: '≥ 30',     color: '#DC2626', gradient: ['#7F1D1D', '#DC2626'] as [string,string] },
];

function calculateFitnessScore(bmi: number, streak: number): number {
  const proximity = Math.max(0, 50 - Math.abs(bmi - 22) * 2.5);
  const consistency = Math.min(50, streak * 2.5);
  return Math.round(proximity + consistency);
}

function classify(bmi: number, goal: FitnessGoal, streak: number): BmiResult {
  const score = calculateFitnessScore(bmi, streak);
  
  if (bmi < 18.5) {
    return {
      bmi,
      category: 'Underweight',
      color: '#3B82F6',
      gradient: ['#1D4ED8', '#3B82F6'],
      fitnessScore: score,
      exerciseFrequency: '4-5 Days / Week',
      advice: goal === 'bulk' 
        ? 'Bulking mode: Focus on heavy lifting and a 500 kcal surplus.'
        : 'Weight gain: Focus on nutrition and light bodyweight strength.',
      diet: {
        title: 'Mass Gaining Diet',
        icon: Utensils,
        items: goal === 'bulk' 
          ? ['High Protein (Egg/Paneer)', 'Complex Carbs (Oats/Rice)', 'Peanut Butter', 'Banana Shakes']
          : ['Full Fat Dairy', 'Mixed Nuts', 'Dates & Figs', 'Ghee in meals']
      },
      fitness: {
        title: goal === 'bulk' ? 'Hypertrophy Training' : 'Light Strength Build',
        icon: Dumbbell,
        items: goal === 'bulk'
          ? ['Deadlifts (3x8)', 'Squats (3x10)', 'Bench Press (3x10)', 'Pull-ups']
          : ['Yoga for strength', 'Bodyweight squats', 'Plank holds', 'Short brisk walks']
      },
      targets: [
        { label: 'CALORIES', value: goal === 'bulk' ? '+600 Surplus' : '+300 Surplus', icon: Zap },
        { label: 'PROTEIN', value: '1.8g - 2.2g/kg', icon: TrendingUp }
      ]
    };
  }
  if (bmi < 25) {
    return {
      bmi,
      category: 'Normal Weight',
      color: '#059669',
      gradient: ['#065F46', '#059669'],
      fitnessScore: score,
      exerciseFrequency: '5-6 Days / Week',
      advice: goal === 'lean' 
        ? 'Lean shred: Focus on HIIT and a minor deficit for definition.'
        : 'Maintenance: Keep your metabolic rate high with functional movement.',
      diet: {
        title: goal === 'bulk' ? 'Lean Bulking' : 'Maintenance Diet',
        icon: Utensils,
        items: ['Grilled Chicken/Tofu', 'Broccoli & Asparagus', 'Quinoa', 'Greek Yogurt']
      },
      fitness: {
        title: goal === 'lean' ? 'High Intensity Shred' : 'Functional Fitness',
        icon: Dumbbell,
        items: goal === 'lean'
          ? ['Burpees (4x20)', 'Mountain Climbers', 'Sprinting', 'Jump Rope']
          : ['Swimming', 'Moderate Lifting', 'Cycling', 'Pilates']
      },
      targets: [
        { label: 'CALORIES', value: goal === 'lean' ? '-200 Deficit' : 'Maintenance', icon: Zap },
        { label: 'PROTEIN', value: '1.5g - 1.8g/kg', icon: TrendingUp }
      ]
    };
  }
  if (bmi < 30) {
    return {
      bmi,
      category: 'Overweight',
      color: '#D97706',
      gradient: ['#92400E', '#D97706'],
      fitnessScore: score,
      exerciseFrequency: '6 Days / Week',
      advice: 'The "Lean" goal is highly recommended to improve heart health.',
      diet: {
        title: 'Calorie Deficit Diet',
        icon: Utensils,
        items: ['Salads with Sprouts', 'Clear Soups', 'Black Coffee/Green Tea', 'Boiled Eggs']
      },
      fitness: {
        title: 'Fat Burn Protocol',
        icon: Dumbbell,
        items: ['LISS Cardio (45 min)', 'Bodyweight Circuits', 'Hill Sprints', 'High Rep Lifting']
      },
      targets: [
        { label: 'CALORIES', value: '-500 Deficit', icon: Zap },
        { label: 'PROTEIN', value: '2.0g/kg LBM', icon: TrendingUp }
      ]
    };
  }
  return {
    bmi,
    category: 'Obese',
    color: '#DC2626',
    gradient: ['#7F1D1D', '#DC2626'],
    fitnessScore: score,
    exerciseFrequency: 'Daily Activity',
    advice: 'Focus on small daily steps to lead to long-term weight loss.',
    diet: {
      title: 'Sugar-Free Keto',
      icon: Utensils,
      items: ['Leafy Greens', 'Healthy Fats (Avocado)', 'Paneer/Tofu', 'Hydration with Lemon']
    },
    fitness: {
      title: 'Low Impact Cardio',
      icon: Dumbbell,
      items: ['Brisk Walking (60m)', 'Water Aerobics', 'Stationary Bike', 'Stretching']
    },
    targets: [
      { label: 'CALORIES', value: '-750 Deficit', icon: Zap },
      { label: 'PROTEIN', value: '1.8g/kg LBM', icon: TrendingUp }
    ]
  };
}

function bmiToPercent(bmi: number): number {
  return Math.min(100, Math.max(0, ((bmi - 10) / 30) * 100));
}

export default function BMICalculatorScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [unit, setUnit]       = useState<Unit>('metric');
  const [height, setHeight]   = useState('');
  const [weight, setWeight]   = useState('');
  const [heightFt, setHFt]    = useState('');
  const [heightIn, setHIn]    = useState('');
  const [goal, setGoal]       = useState<FitnessGoal>('maintain');
  const [result, setResult]   = useState<BmiResult | null>(null);
  const [streak, setStreak]   = useState(0);

  const calculateWithValues = (hStr: string, wStr: string, u: Unit, g: FitnessGoal, strk: number) => {
    let bmi = 0;
    const w = parseFloat(wStr);
    if (u === 'metric') {
      const h = parseFloat(hStr) / 100;
      if (!h || !w || h <= 0 || w <= 0) return;
      bmi = w / (h * h);
    } else {
      const totalIn = (parseFloat(heightFt) * 12) + parseFloat(heightIn || '0');
      if (!totalIn || !w || totalIn <= 0 || w <= 0) return;
      bmi = (w / (totalIn * totalIn)) * 703;
    }
    if (bmi > 0 && bmi < 120) {
      setResult(classify(Math.round(bmi * 10) / 10, g, strk));
    }
  };

  const loadPatientProfile = async (currentStreakVal: number) => {
    try {
      const res = await apiClient.get(PATIENT_ENDPOINTS.DASHBOARD_DATA);
      const data = res.data?.data || res.data || {};
      const profile = data.profile || {};
      const metrics = data.metrics || {};
      
      const rawHeight = metrics.height || profile.height;
      const rawWeight = metrics.weight || profile.weight;
      
      let parsedH = '';
      let parsedW = '';

      if (rawHeight) {
        let hVal = parseFloat(String(rawHeight));
        if (!isNaN(hVal) && hVal > 0) {
          if (hVal < 3) {
            hVal = Math.round(hVal * 100);
          } else if (hVal < 8.5) {
            hVal = Math.round(hVal * 30.48);
          } else if (hVal < 90) {
            hVal = Math.round(hVal * 2.54);
          }
          parsedH = String(Math.round(hVal));
          setHeight(parsedH);
        }
      }

      if (rawWeight) {
        let wVal = parseFloat(String(rawWeight));
        if (!isNaN(wVal) && wVal > 0) {
          if (wVal > 220) {
            wVal = Math.round(wVal / 2.20462);
          }
          parsedW = String(Math.round(wVal));
          setWeight(parsedW);
        }
      }

      if (parsedH && parsedW) {
        calculateWithValues(parsedH, parsedW, 'metric', goal, currentStreakVal);
      }
    } catch (e) {
      console.warn('[BMICalculator] Load profile error:', e);
    }
  };

  React.useEffect(() => {
    loadStreakAndProfile();

    const unsubProfile = familyService.onProfileChange(() => {
      loadStreakAndProfile();
    });

    return () => {
      unsubProfile();
    };
  }, []);

  const loadStreakAndProfile = async () => {
    let currentStreakVal = 0;
    try {
      const data = await streakService.getStreakData();
      currentStreakVal = data.currentStreak || 0;
      setStreak(currentStreakVal);
    } catch (e) { 
      console.error(e); 
    }
    await loadPatientProfile(currentStreakVal);
  };

  const calculate = () => {
    calculateWithValues(height, weight, unit, goal, streak);
  };

  const reset = () => {
    setHeight(''); setWeight(''); setHFt(''); setHIn(''); setResult(null);
  };

  const pct = result ? bmiToPercent(result.bmi) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <SanctuaryText variant="headline_sm" style={styles.headerTitle}>{t('bmi.title')}</SanctuaryText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* MEDICAL DISCLAIMER */}
        <View style={styles.disclaimerBanner}>
          <ShieldAlert size={14} color="#B91C1C" />
          <SanctuaryText style={styles.disclaimerText}>
            Medical Disclaimer: BMI calculations and fitness advice are for informational purposes only. Consult a health professional before starting any new diet or exercise program.
          </SanctuaryText>
        </View>
        
        {/* Streak View */}
        <TouchableOpacity style={styles.streakCard} activeOpacity={0.9} onPress={() => navigation.navigate('Achievements')}>
          <LinearGradient colors={['#FF5F6D', '#FFC371']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.streakGrad}>
            <View style={styles.streakInfo}>
              <Flame size={32} color="#FFF" fill="#FFF" />
              <View style={styles.streakTextCol}>
                <SanctuaryText variant="headline_sm" style={styles.streakNum}>{streak} Day Streak!</SanctuaryText>
                <SanctuaryText variant="label_sm" style={styles.streakSub}>Fitness consistency pays off.</SanctuaryText>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Goal Selector */}
        <View style={styles.goalSection}>
          <SanctuaryText variant="label_lg" style={styles.inputLabel}>CHOOSE YOUR FITNESS GOAL</SanctuaryText>
          <View style={styles.goalGrid}>
            {(['bulk', 'lean', 'maintain'] as FitnessGoal[]).map(g => (
              <TouchableOpacity 
                key={g} 
                style={[styles.goalCard, goal === g && styles.goalCardActive]}
                onPress={() => setGoal(g)}
              >
                <Target size={20} color={goal === g ? '#FFF' : COLORS.primary} />
                <SanctuaryText variant="label_sm" style={[styles.goalLabel, goal === g && styles.goalLabelActive]}>
                  {g.toUpperCase()}
                </SanctuaryText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Unit toggle */}
        <View style={styles.unitToggle}>
          {(['metric', 'imperial'] as Unit[]).map(u => (
            <TouchableOpacity key={u} style={[styles.unitBtn, unit === u && styles.unitBtnActive]} onPress={() => { setUnit(u); reset(); }}>
              <SanctuaryText variant="label_lg" style={[styles.unitTxt, unit === u && styles.unitTxtActive]}>
                {u === 'metric' ? t('bmi.metric') : t('bmi.imperial')}
              </SanctuaryText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Inputs */}
        <View style={styles.inputSection}>
          {unit === 'metric' ? (
            <View style={styles.inputGroup}>
              <SanctuaryText variant="label_lg" style={styles.inputLabel}>HEIGHT (cm)</SanctuaryText>
              <TextInput style={styles.input} value={height} onChangeText={setHeight} placeholder="e.g. 170" keyboardType="decimal-pad" />
            </View>
          ) : (
            <View style={styles.rowGroup}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <SanctuaryText variant="label_lg" style={styles.inputLabel}>HEIGHT (ft)</SanctuaryText>
                <TextInput style={styles.input} value={heightFt} onChangeText={setHFt} placeholder="5" keyboardType="decimal-pad" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <SanctuaryText variant="label_lg" style={styles.inputLabel}>INCHES</SanctuaryText>
                <TextInput style={styles.input} value={heightIn} onChangeText={setHIn} placeholder="8" keyboardType="decimal-pad" />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <SanctuaryText variant="label_lg" style={styles.inputLabel}>WEIGHT ({unit === 'metric' ? 'kg' : 'lbs'})</SanctuaryText>
            <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder={unit === 'metric' ? 'e.g. 70' : 'e.g. 154'} keyboardType="decimal-pad" />
          </View>
        </View>

        <TouchableOpacity style={styles.calcBtn} onPress={calculate} activeOpacity={0.85}>
          <Scale size={18} color="#FFF" />
          <SanctuaryText variant="label_lg" style={styles.calcBtnTxt}>{t('bmi.calculate')}</SanctuaryText>
        </TouchableOpacity>

        {/* Result Area */}
        {result && (
          <View style={styles.resultCard}>
            <LinearGradient colors={result.gradient} style={styles.resultGrad}>
              <View style={styles.resultMain}>
                <View style={styles.scoreCircle}>
                  <SanctuaryText variant="headline_sm" style={styles.scoreVal}>{result.fitnessScore}</SanctuaryText>
                  <SanctuaryText variant="label_sm" style={styles.scoreLbl}>SCORE</SanctuaryText>
                </View>
                <View style={styles.bmiData}>
                  <SanctuaryText variant="label_sm" style={styles.resultLabel}>BMI: {result.bmi.toFixed(1)}</SanctuaryText>
                  <SanctuaryText variant="headline_sm" style={styles.resultCatTxt}>{result.category}</SanctuaryText>
                  <View style={styles.freqBadge}>
                    <Calendar size={12} color="#FFF" />
                    <SanctuaryText variant="label_sm" style={styles.freqTxt}>{result.exerciseFrequency}</SanctuaryText>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Gauge bar */}
            <View style={styles.gaugeWrap}>
              <View style={styles.gaugeTrack}>
                <LinearGradient colors={['#3B82F6','#059669','#D97706','#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gaugeBar} />
                {pct !== null && <View style={[styles.gaugeNeedle, { left: `${pct}%` as any }]} />}
              </View>
              <View style={styles.gaugeLabels}>
                <SanctuaryText variant="label_sm" style={styles.gaugeLabel}>10</SanctuaryText>
                <SanctuaryText variant="label_sm" style={styles.gaugeLabel}>18.5</SanctuaryText>
                <SanctuaryText variant="label_sm" style={styles.gaugeLabel}>25</SanctuaryText>
                <SanctuaryText variant="label_sm" style={styles.gaugeLabel}>30</SanctuaryText>
                <SanctuaryText variant="label_sm" style={styles.gaugeLabel}>40</SanctuaryText>
              </View>
            </View>

            {/* Daily Targets */}
            <View style={styles.targetsRow}>
              {result.targets.map((t, i) => (
                <View key={i} style={styles.targetItem}>
                  <View style={styles.targetIconCircle}><t.icon size={16} color={result.color} /></View>
                  <View>
                    <SanctuaryText variant="label_sm" style={styles.targetLabel}>{t.label}</SanctuaryText>
                    <SanctuaryText variant="label_lg" style={[styles.targetValue, { color: result.color }]}>{t.value}</SanctuaryText>
                  </View>
                </View>
              ))}
            </View>

            {/* Detailed Recommendations */}
            <View style={styles.suggestionsContainer}>
              <View style={styles.suggestionBlock}>
                <View style={styles.suggestionHeader}>
                  <result.diet.icon size={18} color="#1E293B" />
                  <SanctuaryText variant="label_lg" style={styles.suggestionTitle}>{result.diet.title}</SanctuaryText>
                </View>
                <View style={styles.suggestionList}>
                  {result.diet.items.map((item, idx) => (
                    <View key={idx} style={styles.suggestionItem}>
                      <View style={[styles.bullet, { backgroundColor: result.color }]} />
                      <SanctuaryText variant="body_sm" style={styles.suggestionText}>{item}</SanctuaryText>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.suggestionBlock}>
                <View style={styles.suggestionHeader}>
                  <result.fitness.icon size={18} color="#1E293B" />
                  <SanctuaryText variant="label_lg" style={styles.suggestionTitle}>{result.fitness.title}</SanctuaryText>
                </View>
                <View style={styles.suggestionList}>
                  {result.fitness.items.map((item, idx) => (
                    <View key={idx} style={styles.suggestionItem}>
                      <View style={[styles.bullet, { backgroundColor: result.color }]} />
                      <SanctuaryText variant="body_sm" style={styles.suggestionText}>{item}</SanctuaryText>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Advice */}
            <View style={styles.adviceBox}>
              <Info size={14} color={result.color} />
              <SanctuaryText variant="body_sm" style={[styles.adviceTxt, { color: result.color }]}>{result.advice}</SanctuaryText>
            </View>

            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <SanctuaryText variant="label_lg" style={styles.resetTxt}>Recalculate</SanctuaryText>
            </TouchableOpacity>
          </View>
        )}

        {/* Reference */}
        <View style={styles.refTable}>
          <SanctuaryText variant="label_lg" style={styles.refTitle}>BMI Reference</SanctuaryText>
          {CATEGORIES.map(c => (
            <View key={c.label} style={styles.refRow}>
              <View style={[styles.refDot, { backgroundColor: c.color }]} />
              <SanctuaryText variant="label_lg" style={styles.refLabel}>{c.label}</SanctuaryText>
              <SanctuaryText variant="body_sm" style={styles.refRange}>{c.range}</SanctuaryText>
            </View>
          ))}
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
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#1E293B', fontWeight: '900', fontSize: 18 },

  scroll: { padding: 20 },

  streakCard: { borderRadius: 24, overflow: 'hidden', marginBottom: 24 },
  streakGrad: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  streakInfo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  streakTextCol: {},
  streakNum: { color: '#FFF', fontWeight: '900', fontSize: 20 },
  streakSub: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },

  goalSection: { marginBottom: 24 },
  goalGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  goalCard: { flex: 1, height: 80, backgroundColor: '#FFF', borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  goalCardActive: { backgroundColor: COLORS.primary },
  goalLabel: { fontSize: 9, fontWeight: '800', color: '#64748B' },
  goalLabelActive: { color: '#FFF' },

  unitToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 4, marginBottom: 24 },
  unitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  unitBtnActive: { backgroundColor: '#FFF' },
  unitTxt: { color: '#94A3B8', fontWeight: '700', fontSize: 12 },
  unitTxtActive: { color: '#1E293B', fontWeight: '900' },

  inputSection: { gap: 16, marginBottom: 20 },
  rowGroup: { flexDirection: 'row' },
  inputGroup: {},
  inputLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, fontSize: 16, fontWeight: '700', color: '#1E293B' },

  calcBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 18, marginBottom: 24 },
  calcBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },

  resultCard: { backgroundColor: '#FFF', borderRadius: 24, overflow: 'hidden', marginBottom: 24 },
  resultGrad: { padding: 28 },
  resultMain: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  scoreCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.4)' },
  scoreVal: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  scoreLbl: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  bmiData: { flex: 1 },
  resultLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800' },
  resultCatTxt: { color: '#FFF', fontSize: 22, fontWeight: '900', marginVertical: 4 },
  freqBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  freqTxt: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  gaugeWrap: { padding: 20 },
  gaugeTrack: { height: 14, borderRadius: 7, overflow: 'hidden', position: 'relative', marginBottom: 8 },
  gaugeBar: { ...StyleSheet.absoluteFill as any },
  gaugeNeedle: { position: 'absolute', top: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 3, borderColor: '#1E293B', marginLeft: -10 },
  gaugeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  gaugeLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '700' },

  targetsRow: { flexDirection: 'row', padding: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  targetItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  targetIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  targetLabel: { color: '#94A3B8', fontWeight: '800', fontSize: 9 },
  targetValue: { fontWeight: '900', fontSize: 13 },

  suggestionsContainer: { padding: 20, gap: 20 },
  suggestionBlock: {},
  suggestionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  suggestionTitle: { color: '#1E293B', fontWeight: '900', fontSize: 14 },
  suggestionList: { gap: 8 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3 },
  suggestionText: { color: '#475569', fontWeight: '600', fontSize: 13 },

  adviceBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 16 },
  adviceTxt: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  resetBtn: { marginHorizontal: 20, marginBottom: 20, backgroundColor: '#F1F5F9', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  resetTxt: { color: '#64748B', fontWeight: '900', fontSize: 13 },

  refTable: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, gap: 14 },
  refTitle: { color: '#1E293B', fontWeight: '900', fontSize: 15, marginBottom: 4 },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refDot: { width: 10, height: 10, borderRadius: 5 },
  refLabel: { color: '#1E293B', fontWeight: '700', fontSize: 13, flex: 1 },
  refRange: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  disclaimerBanner: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '700',
    lineHeight: 14,
  },
});
