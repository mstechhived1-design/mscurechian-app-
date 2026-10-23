import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Text, Surface, IconButton, RadioButton } from 'react-native-paper';
import { Languages } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'user-language';

const LanguageSelector = () => {
  const { i18n, t } = useTranslation();
  const [visible, setVisible] = useState(false);

  const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
    await AsyncStorage.setItem(LANGUAGE_KEY, lng);
    setVisible(false);
  };

  const currentLanguage = i18n.language || 'en';

  return (
    <View>
      <TouchableOpacity 
        onPress={() => setVisible(true)}
        style={styles.langBtn}
      >
        <Languages size={15} color="#006AF5" />
        <Text style={styles.langCode}>{currentLanguage.toUpperCase()}</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
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
              activeOpacity={1} 
              onPress={() => setVisible(false)} 
            />
          </BlurView>
          <Surface style={[styles.modalContent, styles.modalSurface]} elevation={0}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={styles.modalTitle}>Select Language</Text>
              <IconButton icon="close" onPress={() => setVisible(false)} />
            </View>
            
            <View style={styles.langList}>
              <TouchableOpacity style={styles.langItem} onPress={() => changeLanguage('en')}>
                <Text style={styles.langName}>{t('languages.en')}</Text>
                <RadioButton
                  value="en"
                  status={currentLanguage === 'en' ? 'checked' : 'unchecked'}
                  onPress={() => changeLanguage('en')}
                  color="#006AF5"
                />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.langItem} onPress={() => changeLanguage('hi')}>
                <Text style={styles.langName}>{t('languages.hi')}</Text>
                <RadioButton
                  value="hi"
                  status={currentLanguage === 'hi' ? 'checked' : 'unchecked'}
                  onPress={() => changeLanguage('hi')}
                  color="#006AF5"
                />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.langItem} onPress={() => changeLanguage('te')}>
                <Text style={styles.langName}>{t('languages.te')}</Text>
                <RadioButton
                  value="te"
                  status={currentLanguage === 'te' ? 'checked' : 'unchecked'}
                  onPress={() => changeLanguage('te')}
                  color="#006AF5"
                />
              </TouchableOpacity>
            </View>
          </Surface>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  langCode: {
    marginLeft: 4,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#006AF5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontWeight: 'bold',
    marginLeft: 5,
  },
  langList: {
    marginTop: 10,
  },
  langItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  langName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  modalSurface: { borderTopWidth: 1, borderTopColor: '#EEE' },
});

export default LanguageSelector;
