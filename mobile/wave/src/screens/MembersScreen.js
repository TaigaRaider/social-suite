import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import Avatar from '../components/Avatar';

export default function MembersScreen({ route }) {
  const { groupId, groupName } = route.params;
  const { token, user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await api.getGroupMembers(groupId, token);
      setMembers(data.members || data || []);
    } catch (err) {
      console.log('fetchMembers error:', err.message);
    }
  }, [groupId, token]);

  useEffect(() => {
    fetchMembers().finally(() => setLoading(false));
  }, [fetchMembers]);

  const isCurrentUserAdmin = (member) => {
    return member.role === 'admin' || member.isAdmin || member._id === user?._id || member.id === user?._id;
  };

  const currentMember = members.find(m => {
    const mid = m._id || m.id;
    const uid = m.userId || m.user?._id || m.user?.id;
    return mid === user?._id || uid === user?._id;
  });

  const amIAdmin = currentMember && isCurrentUserAdmin(currentMember);

  const handleRemove = async (member) => {
    const memberId = member._id || member.id || member.userId || member.user?._id;
    const memberName = member.name || member.userName || member.user?.name || 'this member';
    Alert.alert('Remove Member', `Remove ${memberName} from the group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.removeMember(groupId, memberId, token);
            await fetchMembers();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00a884" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(item) => item._id || item.id || item.userId || String(Math.random())}
        renderItem={({ item }) => {
          const memberName = item.name || item.userName || item.user?.name || item.email || 'Unknown';
          const role = item.role || (item.isAdmin ? 'admin' : 'member');
          return (
            <View style={styles.memberRow}>
              <Avatar name={memberName} size={42} />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{memberName}</Text>
                <Text style={styles.memberRole}>{role}</Text>
              </View>
              {amIAdmin && role !== 'admin' && (
                <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={<Text style={styles.headerText}>{members.length} Members</Text>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No members found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111b21' },
  center: { flex: 1, backgroundColor: '#111b21', alignItems: 'center', justifyContent: 'center' },
  headerText: { color: '#00a884', fontSize: 13, fontWeight: '700', paddingHorizontal: 16, paddingVertical: 12 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { color: '#e9edef', fontSize: 15, fontWeight: '600' },
  memberRole: { color: '#8696a0', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  removeBtn: {
    backgroundColor: 'rgba(255,77,77,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  removeBtnText: { color: '#ff4d4d', fontSize: 13, fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#222d34', marginLeft: 70 },
  empty: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#8696a0', fontSize: 15 },
});
