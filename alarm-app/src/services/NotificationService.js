import * as Notifications from 'expo-notifications';
import { MistralService } from './MistralService';

export class NotificationService {
  static async scheduleAlarm(alarm) {
    try {
      const alarmTime = new Date(alarm.time);
      const now = new Date();
      
      // If the alarm time is in the past for today, schedule for tomorrow
      if (alarmTime <= now) {
        alarmTime.setDate(alarmTime.getDate() + 1);
      }

      const trigger = {
        date: alarmTime,
        repeats: alarm.frequency !== 'once',
      };

      // If it's a repeating alarm, set the appropriate repeat pattern
      if (alarm.frequency === 'daily') {
        trigger.repeats = true;
      } else if (alarm.frequency === 'weekly') {
        trigger.repeats = true;
        trigger.weekday = alarmTime.getDay() + 1; // 1-7, Sunday is 1
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Alarm!',
          body: alarm.label || 'Time to wake up!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          data: {
            alarmId: alarm.id,
            type: 'alarm',
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
      await Notifications.cancelScheduledNotificationAsync(notificationId);
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
    });

    // Listen for notification responses (when user taps notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { alarmId } = response.notification.request.content.data;
      if (alarmId) {
        // Navigate to dismiss alarm screen
        navigation.navigate('DismissAlarm', { alarmId });
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }
}