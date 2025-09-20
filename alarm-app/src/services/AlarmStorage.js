import AsyncStorage from '@react-native-async-storage/async-storage';

const ALARMS_STORAGE_KEY = '@alarms';

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
      const updatedAlarms = alarms.map(alarm => 
        alarm.id === alarmId ? { ...alarm, isActive: !alarm.isActive } : alarm
      );
      await this.saveAlarms(updatedAlarms);
    } catch (error) {
      console.error('Error toggling alarm:', error);
      throw error;
    }
  }
}