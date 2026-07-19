import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import Avatar from './Avatar';
import api from '../api';
import { useAuth } from '../context/AuthContext';

function timeAgo(date) {
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

export default function PostCard({ post, onDelete, onNavigateProfile }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(post.likes || []);
  const [likeCount, setLikeCount] = useState(post.likeCount || post.likes?.length || 0);
  const [commentCount, setCommentCount] = useState(post.commentCount || post.comments?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liking, setLiking] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);

  const isLiked = likes?.some?.((l) => (l._id || l) === user?._id) || false;

  const handleLike = useCallback(async () => {
    if (liking) return;
    setLiking(true);
    try {
      const res = await api.posts.likePost(post._id);
      setLikes(res.likes || []);
      setLikeCount(res.likes?.length || 0);
    } catch (err) {
      // revert on error
    } finally {
      setLiking(false);
    }
  }, [post._id, liking]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const res = await api.posts.getComments(post._id);
      setComments(res.comments || res || []);
    } catch (err) {
      // silent
    } finally {
      setLoadingComments(false);
    }
  }, [post._id]);

  const toggleComments = useCallback(async () => {
    if (!showCommentModal) {
      await loadComments();
    }
    setShowCommentModal(!showCommentModal);
  }, [showCommentModal, loadComments]);

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await api.posts.addComment(post._id, { text: commentText.trim() });
      setComments([res.comment || res, ...comments]);
      setCommentCount((c) => c + 1);
      setCommentText('');
    } catch (err) {
      // silent
    } finally {
      setSubmittingComment(false);
    }
  }, [commentText, post._id, comments, submittingComment]);

  const postUser = post.user || post.author || {};
  const authorName = postUser.firstName
    ? `${postUser.firstName} ${postUser.lastName || ''}`
    : postUser.username || 'Unknown';
  const authorAvatar = postUser.avatar || postUser.profilePicture;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onNavigateProfile && onNavigateProfile(postUser._id || postUser.id)}
          style={styles.headerLeft}
        >
          <Avatar name={authorName} uri={authorAvatar} size={40} />
          <View style={styles.headerText}>
            <Text style={styles.authorName}>{authorName}</Text>
            <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        {user && (postUser._id === user._id || postUser.id === user.id) && onDelete && (
          <TouchableOpacity onPress={() => onDelete(post._id)} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {post.text || post.content ? (
        <Text style={styles.content}>{post.text || post.content}</Text>
      ) : null}

      {post.image ? (
        <Image source={{ uri: post.image }} style={styles.postImage} />
      ) : null}

      <View style={styles.statsRow}>
        <Text style={styles.statText}>
          {likeCount > 0 ? `${likeCount} ${likeCount === 1 ? 'like' : 'likes'}` : ''}
        </Text>
        <TouchableOpacity onPress={toggleComments}>
          <Text style={styles.statText}>
            {commentCount > 0 ? `${commentCount} comments` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, isLiked && styles.actionBtnActive]}
          onPress={handleLike}
          disabled={liking}
        >
          {liking ? (
            <ActivityIndicator size="small" color="#475569" />
          ) : (
            <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>
              {isLiked ? '👍 Liked' : '👍 Like'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={toggleComments}>
          <Text style={styles.actionText}>💬 Comment</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showCommentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCommentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCommentModal(false)}>
              <Text style={styles.modalClose}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Comments</Text>
            <View style={{ width: 50 }} />
          </View>

          {loadingComments ? (
            <ActivityIndicator size="large" color="#475569" style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item._id || String(Math.random())}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <Text style={styles.emptyComments}>No comments yet. Be the first!</Text>
              }
              renderItem={({ item }) => {
                const cUser = item.user || item.author || {};
                const cName = cUser.firstName
                  ? `${cUser.firstName} ${cUser.lastName || ''}`
                  : cUser.username || 'Unknown';
                return (
                  <View style={styles.commentItem}>
                    <Avatar name={cName} uri={cUser.avatar} size={32} />
                    <View style={styles.commentBody}>
                      <Text style={styles.commentAuthor}>{cName}</Text>
                      <Text style={styles.commentText}>{item.text || item.content}</Text>
                      <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
                    </View>
                  </View>
                );
              }}
            />
          )}

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
          >
            <View style={styles.commentInputRow}>
              <Avatar name={user?.firstName || user?.username} uri={user?.avatar} size={32} />
              <TextInput
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor="#65676b"
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                onPress={handleAddComment}
                disabled={!commentText.trim() || submittingComment}
                style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
              >
                <Text style={[styles.sendBtnText, !commentText.trim() && styles.sendBtnTextDisabled]}>
                  Send
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 10,
  },
  authorName: {
    fontWeight: '600',
    fontSize: 15,
    color: '#1c1e21',
  },
  time: {
    fontSize: 12,
    color: '#65676b',
  },
  deleteBtn: {
    padding: 4,
  },
  deleteText: {
    color: '#f02849',
    fontSize: 13,
  },
  content: {
    fontSize: 15,
    color: '#1c1e21',
    paddingHorizontal: 12,
    paddingBottom: 12,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#f0f2f5',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statText: {
    fontSize: 13,
    color: '#65676b',
  },
  divider: {
    height: 1,
    backgroundColor: '#e4e6eb',
    marginHorizontal: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  actionBtnActive: {},
  actionText: {
    fontSize: 14,
    color: '#65676b',
    fontWeight: '500',
  },
  actionTextActive: {
    color: '#475569',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
  },
  modalClose: {
    fontSize: 16,
    color: '#475569',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1e21',
  },
  emptyComments: {
    textAlign: 'center',
    color: '#65676b',
    marginTop: 40,
    fontSize: 15,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentBody: {
    backgroundColor: '#f0f2f5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    flex: 1,
  },
  commentAuthor: {
    fontWeight: '600',
    fontSize: 13,
    color: '#1c1e21',
  },
  commentText: {
    fontSize: 14,
    color: '#1c1e21',
    marginTop: 2,
  },
  commentTime: {
    fontSize: 11,
    color: '#65676b',
    marginTop: 4,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e4e6eb',
    backgroundColor: '#fff',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1c1e21',
    marginLeft: 8,
    maxHeight: 80,
  },
  sendBtn: {
    marginLeft: 8,
    padding: 8,
  },
  sendBtnDisabled: {},
  sendBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  sendBtnTextDisabled: {
    color: '#bcc0c4',
  },
});
