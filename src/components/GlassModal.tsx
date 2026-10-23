import React from 'react';
import {
  Modal as RNModal,
  StyleSheet,
  View,
  TouchableWithoutFeedback,
  Platform,
  ViewStyle,
  StyleProp,
  KeyboardAvoidingView,
} from 'react-native';
import { BlurView } from 'expo-blur';

export interface GlassModalProps {
  visible: boolean;
  onDismiss?: () => void;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  animationType?: 'fade' | 'slide' | 'none';
  blurIntensity?: number;
  blurTint?: 'light' | 'dark' | 'default';
  dismissable?: boolean;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  visible,
  onDismiss,
  onClose,
  title,
  children,
  contentContainerStyle,
  animationType = 'fade',
  blurIntensity = Platform.OS === 'ios' ? 45 : 70,
  blurTint = 'dark',
  dismissable = true,
}) => {
  const handleDismiss = () => {
    if (onClose) onClose();
    else if (onDismiss) onDismiss();
  };

  if (!visible) return null;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {/* Fullscreen Frosted Blur Backdrop */}
        <TouchableWithoutFeedback onPress={dismissable ? handleDismiss : undefined}>
          <BlurView
            intensity={blurIntensity}
            tint={blurTint}
            style={StyleSheet.absoluteFill}
          >
            <View style={styles.colorDim} />
          </BlurView>
        </TouchableWithoutFeedback>

        {/* Modal Card Content with Glassmorphic styling */}
        <View style={[styles.defaultContent, contentContainerStyle]}>
          {children}
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

export default GlassModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  defaultContent: {
    width: '90%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
});
