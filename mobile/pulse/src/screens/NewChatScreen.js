import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import Avatar from '../components/Avatar';

export default function NewChatScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchUsers(query.trim());
        const list = Array.isArray(data) ? data : data.users || [];
        setResults(list);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  async function startConversation(userItem) {
    setCreating(userItem.id || userItem._id);
    try {
      const data = await api.createConversation(userItem.id || userItem._id);
      const convId = data.id || data._id || data.conversationId || data.conversation?.id;
      navigation.replace('Chat', {
        conversationId: convId,
        name: userItem.name,
      });
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#8899a6" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for users..."
            placeholderTextColor="#555"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#8899a6" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0084ff" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id || item._id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.userItem}
              onPress={() => startConversation(item)}
              disabled={creating === (item.id || item._id)}
              activeOpacity={0.7}
            >
              <Avatar name={item.name} size={44} online={item.online} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                {item.email && <Text style={styles.userEmail}>{item.email}</Text>}
              </View>
              {creating === (item.id || item._id) ? (
                <ActivityIndicator size="small" color="#0084ff" />
              ) : (
                <Ionicons name="chatbubble-outline" size={20} color="#0084ff" />
              )}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            query.trim().length > 0 && !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="person-search-outline" size={50} color="#333" />
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={50} color="#333" />
                <Text style={styles.emptyText}>Search for someone to start chatting</Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: '#8899a6',
    fontSize: 13,
    marginTop: 2,
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
    fontSize: 15,
    marginTop: 12,
  },
});
