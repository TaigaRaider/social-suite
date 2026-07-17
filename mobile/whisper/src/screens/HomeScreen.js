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
import PostCard from '../components/PostCard';
import api from '../api';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [tab, setTab] = useState('foryou');
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = useCallback(
    async (pageNum = 1, refresh = false) => {
      try {
        const data = tab === 'foryou'
          ? await api.getFeed(pageNum)
          : await api.getFollowingFeed(pageNum);
        const newPosts = data.posts || data.data || data || [];
        if (refresh || pageNum === 1) {
          setPosts(newPosts);
        } else {
          setPosts((prev) => [...prev, ...newPosts]);
        }
        setHasMore(newPosts.length === 20);
        setPage(pageNum);
      } catch (e) {}
    },
    [tab]
  );

  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    fetchPosts(1, true);
  }, [tab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts(1, true);
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchPosts(page + 1);
    setLoadingMore(false);
  };

  const handleDelete = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>whisper</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'foryou' && styles.tabActive]}
          onPress={() => setTab('foryou')}
        >
          <Text style={[styles.tabText, tab === 'foryou' && styles.tabTextActive]}>
            For You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'following' && styles.tabActive]}
          onPress={() => setTab('following')}
        >
          <Text style={[styles.tabText, tab === 'following' && styles.tabTextActive]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <PostCard post={item} onDelete={handleDelete} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#777"
            colors={['#fff']}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color="#777" style={{ marginVertical: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          !refreshing ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Compose')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#363636',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#363636',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  tabText: {
    color: '#777',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#fff',
  },
  empty: {
    marginTop: 80,
    alignItems: 'center',
  },
  emptyText: {
    color: '#777',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: {
    color: '#000',
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '300',
  },
});
