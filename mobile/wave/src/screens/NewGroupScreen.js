import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Avatar from '../components/Avatar';

export default function NewGroupScreen({ navigation }) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getFriends(token);
        setFriends(data.friends || data || []);
      } catch (err) {
        console.log('fetchFriends error:', err.message);
      }
      setLoading(false);
    })();
  }, [token]);

  const toggleFriend = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }
    setCreating(true);
    try {
      const memberIds = Array.from(selected);
      const data = await api.createGroup({ name: name.trim(), description: description.trim(), members: memberIds }, token);
      const group = data.group || data;
      navigation.replace('GroupChat', { groupId: group._id || group.id, groupName: group.name });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
    setCreating(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Group name"
          placeholderTextColor="#8696a0"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Description (optional)"
          placeholderTextColor="#8696a0"
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <Text style={styles.sectionTitle}>Select friends</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#00a884" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item._id || item.id || String(Math.random())}
          renderItem={({ item }) => {
            const id = item._id || item.id;
            const isSelected = selected.has(id);
            const friendName = item.name || item.friendName || item.email;
            return (
              <TouchableOpacity style={styles.friendRow} onPress={() => toggleFriend(id)} activeOpacity={0.7}>
                <Avatar name={friendName} size={40} />
                <Text style={styles.friendName}>{friendName}</Text>
                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No friends yet. Add friends first.</Text>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.createBtn, (creating || !name.trim()) && styles.createBtnDisabled]}
        onPress={handleCreate}
        disabled={creating || !name.trim()}
        activeOpacity={0.8}
      >
        {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Create Group</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111b21' },
  form: { padding: 16 },
  input: {
    backgroundColor: '#202c33',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: '#e9edef',
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#313d45',
  },
  sectionTitle: { color: '#00a884', fontSize: 14, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  friendName: { flex: 1, color: '#e9edef', fontSize: 15, marginLeft: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8696a0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: '#00a884', borderColor: '#00a884' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  empty: { color: '#8696a0', textAlign: 'center', marginTop: 30, fontSize: 14 },
  createBtn: {
    backgroundColor: '#00a884',
    margin: 16,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
