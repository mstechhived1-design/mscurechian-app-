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
import { ChevronLeft, Scale, Info } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { SanctuaryText } from '../components/SanctuaryComponents';
import { COLORS } from '../constants/designSystem';

const { width } = Dimensions.get('window');

type Unit = 'metric' | 'imperial';

interface BmiResult {
  bmi: number;
  category: string;
  color: string;
  gradient: [string, string];
  advice: string;
}

const CATEGORIES = [
  { label: 'Underweight', range: '< 18.5',  color: '#3B82F6', gradient: ['#1D4ED8', '#3B82F6'] as [string,string] },
  { label: 'Normal',      range: '18.5–24.9',color: '#059669', gradient: ['#065F46', '#059669'] as [string,string] },
  { label: 'Overweight',  range: '25–29.9',  color: '#D97706', gradient: ['#92400E', '#D97706'] as [string,string] },
  { label: 'Obese',       range: '≥ 30',     color: '#DC2626', gradient: ['#7F1D1D', '#DC2626'] as [string,string] },
];

function classify(bmi: number): BmiResult {
  if (bmi < 18.5) return { bmi, category: 'Underweight', color: '#3B82F6', gradient: ['#1D4ED8', '#3B82F6'], advice: 'You may need to gain some weight. Consult a nutritionist for a balanced diet plan.' };
  if (bmi < 25)   return { bmi, category: 'Normal Weight', color: '#059669', gradient: ['#065F46', '#059669'], advice: 'Great! Maintain your healthy weight with regular exercise and a balanced diet.' };
  if (bmi < 30)   return { bmi, category: 'Overweight', color: '#D97706', gradient: ['#92400E', '#D97706'], advice: 'Consider increasing physical activity and adjusting your diet to reach a healthier weight.' };
  return { bmi, category: 'Obese', color: '#DC2626', gradient: ['#7F1D1D', '#DC2626'], advice: 'Please consult your doctor. A clinical weight-management plan is recommended.' };
}

// Needle position on the arc: maps BMI 10–40 to 0–100%
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
  const [result, setResult]   = useState<BmiResult | null>(null);

  const calculate = () => {
    let bmi = 0;
    const w = parseFloat(weight);
    if (unit === 'metric') {
      const h = parseFloat(height) / 100;
      if (!h || !w || h <= 0 || w <= 0) return;
      bmi = w / (h * h);
    } else {
      const totalIn = (parseFloat(heightFt) * 12) + parseFloat(heightIn || '0');
      if (!totalIn || !w || totalIn <= 0 || w <= 0) return;
      bmi = (w / (totalIn * totalIn)) * 703;
    }
    setResult(classify(Math.round(bmi * 10) / 10));
  };

  const reset = () => {
    setHeight(''); setWeight(''); setHFt(''); setHIn(''); setResult(null);
  };

  const pct = result ? bmiToPercent(result.bmi) : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <SanctuaryText variant="headline_sm" style={styles.headerTitle}>{t('bmi.title')}</SanctuaryText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

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
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder="e.g. 170"
                placeholderTextColor="#CBD5E1"
                keyboardType="decimal-pad"
              />
            </View>
          ) : (
            <View style={styles.rowGroup}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                <SanctuaryText variant="label_lg" style={styles.inputLabel}>HEIGHT (ft)</SanctuaryText>
                <TextInput style={styles.input} value={heightFt} onChangeText={setHFt} placeholder="5" placeholderTextColor="#CBD5E1" keyboardType="decimal-pad" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <SanctuaryText variant="label_lg" style={styles.inputLabel}>INCHES</SanctuaryText>
                <TextInput style={styles.input} value={heightIn} onChangeText={setHIn} placeholder="8" placeholderTextColor="#CBD5E1" keyboardType="decimal-pad" />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <SanctuaryText variant="label_lg" style={styles.inputLabel}>WEIGHT ({unit === 'metric' ? 'kg' : 'lbs'})</SanctuaryText>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder={unit === 'metric' ? 'e.g. 70' : 'e.g. 154'}
              placeholderTextColor="#CBD5E1"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Calculate button */}
        <TouchableOpacity style={styles.calcBtn} onPress={calculate} activeOpacity={0.85}>
          <Scale size={18} color="#FFF" />
          <SanctuaryText variant="label_lg" style={styles.calcBtnTxt}>{t('bmi.calculate')}</SanctuaryText>
        </TouchableOpacity>

        {/* Result */}
        {result && (
          <View style={styles.resultCard}>
            <LinearGradient colors={result.gradient} style={styles.resultGrad}>
              <SanctuaryText variant="label_sm" style={styles.resultLabel}>YOUR BMI</SanctuaryText>
              <SanctuaryText variant="headline_sm" style={styles.resultBmi}>{result.bmi.toFixed(1)}</SanctuaryText>
              <View style={styles.resultCatBadge}>
                <SanctuaryText variant="label_lg" style={styles.resultCatTxt}>{result.category}</SanctuaryText>
              </View>
            </LinearGradient>

            {/* Gauge bar */}
            <View style={styles.gaugeWrap}>
              <View style={styles.gaugeTrack}>
                <LinearGradient colors={['#3B82F6','#059669','#D97706','#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gaugeBar} />
                {pct !== null && (
                  <View style={[styles.gaugeNeedle, { left: `${pct}%` as any }]} />
                )}
              </View>
              <View style={styles.gaugeLabels}>
                <SanctuaryText variant="label_sm" style={styles.gaugeLabel}>10</SanctuaryText>
                <SanctuaryText variant="label_sm" style={styles.gaugeLabel}>18.5</SanctuaryText>
                <SanctuaryText variant="label_sm" style={styles.gaugeLabel}>25</SanctuaryText>
                <SanctuaryText variant="label_sm" style={styles.gaugeLabel}>30</SanctuaryText>
                <SanctuaryText variant="label_sm" style={styles.gaugeLabel}>40</SanctuaryText>
              </View>
            </View>

            {/* Advice */}
            <View style={styles.adviceBox}>
              <Info size={14} color={result.color} />
              <SanctuaryText variant="body_sm" style={[styles.adviceTxt, { color: result.color }]}>{result.advice}</SanctuaryText>
            </View>

            {/* Reset */}
            <TouchableOpacity style={styles.resetBtn} onPress={reset}>
              <SanctuaryText variant="label_lg" style={styles.resetTxt}>Recalculate</SanctuaryText>
            </TouchableOpacity>
          </View>
        )}

        {/* Reference table */}
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

  unitToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 4, marginBottom: 24 },
  unitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  unitBtnActive: { backgroundColor: '#FFF' },
  unitTxt: { color: '#94A3B8', fontWeight: '700', fontSize: 12 },
  unitTxtActive: { color: '#1E293B', fontWeight: '900' },

  inputSection: { gap: 16, marginBottom: 20 },
  rowGroup: { flexDirection: 'row' },
  inputGroup: {},
  inputLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8 },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },

  calcBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 16, paddingVertical: 18, marginBottom: 24,
  },
  calcBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },

  resultCard: { backgroundColor: '#FFF', borderRadius: 24, overflow: 'hidden', marginBottom: 24 },
  resultGrad: { padding: 28, alignItems: 'center' },
  resultLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  resultBmi: { color: '#FFF', fontSize: 64, fontWeight: '900', lineHeight: 72, marginBottom: 12 },
  resultCatBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  resultCatTxt: { color: '#FFF', fontWeight: '900', fontSize: 14 },

  gaugeWrap: { padding: 20 },
  gaugeTrack: { height: 14, borderRadius: 7, overflow: 'hidden', position: 'relative', marginBottom: 8 },
  gaugeBar: { ...StyleSheet.absoluteFillObject },
  gaugeNeedle: { position: 'absolute', top: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF', borderWidth: 3, borderColor: '#1E293B', marginLeft: -10 },
  gaugeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  gaugeLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '700' },

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
});
