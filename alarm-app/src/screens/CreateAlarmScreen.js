import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { AlarmStorage } from '../services/AlarmStorage';
import { NotificationService } from '../services/NotificationService';

export default function CreateAlarmScreen({ navigation }) {
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [label, setLabel] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [duration, setDuration] = useState('5');
  const [saving, setSaving] = useState(false);
  const [customRingtone, setCustomRingtone] = useState(null);

  const handleTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || time;
    setShowTimePicker(Platform.OS === 'ios');
    setTime(currentTime);
  };

  const formatTimeDisplay = (date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const validateForm = () => {
    if (!label.trim()) {
      Alert.alert('Error', 'Please enter an alarm label');
      return false;
    }
    
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum < 1 || durationNum > 60) {
      Alert.alert('Error', 'Duration must be between 1 and 60 minutes');
      return false;
    }
    
    return true;
  };

  const pickCustomRingtone = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCustomRingtone(result.assets[0]);
        Alert.alert('Success', 'Custom ringtone selected!');
      }
    } catch (error) {
      console.error('Error picking ringtone:', error);
      Alert.alert('Error', 'Failed to select ringtone. Please try again.');
    }
  };

  const saveAlarm = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      // Add debugging log for alarm time
      console.log('Creating alarm for time:', time.toISOString());
      console.log('Current time:', new Date().toISOString());
      
      const alarmData = {
        time: time.toISOString(),
        label: label.trim(),
        frequency,
        duration: parseInt(duration),
      };
      
      // AlarmStorage.addAlarm already handles notification scheduling
      const newAlarm = await AlarmStorage.addAlarm(alarmData);
      
      // Save custom ringtone if selected
      if (customRingtone) {
        await AlarmStorage.setCustomRingtone(newAlarm.id, customRingtone.uri);
      }
      
      Alert.alert(
        'Alarm Created',
        `Your alarm has been set for ${formatTimeDisplay(time)}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving alarm:', error);
      Alert.alert('Error', 'Failed to create alarm. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        
        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alarm Time</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Text style={styles.timeButtonText}>
              {formatTimeDisplay(time)}
            </Text>
          </TouchableOpacity>
          
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>

        {/* Label Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Label</Text>
          <TextInput
            style={styles.textInput}
            value={label}
            onChangeText={setLabel}
            placeholder="Enter alarm label (e.g., Wake up, Meeting)"
            placeholderTextColor="#999"
            maxLength={50}
          />
        </View>

        {/* Frequency Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequency</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={frequency}
              onValueChange={setFrequency}
              style={styles.picker}
            >
              <Picker.Item label="Once" value="once" />
              <Picker.Item label="Daily" value="daily" />
              <Picker.Item label="Weekly" value="weekly" />
            </Picker>
          </View>
        </View>

        {/* Duration Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration (minutes)</Text>
          <TextInput
            style={styles.textInput}
            value={duration}
            onChangeText={setDuration}
            placeholder="Enter duration (1-60 minutes)"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={2}
          />
          <Text style={styles.helperText}>
            How long the alarm should ring before automatically stopping
          </Text>
        </View>

        {/* Custom Ringtone Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ringtone</Text>
          <TouchableOpacity
            style={styles.ringtoneButton}
            onPress={pickCustomRingtone}
          >
            <Ionicons name="musical-note" size={24} color="#007AFF" />
            <Text style={styles.ringtoneButtonText}>
              {customRingtone ? customRingtone.name : 'Select Custom Ringtone'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          <Text style={styles.helperText}>
            {customRingtone 
              ? 'Custom ringtone selected. Default will be used if file is unavailable.'
              : 'Choose a custom ringtone from your device or use default alarm sound'
            }
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveAlarm}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Creating Alarm...' : 'Create Alarm'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  timeButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#007AFF',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  ringtoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    justifyContent: 'space-between',
  },
  ringtoneButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginLeft: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 50,
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});