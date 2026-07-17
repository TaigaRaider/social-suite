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

const TABS = ['Requests', 'All Friends', 'Suggestions'];

export default function FriendsScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Requests');
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [reqRes, friendsRes, sugRes] = await Promise.all([
        api.friends.getFriendRequests().catch(() => ({ requests: [] })),
        api.friends.getFriends().catch(() => ({ friends: [] })),
        api.friends.getSuggestions().catch(() => ({ suggestions: [] })),
      ]);
      setRequests(reqRes.requests || reqRes || []);
      setFriends(friendsRes.friends || friendsRes || []);
      setSuggestions(sugRes.suggestions || sugRes || []);
    } catch (err) {
      // silent
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchAll();
      setLoading(false);
    })();
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const handleAccept = useCallback(async (userId) => {
    setActionLoading(userId + 'accept');
    try {
      await api.friends.acceptFriend(userId);
      setRequests((prev) => prev.filter((r) => {
        const rId = r._id || r.id || r.user?._id || r.user?.id;
        return rId !== userId;
      }));
      await fetchAll();
    } catch (err) {
      // silent
    } finally {
      setActionLoading(null);
    }
  }, [fetchAll]);

  const handleDecline = useCallback(async (userId) => {
    setActionLoading(userId + 'decline');
    try {
      await api.friends.declineFriend(userId);
      setRequests((prev) => prev.filter((r) => {
        const rId = r._id || r.id || r.user?._id || r.user?.id;
        return rId !== userId;
      }));
    } catch (err) {
      // silent
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleAdd = useCallback(async (userId) => {
    setActionLoading(userId + 'add');
    try {
      await api.friends.sendFriendRequest(userId);
      setSuggestions((prev) => prev.filter((s) => {
        const sId = s._id || s.id;
        return sId !== userId;
      }));
    } catch (err) {
      // silent
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleRemove = useCallback(async (userId) => {
    setActionLoading(userId + 'remove');
    try {
      await api.friends.removeFriend(userId);
      setFriends((prev) => prev.filter((f) => {
        const fId = f._id || f.id;
        return fId !== userId;
      }));
    } catch (err) {
      // silent
    } finally {
      setActionLoading(null);
    }
  }, []);

  const getDisplayUser = (item) => {
    return item.user || item.friend || item;
  };

  const renderItem = (item, type) => {
    const displayUser = getDisplayUser(item);
    const userId = displayUser._id || displayUser.id;
    const name = displayUser.firstName
      ? `${displayUser.firstName} ${displayUser.lastName || ''}`
      : displayUser.username || 'Unknown';
    const mutualFriends = item.mutualFriends || displayUser.mutualFriends || 0;

    return (
      <TouchableOpacity
        key={userId}
        style={styles.card}
        onPress={() => navigation.navigate('Profile', { userId })}
      >
        <Avatar name={name} uri={displayUser.avatar || displayUser.profilePicture} size={60} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{name}</Text>
          {mutualFriends > 0 && (
            <Text style={styles.mutual}>{mutualFriends} mutual friends</Text>
          )}
        </View>
        <View style={styles.cardActions}>
          {type === 'request' && (
            <>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleAccept(userId)}
                disabled={actionLoading === userId + 'accept'}
              >
                {actionLoading === userId + 'accept' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.acceptBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => handleDecline(userId)}
                disabled={actionLoading === userId + 'decline'}
              >
                <Text style={styles.declineBtnText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
          {type === 'friend' && (
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemove(userId)}
              disabled={actionLoading === userId + 'remove'}
            >
              <Text style={styles.removeBtnText}>Unfriend</Text>
            </TouchableOpacity>
          )}
          {type === 'suggestion' && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => handleAdd(userId)}
              disabled={actionLoading === userId + 'add'}
            >
              {actionLoading === userId + 'add' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addBtnText}>Add Friend</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getData = () => {
    switch (activeTab) {
      case 'Requests': return requests;
      case 'All Friends': return friends;
      case 'Suggestions': return suggestions;
      default: return [];
    }
  };

  const data = getData();

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
              {tab === 'Requests' && requests.length > 0 && (
                <Text style={styles.badge}> ({requests.length})</Text>
              )}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1877f2" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id || item.id || String(Math.random())}
          renderItem={({ item }) =>
            renderItem(item, activeTab === 'Requests' ? 'request' : activeTab === 'All Friends' ? 'friend' : 'suggestion')
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {activeTab === 'Requests' && 'No friend requests'}
                {activeTab === 'All Friends' && 'No friends yet'}
                {activeTab === 'Suggestions' && 'No suggestions right now'}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1877f2" colors={['#1877f2']} />
          }
          contentContainerStyle={data.length === 0 ? styles.emptyList : styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#1877f2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#65676b',
  },
  activeTabText: {
    color: '#1877f2',
  },
  badge: {
    color: '#f02849',
  },
  list: {
    paddingVertical: 8,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1e21',
  },
  mutual: {
    fontSize: 12,
    color: '#65676b',
    marginTop: 2,
  },
  cardActions: {
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: '#1877f2',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 90,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  declineBtn: {
    backgroundColor: '#e4e6eb',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 90,
  },
  declineBtnText: {
    color: '#1c1e21',
    fontSize: 13,
    fontWeight: '500',
  },
  addBtn: {
    backgroundColor: '#1877f2',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 110,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  removeBtn: {
    backgroundColor: '#e4e6eb',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#1c1e21',
    fontSize: 13,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#65676b',
  },
});
