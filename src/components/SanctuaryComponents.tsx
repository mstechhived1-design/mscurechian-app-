import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput as RNTextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../constants/designSystem';

// --- TYPOGRAPHY ---
export const SanctuaryText = ({ variant = 'body_md', style, children, ...props }: any) => {
  const variantStyle = TYPOGRAPHY[variant as keyof typeof TYPOGRAPHY] || TYPOGRAPHY.body_md;
  return (
    <Text
      style={[
        { color: COLORS.on_surface, fontFamily: variant.includes('display') || variant.includes('headline') ? 'Manrope_600SemiBold' : 'Inter_400Regular' },
        variantStyle,
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

// --- BUTTONS ---
export const PrimaryButton = ({ label, onPress, loading, disabled, style }: any) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btnWrapper, style]}
    >
      <LinearGradient
        colors={[COLORS.primary, COLORS.primary_container]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }} // 135 deg approx
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.on_primary} />
        ) : (
          <SanctuaryText
            variant="label_lg"
            style={{ color: COLORS.on_primary, fontWeight: '700' }}
          >
            {label}
          </SanctuaryText>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export const SecondaryButton = ({ label, onPress, style }: any) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.secondaryButton, style]}
  >
    <SanctuaryText variant="label_lg" style={{ color: COLORS.on_surface }}>
      {label}
    </SanctuaryText>
  </TouchableOpacity>
);

// --- INPUTS ---
export const SanctuaryInput = ({ label, value, onChangeText, secureTextEntry, error, icon: Icon, rightIcon: RightIcon }: any) => {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <View style={styles.inputContainer}>
      <SanctuaryText variant="body_sm" style={styles.inputLabel}>
        {label}
      </SanctuaryText>
      <View style={[
        styles.inputField,
        { backgroundColor: COLORS.surface_container_lowest },
        isFocused && { borderBottomWidth: 2, borderBottomColor: COLORS.primary_fixed_dim }
      ]}>
        {Icon && <View style={styles.iconBox}>{Icon}</View>}
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={COLORS.outline_variant}
          style={styles.textInput}
        />
        {RightIcon && <View style={styles.iconBox}>{RightIcon}</View>}
      </View>
      {error && <SanctuaryText variant="body_sm" style={{ color: COLORS.error, marginTop: 4 }}>{error}</SanctuaryText>}
    </View>
  );
};

// --- LOADING (Simple Round Spinner) ---
export const DigitalAtriumLoader = ({ fullscreen = true }: { message?: string; subMessage?: string; fullscreen?: boolean }) => (
  <View style={fullscreen ? styles.loaderContainer : { padding: SPACING.xl, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

const styles = StyleSheet.create({
  btnWrapper: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    height: 56,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    height: 56,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface_container_highest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    marginBottom: SPACING.xl,
  },
  inputLabel: {
    marginBottom: SPACING.sm,
    color: COLORS.on_surface,
    opacity: 0.7,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    height: 52,
    paddingHorizontal: SPACING.md,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: COLORS.on_surface,
  },
  iconBox: {
    marginRight: SPACING.sm,
  },
  loaderContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: COLORS.surface
  }
});
