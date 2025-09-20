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
import { AlarmStorage } from '../services/AlarmStorage';
import { NotificationService } from '../services/NotificationService';

export default function CreateAlarmScreen({ navigation }) {
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [label, setLabel] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [duration, setDuration] = useState('5');
  const [saving, setSaving] = useState(false);

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

  const saveAlarm = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const alarmData = {
        time: time.toISOString(),
        label: label.trim(),
        frequency,
        duration: parseInt(duration),
      };
      
      // AlarmStorage.addAlarm already handles notification scheduling
      const newAlarm = await AlarmStorage.addAlarm(alarmData);
      
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