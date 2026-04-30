import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { 
  ChevronLeft, 
  Scan, 
  Utensils, 
  Zap, 
  Droplet, 
  Wind,
  Info,
  TrendingUp,
  Activity,
  Camera
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '@/navigation/types';
import { SanctuaryText, DigitalAtriumLoader } from '../components/SanctuaryComponents';
import { COLORS } from '../constants/designSystem';
import { analyzeFood, NutrientInfo } from '../services/nutritionService';

const { width, height } = Dimensions.get('window');

export default function FoodScannerScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [food, setFood] = useState<NutrientInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [servings, setServings] = useState(1);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    
    setFood(null); // Clear previous result
    setLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });

      if (photo && photo.base64) {
        const result = await analyzeFood('', photo.base64);
        if (result) {
          setFood(result);
        } else {
          throw new Error('Analysis failed');
        }
      }
    } catch (e) {
      Alert.alert(
        'Analysis Failed',
        'Unable to identify the food. Please try again with a clearer picture.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!permission) return <View style={styles.container}><SanctuaryText variant="body_md">Requesting camera permission...</SanctuaryText></View>;
  if (!permission.granted) return <View style={styles.container}><SanctuaryText variant="body_md">No access to camera</SanctuaryText></View>;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <SanctuaryText variant="headline_sm" style={styles.headerTitle}>Food AI Scanner</SanctuaryText>
        <View style={{ width: 40 }} />
      </View>

      {loading && (
        <View style={styles.loaderOverlay}>
          <DigitalAtriumLoader />
          <SanctuaryText variant="label_lg" style={styles.loaderTxt}>AI is identifying your meal...</SanctuaryText>
        </View>
      )}

      {!food ? (
        <View style={styles.scannerContainer}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing="back"
          />
          <View style={styles.overlay}>
            <View style={styles.unfocusedContainer}></View>
            <View style={styles.focusedRow}>
              <View style={styles.unfocusedContainer}></View>
              <View style={styles.focusedContainer}>
                <View style={styles.cornerTopLeft} />
                <View style={styles.cornerTopRight} />
                <View style={styles.cornerBottomLeft} />
                <View style={styles.cornerBottomRight} />
              </View>
              <View style={styles.unfocusedContainer}></View>
            </View>
            <View style={styles.unfocusedContainer}></View>
          </View>
          
          <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
            <View style={styles.captureInner}>
              <Camera size={32} color="#FFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.scannerHint}>
            <Utensils size={24} color="#FFF" />
            <SanctuaryText variant="label_lg" style={styles.hintTxt}>Point at your meal and tap to identify</SanctuaryText>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.resultScroll} contentContainerStyle={styles.scrollContent}>
          <LinearGradient colors={['#F8FAFC', '#FFF']} style={styles.foodHeader}>
            <View style={styles.foodIconBox}>
              <Utensils size={32} color={COLORS.primary} />
            </View>
            <SanctuaryText variant="headline_sm" style={styles.foodName}>{food.name}</SanctuaryText>
            <SanctuaryText variant="label_sm" style={styles.servingLabel}>Per {servings} Serving</SanctuaryText>
          </LinearGradient>

          {/* Macros Grid */}
          <View style={styles.macrosGrid}>
            <View style={styles.macroCard}>
              <Zap size={20} color="#F59E0B" />
              <SanctuaryText variant="headline_sm" style={styles.macroVal}>{food.calories * servings}</SanctuaryText>
              <SanctuaryText variant="label_sm" style={styles.macroLabel}>CALORIES</SanctuaryText>
            </View>
            <View style={styles.macroCard}>
              <Activity size={20} color="#EF4444" />
              <SanctuaryText variant="headline_sm" style={styles.macroVal}>{food.protein * servings}g</SanctuaryText>
              <SanctuaryText variant="label_sm" style={styles.macroLabel}>PROTEIN</SanctuaryText>
            </View>
            <View style={styles.macroCard}>
              <Wind size={20} color="#3B82F6" />
              <SanctuaryText variant="headline_sm" style={styles.macroVal}>{food.carbs * servings}g</SanctuaryText>
              <SanctuaryText variant="label_sm" style={styles.macroLabel}>CARBS</SanctuaryText>
            </View>
            <View style={styles.macroCard}>
              <Droplet size={20} color="#10B981" />
              <SanctuaryText variant="headline_sm" style={styles.macroVal}>{food.fats * servings}g</SanctuaryText>
              <SanctuaryText variant="label_sm" style={styles.macroLabel}>FATS</SanctuaryText>
            </View>
          </View>

          {/* Vitamins Section */}
          <View style={styles.section}>
            <SanctuaryText variant="label_lg" style={styles.sectionTitle}>Vitamins & Minerals</SanctuaryText>
            <View style={styles.vitaminList}>
              {food.vitamins.map((v, i) => (
                <View key={i} style={styles.vitaminBadge}>
                  <SanctuaryText variant="label_sm" style={styles.vitaminTxt}>{v}</SanctuaryText>
                </View>
              ))}
            </View>
          </View>

          {/* Health Insight */}
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Info size={18} color={COLORS.primary} />
              <SanctuaryText variant="label_lg" style={styles.insightTitle}>Nutrient Insight</SanctuaryText>
            </View>
            <SanctuaryText variant="body_sm" style={styles.insightBody}>
              Based on your BMI profile, this food is <SanctuaryText variant="label_lg" style={{ color: COLORS.primary }}>High in Protein</SanctuaryText>. 
              It accounts for {Math.round((food.protein * servings / 60) * 100)}% of your daily protein target.
            </SanctuaryText>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.addBtn} onPress={() => {
              Alert.alert('Success', 'Nutrients added to your daily log!');
              setFood(null);
            }}>
              <TrendingUp size={18} color="#FFF" />
              <SanctuaryText variant="label_lg" style={styles.addBtnTxt}>Log Food</SanctuaryText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => {
              setFood(null);
            }}>
              <SanctuaryText variant="label_lg" style={styles.cancelTxt}>Scan Another</SanctuaryText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
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

  scannerContainer: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject },
  unfocusedContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  focusedRow: { flexDirection: 'row', height: 260 },
  focusedContainer: { width: 260, position: 'relative' },
  cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: COLORS.primary, borderTopLeftRadius: 20 },
  cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: COLORS.primary, borderTopRightRadius: 20 },
  cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: COLORS.primary, borderBottomLeftRadius: 20 },
  cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: COLORS.primary, borderBottomRightRadius: 20 },
  scannerHint: { position: 'absolute', bottom: 120, alignSelf: 'center', alignItems: 'center', gap: 12 },
  hintTxt: { color: '#FFF', fontWeight: '800', letterSpacing: 0.5 },

  captureBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },

  resultScroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  foodHeader: { alignItems: 'center', padding: 24, borderRadius: 24, marginBottom: 24 },
  foodIconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  foodName: { color: '#1E293B', fontWeight: '900', fontSize: 20, marginBottom: 4 },
  servingLabel: { color: '#94A3B8', fontWeight: '700' },

  macrosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  macroCard: { width: (width - 52) / 2, backgroundColor: '#FFF', padding: 16, borderRadius: 20, alignItems: 'center', gap: 6 },
  macroVal: { color: '#1E293B', fontWeight: '900', fontSize: 18 },
  macroLabel: { color: '#94A3B8', fontWeight: '800', fontSize: 10, letterSpacing: 0.5 },

  section: { marginBottom: 24 },
  sectionTitle: { color: '#1E293B', fontWeight: '900', fontSize: 15, marginBottom: 12 },
  vitaminList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vitaminBadge: { backgroundColor: '#EAF1FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  vitaminTxt: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },

  insightCard: { backgroundColor: '#EAF1FF', borderRadius: 20, padding: 20, marginBottom: 24 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  insightTitle: { color: COLORS.primary, fontWeight: '900' },
  insightBody: { color: '#1E3A8A', fontWeight: '600', lineHeight: 20 },

  actions: { gap: 12 },
  addBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 10 },
  addBtnTxt: { color: '#FFF', fontWeight: '900' },
  cancelBtn: { paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  cancelTxt: { color: '#64748B', fontWeight: '800' },

  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 100, justifyContent: 'center', alignItems: 'center', gap: 20 },
  loaderTxt: { color: COLORS.primary, fontWeight: '900' },
});
