import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Pressable,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Avatar from './Avatar';
import api from '../api';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString();
}

export default function PostCard({ post, onDelete, showThreadLine = false }) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likesCount || post._count?.likes || 0);
  const [reposted, setReposted] = useState(post.isReposted || false);
  const [repostCount, setRepostCount] = useState(post.repostsCount || post._count?.reposts || 0);
  const [bookmarked, setBookmarked] = useState(post.isBookmarked || false);
  const [replyCount] = useState(post.repliesCount || post._count?.replies || 0);
  const scaleAnim = useState(new Animated.Value(1))[0];

  const author = post.author || post.user || {};
  const isOwn = user && (user.id === author.id || user.id === author.userId);

  const handleLike = async () => {
    try {
      if (liked) {
        await api.unlikePost(post.id);
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        await api.likePost(post.id);
        setLiked(true);
        setLikeCount((c) => c + 1);
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
      }
    } catch (e) {}
  };

  const handleRepost = async () => {
    try {
      if (reposted) {
        await api.unrepostPost(post.id);
        setReposted(false);
        setRepostCount((c) => Math.max(0, c - 1));
      } else {
        await api.repostPost(post.id);
        setReposted(true);
        setRepostCount((c) => c + 1);
      }
    } catch (e) {}
  };

  const handleBookmark = async () => {
    try {
      if (bookmarked) {
        await api.unbookmarkPost(post.id);
        setBookmarked(false);
      } else {
        await api.bookmarkPost(post.id);
        setBookmarked(true);
      }
    } catch (e) {}
  };

  const handleDelete = () => {
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deletePost(post.id);
            onDelete && onDelete(post.id);
          } catch (e) {}
        },
      },
    ]);
  };

  const goToProfile = () => {
    navigation.navigate('Profile', { username: author.username });
  };

  const goToThread = () => {
    navigation.navigate('Thread', { postId: post.id });
  };

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={goToThread}>
      <View style={styles.container}>
        {showThreadLine && <View style={styles.threadLine} />}
        <View style={styles.left}>
          <TouchableOpacity onPress={goToProfile}>
            <Avatar name={author.name || author.displayName} size={40} />
          </TouchableOpacity>
          {showThreadLine && <View style={styles.bottomThreadLine} />}
        </View>
        <View style={styles.right}>
          <View style={styles.header}>
            <TouchableOpacity onPress={goToProfile} style={styles.nameRow}>
              <Text style={styles.displayName}>
                {author.name || author.displayName || 'User'}
              </Text>
              <Text style={styles.username}>
                @{author.username}
              </Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
            </TouchableOpacity>
            {isOwn && (
              <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {post.replyTo && post.replyTo.author && (
            <Text style={styles.replyingTo}>
              Replying to @{post.replyTo.author.username}
            </Text>
          )}

          <Text style={styles.content}>{post.content}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.action} onPress={goToThread}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionCount}>{replyCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleRepost}>
              <Text style={[styles.actionIcon, reposted && styles.repostActive]}>
                🔄
              </Text>
              <Text style={[styles.actionCount, reposted && styles.repostActive]}>
                {repostCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleLike}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Text style={[styles.actionIcon, liked && styles.likeActive]}>
                  {liked ? '♥' : '♡'}
                </Text>
              </Animated.View>
              <Text style={[styles.actionCount, liked && styles.likeActive]}>
                {likeCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.action} onPress={handleBookmark}>
              <Text style={[styles.actionIcon, bookmarked && styles.bookmarkActive]}>
                {bookmarked ? '🔖' : '🏷'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#363636',
    backgroundColor: '#181818',
    position: 'relative',
  },
  left: {
    marginRight: 10,
    alignItems: 'center',
  },
  right: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  displayName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    marginRight: 4,
  },
  username: {
    color: '#777',
    fontSize: 14,
    marginRight: 4,
  },
  dot: {
    color: '#777',
    fontSize: 14,
    marginRight: 4,
  },
  time: {
    color: '#777',
    fontSize: 14,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteText: {
    color: '#777',
    fontSize: 14,
  },
  replyingTo: {
    color: '#777',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 4,
  },
  content: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingRight: 40,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionCount: {
    color: '#777',
    fontSize: 13,
  },
  likeActive: {
    color: '#f91880',
  },
  repostActive: {
    color: '#00ba7c',
  },
  bookmarkActive: {
    color: '#1d9bf0',
  },
  threadLine: {
    position: 'absolute',
    left: 34,
    top: 54,
    bottom: 0,
    width: 2,
    backgroundColor: '#363636',
  },
  bottomThreadLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#363636',
    marginTop: 4,
  },
});
