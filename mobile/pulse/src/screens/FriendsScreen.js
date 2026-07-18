import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function FriendsScreen({ navigation }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const data = await api.getFriends();
      setFriends(data.friends || data || []);
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const startChat = (friend) => {
    navigation.navigate('Chat', { userId: friend._id || friend.id, name: friend.username });
  };

  const renderFriend = ({ item }) => (
    <TouchableOpacity style={styles.friendItem} onPress={() => startChat(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.username?.[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{item.username}</Text>
        <Text style={styles.friendStatus}>{item.status || 'Online'}</Text>
      </View>
      <Ionicons name="chatbubble-outline" size={20} color="#0084ff" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0084ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={friends}
        keyExtractor={(item) => item._id || item.id || String(Math.random())}
        renderItem={renderFriend}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No friends yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a4a',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a2a4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  friendInfo: { flex: 1, marginLeft: 12 },
  friendName: { color: '#fff', fontSize: 16, fontWeight: '500' },
  friendStatus: { color: '#8899a6', fontSize: 13, marginTop: 2 },
  emptyText: { color: '#8899a6', fontSize: 15 },
});
