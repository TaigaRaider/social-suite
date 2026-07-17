import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Avatar from '../components/Avatar';
import api from '../api';
import { useAuth } from '../context/AuthContext';

function timeAgo(date) {
  if (!date) return '';
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString();
}

export default function MessagesScreen({ navigation }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.messages.getConversations();
      setConversations(res.conversations || res || []);
    } catch (err) {
      // silent
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchConversations();
      setLoading(false);
    })();
  }, [fetchConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  const getOtherUser = (conv) => {
    if (conv.user) return conv.user;
    if (conv.participants) {
      return conv.participants.find((p) => (p._id || p.id) !== user?._id) || conv.participants[0];
    }
    return conv;
  };

  const renderConversation = ({ item }) => {
    const otherUser = getOtherUser(item);
    const name = otherUser.firstName
      ? `${otherUser.firstName} ${otherUser.lastName || ''}`
      : otherUser.username || 'Unknown';
    const lastMessage = item.lastMessage || item.lastMessageText || '';
    const unread = item.unreadCount || item.unread || 0;
    const time = item.updatedAt || item.lastMessageTime;

    return (
      <TouchableOpacity
        style={styles.convItem}
        onPress={() =>
          navigation.navigate('Chat', {
            userId: otherUser._id || otherUser.id,
            userName: name,
          })
        }
      >
        <View style={styles.avatarWrap}>
          <Avatar name={name} uri={otherUser.avatar || otherUser.profilePicture} size={52} />
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
        <View style={styles.convInfo}>
          <View style={styles.convTop}>
            <Text style={[styles.convName, unread > 0 && styles.convNameBold]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.convTime, unread > 0 && styles.convTimeBold]}>
              {timeAgo(time)}
            </Text>
          </View>
          <Text
            style={[styles.convPreview, unread > 0 && styles.convPreviewBold]}
            numberOfLines={1}
          >
            {lastMessage || 'Start a conversation'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#1877f2" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id || item.id || String(Math.random())}
          renderItem={renderConversation}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>Send a message to start chatting!</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1877f2" colors={['#1877f2']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  avatarWrap: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#f02849',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  convInfo: {
    flex: 1,
    marginLeft: 12,
  },
  convTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convName: {
    fontSize: 15,
    color: '#1c1e21',
    flex: 1,
  },
  convNameBold: {
    fontWeight: '700',
  },
  convTime: {
    fontSize: 12,
    color: '#65676b',
    marginLeft: 8,
  },
  convTimeBold: {
    color: '#1877f2',
    fontWeight: '600',
  },
  convPreview: {
    fontSize: 13,
    color: '#65676b',
    marginTop: 2,
  },
  convPreviewBold: {
    color: '#1c1e21',
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    padding: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1e21',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#65676b',
    marginTop: 4,
  },
});
