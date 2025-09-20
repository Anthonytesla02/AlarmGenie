import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AlarmStorage } from '../services/AlarmStorage';
import { NotificationService } from '../services/NotificationService';

export default function AlarmListScreen({ navigation }) {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlarms();
    
    // Set up notification listener
    const unsubscribe = NotificationService.setupNotificationListener(navigation);
    
    // Reload alarms when screen is focused
    const unsubscribeFocus = navigation.addListener('focus', loadAlarms);
    
    return () => {
      unsubscribe && unsubscribe();
      unsubscribeFocus();
    };
  }, [navigation]);

  const loadAlarms = async () => {
    try {
      const loadedAlarms = await AlarmStorage.loadAlarms();
      setAlarms(loadedAlarms);
    } catch (error) {
      Alert.alert('Error', 'Failed to load alarms');
    } finally {
      setLoading(false);
    }
  };

  const toggleAlarm = async (alarmId) => {
    try {
      await AlarmStorage.toggleAlarm(alarmId);
      loadAlarms();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle alarm');
    }
  };

  const deleteAlarm = async (alarmId) => {
    Alert.alert(
      'Delete Alarm',
      'Are you sure you want to delete this alarm?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AlarmStorage.deleteAlarm(alarmId);
              loadAlarms();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete alarm');
            }
          },
        },
      ]
    );
  };

  const formatTime = (timeString) => {
    const time = new Date(timeString);
    return time.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const renderAlarmItem = ({ item }) => (
    <View style={styles.alarmItem}>
      <View style={styles.alarmInfo}>
        <Text style={[styles.timeText, !item.isActive && styles.disabledText]}>
          {formatTime(item.time)}
        </Text>
        <Text style={[styles.labelText, !item.isActive && styles.disabledText]}>
          {item.label || 'Alarm'}
        </Text>
        <Text style={[styles.frequencyText, !item.isActive && styles.disabledText]}>
          {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)}
        </Text>
        <Text style={[styles.durationText, !item.isActive && styles.disabledText]}>
          Duration: {item.duration} minutes
        </Text>
      </View>
      <View style={styles.alarmControls}>
        <Switch
          value={item.isActive}
          onValueChange={() => toggleAlarm(item.id)}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={item.isActive ? '#f5dd4b' : '#f4f3f4'}
        />
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteAlarm(item.id)}
        >
          <Ionicons name="trash" size={24} color="#ff4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading alarms...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {alarms.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alarm-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No alarms yet</Text>
          <Text style={styles.emptySubtext}>Tap the + button to create your first alarm</Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          renderItem={renderAlarmItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
        />
      )}
      
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateAlarm')}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  alarmItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alarmInfo: {
    flex: 1,
  },
  timeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  labelText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  frequencyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  durationText: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  disabledText: {
    opacity: 0.5,
  },
  alarmControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyText: {
    fontSize: 20,
    color: '#999',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
  },
});