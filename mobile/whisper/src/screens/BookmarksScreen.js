import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import PostCard from '../components/PostCard';
import api from '../api';

export default function BookmarksScreen() {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchBookmarks = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      const data = await api.getBookmarks(pageNum);
      const items = data.posts || data.data || data || [];
      if (refresh || pageNum === 1) {
        setBookmarks(items);
      } else {
        setBookmarks((prev) => [...prev, ...items]);
      }
      setHasMore(items.length === 20);
      setPage(pageNum);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchBookmarks(1, true).finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookmarks(1, true);
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (!hasMore) return;
    await fetchBookmarks(page + 1);
  };

  const handleDelete = (id) => {
    setBookmarks((prev) => prev.filter((p) => p.id !== id));
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
        <Text style={styles.headerTitle}>Bookmarks</Text>
      </View>

      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <PostCard post={item} onDelete={handleDelete} />
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
            <Text style={styles.emptyTitle}>Save posts for later</Text>
            <Text style={styles.emptyText}>
              Bookmark posts to easily find them again.
            </Text>
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
  empty: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
