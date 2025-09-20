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
import { Ionicons } from '@expo/vector-icons';
import { MistralService } from '../services/MistralService';

export default function DismissAlarmScreen({ route, navigation }) {
  const { alarmId } = route.params || {};
  const [dismissalCode, setDismissalCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [isPlaying, setIsPlaying] = useState(true);
  const [attempts, setAttempts] = useState(0);
  
  const soundRef = useRef(null);
  const timerRef = useRef(null);
  const vibrationRef = useRef(null);

  useEffect(() => {
    // Prevent going back
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    
    // Generate dismissal code
    generateCode();
    
    // Start alarm sound and vibration
    playAlarmSound();
    startVibration();
    
    // Start countdown timer
    startTimer();
    
    return () => {
      backHandler.remove();
      stopAlarm();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const generateCode = async () => {
    setIsGeneratingCode(true);
    try {
      const codeData = await MistralService.generateDismissalCode();
      setDismissalCode(codeData.code);
    } catch (error) {
      console.error('Error generating code:', error);
      // Fallback code generation
      const fallbackCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      setDismissalCode(fallbackCode);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const playAlarmSound = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing alarm sound:', error);
      // Fallback to system alert sound
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/alarm-sound.mp3'), // We'll need to add this
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        soundRef.current = sound;
      } catch (fallbackError) {
        console.error('Fallback sound failed:', fallbackError);
      }
    }
  };

  const startVibration = () => {
    const vibrationPattern = [1000, 1000]; // 1 second on, 1 second off
    Vibration.vibrate(vibrationPattern, true);
  };

  const stopAlarm = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      Vibration.cancel();
      setIsPlaying(false);
    } catch (error) {
      console.error('Error stopping alarm:', error);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up, dismiss alarm automatically
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = () => {
    Alert.alert(
      'Alarm Timeout',
      'The alarm has been automatically dismissed after 5 minutes.',
      [{ text: 'OK', onPress: () => navigation.navigate('AlarmList') }]
    );
    stopAlarm();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    setAttempts(prev => prev + 1);
    
    if (userInput.trim().toUpperCase() === dismissalCode) {
      // Correct code entered
      stopAlarm();
      Alert.alert(
        'Alarm Dismissed',
        'Great! You successfully dismissed the alarm.',
        [{ text: 'OK', onPress: () => navigation.navigate('AlarmList') }]
      );
    } else {
      // Incorrect code
      setUserInput('');
      
      if (attempts >= 2) {
        Alert.alert(
          'Multiple Failed Attempts',
          'You have entered the wrong code multiple times. The alarm will continue until the correct code is entered or time runs out.',
          [{ text: 'Try Again' }]
        );
      } else {
        Alert.alert(
          'Incorrect Code',
          'The code you entered is incorrect. Please try again.',
          [{ text: 'Try Again' }]
        );
      }
    }
  };

  const regenerateCode = async () => {
    setUserInput('');
    await generateCode();
    Alert.alert(
      'New Code Generated',
      'A new dismissal code has been generated.',
      [{ text: 'OK' }]
    );
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
        <Text style={styles.alarmTitle}>ALARM!</Text>
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
            {dismissalCode}
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
          onChangeText={setUserInput}
          placeholder="Enter the code here"
          placeholderTextColor="#999"
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          selectTextOnFocus={false}
          maxLength={8}
        />
        
        <TouchableOpacity
          style={[styles.submitButton, !userInput.trim() && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!userInput.trim()}
        >
          <Text style={styles.submitButtonText}>Dismiss Alarm</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={styles.regenerateButton}
          onPress={regenerateCode}
        >
          <Ionicons name="refresh" size={20} color="#007AFF" />
          <Text style={styles.regenerateButtonText}>Generate New Code</Text>
        </TouchableOpacity>
        
        <Text style={styles.attemptsText}>
          Attempts: {attempts}
        </Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff4444',
    marginTop: 10,
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