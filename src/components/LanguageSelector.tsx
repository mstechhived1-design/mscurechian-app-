import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
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
        <Languages size={20} color="#006AF5" />
        <Text style={styles.langCode}>{currentLanguage.toUpperCase()}</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.dismissOverlay} 
            activeOpacity={1} 
            onPress={() => setVisible(false)} 
          />
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
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0E6FF',
    marginRight: 8,
  },
  langCode: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
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
