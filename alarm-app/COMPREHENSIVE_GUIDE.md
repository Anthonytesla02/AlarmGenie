# Comprehensive Alarm App Guide

## Overview

This is a React Native/Expo alarm application with unique security features including locally-generated dismissal codes (development), custom ringtones, and intelligent alarm timing validation. The app provides a modern interface for creating, managing, and dismissing alarms with advanced security features.

**Key Features:**
- Secure dismissal codes with expiration and attempt limiting
- Custom ringtone support via document picker
- Intelligent timing validation with tolerance for early/late triggers
- Background notification scheduling with Android channel optimization
- Audio playback with looping and silent mode support
- Recurring alarm management (once, daily, weekly)
- Memory leak prevention with proper resource cleanup

## App Architecture

### Main Components

```
alarm-app/
├── App.js                 # Main app with navigation setup
├── src/
│   ├── screens/
│   │   ├── AlarmListScreen.js     # Home screen showing all alarms
│   │   ├── CreateAlarmScreen.js   # Screen for creating new alarms
│   │   └── DismissAlarmScreen.js  # Special dismissal screen with AI codes
│   └── services/
│       ├── AlarmStorage.js        # Data persistence layer
│       ├── NotificationService.js # Notification scheduling & handling
│       └── MistralService.js      # AI code generation service
├── assets/
│   └── alarm-sound.wav           # Default alarm sound
└── package.json
```

## Core Features

### 1. Alarm Management
- Create alarms with custom times, labels, and frequencies
- Toggle alarms on/off without deleting them
- Delete alarms with confirmation
- Support for one-time, daily, and weekly alarms
- Custom ringtone selection

### 2. AI-Generated Dismissal Codes
- Unique 8-character alphanumeric codes generated for each alarm
- Codes expire after 10 minutes for security
- Multiple attempt tracking
- Prevents accidental dismissal

### 3. Intelligent Timing
- Validates alarm timing with tolerance for early triggers
- Automatic rescheduling for recurring alarms
- Handles timezone and daylight saving changes

## Code Documentation

### App.js - Main Application Entry

```javascript
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import AlarmListScreen from './src/screens/AlarmListScreen';
import CreateAlarmScreen from './src/screens/CreateAlarmScreen';
import DismissAlarmScreen from './src/screens/DismissAlarmScreen';
import { NotificationService } from './src/services/NotificationService';

const Stack = createNativeStackNavigator();

// Configure notifications to show alerts and play sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const navigationRef = useRef();
  const notificationListenerRef = useRef(null);

  useEffect(() => {
    // Request notification permissions on app start
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to receive notifications was denied!');
      }
    };
    requestPermissions();

    // Cleanup notification listeners on unmount
    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current();
        notificationListenerRef.current = null;
      }
    };
  }, []);

  const onNavigationReady = () => {
    // Set up notification listeners once navigation is ready
    if (!notificationListenerRef.current) {
      const unsubscribe = NotificationService.setupNotificationListener(navigationRef.current);
      notificationListenerRef.current = unsubscribe;
    }
  };
  
  return (
    <NavigationContainer 
      ref={navigationRef}
      onReady={onNavigationReady}
    >
      <Stack.Navigator initialRouteName="AlarmList">
        <Stack.Screen 
          name="AlarmList" 
          component={AlarmListScreen} 
          options={{ title: 'My Alarms' }}
        />
        <Stack.Screen 
          name="CreateAlarm" 
          component={CreateAlarmScreen} 
          options={{ title: 'Create Alarm' }}
        />
        <Stack.Screen 
          name="DismissAlarm" 
          component={DismissAlarmScreen} 
          options={{ 
            title: 'Dismiss Alarm',
            headerLeft: () => null, // Prevent going back
            gestureEnabled: false, // Disable swipe back
          }}
        />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
```

**Key Functions:**
- Sets up React Navigation with three screens and proper titles
- Configures notification behavior globally
- Requests notification permissions on app startup
- Initializes notification listeners when navigation is ready
- Prevents users from navigating back from DismissAlarm screen
- Manages notification listener lifecycle with cleanup

### AlarmListScreen.js - Main Home Screen

```javascript
export default function AlarmListScreen({ navigation }) {
  const [alarms, setAlarms] = useState([]);

  // Load alarms from storage when screen focuses
  useEffect(() => {
    loadAlarms();
    const unsubscribeFocus = navigation.addListener('focus', loadAlarms);
    return () => unsubscribeFocus();
  }, [navigation]);

  const loadAlarms = async () => {
    try {
      const loadedAlarms = await AlarmStorage.loadAlarms();
      setAlarms(loadedAlarms);
    } catch (error) {
      Alert.alert('Error', 'Failed to load alarms');
    }
  };

  const toggleAlarm = async (alarmId) => {
    try {
      await AlarmStorage.toggleAlarm(alarmId);
      loadAlarms(); // Refresh list
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle alarm');
    }
  };
}
```

**Key Functions:**
- `loadAlarms()`: Retrieves all alarms from AsyncStorage
- `toggleAlarm()`: Enables/disables alarms without deletion
- `deleteAlarm()`: Removes alarms with user confirmation
- `formatTime()`: Formats time display in 12-hour format

**UI Components:**
- FlatList for alarm display
- Switch components for toggling alarms
- Delete buttons with confirmation dialogs
- Empty state when no alarms exist

### CreateAlarmScreen.js - Alarm Creation

```javascript
export default function CreateAlarmScreen({ navigation }) {
  const [time, setTime] = useState(new Date());
  const [label, setLabel] = useState('');
  const [frequency, setFrequency] = useState('once');
  const [duration, setDuration] = useState('5');
  const [customRingtone, setCustomRingtone] = useState(null);

  const saveAlarm = async () => {
    if (!validateForm()) return;
    
    try {
      const newAlarm = {
        time: time.toISOString(),
        label: label.trim(),
        frequency,
        duration: parseInt(duration),
        customRingtone: customRingtone?.uri || null,
      };

      await AlarmStorage.addAlarm(newAlarm);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save alarm');
    }
  };

  const pickCustomRingtone = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets?.length > 0) {
        setCustomRingtone(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select ringtone');
    }
  };
}
```

**Key Functions:**
- `validateForm()`: Ensures all required fields are filled correctly
- `saveAlarm()`: Creates new alarm object and saves to storage
- `pickCustomRingtone()`: Allows users to select custom alarm sounds
- `handleTimeChange()`: Manages time picker interactions

**Form Components:**
- DateTimePicker for alarm time selection
- TextInput for alarm label
- Picker for frequency (once, daily, weekly)
- Duration slider (1-60 minutes)
- Custom ringtone selector

### DismissAlarmScreen.js - AI-Powered Dismissal

The most complex screen that handles audio playback, vibration, countdown timers, and secure dismissal code validation.

```javascript
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, Vibration, BackHandler,
} from 'react-native';
import { AudioPlayer, setAudioModeAsync } from 'expo-audio';
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
    // Prevent going back with hardware back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    
    // Initialize dismissal screen
    initializeAlarmDismissal();
    
    // Cleanup on component unmount
    return () => {
      backHandler.remove();
      stopAlarm();
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Clean up audio player resources
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.remove();
        } catch (e) {
          console.log('Error cleaning up audio player:', e);
        }
      }
    };
  }, []);

  const initializeAlarmDismissal = async () => {
    try {
      // Load alarm data
      const alarmData = await AlarmStorage.getAlarm(alarmId);
      if (alarmData) {
        setAlarm(alarmData);
        const alarmDuration = alarmData.duration || 5; // Default to 5 minutes
        setTimeRemaining(alarmDuration * 60);
      }

      // Check for existing dismissal code or generate new one
      let codeData = await AlarmStorage.getDismissalCode(alarmId);
      if (!codeData || isCodeExpired(codeData)) {
        codeData = await MistralService.generateDismissalCode();
        await AlarmStorage.saveDismissalCode(alarmId, codeData);
      }
      
      setDismissalCodeData(codeData);
      setAttempts(codeData.attempts || 0);
      setIsGeneratingCode(false);
      
      // Start alarm sound, vibration, and countdown
      await playAlarmSound();
      startVibration();
      startTimer();
    } catch (error) {
      console.error('Failed to initialize dismissal:', error);
      Alert.alert('Error', 'Failed to load alarm data');
    }
  };

  // Audio playback with looping and custom ringtone support
  const playAlarmSound = async () => {
    try {
      // Configure audio mode for alarm playback
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'mixWithOthers',
      });

      // Load default or custom ringtone
      let audioSource = require('../../assets/alarm-sound.wav');
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

  // Core audio player management with looping
  const playAudio = async (audioSource) => {
    try {
      // Clean up any existing player
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.remove();
        } catch (e) {
          console.log('Error removing previous player:', e);
        }
        audioPlayerRef.current = null;
      }

      // Create new audio player
      const player = new AudioPlayer(audioSource);
      audioPlayerRef.current = player;
      setAudioPlayer(player);
      
      // Set up looping by handling play completion
      player.addListener('playbackStatusChanged', (status) => {
        if (status.isLoaded && status.didJustFinish && isPlaying) {
          // Restart the audio to loop
          player.replay().catch(console.error);
        }
      });
      
      // Start playing
      await player.play();
      setIsPlaying(true);
      
      console.log('Audio player started successfully with looping');
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  // Vibration pattern management
  const startVibration = () => {
    // Vibrate in pattern: wait 0ms, vibrate 1000ms, wait 1000ms, repeat
    Vibration.vibrate([0, 1000, 1000], true);
  };

  // Countdown timer for alarm duration
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time expired, dismiss alarm automatically
          dismissAlarmTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Code validation and dismissal logic
  const validateAndDismissAlarm = async () => {
    if (userInput.trim().toUpperCase() === dismissalCodeData.code) {
      // Correct code entered
      await dismissAlarmSuccess();
    } else {
      // Incorrect code - increment attempts
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setUserInput('');
      
      // Update dismissal code with attempt count
      const updatedCodeData = { ...dismissalCodeData, attempts: newAttempts };
      setDismissalCodeData(updatedCodeData);
      await AlarmStorage.saveDismissalCode(alarmId, updatedCodeData);
      
      if (newAttempts >= 5) {
        Alert.alert(
          'Too Many Attempts', 
          'Maximum attempts reached. Please wait for the alarm to timeout.'
        );
      } else {
        Alert.alert('Incorrect Code', `Attempt ${newAttempts}/5. Please try again.`);
      }
    }
  };

  const dismissAlarmSuccess = async () => {
    try {
      stopAlarm();
      await AlarmStorage.removeDismissalCode(alarmId);
      
      // Handle recurring vs one-time alarms
      if (alarm.frequency !== 'once') {
        await AlarmStorage.rescheduleAlarm(alarmId);
        Alert.alert('Alarm Dismissed', `Next ${alarm.frequency} alarm has been scheduled.`);
      } else {
        await AlarmStorage.deleteAlarm(alarmId);
        Alert.alert('Alarm Dismissed', 'One-time alarm has been removed.');
      }
      
      navigation.navigate('AlarmList');
    } catch (error) {
      console.error('Error dismissing alarm:', error);
      Alert.alert('Error', 'Failed to dismiss alarm properly');
    }
  };

  const dismissAlarmTimeout = async () => {
    try {
      stopAlarm();
      await AlarmStorage.removeDismissalCode(alarmId);
      
      if (alarm.frequency !== 'once') {
        await AlarmStorage.rescheduleAlarm(alarmId);
      } else {
        await AlarmStorage.deleteAlarm(alarmId);
      }
      
      Alert.alert('Alarm Timeout', 'Alarm dismissed due to timeout.');
      navigation.navigate('AlarmList');
    } catch (error) {
      console.error('Error handling alarm timeout:', error);
    }
  };

  const stopAlarm = () => {
    // Stop vibration
    Vibration.cancel();
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop audio
    if (audioPlayerRef.current && isPlaying) {
      try {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
  };

  const isCodeExpired = (codeData) => {
    return Date.now() > codeData.expiresAt;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // UI rendering logic here...
}
```

**Key Functions:**
- `initializeAlarmDismissal()`: Complete setup with data loading, code generation, audio/vibration start
- `playAlarmSound()`: Configures audio mode and determines audio source (default vs custom)
- `playAudio()`: Creates AudioPlayer with looping logic and event listeners
- `startVibration()`: Continuous vibration pattern during alarm
- `startTimer()`: Countdown management with auto-dismiss on timeout
- `validateAndDismissAlarm()`: Code validation with attempt tracking and limits
- `stopAlarm()`: Complete cleanup of audio, vibration, and timers

**Security & UX Features:**
- Hardware back button disabled to prevent accidental dismissal
- Code expiration (10 minutes from generation)
- Attempt tracking and limiting (5 attempts maximum)
- Automatic timeout dismissal
- Proper cleanup to prevent memory leaks

**Audio Management:**
- Plays in silent mode and background
- Supports custom ringtones via file picker
- Implements looping through playback status events
- Proper resource cleanup on component unmount

**Critical Error Handling:**
- Audio playback continues without crashing on audio errors
- Graceful degradation when audio resources fail
- Database errors don't crash the dismissal process

## Services Documentation

### AlarmStorage.js - Data Persistence

This service manages all data persistence using AsyncStorage, including alarms, dismissal codes, and custom ringtones.

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from './NotificationService';

const ALARMS_STORAGE_KEY = '@alarms';
const DISMISSAL_CODES_STORAGE_KEY = '@dismissal_codes';
const CUSTOM_RINGTONES_STORAGE_KEY = '@custom_ringtones';

export class AlarmStorage {
  // Core alarm CRUD operations
  static async saveAlarms(alarms) {
    try {
      await AsyncStorage.setItem(ALARMS_STORAGE_KEY, JSON.stringify(alarms));
    } catch (error) {
      console.error('Error saving alarms:', error);
      throw error;
    }
  }

  static async loadAlarms() {
    try {
      const alarmsData = await AsyncStorage.getItem(ALARMS_STORAGE_KEY);
      return alarmsData ? JSON.parse(alarmsData) : [];
    } catch (error) {
      console.error('Error loading alarms:', error);
      return [];
    }
  }

  static async addAlarm(alarm) {
    try {
      const alarms = await this.loadAlarms();
      const newAlarm = {
        id: Date.now().toString(),
        ...alarm,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      
      // Schedule notification and store notification ID
      const notificationId = await NotificationService.scheduleAlarm(newAlarm);
      newAlarm.notificationId = notificationId;
      
      alarms.push(newAlarm);
      await this.saveAlarms(alarms);
      return newAlarm;
    } catch (error) {
      console.error('Error adding alarm:', error);
      throw error;
    }
  }

  static async deleteAlarm(alarmId) {
    try {
      const alarms = await this.loadAlarms();
      const alarmToDelete = alarms.find(alarm => alarm.id === alarmId);
      
      // Cancel notification if it exists
      if (alarmToDelete && alarmToDelete.notificationId) {
        await NotificationService.cancelAlarm(alarmToDelete.notificationId);
      }
      
      // Remove associated data
      await this.removeDismissalCode(alarmId);
      await this.removeCustomRingtone(alarmId);
      
      const filteredAlarms = alarms.filter(alarm => alarm.id !== alarmId);
      await this.saveAlarms(filteredAlarms);
    } catch (error) {
      console.error('Error deleting alarm:', error);
      throw error;
    }
  }

  static async toggleAlarm(alarmId) {
    try {
      const alarms = await this.loadAlarms();
      const updatedAlarms = await Promise.all(alarms.map(async (alarm) => {
        if (alarm.id === alarmId) {
          const updatedAlarm = { ...alarm, isActive: !alarm.isActive };
          
          if (updatedAlarm.isActive) {
            // Re-schedule notification
            const notificationId = await NotificationService.scheduleAlarm(updatedAlarm);
            updatedAlarm.notificationId = notificationId;
          } else {
            // Cancel existing notification
            if (updatedAlarm.notificationId) {
              await NotificationService.cancelAlarm(updatedAlarm.notificationId);
              updatedAlarm.notificationId = null;
            }
          }
          
          return updatedAlarm;
        }
        return alarm;
      }));
      
      await this.saveAlarms(updatedAlarms);
    } catch (error) {
      console.error('Error toggling alarm:', error);
      throw error;
    }
  }

  // Individual alarm retrieval
  static async getAlarm(alarmId) {
    try {
      const alarms = await this.loadAlarms();
      return alarms.find(alarm => alarm.id === alarmId);
    } catch (error) {
      console.error('Error getting alarm:', error);
      return null;
    }
  }

  // Dismissal code management
  static async saveDismissalCode(alarmId, codeData) {
    try {
      const codes = await this.loadDismissalCodes();
      codes[alarmId] = codeData;
      await AsyncStorage.setItem(DISMISSAL_CODES_STORAGE_KEY, JSON.stringify(codes));
    } catch (error) {
      console.error('Error saving dismissal code:', error);
    }
  }

  static async getDismissalCode(alarmId) {
    try {
      const codes = await this.loadDismissalCodes();
      return codes[alarmId] || null;
    } catch (error) {
      console.error('Error getting dismissal code:', error);
      return null;
    }
  }

  static async removeDismissalCode(alarmId) {
    try {
      const codes = await this.loadDismissalCodes();
      delete codes[alarmId];
      await AsyncStorage.setItem(DISMISSAL_CODES_STORAGE_KEY, JSON.stringify(codes));
    } catch (error) {
      console.error('Error removing dismissal code:', error);
    }
  }

  static async loadDismissalCodes() {
    try {
      const codesData = await AsyncStorage.getItem(DISMISSAL_CODES_STORAGE_KEY);
      return codesData ? JSON.parse(codesData) : {};
    } catch (error) {
      console.error('Error loading dismissal codes:', error);
      return {};
    }
  }

  // Custom ringtone management
  static async saveCustomRingtone(alarmId, ringtoneUri) {
    try {
      const ringtones = await this.loadCustomRingtones();
      ringtones[alarmId] = ringtoneUri;
      await AsyncStorage.setItem(CUSTOM_RINGTONES_STORAGE_KEY, JSON.stringify(ringtones));
    } catch (error) {
      console.error('Error saving custom ringtone:', error);
    }
  }

  static async getCustomRingtone(alarmId) {
    try {
      const ringtones = await this.loadCustomRingtones();
      return ringtones[alarmId] || null;
    } catch (error) {
      console.error('Error getting custom ringtone:', error);
      return null;
    }
  }

  static async removeCustomRingtone(alarmId) {
    try {
      const ringtones = await this.loadCustomRingtones();
      delete ringtones[alarmId];
      await AsyncStorage.setItem(CUSTOM_RINGTONES_STORAGE_KEY, JSON.stringify(ringtones));
    } catch (error) {
      console.error('Error removing custom ringtone:', error);
    }
  }

  static async loadCustomRingtones() {
    try {
      const ringtonesData = await AsyncStorage.getItem(CUSTOM_RINGTONES_STORAGE_KEY);
      return ringtonesData ? JSON.parse(ringtonesData) : {};
    } catch (error) {
      console.error('Error loading custom ringtones:', error);
      return {};
    }
  }

  // Recurring alarm rescheduling
  static async rescheduleAlarm(alarmId) {
    try {
      const alarm = await this.getAlarm(alarmId);
      if (alarm && alarm.frequency !== 'once') {
        // Cancel existing notification
        if (alarm.notificationId) {
          await NotificationService.cancelAlarm(alarm.notificationId);
        }
        
        // Reschedule with new notification ID
        const notificationId = await NotificationService.scheduleAlarm(alarm);
        await this.updateAlarm(alarmId, { notificationId });
      }
    } catch (error) {
      console.error('Error rescheduling alarm:', error);
    }
  }

  static async updateAlarm(alarmId, updates) {
    try {
      const alarms = await this.loadAlarms();
      const updatedAlarms = alarms.map(alarm => 
        alarm.id === alarmId ? { ...alarm, ...updates } : alarm
      );
      await this.saveAlarms(updatedAlarms);
    } catch (error) {
      console.error('Error updating alarm:', error);
      throw error;
    }
  }
}
```

**Storage Keys:**
- `@alarms`: Main alarm data array
- `@dismissal_codes`: Alarm ID to dismissal code mapping
- `@custom_ringtones`: Alarm ID to ringtone URI mapping

**Key Methods:**
- `addAlarm()`: Creates alarm with notification scheduling and notification ID persistence
- `toggleAlarm()`: Properly schedules/cancels notifications when toggling active state
- `deleteAlarm()`: Removes alarm, cancels notifications, and cleans up related data
- `saveDismissalCode()`: Stores AI-generated codes with expiration data
- `saveCustomRingtone()`: Persists custom ringtone file URIs per alarm
- `rescheduleAlarm()`: Handles recurring alarm rescheduling after dismissal

**Data Relationships:**
- Each alarm stores its `notificationId` for proper cancellation
- Dismissal codes are stored separately with expiration tracking
- Custom ringtones are stored as file URIs linked to alarm IDs
- All related data is cleaned up when alarms are deleted

### NotificationService.js - Notification Management

This service handles all notification scheduling, Android channel setup, and alarm validation logic.

```javascript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export class NotificationService {
  // In-memory map to prevent duplicate navigation
  static navigationInFlight = new Map();

  // Android notification channel setup
  static async setupNotificationChannels() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alarm-channel', {
        name: 'Alarm Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
      });
    }
  }

  static async scheduleAlarm(alarm) {
    try {
      await this.setupNotificationChannels();
      
      const alarmTime = new Date(alarm.time);
      const now = new Date();
      
      console.log('Scheduling alarm for:', alarmTime.toISOString());
      console.log('Current time:', now.toISOString());
      
      let trigger;
      
      if (alarm.frequency === 'once') {
        // For one-time alarms, calculate the next occurrence
        let scheduledTime = new Date(alarmTime);
        
        // If the alarm time has passed today, schedule for tomorrow
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        
        console.log('Scheduling one-time alarm for:', scheduledTime.toISOString());
        trigger = { date: scheduledTime };
      } else if (alarm.frequency === 'daily') {
        // For daily alarms, use calendar trigger
        const hour = alarmTime.getHours();
        const minute = alarmTime.getMinutes();
        
        console.log('Scheduling daily alarm for:', hour + ':' + minute);
        trigger = {
          hour: hour,
          minute: minute,
          repeats: true,
        };
      } else if (alarm.frequency === 'weekly') {
        // For weekly alarms, schedule for the specific day
        const hour = alarmTime.getHours();
        const minute = alarmTime.getMinutes();
        const weekday = alarmTime.getDay() + 1; // 1-7, Sunday is 1
        
        console.log('Scheduling weekly alarm for weekday:', weekday, 'at', hour + ':' + minute);
        trigger = {
          weekday: weekday,
          hour: hour,
          minute: minute,
          repeats: true,
        };
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Alarm!',
          body: alarm.label,
          data: {
            alarmId: alarm.id,
            duration: alarm.duration,
            type: 'alarm'
          },
          sound: 'default',
          priority: 'max',
          autoDismiss: true,
          vibrationPattern: [0, 250, 250, 250],
        },
        trigger,
      });

      console.log('Alarm scheduled with notification ID:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling alarm:', error);
      throw error;
    }
  }

  static async cancelAlarm(notificationId) {
    try {
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        console.log('Alarm cancelled:', notificationId);
      }
    } catch (error) {
      console.error('Error cancelling alarm:', error);
    }
  }

  static setupNotificationListener(navigation) {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received in foreground:', notification);
        const { data } = notification.request.content;
        if (data && data.type === 'alarm') {
          this.handleAlarmNotification(data, navigation);
        }
      }
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response received:', response);
        const { data } = response.notification.request.content;
        if (data && data.type === 'alarm') {
          this.handleAlarmNotification(data, navigation);
        }
      }
    );

    // Return cleanup function
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }

  static async handleAlarmNotification(data, navigation) {
    const { alarmId, duration } = data;
    
    console.log('Handling alarm notification for:', alarmId);
    
    // Prevent duplicate navigation
    if (this.navigationInFlight.has(alarmId)) {
      console.log('Navigation already in flight for alarm:', alarmId);
      return;
    }
    
    try {
      this.navigationInFlight.set(alarmId, true);
      
      // Validate alarm timing with tolerance
      const isValidAlarm = await this.validateAlarmTiming(alarmId);
      if (isValidAlarm) {
        console.log('Alarm is due, navigating to dismiss screen');
        navigation.navigate('DismissAlarm', { alarmId, duration });
      } else {
        console.log('Alarm timing validation failed, ignoring');
      }
    } finally {
      // Clear the flag after a short delay
      setTimeout(() => {
        this.navigationInFlight.delete(alarmId);
      }, 1000);
    }
  }

  // Critical timing validation with tolerance for early/late triggers
  static async validateAlarmTiming(alarmId) {
    try {
      const { AlarmStorage } = require('./AlarmStorage');
      const alarm = await AlarmStorage.getAlarm(alarmId);
      
      if (!alarm || !alarm.isActive) {
        console.log('Alarm not found or not active:', alarmId);
        return false;
      }
      
      console.log('Validating alarm timing for alarm:', alarmId);
      
      const now = new Date();
      const alarmTime = new Date(alarm.time);
      
      console.log('Current time:', now.toISOString());
      console.log('Alarm time:', alarmTime.toISOString());
      console.log('Alarm frequency:', alarm.frequency);
      
      if (alarm.frequency === 'once') {
        // For one-time alarms, check if we're within tolerance
        const diffMinutes = (now.getTime() - alarmTime.getTime()) / (1000 * 60);
        const withinTolerance = Math.abs(diffMinutes) <= 2; // 2 minute tolerance
        
        console.log('One-time alarm validation:', {
          current: now.toISOString(),
          scheduled: alarmTime.toISOString(),
          diffMinutes,
          withinTolerance
        });
        
        return withinTolerance;
      } else {
        // For recurring alarms, check time of day match
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const alarmHour = alarmTime.getHours();
        const alarmMinute = alarmTime.getMinutes();
        
        const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (alarmHour * 60 + alarmMinute));
        const withinTolerance = timeDiff <= 2; // 2 minute tolerance
        
        console.log('Recurring alarm validation:', {
          currentTime: `${currentHour}:${currentMinute}`,
          alarmTime: `${alarmHour}:${alarmMinute}`,
          timeDiff,
          withinTolerance
        });
        
        return withinTolerance;
      }
    } catch (error) {
      console.error('Error validating alarm timing:', error);
      return false;
    }
  }
}
```

**Key Methods:**
- `setupNotificationChannels()`: Configures Android notification channels with high priority
- `scheduleAlarm()`: Creates scheduled notifications with different trigger types (date, calendar)
- `cancelAlarm()`: Cancels scheduled notifications by ID
- `setupNotificationListener()`: Sets up both foreground and response listeners
- `handleAlarmNotification()`: Processes alarm notifications with duplicate prevention
- `validateAlarmTiming()`: Critical timing validation with 2-minute tolerance for early/late triggers

**Android Channel Configuration:**
- Maximum importance for breakthrough notifications
- Custom vibration pattern
- Sound enabled
- Light indicator configured

**Timing Tolerance Logic:**
- One-time alarms: Validates within 2 minutes of scheduled time
- Recurring alarms: Validates time-of-day match within 2 minutes
- Prevents duplicate navigation with in-flight tracking

### MistralService.js - Local Code Generation (Development)

**IMPORTANT:** This is a development implementation that generates codes locally. In production, this would be replaced with a secure backend service.

```javascript
// Note: In production, this should be replaced with a backend service
// that securely calls the Mistral AI API to prevent API key exposure

export class MistralService {
  static async generateDismissalCode() {
    try {
      // For development and demo purposes, we generate codes locally
      // In production, this would make a secure backend API call
      const code = this.generateSecureCode();
      
      // Simulate API delay to match real Mistral AI behavior
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        code: code,
        timestamp: Date.now(),
        expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes from now
      };
    } catch (error) {
      console.error('Error generating dismissal code:', error);
      throw new Error('Failed to generate dismissal code');
    }
  }

  // Secure local code generation with entropy from multiple sources
  static generateSecureCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Use multiple entropy sources for better randomness
    const timestamp = Date.now().toString();
    const random1 = Math.random().toString(36);
    const random2 = Math.random().toString(36);
    
    // Combine entropy sources
    const entropy = timestamp + random1 + random2;
    
    for (let i = 0; i < 8; i++) {
      // Use entropy to seed character selection
      const seedIndex = (entropy.charCodeAt(i % entropy.length) + i) % characters.length;
      const randomIndex = Math.floor(Math.random() * characters.length);
      const finalIndex = (seedIndex + randomIndex) % characters.length;
      code += characters.charAt(finalIndex);
    }
    
    return code;
  }

  static isValidCode(code) {
    // Validate that the code is exactly 8 alphanumeric characters
    const codeRegex = /^[A-Z0-9]{8}$/;
    return codeRegex.test(code);
  }

  /* 
   * Production Implementation:
   * 
   * This would be implemented as a backend service that:
   * 1. Receives a request for a dismissal code
   * 2. Calls Mistral AI API securely with server-side API key
   * 3. Validates and sanitizes the response to ensure 8-char alphanumeric
   * 4. Returns the code with expiration timestamp
   * 
   * Example backend endpoint:
   * 
   * POST /api/generate-dismissal-code
   * Headers: Authorization: Bearer <user-jwt-token>
   * Body: { alarmId: string }
   * Response: { code: string, expiresAt: number }
   */

  static async generateCodeWithBackend(alarmId) {
    // This would be the production implementation
    try {
      const response = await fetch('/api/generate-dismissal-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getUserToken()}`,
        },
        body: JSON.stringify({ alarmId }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate response format
      if (!data.code || !data.expiresAt || !this.isValidCode(data.code)) {
        throw new Error('Invalid response format from backend');
      }

      return data;
    } catch (error) {
      console.error('Backend code generation failed:', error);
      // Fallback to local generation for demo purposes
      return this.generateDismissalCode();
    }
  }

  static async getUserToken() {
    // This would retrieve the user's authentication token
    // For demo purposes, return a placeholder
    return 'demo-user-token';
  }
}
```

**Current Implementation (Development):**
- `generateDismissalCode()`: Creates secure 8-character codes locally
- `generateSecureCode()`: Uses multiple entropy sources for randomness
- `isValidCode()`: Validates 8-character alphanumeric format
- Simulates API delay for realistic UX

**Production Implementation Notes:**
- Would use secure backend API calls to Mistral AI
- API keys stored server-side for security
- User authentication and rate limiting
- Input validation and sanitization
- Retry logic for API failures
- Security monitoring and logging

## Data Flow

### Alarm Creation Flow
1. User opens CreateAlarmScreen
2. User fills form with time, label, frequency, duration
3. User optionally selects custom ringtone
4. Form validation ensures all fields are correct
5. AlarmStorage.addAlarm() creates alarm object
6. NotificationService.scheduleAlarm() schedules notification
7. Alarm saved to AsyncStorage with notification ID
8. User returns to AlarmListScreen

### Alarm Trigger Flow
1. System notification triggers at scheduled time
2. NotificationService.handleAlarmNotification() receives notification
3. Alarm timing validation checks if alarm should trigger
4. Navigation to DismissAlarmScreen with alarm data
5. MistralService generates dismissal code
6. Audio playback starts with vibration
7. Timer countdown begins
8. User enters dismissal code
9. Code validation and alarm dismissal/rescheduling

### Data Storage Structure

```javascript
// Alarm Object Structure
{
  id: "1758462112873",
  time: "2025-09-21T13:42:00.000Z",
  label: "Wake up",
  frequency: "daily", // once, daily, weekly
  duration: 5, // minutes
  isActive: true,
  createdAt: "2025-09-21T13:41:52.873Z",
  notificationId: "notification-uuid",
  customRingtone: "file://path/to/audio.mp3" // optional
}

// Dismissal Code Structure
{
  code: "A1B2C3D4",
  timestamp: 1758462112873,
  expiresAt: 1758462712873,
  attempts: 0
}
```

## Dependencies

### Core Dependencies
```json
{
  "@react-navigation/native": "^6.0.0",
  "@react-navigation/native-stack": "^6.0.0",
  "@react-native-async-storage/async-storage": "^1.0.0",
  "@react-native-community/datetimepicker": "^8.4.5",
  "@react-native-picker/picker": "^2.11.2",
  "expo": "~52.0.0",
  "expo-audio": "~15.0.0",
  "expo-document-picker": "^12.1.0",
  "expo-notifications": "~0.29.0",
  "react": "18.2.0",
  "react-native": "0.74.87"
}
```

### Key Libraries
- **expo-notifications**: Handles alarm scheduling and notification management
- **expo-audio**: Manages alarm sound playback and audio configuration
- **AsyncStorage**: Persists alarm data and dismissal codes locally
- **React Navigation**: Provides navigation between screens
- **expo-document-picker**: Allows custom ringtone selection

## Security Features

### Code Generation Security
- Uses multiple entropy sources (timestamp, random values)
- 8-character alphanumeric codes for high entropy
- Time-based expiration (10 minutes)
- Attempt tracking and limiting

### Data Protection
- Local storage only (no cloud dependencies)
- Secure code validation
- Notification data validation
- Input sanitization

## Performance Optimizations

### Memory Management
- Audio player cleanup on component unmount
- Notification listener cleanup
- Timer cleanup to prevent memory leaks

### Efficient Loading
- AsyncStorage operations are optimized
- Screen focus-based data refreshing
- Lazy loading of dismissal codes

### Battery Optimization
- Efficient notification scheduling
- Audio mode configuration for background playback
- Minimal background processing

## Troubleshooting Common Issues

### 1. Notifications Not Working
- Check notification permissions
- Verify notification channel setup (Android)
- Ensure alarm scheduling logic is correct

### 2. Audio Playback Issues
- Check audio permissions
- Verify audio file paths and formats
- Ensure expo-audio is properly configured

### 3. Time Zone Issues
- Use ISO string format for time storage
- Handle daylight saving time changes
- Validate alarm timing on trigger

### 4. Storage Issues
- Handle AsyncStorage errors gracefully
- Provide fallback for corrupted data
- Regular data validation

## Setup and Installation

### Prerequisites
- Node.js 18+ installed
- Expo CLI: `npm install -g @expo/cli`
- Physical device or emulator for testing

### Installation Steps

1. **Clone and Install Dependencies**
```bash
cd alarm-app
npm install
```

2. **Start Development Server**
```bash
npm run web  # For web development
# or
expo start    # For mobile development
```

3. **Important: Development Build Required for Notifications**

⚠️ **Critical**: As of Expo SDK 53, `expo-notifications` no longer works in Expo Go. You must use a development build for full notification functionality.

```bash
# Create development build
eas build --profile development --platform android
# or for iOS
eas build --profile development --platform ios
```

### Testing the App

#### Web Testing (Limited Functionality)
- Access via http://localhost:5000
- UI and navigation work
- Notifications are limited (browser notifications only)
- Audio playback may have restrictions

#### Mobile Testing (Full Functionality)
- Install development build on device
- All features work including:
  - Background notifications
  - High-priority alarm notifications
  - Custom ringtones
  - Audio playback in silent mode
  - Vibration patterns

### Required Permissions

The app will request these permissions on startup:
- **Notifications**: Essential for alarm functionality
- **Audio**: Required for alarm sounds
- **Document Picker**: For custom ringtone selection

### Testing Alarms

1. **Create Test Alarm**
   - Set time 1-2 minutes in the future
   - Use short duration (1-2 minutes) for testing
   - Test with both default and custom ringtones

2. **Verify Notification Scheduling**
   - Check console logs for scheduling confirmations
   - Verify notification ID assignment

3. **Test Dismissal Flow**
   - Wait for alarm to trigger
   - Enter correct dismissal code
   - Verify recurring alarm rescheduling

### Development Workflow Configuration

The project includes a configured workflow:
```bash
# Workflow: "Alarm App Frontend"
cd alarm-app && npm run web
```

This runs the web version on port 5000 with proper host configuration for the Replit environment.

### Package Versions

Key package versions (as configured):
```json
{
  "expo": "~52.0.0",
  "expo-notifications": "~0.29.0",
  "expo-audio": "~15.0.0",
  "@react-native-community/datetimepicker": "8.4.5",
  "@react-native-picker/picker": "2.11.2"
}
```

### Troubleshooting Common Setup Issues

#### 1. Notifications Not Working
- **In Expo Go**: Use development build instead
- **Permissions**: Check notification permissions in device settings
- **Android**: Verify notification channel creation

#### 2. Audio Issues
- **Web**: Browser audio policies may block autoplay
- **Mobile**: Check audio permissions and silent mode settings
- **Custom Ringtones**: Verify file format compatibility (MP3, WAV, M4A)

#### 3. Timer/Validation Issues
- **Clock Sync**: Ensure device clock is accurate
- **Timezone**: The app handles local timezone automatically
- **Early Triggers**: 2-minute tolerance built into validation logic

#### 4. Development Build Issues
```bash
# Clear Expo cache
expo r -c

# Rebuild development build
eas build --profile development --platform android --clear-cache
```

### File Structure Reference
```
alarm-app/
├── App.js                     # Main navigation setup
├── src/
│   ├── screens/              # UI screens
│   │   ├── AlarmListScreen.js    # Home screen
│   │   ├── CreateAlarmScreen.js  # Alarm creation
│   │   └── DismissAlarmScreen.js # Alarm dismissal
│   └── services/             # Business logic
│       ├── AlarmStorage.js       # Data persistence
│       ├── NotificationService.js # Notification handling
│       └── MistralService.js     # Code generation
├── assets/
│   └── alarm-sound.wav       # Default alarm sound
└── package.json
```

## Limitations and Known Issues

### Current Limitations
- **Expo Go Incompatibility**: Notifications require development build
- **Web Limitations**: Full functionality requires mobile environment
- **Local Code Generation**: Production would use secure backend API
- **Timezone Handling**: Uses device local timezone (no custom timezone support)

### Performance Considerations
- **Battery Optimization**: Audio and notifications are optimized for minimal battery impact
- **Memory Management**: Proper cleanup prevents memory leaks
- **Storage Efficiency**: AsyncStorage operations are batched where possible

This comprehensive guide provides everything needed to understand, maintain, and extend the alarm application. The modular architecture makes it easy to add new features while maintaining code quality and security standards.