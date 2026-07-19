import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function FeedScreen({ navigation }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [expandedComposer, setExpandedComposer] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await api.posts.getFeed(pageNum);
      const newPosts = res.posts || res || [];
      if (append) {
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      setHasMore(newPosts.length >= 10);
      setPage(pageNum);
    } catch (err) {
      // silent
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchPosts(1);
      setLoading(false);
    })();
  }, [fetchPosts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts(1);
    setRefreshing(false);
  }, [fetchPosts]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPosts(page + 1, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, fetchPosts]);

  const handleCreatePost = useCallback(async () => {
    if (!postText.trim() || posting) return;
    setPosting(true);
    try {
      const res = await api.posts.createPost({ text: postText.trim() });
      const newPost = res.post || res;
      setPosts((prev) => [newPost, ...prev]);
      setPostText('');
      setExpandedComposer(false);
    } catch (err) {
      // silent
    } finally {
      setPosting(false);
    }
  }, [postText, posting]);

  const handleDelete = useCallback(async (postId) => {
    try {
      await api.posts.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      // silent
    }
  }, []);

  const navigateProfile = useCallback((userId) => {
    navigation.navigate('Profile', { userId });
  }, [navigation]);

  const renderHeader = () => (
    <View style={styles.composerCard}>
      <View style={styles.composerRow}>
        <Avatar name={user?.firstName || user?.username} uri={user?.avatar} size={40} />
        <TouchableOpacity
          style={styles.composerInput}
          onPress={() => setExpandedComposer(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.composerPlaceholder}>
            {expandedComposer ? '' : "What's on your mind?"}
          </Text>
        </TouchableOpacity>
      </View>

      {expandedComposer && (
        <View style={styles.expandedComposer}>
          <TextInput
            style={styles.composerText}
            placeholder="What's on your mind?"
            placeholderTextColor="#65676b"
            value={postText}
            onChangeText={setPostText}
            multiline
            autoFocus
            textAlignVertical="top"
          />
          <View style={styles.composerActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setExpandedComposer(false);
                setPostText('');
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postBtn, (!postText.trim() || posting) && styles.postBtnDisabled]}
              onPress={handleCreatePost}
              disabled={!postText.trim() || posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.postBtnText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!expandedComposer && (
        <View style={styles.composerDivider} />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id || String(Math.random())}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onDelete={handleDelete}
            onNavigateProfile={navigateProfile}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptySubtext}>Create a post to get started!</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#475569" style={{ marginVertical: 16 }} />
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#475569" colors={['#475569']} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={posts.length === 0 && !loading ? styles.emptyList : styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  list: {
    paddingBottom: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  composerCard: {
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginLeft: 10,
  },
  composerPlaceholder: {
    color: '#65676b',
    fontSize: 15,
  },
  expandedComposer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  composerText: {
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1c1e21',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: '#65676b',
    fontSize: 15,
    fontWeight: '500',
  },
  postBtn: {
    backgroundColor: '#475569',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  postBtnDisabled: {
    opacity: 0.5,
  },
  postBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  composerDivider: {
    height: 1,
    backgroundColor: '#e4e6eb',
    marginHorizontal: 12,
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
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
