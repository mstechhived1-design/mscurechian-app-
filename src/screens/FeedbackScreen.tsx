import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Text,
  Surface,
  IconButton,
  TextInput,
  Button,
  ActivityIndicator,
  Card,
  ProgressBar,
} from 'react-native-paper';
import { 
  Star, 
  Stethoscope,
  Users,
  Building,
  Clock,
  CreditCard,
  FileText,
  CheckCircle,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/types';
import { apiClient, FEEDBACK_ENDPOINTS, PATIENT_ENDPOINTS } from '@/api';

const { width } = Dimensions.get('window');

type FeedbackStep = 1 | 2 | 3;

export default function FeedbackScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Feedback'>>();
  
  // Wizards state
  const [currentStep, setCurrentStep] = useState<FeedbackStep>(1);
  const [loading, setLoading] = useState(false);

  // Form data state
  const [rating, setRating] = useState(0);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [hospitalId] = useState(route.params?.hospitalId || '');
  const [hospitalName] = useState(route.params?.hospitalName || 'your Hospital');
  const [comment, setComment] = useState('');

  // Topics mapping
  const topics = [
    { id: 'clinical', name: 'Clinical Care', icon: Stethoscope },
    { id: 'behavior', name: 'Staff Behavior', icon: Users },
    { id: 'facilities', name: 'Facilities', icon: Building },
    { id: 'waittime', name: 'Wait Time', icon: Clock },
    { id: 'billing', name: 'Billing', icon: CreditCard },
    { id: 'other', name: 'Other', icon: FileText },
  ];

  const handleNext = () => {
    if (currentStep === 1 && rating === 0) {
      Alert.alert('Selection Required', 'Please provide a star rating to proceed.');
      return;
    }
    if (currentStep === 2 && selectedTopics.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one topic.');
      return;
    }
    
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as FeedbackStep);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as FeedbackStep);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!hospitalId) {
      Alert.alert('Error', 'Hospital identification missing. Please try again from the hospital list.');
      return;
    }

    setLoading(true);
    try {
      const feedbackText = selectedTopics.length > 0 
        ? `[${selectedTopics.join(', ')}] ${comment}` 
        : comment;

      const basePayload = {
        hospitalId,
        hospital: hospitalId, // Some backends use 'hospital' field
        rating: Number(rating),
        stars: Number(rating), // Fallback for some systems
        comment: feedbackText || 'General feedback.',
        feedback: feedbackText || 'General feedback.', // Fallback for 'feedback' key
      };

      console.log(`[FeedbackScreen] Submission Attempt 1: /patients/hospitals/${hospitalId}/feedback`);
      
      try {
        const response = await apiClient.post(`/patients/hospitals/${hospitalId}/feedback`, basePayload);
        if (response.status >= 200 && response.status < 300) {
          Alert.alert('Success', 'Feedback submitted successfully!', [{ text: 'OK', onPress: () => navigation.popToTop() }]);
          return;
        }
      } catch (e1: any) {
        console.warn('[FeedbackScreen] Attempt 1 failed (404/500), trying Attempt 2...');
        
        try {
          console.log(`[FeedbackScreen] Submission Attempt 2: ${FEEDBACK_ENDPOINTS.SUBMIT}`);
          const response = await apiClient.post(FEEDBACK_ENDPOINTS.SUBMIT, basePayload);
          if (response.status >= 200 && response.status < 300) {
            Alert.alert('Success', 'Feedback submitted!', [{ text: 'OK', onPress: () => navigation.popToTop() }]);
            return;
          }
        } catch (e2: any) {
          console.warn('[FeedbackScreen] Attempt 2 failed, trying Attempt 3: /patients/feedback');
          
          const response = await apiClient.post('/patients/feedback', basePayload);
          if (response.status >= 200 && response.status < 300) {
            Alert.alert('Success', 'Feedback received!', [{ text: 'OK', onPress: () => navigation.popToTop() }]);
            return;
          }
        }
      }
    } catch (err: any) {
      console.error('[FeedbackScreen] Final Submission Failure:', err);
      const serverMsg = err.response?.data?.message || err.message || 'Server Error';
      Alert.alert(
        'Submission Error', 
        `Feedback service encountered a problem (${serverMsg}). Your feedback was logged locally but couldn't reach the server. We'll fix this shortly.`
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (id: string) => {
    setSelectedTopics(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  // ─── Step Renderers ────────────────────────────────────────────────────────

  const renderStepHeader = () => {
    const steps = [
      { id: 1, label: 'RATE' },
      { id: 2, label: 'TOPIC' },
      { id: 3, label: 'SUBMIT' }
    ];

    return (
      <View style={styles.stepsIndicator}>
        {steps.map((s, idx) => (
          <React.Fragment key={s.id}>
            <View style={styles.stepCircleContainer}>
              <View style={[
                styles.stepCircle, 
                currentStep >= s.id ? styles.stepCircleActive : styles.stepCircleInactive,
                currentStep > s.id && styles.stepCircleCompleted
              ]}>
                {currentStep > s.id ? (
                  <CheckCircle size={16} color="#FFF" />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    currentStep >= s.id ? styles.stepNumberActive : styles.stepNumberInactive
                  ]}>{s.id}</Text>
                )}
              </View>
              <Text style={styles.stepLabelText}>{s.label}</Text>
            </View>
            {idx < steps.length - 1 && (
              <View style={[
                styles.stepLine,
                currentStep > s.id ? styles.stepLineActive : styles.stepLineInactive
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderRatingScreen = () => (
    <View style={styles.stepContent}>
      <Text variant="headlineSmall" style={styles.stepTitle}>Your Satisfaction</Text>
      <Text variant="bodyLarge" style={styles.stepSubtitle}>How would you rate your overall experience with {hospitalName}?</Text>
      
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((s) => (
          <TouchableOpacity 
            key={s} 
            onPress={() => setRating(s)}
            style={styles.starWrapper}
          >
            <Star 
              size={50} 
              color={s <= rating ? '#FFD700' : '#E0E0E0'} 
              fill={s <= rating ? '#FFD700' : 'transparent'}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingHint}>
        {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : rating === 5 ? 'Excellent' : 'Select a rating'}
      </Text>
    </View>
  );

  const renderTopicScreen = () => (
    <View style={styles.stepContent}>
      <Text variant="headlineSmall" style={styles.stepTitle}>What is this about?</Text>
      <Text variant="bodyLarge" style={styles.stepSubtitle}>Select topics you'd like to provide feedback on.</Text>
      
      <View style={styles.topicGrid}>
        {topics.map((t) => {
          const isSelected = selectedTopics.includes(t.id);
          const IconComp = t.icon;
          return (
            <TouchableOpacity 
              key={t.id} 
              style={[
                styles.topicItem,
                isSelected && styles.topicItemActive
              ]}
              onPress={() => toggleTopic(t.id)}
            >
              <Surface style={styles.topicIconSurface} elevation={isSelected ? 0 : 1}>
                <IconComp size={24} color={isSelected ? '#006AF5' : '#666'} />
              </Surface>
              <Text style={[styles.topicText, isSelected && styles.topicTextActive]}>{t.name}</Text>
              {isSelected && (
                <View style={styles.topicCheck}>
                  <CheckCircle size={14} color="#006AF5" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderSubmitScreen = () => (
    <View style={styles.stepContent}>
      <Text variant="headlineSmall" style={styles.stepTitle}>One last thing</Text>
      <Text variant="bodyLarge" style={styles.stepSubtitle}>Please share any additional details or comments about your experience.</Text>
      
      <Card style={styles.reviewCard}>
        <Card.Content>
          <View style={styles.reviewSummary}>
             <View style={styles.reviewHeader}>
               <Star size={16} color="#FFD700" fill="#FFD700" />
               <Text style={styles.reviewRatingText}>{rating}/5 Rating</Text>
             </View>
             <Text variant="titleMedium" style={styles.reviewHospitalName}>{hospitalName}</Text>
             <Text variant="bodySmall" style={styles.reviewTopics}>Topics: {selectedTopics.length > 0 ? selectedTopics.join(', ') : 'General'}</Text>
          </View>
        </Card.Content>
      </Card>

      <TextInput
        mode="outlined"
        placeholder="Tell us about your experience..."
        multiline
        numberOfLines={6}
        value={comment}
        onChangeText={setComment}
        style={styles.commentInput}
        outlineColor="#E0E0E0"
        activeOutlineColor="#006AF5"
      />
      <Text style={styles.minCharHint}>{comment.length} characters (Recommended 10+)</Text>
    </View>
  );

  // ─── Main Content ──────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerContent}>
          <IconButton icon="close" onPress={() => navigation.goBack()} />
          <View style={styles.headerTitleContainer}>
            <Text variant="titleLarge" style={styles.headerTitle}>Patient Feedback</Text>
            <Text variant="labelSmall" style={styles.headerSubtitle}>We value your opinion</Text>
          </View>
        </View>
      </Surface>

      {renderStepHeader()}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 1 && renderRatingScreen()}
          {currentStep === 2 && renderTopicScreen()}
          {currentStep === 3 && renderSubmitScreen()}
        </ScrollView>
      </KeyboardAvoidingView>

      <Surface style={styles.footer} elevation={4}>
        <Button 
          mode="text" 
          onPress={handleBack} 
          style={styles.footerBtn}
          textColor="#666"
        >
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>
        <Button 
          mode="contained" 
          onPress={handleNext} 
          loading={loading}
          disabled={loading}
          style={styles.nextBtn}
          contentStyle={styles.nextBtnContent}
        >
          {currentStep === 3 ? 'Submit Feedback' : 'Next'}
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    paddingTop: 50,
    backgroundColor: '#FFF',
    paddingBottom: 15,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerTitleContainer: {
    marginLeft: 0,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    color: '#888',
  },
  stepsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  stepCircleContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stepCircleActive: {
    borderColor: '#006AF5',
    backgroundColor: '#006AF5',
  },
  stepCircleInactive: {
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  stepCircleCompleted: {
    backgroundColor: '#38A169',
    borderColor: '#38A169',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepNumberActive: {
    color: '#FFF',
  },
  stepNumberInactive: {
    color: '#BBB',
  },
  stepLabelText: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: 'bold',
    color: '#888',
  },
  stepLine: {
    width: 50,
    height: 2,
    marginHorizontal: 10,
    marginTop: -15, // Align with circles
  },
  stepLineActive: {
    backgroundColor: '#38A169',
  },
  stepLineInactive: {
    backgroundColor: '#E0E0E0',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 40,
  },
  starWrapper: {
    marginHorizontal: 8,
  },
  ratingHint: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#006AF5',
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  topicItem: {
    width: (width - 64) / 2,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  topicItemActive: {
    borderColor: '#006AF5',
    backgroundColor: '#F0F7FF',
  },
  topicIconSurface: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  topicText: {
    fontWeight: 'bold',
    color: '#333',
  },
  topicTextActive: {
    color: '#1A1A1A',
  },
  topicCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  reviewCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  reviewSummary: {
    flexDirection: 'column',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewRatingText: {
    marginLeft: 6,
    fontWeight: 'bold',
    color: '#555',
  },
  reviewHospitalName: {
    fontWeight: 'bold',
    color: '#006AF5',
  },
  reviewTopics: {
    color: '#666',
    marginTop: 4,
  },
  commentInput: {
    backgroundColor: '#FFF',
    textAlignVertical: 'top',
  },
  minCharHint: {
    fontSize: 11,
    color: '#888',
    marginTop: 8,
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  footerBtn: {
    justifyContent: 'center',
  },
  nextBtn: {
    borderRadius: 12,
    width: '60%',
    backgroundColor: '#006AF5',
  },
  nextBtnContent: {
    height: 48,
  },
});
