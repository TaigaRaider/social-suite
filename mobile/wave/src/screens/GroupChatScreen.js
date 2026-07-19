import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
  Modal, ScrollView, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import MessageBubble from '../components/MessageBubble';
import { loadIdentity, generateLocalIdentity, uploadKeyBundle, sendMessage as sendEncrypted, isE2EEEnabled } from '../crypto/signalProtocol';

export default function GroupChatScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [memberCount, setMemberCount] = useState(0);
  const [showMemberList, setShowMemberList] = useState(false);
  const [members, setMembers] = useState([]);
  const flatListRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.getMessages(groupId, token);
      setMessages(data.messages || data || []);
    } catch (err) {
      console.log('fetchMessages error:', err.message);
    }
  }, [groupId, token]);

  const fetchMembers = useCallback(async () => {
    try {
      const data = await api.getGroupMembers(groupId, token);
      const members = data.members || data || [];
      setMemberCount(members.length);
    } catch (err) {
      console.log('fetchMembers error:', err.message);
    }
  }, [groupId, token]);

  const loadDetailedMembers = useCallback(async () => {
    try {
      const data = await api.getGroupMembersDetailed(groupId, token);
      setMembers(data.members || []);
    } catch (err) {
      console.log('loadDetailedMembers error:', err.message);
    }
  }, [groupId, token]);

  const isGroupAdmin = members.find(m => m.userId === user?._id)?.role === 'admin' || members.find(m => m.userId === user?._id)?.role === 'owner';
  const isGroupOwner = members.find(m => m.userId === user?._id)?.role === 'owner';

  const handleMuteMember = async (userId, muted) => {
    try {
      await api.muteGroupMember(groupId, userId, muted, token);
      loadDetailedMembers();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleKickMember = async (userId) => {
    Alert.alert('Kick Member', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Kick', style: 'destructive', onPress: async () => {
        try {
          await api.kickGroupMember(groupId, userId, token);
          loadDetailedMembers();
          fetchMembers();
        } catch (err) {
          Alert.alert('Error', err.message);
        }
      }},
    ]);
  };

  const handleBanMember = async (userId, banned) => {
    Alert.alert(banned ? 'Ban Member' : 'Unban Member', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: banned ? 'Ban' : 'Unban', style: 'destructive', onPress: async () => {
        try {
          await api.banGroupMember(groupId, userId, banned, token);
          loadDetailedMembers();
          fetchMembers();
        } catch (err) {
          Alert.alert('Error', err.message);
        }
      }},
    ]);
  };

  useEffect(() => {
    fetchMessages();
    fetchMembers();
    loadDetailedMembers();
  }, [fetchMessages, fetchMembers, loadDetailedMembers]);

  useEffect(() => {
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerName} numberOfLines={1}>{groupName}</Text>
          <Text style={styles.headerCount}>{memberCount} members</Text>
        </View>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => { setShowMemberList(true); loadDetailedMembers(); }}
            style={styles.membersBtn}
          >
            <Text style={styles.membersBtnText}>Members</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, groupName, memberCount, groupId]);

  useEffect(() => {
    const initCrypto = async () => {
      const identity = await loadIdentity();
      if (!identity) {
        await generateLocalIdentity();
        if (token) await uploadKeyBundle(token);
      }
    };
    if (token) initCrypto();
  }, [token]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    try {
      if (isE2EEEnabled()) {
        await sendEncrypted(groupId, msg, token);
      } else {
        await api.sendMessage(groupId, { content: msg, text: msg }, token);
      }
      await fetchMessages();
    } catch (err) {
      setText(msg);
      console.log('send error:', err.message);
    }
  };

  return (
    <>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id || item.id || String(Math.random())}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwn={item.sender === user?._id || item.senderId === user?._id || item.sender?.id === user?._id || item.sender?._id === user?._id}
          />
        )}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          placeholderTextColor="#8696a0"
          multiline
          maxLength={2000}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.7}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>

      <Modal visible={showMemberList} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.memberModal}>
          <View style={styles.memberModalHeader}>
            <Text style={styles.memberModalTitle}>Members ({members.length})</Text>
            <TouchableOpacity onPress={() => setShowMemberList(false)}>
              <Text style={styles.memberModalClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={members}
            keyExtractor={(item) => String(item.userId)}
            renderItem={({ item: m }) => (
              <View style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {(m.firstName?.[0] || m.username?.[0] || '?').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {m.firstName} {m.lastName} {m.role === 'owner' ? '(Owner)' : m.role === 'admin' ? '(Admin)' : ''}
                  </Text>
                  <Text style={styles.memberUsername}>@{m.username}</Text>
                </View>
                {isGroupAdmin && m.userId !== user?._id && (
                  <View style={styles.memberActions}>
                    <TouchableOpacity onPress={() => handleMuteMember(m.userId, !m.muted)} style={styles.memberActionBtn}>
                      <Text style={styles.memberActionText}>{m.muted ? 'Unmute' : 'Mute'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleKickMember(m.userId)} style={styles.memberActionBtn}>
                      <Text style={[styles.memberActionText, { color: '#f44336' }]}>Kick</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleBanMember(m.userId, !m.banned)} style={styles.memberActionBtn}>
                      <Text style={[styles.memberActionText, { color: m.banned ? '#4caf50' : '#ff9800' }]}>{m.banned ? 'Unban' : 'Ban'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111b21' },
  messagesList: { paddingVertical: 8 },
  headerTitleWrap: { flex: 1 },
  headerName: { color: '#e9edef', fontSize: 16, fontWeight: '700' },
  headerCount: { color: '#8696a0', fontSize: 12, marginTop: 1 },
  membersBtn: { marginRight: 8, paddingVertical: 6, paddingHorizontal: 12 },
  membersBtnText: { color: '#00a884', fontSize: 14, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#1f2c33',
    borderTopWidth: 1,
    borderTopColor: '#222d34',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2a3942',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#e9edef',
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#00a884',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  memberModal: { flex: 1, backgroundColor: '#111b21' },
  memberModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222d34' },
  memberModalTitle: { color: '#e9edef', fontSize: 18, fontWeight: '700' },
  memberModalClose: { color: '#00a884', fontSize: 16, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#222d34' },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00a884', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  memberAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  memberName: { color: '#e9edef', fontSize: 15, fontWeight: '600' },
  memberUsername: { color: '#8696a0', fontSize: 13, marginTop: 2 },
  memberActions: { flexDirection: 'row', gap: 8 },
  memberActionBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  memberActionText: { color: '#00a884', fontSize: 13, fontWeight: '600' },
});
