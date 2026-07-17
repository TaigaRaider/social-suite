import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Avatar from '../components/Avatar';
import api from '../api';

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function getNotifText(notif) {
  const name = notif.actor?.name || notif.actor?.displayName || 'Someone';
  switch (notif.type) {
    case 'LIKE':
      return 'liked your post';
    case 'REPOST':
      return 'reposted your post';
    case 'FOLLOW':
      return 'started following you';
    case 'REPLY':
      return 'replied to your post';
    case 'MENTION':
      return 'mentioned you';
    default:
      return 'interacted with you';
  }
}

export default function ActivityScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      const data = await api.getNotifications(pageNum);
      const items = data.notifications || data.data || data || [];
      if (refresh || pageNum === 1) {
        setNotifications(items);
      } else {
        setNotifications((prev) => [...prev, ...items]);
      }
      setHasMore(items.length === 20);
      setPage(pageNum);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchNotifications(1, true).finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications(1, true);
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (!hasMore) return;
    await fetchNotifications(page + 1);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'LIKE': return '♥';
      case 'REPOST': return '🔄';
      case 'FOLLOW': return '👤';
      case 'REPLY': return '💬';
      case 'MENTION': return '@';
      default: return '•';
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'LIKE': return '#f91880';
      case 'REPOST': return '#00ba7c';
      case 'FOLLOW': return '#1d9bf0';
      default: return '#777';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#777" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.notifRow}
            onPress={() => {
              if (item.postId) {
                navigation.navigate('Thread', { postId: item.postId });
              } else if (item.actor?.username) {
                navigation.navigate('Profile', { username: item.actor.username });
              }
            }}
          >
            <View style={styles.notifIcon}>
              <Text style={[styles.iconText, { color: getColor(item.type) }]}>
                {getIcon(item.type)}
              </Text>
            </View>
            <Avatar name={item.actor?.name || item.actor?.displayName} size={36} />
            <View style={styles.notifContent}>
              <Text style={styles.notifText}>
                <Text style={styles.notifName}>
                  {item.actor?.name || item.actor?.displayName || 'Someone'}
                </Text>
                {' '}{getNotifText(item)}
              </Text>
              {item.post?.content ? (
                <Text style={styles.notifPreview} numberOfLines={1}>
                  {item.post.content}
                </Text>
              ) : null}
              <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#777"
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No activity yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#363636',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#363636',
  },
  notifIcon: {
    width: 24,
    alignItems: 'center',
    paddingTop: 2,
  },
  iconText: {
    fontSize: 14,
    fontWeight: '700',
  },
  notifContent: {
    flex: 1,
    marginLeft: 8,
  },
  notifText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  notifName: {
    fontWeight: '700',
  },
  notifPreview: {
    color: '#555',
    fontSize: 13,
    marginTop: 4,
  },
  notifTime: {
    color: '#555',
    fontSize: 12,
    marginTop: 4,
  },
  empty: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: '#777',
    fontSize: 15,
  },
});
