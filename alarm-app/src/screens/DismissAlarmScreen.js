import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Vibration,
  BackHandler,
} from 'react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { AlarmStorage } from '../services/AlarmStorage';
import { MistralService } from '../services/MistralService';
import { NotificationService } from '../services/NotificationService';

export default function DismissAlarmScreen({ route, navigation }) {
  const { alarmId, duration: notificationDuration } = route.params || {};
  const [alarm, setAlarm] = useState(null);
  const [dismissalCodeData, setDismissalCodeData] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(300); // Default 5 minutes
  const [isPlaying, setIsPlaying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [audioPlayer, setAudioPlayer] = useState(null);
  
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);

  useEffect(() => {
    // Prevent going back
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    
    // Load alarm data and setup
    initializeAlarmDismissal();
    
    return () => {
      backHandler.remove();
      stopAlarm();
      if (timerRef.current) clearInterval(timerRef.current);
      // Clean up audio resources
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.unloadAsync();
        } catch (e) {
          console.log('Error cleaning up audio player:', e);
        }
      }
    };
  }, []);

  const initializeAlarmDismissal = async () => {
    try {
      // Load the alarm data
      const alarmData = await AlarmStorage.getAlarm(alarmId);
      if (alarmData) {
        setAlarm(alarmData);
        const alarmDuration = alarmData.duration || 5; // Default to 5 minutes
        setTimeRemaining(alarmDuration * 60);
      }

      // Check for existing dismissal code or generate new one
      let codeData = await AlarmStorage.getDismissalCode(alarmId);
      if (!codeData || isCodeExpired(codeData)) {
        // Generate new code
        codeData = await MistralService.generateDismissalCode();
        await AlarmStorage.saveDismissalCode(alarmId, codeData);
      }
      
      setDismissalCodeData(codeData);
      setAttempts(codeData.attempts || 0);
      
      // Start alarm sound and countdown
      await playAlarmSound();
      startVibration();
      startTimer();
      
    } catch (error) {
      console.error('Error initializing alarm dismissal:', error);
      Alert.alert('Error', 'Failed to load alarm. Please try again.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const isCodeExpired = (codeData) => {
    return Date.now() > codeData.expiresAt;
  };

  const playAlarmSound = async () => {
    try {
      // Configure audio mode for alarm playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      // Load default audio source
      let audioSource = require('../../assets/alarm-sound.wav');
      
      // Check if user has a custom ringtone
      const customRingtone = await AlarmStorage.getCustomRingtone(alarmId);
      if (customRingtone) {
        audioSource = { uri: customRingtone };
      }

      await playAudio(audioSource);
    } catch (error) {
      console.error('Error playing alarm sound:', error);
      // Continue without sound rather than failing
      setIsPlaying(false);
    }
  };

  const playAudio = async (audioSource) => {
    try {
      // Clean up any existing sound
      if (audioPlayerRef.current) {
        try {
          await audioPlayerRef.current.unloadAsync();
        } catch (e) {
          console.log('Error unloading previous sound:', e);
        }
        audioPlayerRef.current = null;
      }

      // Create new sound object
      const { sound } = await Audio.Sound.createAsync(
        audioSource,
        {
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
        }
      );
      
      audioPlayerRef.current = sound;
      setAudioPlayer(sound);
      setIsPlaying(true);
      
      console.log('Audio player started successfully with looping');
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const startVibration = () => {
    const vibrationPattern = [1000, 1000]; // 1 second on, 1 second off
    Vibration.vibrate(vibrationPattern, true);
  };

  const stopAlarm = async () => {
    try {
      if (audioPlayerRef.current) {
        await audioPlayerRef.current.pauseAsync();
        await audioPlayerRef.current.unloadAsync();
        audioPlayerRef.current = null;
        setAudioPlayer(null);
      }
      Vibration.cancel();
      setIsPlaying(false);
    } catch (error) {
      console.error('Error stopping alarm:', error);
      // Continue anyway to ensure the alarm stops
      setIsPlaying(false);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = () => {
    stopAlarm(); // Stop immediately
    Alert.alert(
      'Alarm Timeout',
      `The alarm has been automatically dismissed after ${alarm?.duration || 5} minutes.`,
      [{ text: 'OK', onPress: () => {
        AlarmStorage.removeDismissalCode(alarmId);
        navigation.navigate('AlarmList');
      }}]
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    const newAttempts = await AlarmStorage.incrementCodeAttempts(alarmId);
    setAttempts(newAttempts);
    
    // Check attempt limit before processing
    if (newAttempts > 5) {
      Alert.alert(
        'Maximum Attempts Exceeded',
        'Too many failed attempts. The alarm will continue until timeout.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (userInput.trim().toUpperCase() === dismissalCodeData.code) {
      // Correct code entered
      stopAlarm();
      await AlarmStorage.removeDismissalCode(alarmId);
      
      // For one-time alarms, cancel notification and mark as inactive
      if (alarm && alarm.frequency === 'once') {
        if (alarm.notificationId) {
          await NotificationService.cancelAlarm(alarm.notificationId);
        }
        await AlarmStorage.updateAlarm(alarmId, { 
          isActive: false, 
          notificationId: null 
        });
      }
      
      Alert.alert(
        'Alarm Dismissed',
        'Great! You successfully dismissed the alarm.',
        [{ text: 'OK', onPress: () => navigation.navigate('AlarmList') }]
      );
    } else {
      // Incorrect code
      setUserInput('');
      
      if (newAttempts >= 5) {
        Alert.alert(
          'Too Many Failed Attempts',
          'Maximum attempts exceeded. The alarm will continue until time runs out or the correct code is entered.',
          [{ text: 'Continue' }]
        );
      } else {
        Alert.alert(
          'Incorrect Code',
          `The code you entered is incorrect. ${5 - newAttempts} attempts remaining.`,
          [{ text: 'Try Again' }]
        );
      }
    }
  };

  const regenerateCode = async () => {
    setUserInput('');
    setIsGeneratingCode(true);
    try {
      const newCodeData = await MistralService.generateDismissalCode();
      await AlarmStorage.saveDismissalCode(alarmId, newCodeData);
      setDismissalCodeData(newCodeData);
      setAttempts(0);
      Alert.alert(
        'New Code Generated',
        'A new dismissal code has been generated.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate new code. Please try again.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  if (isGeneratingCode) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="hourglass-outline" size={64} color="#007AFF" />
        <Text style={styles.loadingText}>Generating dismissal code...</Text>
        <Text style={styles.loadingSubtext}>Please wait while we create your unique code</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="alarm" size={48} color="#ff4444" />
        <Text style={styles.alarmTitle}>🚨 {alarm?.label || 'ALARM'} 🚨</Text>
        <Text style={styles.timeRemainingText}>
          Time remaining: {formatTime(timeRemaining)}
        </Text>
      </View>

      <View style={styles.codeSection}>
        <Text style={styles.instructionText}>
          Enter this code to dismiss the alarm:
        </Text>
        
        <View style={styles.codeDisplay}>
          <Text style={styles.codeText} selectable={false}>
            {dismissalCodeData?.code || 'Loading...'}
          </Text>
        </View>
        
        <Text style={styles.warningText}>
          ⚠️ This code cannot be copied. You must type it manually.
        </Text>
      </View>

      <View style={styles.inputSection}>
        <TextInput
          style={styles.codeInput}
          value={userInput}
          onChangeText={(text) => {
            // Prevent paste operations by rejecting multi-character insertions
            if (text.length > userInput.length + 1) {
              return; // Reject paste
            }
            setUserInput(text);
          }}
          placeholder="Enter the code here"
          placeholderTextColor="#999"
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          selectTextOnFocus={false}
          contextMenuHidden={true}
          selection={{start: userInput.length, end: userInput.length}}
          onSelectionChange={() => {}}
          maxLength={8}
          editable={!isGeneratingCode}
        />
        
        <TouchableOpacity
          style={[styles.submitButton, (!userInput.trim() || isGeneratingCode) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!userInput.trim() || isGeneratingCode}
        >
          <Text style={styles.submitButtonText}>Dismiss Alarm</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.regenerateButton}
          onPress={regenerateCode}
          disabled={isGeneratingCode}
        >
          <Ionicons name="refresh" size={20} color="#007AFF" />
          <Text style={styles.regenerateButtonText}>Generate New Code</Text>
        </TouchableOpacity>
        
        <Text style={styles.attemptsText}>
          Attempts: {attempts}/5
        </Text>

        {isCodeExpired(dismissalCodeData) && (
          <Text style={styles.expiredText}>
            ⚠️ Code expired - generating new one...
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffebee',
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  alarmTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ff4444',
    marginTop: 10,
    textAlign: 'center',
  },
  timeRemainingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
  },
  codeSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  codeDisplay: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 20,
    marginBottom: 15,
  },
  codeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 4,
    fontFamily: 'monospace',
    userSelect: 'none',
  },
  warningText: {
    fontSize: 14,
    color: '#ff6600',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  inputSection: {
    marginBottom: 30,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    fontSize: 24,
    textAlign: 'center',
    backgroundColor: 'white',
    letterSpacing: 2,
    fontFamily: 'monospace',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomSection: {
    alignItems: 'center',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  regenerateButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 8,
  },
  attemptsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  expiredText: {
    fontSize: 14,
    color: '#ff4444',
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 20,
    color: '#007AFF',
    marginTop: 20,
    fontWeight: '500',
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
});