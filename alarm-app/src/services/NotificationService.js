import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export class NotificationService {
  // In-memory map to prevent duplicate navigation
  static navigationInFlight = new Map();

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
          body: alarm.label || 'Time to wake up!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          data: {
            alarmId: alarm.id,
            type: 'alarm',
            duration: alarm.duration,
          },
        },
        trigger,
      });

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
      }
    } catch (error) {
      console.error('Error cancelling alarm:', error);
      throw error;
    }
  }

  static async cancelAllAlarms() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error cancelling all alarms:', error);
      throw error;
    }
  }

  static async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  static setupNotificationListener(navigation) {
    // Listen for notifications when app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(async notification => {
      console.log('Notification received in foreground:', notification);
      
      const { alarmId, duration } = notification.request.content.data;
      if (alarmId) {
        // Prevent duplicate navigation
        const navigationKey = `${alarmId}-${Date.now()}`;
        if (this.navigationInFlight.has(alarmId)) {
          console.log('Navigation already in flight for alarm:', alarmId);
          return;
        }
        
        // Set navigation in flight with TTL
        this.navigationInFlight.set(alarmId, navigationKey);
        setTimeout(() => {
          this.navigationInFlight.delete(alarmId);
        }, 5000); // 5 second TTL
        
        // Validate that this alarm should actually be triggering now
        const shouldTrigger = await this.validateAlarmTiming(alarmId);
        
        if (shouldTrigger) {
          console.log('Alarm is due, navigating to dismiss screen');
          navigation.navigate('DismissAlarm', { alarmId, duration });
        } else {
          console.log('Alarm received but not due yet, ignoring');
          this.navigationInFlight.delete(alarmId); // Remove if not navigating
        }
      }
    });

    // Listen for notification responses (when user taps notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(async response => {
      const { alarmId, duration } = response.notification.request.content.data;
      if (alarmId) {
        // Prevent duplicate navigation
        if (this.navigationInFlight.has(alarmId)) {
          console.log('Navigation already in flight for alarm:', alarmId);
          return;
        }
        
        // Set navigation in flight with TTL
        this.navigationInFlight.set(alarmId, `${alarmId}-${Date.now()}`);
        setTimeout(() => {
          this.navigationInFlight.delete(alarmId);
        }, 5000); // 5 second TTL
        
        // Validate that this alarm should actually be triggering now
        const shouldTrigger = await this.validateAlarmTiming(alarmId);
        
        if (shouldTrigger) {
          console.log('Alarm is due, navigating to dismiss screen');
          navigation.navigate('DismissAlarm', { alarmId, duration });
        } else {
          console.log('Alarm tapped but not due yet, ignoring');
          this.navigationInFlight.delete(alarmId); // Remove if not navigating
        }
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }

  static async validateAlarmTiming(alarmId) {
    try {
      // Import AlarmStorage dynamically to avoid circular imports
      const { AlarmStorage } = await import('./AlarmStorage');
      const alarm = await AlarmStorage.getAlarm(alarmId);
      
      if (!alarm || !alarm.isActive) {
        console.log('Alarm not found or inactive:', alarmId);
        return false;
      }
      
      const now = new Date();
      const alarmTime = new Date(alarm.time);
      
      console.log('Validating alarm timing for alarm:', alarmId);
      console.log('Current time:', now.toISOString());
      console.log('Alarm time:', alarmTime.toISOString());
      console.log('Alarm frequency:', alarm.frequency);
      
      // Validate based on frequency
      if (alarm.frequency === 'once') {
        // For one-time alarms, trust the OS scheduling since we fixed the scheduling logic
        // The OS wouldn't fire the notification unless it was time
        console.log('One-time alarm triggered, trusting OS scheduling');
        return true;
      } else if (alarm.frequency === 'daily') {
        // For daily alarms, check if hour and minute match (within 90 seconds)
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const alarmMinutes = alarmTime.getHours() * 60 + alarmTime.getMinutes();
        const diff = Math.abs(nowMinutes - alarmMinutes);
        return diff <= 1.5; // 1.5 minutes tolerance
      } else if (alarm.frequency === 'weekly') {
        // For weekly alarms, check weekday, hour, and minute
        const nowDay = now.getDay();
        const alarmDay = alarmTime.getDay();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const alarmMinutes = alarmTime.getHours() * 60 + alarmTime.getMinutes();
        const timeDiff = Math.abs(nowMinutes - alarmMinutes);
        return nowDay === alarmDay && timeDiff <= 1.5;
      }
      
      return false;
    } catch (error) {
      console.error('Error validating alarm timing:', error);
      // In case of error, be conservative and don't allow the alarm
      return false;
    }
  }
}