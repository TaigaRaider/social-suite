import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ route }) {
  const navigation = useNavigation();
  const { user: currentUser, refreshUser } = useAuth();
  const { username } = route.params || {};

  const profileUsername = username || currentUser?.username;
  const isOwn = !username || username === currentUser?.username;

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.getProfile(profileUsername);
      setProfile(data.user || data);
      setFollowing(data.user?.isFollowing || data.isFollowing || false);
      setEditName(data.user?.name || data.name || '');
      setEditBio(data.user?.bio || data.bio || '');
      const postsData = await api.getUserPosts(profileUsername);
      setPosts(postsData.posts || postsData.data || postsData || []);
    } catch (e) {
      Alert.alert('Error', 'Could not load profile');
    }
  }, [profileUsername]);

  useEffect(() => {
    fetchProfile().finally(() => setLoading(false));
  }, [fetchProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const handleFollow = async () => {
    try {
      if (following) {
        await api.unfollowUser(profileUsername);
        setFollowing(false);
        setProfile((p) => ({
          ...p,
          followersCount: Math.max(0, (p.followersCount || 0) - 1),
        }));
      } else {
        await api.followUser(profileUsername);
        setFollowing(true);
        setProfile((p) => ({
          ...p,
          followersCount: (p.followersCount || 0) + 1,
        }));
      }
    } catch (e) {}
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await api.updateProfile({ name: editName.trim(), bio: editBio.trim() });
      await fetchProfile();
      await refreshUser();
      setEditVisible(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  };

  const handleDelete = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
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
        <View>
          <Text style={styles.headerName}>
            {profile?.name || profile?.displayName || 'User'}
          </Text>
          <Text style={styles.headerPosts}>{posts.length} posts</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <PostCard post={item} onDelete={handleDelete} />
        )}
        ListHeaderComponent={
          <View>
            <View style={styles.profileTop}>
              <Avatar
                name={profile?.name || profile?.displayName}
                size={72}
              />
              {isOwn ? (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setEditVisible(true)}
                >
                  <Text style={styles.editBtnText}>Edit profile</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.followBtn,
                    following && styles.followBtnActive,
                  ]}
                  onPress={handleFollow}
                >
                  <Text
                    style={[
                      styles.followBtnText,
                      following && styles.followBtnTextActive,
                    ]}
                  >
                    {following ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.nameSection}>
              <Text style={styles.profileName}>
                {profile?.name || profile?.displayName}
              </Text>
              <Text style={styles.profileUsername}>
                @{profile?.username}
              </Text>
            </View>

            {profile?.bio ? (
              <Text style={styles.profileBio}>{profile.bio}</Text>
            ) : null}

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statCount}>
                  {profile?.postsCount || posts.length}
                </Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statCount}>
                  {profile?.followersCount || 0}
                </Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statCount}>
                  {profile?.followingCount || 0}
                </Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>

            <View style={styles.divider} />
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#777"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
      />

      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={saving || !editName.trim()}
            >
              <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>
                {saving ? '...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Display name"
              placeholderTextColor="#555"
            />

            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.fieldInput, styles.bioInput]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell us about yourself"
              placeholderTextColor="#555"
              multiline
              maxLength={160}
            />
          </View>
        </View>
      </Modal>
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
  headerName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  headerPosts: {
    color: '#777',
    fontSize: 12,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followBtn: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  followBtnActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#555',
  },
  followBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  followBtnTextActive: {
    color: '#fff',
  },
  nameSection: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  profileName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  profileUsername: {
    color: '#777',
    fontSize: 14,
    marginTop: 2,
  },
  profileBio: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 20,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 20,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statCount: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  statLabel: {
    color: '#777',
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#363636',
    marginTop: 14,
  },
  empty: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#777',
    fontSize: 15,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#181818',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#363636',
  },
  modalCancel: {
    color: '#fff',
    fontSize: 15,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  modalSave: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  fieldLabel: {
    color: '#777',
    fontSize: 13,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#363636',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
});
