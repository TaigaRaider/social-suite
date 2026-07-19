import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.username || 'User'}</Text>
        <Text style={styles.email}>{user?.email || ''}</Text>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={22} color="#fff" />
          <Text style={styles.menuText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={18} color="#8899a6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={22} color="#fff" />
          <Text style={styles.menuText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color="#8899a6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="lock-closed-outline" size={22} color="#fff" />
          <Text style={styles.menuText}>Privacy</Text>
          <Ionicons name="chevron-forward" size={18} color="#8899a6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DeviceManager')}>
          <Ionicons name="phone-portrait-outline" size={22} color="#fff" />
          <Text style={styles.menuText}>Linked Devices</Text>
          <Ionicons name="chevron-forward" size={18} color="#8899a6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={22} color="#fff" />
          <Text style={styles.menuText}>Help</Text>
          <Ionicons name="chevron-forward" size={18} color="#8899a6" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#ff4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { alignItems: 'center', paddingVertical: 32, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2a2a4a' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2a2a4a', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '600' },
  name: { color: '#fff', fontSize: 20, fontWeight: '600' },
  email: { color: '#8899a6', fontSize: 14, marginTop: 4 },
  section: { marginTop: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#2a2a4a' },
  menuText: { flex: 1, color: '#fff', fontSize: 16, marginLeft: 12 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32, padding: 16, marginHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,68,68,0.1)' },
  logoutText: { color: '#ff4444', fontSize: 16, fontWeight: '500', marginLeft: 8 },
});
