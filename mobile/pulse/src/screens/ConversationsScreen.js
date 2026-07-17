import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import ConversationItem from '../components/ConversationItem';

export default function ConversationsScreen({ navigation }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      const list = Array.isArray(data) ? data : data.conversations || [];
      setConversations(list);
      if (!search.trim()) {
        setFiltered(list);
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(conversations);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        conversations.filter(
          (c) =>
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
        )
      );
    }
  }, [search, conversations]);

  function onRefresh() {
    setRefreshing(true);
    fetchConversations();
  }

  function openChat(conversation) {
    navigation.navigate('Chat', {
      conversationId: conversation.id || conversation._id,
      name: conversation.name,
    });
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0084ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#8899a6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#555"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#8899a6" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id || item._id)}
        renderItem={({ item }) => (
          <ConversationItem conversation={item} onPress={() => openChat(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0084ff"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color="#333" />
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>Start a new conversation</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewChat')}
        activeOpacity={0.8}
      >
        <Ionicons name="create-outline" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1a1a2e',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#ffffff',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2a2a4a',
    marginLeft: 72,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: '#8899a6',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#555',
    fontSize: 14,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0084ff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#0084ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
