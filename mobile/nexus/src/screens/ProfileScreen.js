import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function ProfileScreen({ route, navigation }) {
  const { user: currentUser, refreshUser, logout } = useAuth();
  const userId = route?.params?.userId || currentUser?._id;
  const isOwnProfile = !route?.params?.userId || route.params.userId === currentUser?._id;

  const [profileUser, setProfileUser] = useState(isOwnProfile ? currentUser : null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendStatus, setFriendStatus] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      if (isOwnProfile) {
        await refreshUser();
        const me = await api.auth.me();
        setProfileUser(me.user || me);
      } else {
        const res = await api.auth.getUser(userId);
        setProfileUser(res.user || res);
      }
    } catch (err) {
      // silent
    }
  }, [userId, isOwnProfile, refreshUser]);

  const fetchPosts = useCallback(async () => {
    try {
      const targetId = userId || currentUser?._id;
      const res = await api.posts.getUserPosts(targetId);
      setPosts(res.posts || res || []);
    } catch (err) {
      // silent
    }
  }, [userId, currentUser]);

  const fetchFriendStatus = useCallback(async () => {
    if (isOwnProfile) return;
    try {
      const friendsRes = await api.friends.getFriends();
      const friendsList = friendsRes.friends || friendsRes || [];
      const isFriend = friendsList.some(
        (f) => (f._id || f.id) === userId || (f.user?._id || f.friend?._id) === userId
      );
      if (isFriend) {
        setFriendStatus('friends');
        return;
      }
      const reqRes = await api.friends.getFriendRequests();
      const requests = reqRes.requests || reqRes || [];
      const hasPending = requests.some(
        (r) => (r._id || r.id || r.user?._id) === userId
      );
      if (hasPending) {
        setFriendStatus('pending');
      } else {
        setFriendStatus('none');
      }
    } catch (err) {
      setFriendStatus('none');
    }
  }, [userId, isOwnProfile]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchPosts(), fetchFriendStatus()]);
      setLoading(false);
    })();
  }, [fetchProfile, fetchPosts, fetchFriendStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchPosts(), fetchFriendStatus()]);
    setRefreshing(false);
  }, [fetchProfile, fetchPosts, fetchFriendStatus]);

  const handleAddFriend = useCallback(async () => {
    setActionLoading(true);
    try {
      await api.friends.sendFriendRequest(userId);
      setFriendStatus('pending');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send friend request');
    } finally {
      setActionLoading(false);
    }
  }, [userId]);

  const handleRemoveFriend = useCallback(async () => {
    Alert.alert('Unfriend', 'Are you sure you want to remove this friend?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.friends.removeFriend(userId);
            setFriendStatus('none');
          } catch (err) {
            // silent
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [userId]);

  const handleMessage = useCallback(() => {
    navigation.navigate('Messages', {
      screen: 'Chat',
      params: {
        userId: profileUser?._id || profileUser?.id,
        userName: profileUser?.firstName
          ? `${profileUser.firstName} ${profileUser.lastName || ''}`
          : profileUser?.username || 'User',
      },
    });
  }, [navigation, profileUser]);

  const handleEditProfile = useCallback(() => {
    setEditFirstName(profileUser?.firstName || '');
    setEditLastName(profileUser?.lastName || '');
    setEditBio(profileUser?.bio || '');
    setShowEditModal(true);
  }, [profileUser]);

  const handleSaveProfile = useCallback(async () => {
    if (!editFirstName.trim()) {
      Alert.alert('Error', 'First name is required');
      return;
    }
    setSaving(true);
    try {
      await api.auth.updateMe({
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
        bio: editBio.trim(),
      });
      await refreshUser();
      await fetchProfile();
      setShowEditModal(false);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }, [editFirstName, editLastName, editBio, refreshUser, fetchProfile]);

  const handleDeletePost = useCallback(async (postId) => {
    try {
      await api.posts.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      // silent
    }
  }, []);

  const navigateProfile = useCallback((uid) => {
    if (uid === currentUser?._id) return;
    navigation.push('Profile', { userId: uid });
  }, [navigation, currentUser]);

  const name = profileUser?.firstName
    ? `${profileUser.firstName} ${profileUser.lastName || ''}`
    : profileUser?.username || 'User';

  const renderHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.coverArea}>
        <View style={styles.avatarCenter}>
          <Avatar name={name} uri={profileUser?.avatar || profileUser?.profilePicture} size={100} />
        </View>
      </View>

      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{name}</Text>
        {profileUser?.bio ? (
          <Text style={styles.profileBio}>{profileUser.bio}</Text>
        ) : null}

        {profileUser?.friendCount !== undefined && (
          <Text style={styles.friendCount}>{profileUser.friendCount} friends</Text>
        )}

        {isOwnProfile ? (
          <View style={styles.ownActions}>
            <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() =>
                Alert.alert('Log Out', 'Are you sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Log Out', style: 'destructive', onPress: logout },
                ])
              }
            >
              <Text style={styles.logoutBtnText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.otherActions}>
            {friendStatus === 'none' && (
              <TouchableOpacity
                style={styles.friendBtn}
                onPress={handleAddFriend}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.friendBtnText}>Add Friend</Text>
                )}
              </TouchableOpacity>
            )}
            {friendStatus === 'pending' && (
              <View style={styles.pendingBtn}>
                <Text style={styles.pendingBtnText}>Request Sent</Text>
              </View>
            )}
            {friendStatus === 'friends' && (
              <TouchableOpacity
                style={styles.unfriendBtn}
                onPress={handleRemoveFriend}
                disabled={actionLoading}
              >
                <Text style={styles.unfriendBtnText}>Friends ✓</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.messageBtn} onPress={handleMessage}>
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Posts</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#475569" />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id || String(Math.random())}
        renderItem={({ item }) => (
          <PostCard post={item} onDelete={handleDeletePost} onNavigateProfile={navigateProfile} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#475569" colors={['#475569']} />
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyList : styles.list}
      />

      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#475569" />
              ) : (
                <Text style={styles.modalSave}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={editFirstName}
              onChangeText={setEditFirstName}
              placeholder="First name"
              placeholderTextColor="#90a4ae"
            />

            <Text style={styles.fieldLabel}>Last Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={editLastName}
              onChangeText={setEditLastName}
              placeholder="Last name"
              placeholderTextColor="#90a4ae"
            />

            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldTextarea]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell us about yourself"
              placeholderTextColor="#90a4ae"
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  list: {
    paddingBottom: 16,
  },
  emptyList: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  coverArea: {
    backgroundColor: '#e4e6eb',
    height: 160,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  avatarCenter: {
    marginBottom: -40,
  },
  profileInfo: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1c1e21',
  },
  profileBio: {
    fontSize: 14,
    color: '#65676b',
    marginTop: 4,
    textAlign: 'center',
  },
  friendCount: {
    fontSize: 14,
    color: '#65676b',
    marginTop: 4,
  },
  ownActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  editBtn: {
    backgroundColor: '#e4e6eb',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  editBtnText: {
    color: '#1c1e21',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: '#e4e6eb',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  logoutBtnText: {
    color: '#f02849',
    fontSize: 14,
    fontWeight: '600',
  },
  otherActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  friendBtn: {
    backgroundColor: '#475569',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
    minWidth: 110,
    alignItems: 'center',
  },
  friendBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingBtn: {
    backgroundColor: '#e4e6eb',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  pendingBtnText: {
    color: '#65676b',
    fontSize: 14,
    fontWeight: '500',
  },
  unfriendBtn: {
    backgroundColor: '#e4e6eb',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  unfriendBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  messageBtn: {
    backgroundColor: '#e4e6eb',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  messageBtnText: {
    color: '#1c1e21',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e4e6eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1e21',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 15,
    color: '#65676b',
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
  modalCancel: {
    fontSize: 16,
    color: '#65676b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1e21',
  },
  modalSave: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1c1e21',
    marginBottom: 6,
    marginTop: 12,
  },
  fieldInput: {
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1c1e21',
  },
  fieldTextarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
