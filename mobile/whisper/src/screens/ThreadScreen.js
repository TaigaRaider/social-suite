import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PostCard from '../components/PostCard';
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

export default function ThreadScreen({ route }) {
  const navigation = useNavigation();
  const { postId } = route.params;
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchThread = async () => {
    try {
      const data = await api.getPost(postId);
      setPost(data.post || data);
      const repliesData = await api.getReplies(postId);
      setReplies(repliesData.posts || repliesData.data || repliesData || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchThread().finally(() => setLoading(false));
  }, [postId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchThread();
    setRefreshing(false);
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const data = await api.replyToPost(postId, replyText.trim());
      const newReply = data.post || data;
      setReplies((prev) => [newReply, ...prev]);
      setReplyText('');
    } catch (e) {}
    setSending(false);
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thread</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={replies}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <PostCard post={item} showThreadLine={true} />
        )}
        ListHeaderComponent={
          post ? (
            <View>
              <PostCard post={post} />
              <View style={styles.replyHeader}>
                <Text style={styles.replyHeaderText}>
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </Text>
                <View style={styles.threadConnector} />
              </View>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#777"
          />
        }
        ListEmptyComponent={
          !refreshing ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No replies yet</Text>
            </View>
          ) : null
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.replyBar}>
          <TextInput
            style={styles.replyInput}
            placeholder="Post your reply"
            placeholderTextColor="#555"
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.replyButton,
              (!replyText.trim() || sending) && styles.replyButtonDisabled,
            ]}
            onPress={handleReply}
            disabled={!replyText.trim() || sending}
          >
            <Text style={styles.replyButtonText}>
              {sending ? '...' : 'Reply'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#363636',
  },
  backBtn: {
    color: '#fff',
    fontSize: 22,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  replyHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#363636',
  },
  replyHeaderText: {
    color: '#777',
    fontSize: 13,
  },
  threadConnector: {
    height: 1,
    backgroundColor: '#363636',
    marginTop: 8,
  },
  empty: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#777',
    fontSize: 15,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#363636',
    backgroundColor: '#262626',
  },
  replyInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    maxHeight: 80,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  replyButton: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 10,
  },
  replyButtonDisabled: {
    opacity: 0.4,
  },
  replyButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
});
