import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export class NotificationService {
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
      
      // If the alarm time is in the past for today, schedule for tomorrow
      if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1);
      }

      let trigger;
      
      if (alarm.frequency === 'once') {
        trigger = { date: alarmTime };
      } else if (alarm.frequency === 'daily') {
        trigger = {
          hour: alarmTime.getHours(),
          minute: alarmTime.getMinutes(),
          repeats: true,
        };
      } else if (alarm.frequency === 'weekly') {
        trigger = {
          weekday: alarmTime.getDay() + 1, // 1-7, Sunday is 1
          hour: alarmTime.getHours(),
          minute: alarmTime.getMinutes(),
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
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      // Show alert that alarm is going off
      const { alarmId, duration } = notification.request.content.data;
      if (alarmId) {
        // Navigate immediately to dismiss screen
        navigation.navigate('DismissAlarm', { alarmId, duration });
      }
    });

    // Listen for notification responses (when user taps notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { alarmId, duration } = response.notification.request.content.data;
      if (alarmId) {
        // Navigate to dismiss alarm screen
        navigation.navigate('DismissAlarm', { alarmId, duration });
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }
}