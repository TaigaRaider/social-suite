import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://localhost:3004';

async function apiRequest(path, options = {}) {
  const token = await AsyncStorage.getItem('wave_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function ContactImporterScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    try {
      const data = await apiRequest('/api/crypto/contacts');
      setContacts(data.contacts || []);
    } catch (err) {
      console.log('loadContacts error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdd = async () => {
    if (!manualName.trim()) return;
    setImporting(true);
    try {
      await apiRequest('/api/crypto/contacts/import', {
        method: 'POST',
        body: JSON.stringify({ contacts: [{ name: manualName, phone: manualPhone || null, email: manualEmail || null }] }),
      });
      setManualName(''); setManualPhone(''); setManualEmail('');
      loadContacts();
    } catch (err) {
      Alert.alert('Error', 'Failed to add contact');
    }
    setImporting(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const data = await apiRequest('/api/crypto/contacts/sync', { method: 'POST' });
      setResult(data);
      loadContacts();
    } catch (err) {
      Alert.alert('Error', 'Failed to sync contacts');
    }
    setSyncing(false);
  };

  const handleDelete = async (contactId) => {
    try {
      await apiRequest(`/api/crypto/contacts/${contactId}`, { method: 'DELETE' });
      setContacts(prev => prev.filter(c => c.id !== contactId));
    } catch (err) {
      Alert.alert('Error', 'Failed to delete contact');
    }
  };

  const renderContact = ({ item }) => (
    <View style={styles.contactItem}>
      <View style={[styles.contactAvatar, item.contactUserId && styles.contactAvatarMatched]}>
        <Text style={styles.contactAvatarText}>
          {item.contactUserId ? '\u2713' : item.name?.[0]?.toUpperCase() || '?'}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactDetail}>
          {item.phone || ''} {item.email || ''}
          {item.contactUserId ? ' \u2022 On Wave' : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
        <Ionicons name="close-circle" size={22} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contacts</Text>
        <View style={{ width: 32 }} />
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderContact}
        ListHeaderComponent={
          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add Contact</Text>
              <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#8696a0" value={manualName} onChangeText={setManualName} />
              <TextInput style={styles.input} placeholder="Phone (optional)" placeholderTextColor="#8696a0" value={manualPhone} onChangeText={setManualPhone} />
              <TextInput style={styles.input} placeholder="Email (optional)" placeholderTextColor="#8696a0" value={manualEmail} onChangeText={setManualEmail} />
              <TouchableOpacity style={[styles.btn, !manualName.trim() && styles.btnDisabled]} onPress={handleManualAdd} disabled={!manualName.trim() || importing}>
                <Text style={styles.btnText}>{importing ? 'Adding...' : 'Add Contact'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.syncBtn} onPress={handleSync} disabled={syncing}>
              <Ionicons name="sync" size={18} color="#fff" />
              <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync Contacts'}</Text>
            </TouchableOpacity>

            {result && (
              <Text style={styles.resultText}>
                Imported {result.imported} contacts, {result.matched || 0} matched.
              </Text>
            )}

            <Text style={styles.sectionTitle}>Your Contacts ({contacts.length})</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#00a884" style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.emptyText}>No contacts yet. Add some above.</Text>
          )
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111b21' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: '#1f2c33' },
  backBtn: { padding: 4 },
  headerTitle: { color: '#e9edef', fontSize: 20, fontWeight: '700' },
  content: { padding: 16 },
  card: { backgroundColor: '#1f2c33', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { color: '#e9edef', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  input: { backgroundColor: '#2a3942', borderRadius: 8, padding: 12, color: '#e9edef', fontSize: 14, marginBottom: 8 },
  btn: { backgroundColor: '#00a884', borderRadius: 8, padding: 12, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#555' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0ea5e9', borderRadius: 8, padding: 12, marginBottom: 12 },
  syncBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  resultText: { color: '#10b981', fontSize: 13, marginBottom: 12 },
  sectionTitle: { color: '#e9edef', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#222d34' },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2a3942', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  contactAvatarMatched: { backgroundColor: '#10b981' },
  contactAvatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  contactInfo: { flex: 1 },
  contactName: { color: '#e9edef', fontSize: 14, fontWeight: '500' },
  contactDetail: { color: '#8696a0', fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 4 },
  emptyText: { color: '#8696a0', textAlign: 'center', marginTop: 40, fontSize: 14 },
});
