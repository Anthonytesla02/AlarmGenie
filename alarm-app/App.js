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

// Configure notifications
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