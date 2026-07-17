import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import GroupListItem from '../components/GroupListItem';

export default function GroupsScreen({ navigation }) {
  const { token } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      const data = await api.getGroups(token);
      setGroups(data.groups || data || []);
    } catch (err) {
      console.log('fetchGroups error:', err.message);
    }
  }, [token]);

  useEffect(() => {
    fetchGroups().finally(() => setLoading(false));
  }, [fetchGroups]);

  useEffect(() => {
    const interval = setInterval(fetchGroups, 5000);
    return () => clearInterval(interval);
  }, [fetchGroups]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  }, [fetchGroups]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00a884" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wave</Text>
      </View>
      <FlatList
        data={groups}
        keyExtractor={(item) => item._id || item.id || String(Math.random())}
        renderItem={({ item }) => (
          <GroupListItem
            group={item}
            onPress={() => navigation.navigate('GroupChat', { groupId: item._id || item.id, groupName: item.name })}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00a884" colors={['#00a884']} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No groups yet</Text>
            <Text style={styles.emptySubtext}>Create a group to start chatting</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewGroup')} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111b21' },
  center: { flex: 1, backgroundColor: '#111b21', alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#1f2c33',
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerTitle: { color: '#e9edef', fontSize: 22, fontWeight: '800' },
  separator: { height: 1, backgroundColor: '#222d34', marginLeft: 80 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#8696a0', fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: '#8696a0', fontSize: 14, marginTop: 6 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#00a884',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 32, fontWeight: '300' },
});
