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

function timeAgo(date) {
  if (!date) return '';
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString();
}

function getNotificationText(type) {
  switch (type) {
    case 'like': return 'liked your post';
    case 'comment': return 'commented on your post';
    case 'friend_request': return 'sent you a friend request';
    case 'friend_accept': return 'accepted your friend request';
    case 'message': return 'sent you a message';
    case 'mention': return 'mentioned you in a comment';
    default: return 'interacted with you';
  }
}

function getIcon(type) {
  switch (type) {
    case 'like': return '👍';
    case 'comment': return '💬';
    case 'friend_request': return '👤';
    case 'friend_accept': return '✅';
    case 'message': return '✉️';
    case 'mention': return '@';
    default: return '🔔';
  }
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await api.notifications.getNotifications(pageNum);
      const items = res.notifications || res || [];
      if (append) {
        setNotifications((prev) => [...prev, ...items]);
      } else {
        setNotifications(items);
      }
      setHasMore(items.length >= 20);
      setPage(pageNum);
    } catch (err) {
      // silent
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchNotifications(1);
      setLoading(false);
    })();
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications(1);
    setRefreshing(false);
  }, [fetchNotifications]);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    await fetchNotifications(page + 1, true);
  }, [hasMore, page, fetchNotifications]);

  const handlePress = useCallback(async (notif) => {
    try {
      if (!notif.read && !notif.isRead) {
        await api.notifications.markRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true, isRead: true } : n))
        );
      }
    } catch (err) {
      // silent
    }

    if (notif.type === 'friend_request' || notif.type === 'friend_accept') {
      navigation.navigate('Friends');
    } else if (notif.type === 'message') {
      if (notif.from?.user?._id || notif.senderId || notif.userId) {
        navigation.navigate('Messages', {
          screen: 'Chat',
          params: {
            userId: notif.from?.user?._id || notif.senderId || notif.userId,
            userName: notif.from?.user?.firstName
              ? `${notif.from.user.firstName} ${notif.from.user.lastName || ''}`
              : 'User',
          },
        });
      }
    } else if (notif.postId || notif.type === 'like' || notif.type === 'comment') {
      // could navigate to post detail if available
    }
  }, [navigation]);

  const renderNotification = ({ item }) => {
    const fromUser = item.from?.user || item.user || item.sender || {};
    const name = fromUser.firstName
      ? `${fromUser.firstName} ${fromUser.lastName || ''}`
      : fromUser.username || 'Someone';
    const isRead = item.read || item.isRead;
    const type = item.type || 'like';
    const icon = getIcon(type);
    const text = item.text || getNotificationText(type);

    return (
      <TouchableOpacity
        style={[styles.notifItem, !isRead && styles.notifUnread]}
        onPress={() => handlePress(item)}
      >
        <View style={styles.avatarWrap}>
          <Avatar
            name={name}
            uri={fromUser.avatar || fromUser.profilePicture}
            size={48}
          />
          <View style={styles.iconBadge}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifText}>
            <Text style={styles.notifName}>{name}</Text>{' '}
            {text}
          </Text>
          <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!isRead && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#1877f2" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id || String(Math.random())}
          renderItem={renderNotification}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtext}>You're all caught up!</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1877f2" colors={['#1877f2']} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
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
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  notifUnread: {
    backgroundColor: '#e7f3ff',
  },
  avatarWrap: {
    position: 'relative',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e4e6eb',
  },
  iconText: {
    fontSize: 12,
  },
  notifContent: {
    flex: 1,
    marginLeft: 12,
  },
  notifText: {
    fontSize: 14,
    color: '#1c1e21',
    lineHeight: 20,
  },
  notifName: {
    fontWeight: '600',
  },
  notifTime: {
    fontSize: 12,
    color: '#1877f2',
    marginTop: 2,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1877f2',
    marginLeft: 8,
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
