import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from './NotificationService';

const ALARMS_STORAGE_KEY = '@alarms';
const DISMISSAL_CODES_STORAGE_KEY = '@dismissal_codes';
const CUSTOM_RINGTONES_STORAGE_KEY = '@custom_ringtones';

export class AlarmStorage {
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
      
      // Schedule the notification
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
      
      // Cancel the notification if it exists
      if (alarmToDelete && alarmToDelete.notificationId) {
        await NotificationService.cancelAlarm(alarmToDelete.notificationId);
      }
      
      // Remove dismissal code for this alarm
      await this.removeDismissalCode(alarmId);
      
      const filteredAlarms = alarms.filter(alarm => alarm.id !== alarmId);
      await this.saveAlarms(filteredAlarms);
    } catch (error) {
      console.error('Error deleting alarm:', error);
      throw error;
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

  static async toggleAlarm(alarmId) {
    try {
      const alarms = await this.loadAlarms();
      const alarmToToggle = alarms.find(alarm => alarm.id === alarmId);
      
      if (alarmToToggle) {
        const newActiveState = !alarmToToggle.isActive;
        
        if (newActiveState) {
          // Turning alarm on - schedule notification
          const notificationId = await NotificationService.scheduleAlarm({
            ...alarmToToggle,
            isActive: true
          });
          alarmToToggle.notificationId = notificationId;
        } else {
          // Turning alarm off - cancel notification
          if (alarmToToggle.notificationId) {
            await NotificationService.cancelAlarm(alarmToToggle.notificationId);
          }
          alarmToToggle.notificationId = null;
        }
        
        alarmToToggle.isActive = newActiveState;
        await this.saveAlarms(alarms);
      }
    } catch (error) {
      console.error('Error toggling alarm:', error);
      throw error;
    }
  }

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
      codes[alarmId] = {
        ...codeData,
        createdAt: Date.now(),
        attempts: 0,
      };
      await AsyncStorage.setItem(DISMISSAL_CODES_STORAGE_KEY, JSON.stringify(codes));
    } catch (error) {
      console.error('Error saving dismissal code:', error);
      throw error;
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

  static async incrementCodeAttempts(alarmId) {
    try {
      const codes = await this.loadDismissalCodes();
      if (codes[alarmId]) {
        codes[alarmId].attempts = (codes[alarmId].attempts || 0) + 1;
        await AsyncStorage.setItem(DISMISSAL_CODES_STORAGE_KEY, JSON.stringify(codes));
        return codes[alarmId].attempts;
      }
      return 0;
    } catch (error) {
      console.error('Error incrementing code attempts:', error);
      return 0;
    }
  }

  // Custom ringtone methods
  static async loadCustomRingtones() {
    try {
      const ringtonesData = await AsyncStorage.getItem(CUSTOM_RINGTONES_STORAGE_KEY);
      return ringtonesData ? JSON.parse(ringtonesData) : {};
    } catch (error) {
      console.error('Error loading custom ringtones:', error);
      return {};
    }
  }

  static async setCustomRingtone(alarmId, ringtoneUri) {
    try {
      const ringtones = await this.loadCustomRingtones();
      ringtones[alarmId] = ringtoneUri;
      await AsyncStorage.setItem(CUSTOM_RINGTONES_STORAGE_KEY, JSON.stringify(ringtones));
    } catch (error) {
      console.error('Error setting custom ringtone:', error);
      throw error;
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
}