import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;
const isMediumScreen = width >= 380 && width < 768;

const API_BASE = 'http://localhost:3003';

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDeviceIcon(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('iphone') || n.includes('ipad') || n.includes('ios')) return '📱';
  if (n.includes('android')) return '📱';
  if (n.includes('windows') || n.includes('linux') || n.includes('mac')) return '💻';
  return '🖥️';
}

export default function DeviceManagerScreen({ navigation }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const res = await fetch(`${API_BASE}/api/crypto/devices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDevices(data.devices || []);
      const current = data.devices?.find(d => d.isCurrent);
      if (current) setCurrentDeviceId(current.deviceId);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId) => {
    Alert.alert('Remove Device', 'This will delete all encryption keys for this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('authToken');
            await fetch(`${API_BASE}/api/crypto/devices/${deviceId}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            setDevices(prev => prev.filter(d => d.deviceId !== deviceId));
          } catch (err) {
            Alert.alert('Error', 'Failed to remove device');
          }
        }
      }
    ]);
  };

  const handleSetActive = async (deviceId) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      await fetch(`${API_BASE}/api/crypto/devices/${deviceId}/activate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentDeviceId(deviceId);
      setDevices(prev => prev.map(d => ({ ...d, isCurrent: d.deviceId === deviceId })));
    } catch (err) {
      Alert.alert('Error', 'Failed to activate device');
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.deviceCard, item.deviceId === currentDeviceId && styles.currentDevice]}>
      <View style={styles.deviceHeader}>
        <Text style={styles.deviceIcon}>{getDeviceIcon(item.deviceName)}</Text>
        <View style={styles.deviceInfo}>
          <View style={styles.deviceNameRow}>
            <Text style={styles.deviceName}>{item.deviceName || 'Unknown Device'}</Text>
            {item.isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
          </View>
          <Text style={styles.deviceId}>
            {item.deviceId?.slice(0, 8)}...{item.deviceId?.slice(-4)}
          </Text>
          <Text style={styles.lastSeen}>Last seen {timeAgo(item.lastSeenAt)}</Text>
        </View>
      </View>
      {!item.isCurrent && (
        <View style={styles.deviceActions}>
          <TouchableOpacity style={styles.setActiveBtn} onPress={() => handleSetActive(item.deviceId)}>
            <Text style={styles.setActiveBtnText}>Set Active</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveDevice(item.deviceId)}>
            <Text style={styles.removeBtnText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Linked Devices</Text>
        </View>
        <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Linked Devices</Text>
      </View>
      <Text style={styles.subtitle}>Manage your encrypted devices. Each device has its own encryption keys.</Text>
      <FlatList
        data={devices}
        renderItem={renderItem}
        keyExtractor={item => item.id?.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔐</Text>
            <Text style={styles.emptyTitle}>No linked devices</Text>
            <Text style={styles.emptySubtitle}>Link your first device to start encrypted messaging</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: isSmallScreen ? 12 : 16, paddingTop: isSmallScreen ? 48 : 56,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e4e6eb'
  },
  backBtn: { fontSize: 16, color: '#8b5cf6', fontWeight: '600' },
  title: { fontSize: isSmallScreen ? 18 : 20, fontWeight: '700', color: '#1c1e21' },
  subtitle: { fontSize: 13, color: '#65676b', padding: isSmallScreen ? 12 : 16, paddingBottom: 8 },
  list: { padding: isSmallScreen ? 12 : 16, gap: 10 },
  deviceCard: {
    backgroundColor: 'white', borderRadius: 12, padding: isSmallScreen ? 12 : 16,
    borderWidth: 1, borderColor: '#e4e6eb'
  },
  currentDevice: { borderColor: '#8b5cf6', backgroundColor: '#e7f3ff' },
  deviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deviceIcon: { fontSize: 28 },
  deviceInfo: { flex: 1 },
  deviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deviceName: { fontWeight: '600', fontSize: isSmallScreen ? 14 : 15, color: '#1c1e21' },
  currentBadge: { backgroundColor: '#8b5cf6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  currentBadgeText: { color: 'white', fontSize: 11, fontWeight: '600' },
  deviceId: { fontSize: 12, color: '#65676b', fontFamily: 'monospace', marginTop: 4 },
  lastSeen: { fontSize: 12, color: '#65676b', marginTop: 2 },
  deviceActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  setActiveBtn: { flex: 1, backgroundColor: '#e4e6eb', borderRadius: 8, padding: 8, alignItems: 'center' },
  setActiveBtnText: { fontSize: 13, fontWeight: '600', color: '#1c1e21' },
  removeBtn: { flex: 1, backgroundColor: '#fee2e2', borderRadius: 8, padding: 8, alignItems: 'center' },
  removeBtnText: { fontSize: 13, fontWeight: '600', color: '#dc2626' },
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 16 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1c1e21', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#65676b', textAlign: 'center' }
});
