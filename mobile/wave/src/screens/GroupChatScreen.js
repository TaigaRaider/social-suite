import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
  Modal, ScrollView, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Audio } from 'expo-av';
import MessageBubble from '../components/MessageBubble';
import { loadIdentity, generateLocalIdentity, uploadKeyBundle, sendMessage as sendEncrypted, isE2EEEnabled } from '../crypto/signalProtocol';
import { Ionicons } from '@expo/vector-icons';

export default function GroupChatScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [memberCount, setMemberCount] = useState(0);
  const [showMemberList, setShowMemberList] = useState(false);
  const [members, setMembers] = useState([]);
  const [showStickers, setShowStickers] = useState(false);
  const [stickerPacks, setStickerPacks] = useState([]);
  const [activePack, setActivePack] = useState(null);
  const flatListRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingRef = useRef(null);
  const timerRef = useRef(null);

  const startRecording = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') return alert('Microphone permission required');

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    recordingRef.current = recording;
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopRecording = async () => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    await recordingRef.current.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    const duration = recordingTime;
    const content = `Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`;
    setText(content);
    await handleSend();
  };

  const formatRecordingTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const loadStickers = async () => {
      try {
        const data = await api.getStickers(token);
        setStickerPacks(data.packs || []);
        if (data.packs?.length > 0) setActivePack(data.packs[0]);
      } catch {}
    };
    if (token) loadStickers();
  }, [token]);

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
          <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { peerId: groupId, peerName: groupName, callType: 'voice', isIncoming: false })} style={{ marginRight: 8 }}>
            <Ionicons name="call" size={20} color="#00a884" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('CallScreen', { peerId: groupId, peerName: groupName, callType: 'video', isIncoming: false })} style={{ marginRight: 8 }}>
            <Ionicons name="videocam" size={20} color="#00a884" />
          </TouchableOpacity>
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
      {showStickers && (
        <View style={styles.stickerPicker}>
          <View style={styles.stickerPackTabs}>
            {stickerPacks.map(pack => (
              <TouchableOpacity key={pack.id} onPress={() => setActivePack(pack)}
                style={[styles.stickerPackTab, activePack?.id === pack.id && styles.stickerPackTabActive]}>
                <Text style={styles.stickerPackTabText}>{pack.icon} {pack.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FlatList
            data={activePack?.stickers || []}
            numColumns={7}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => { setText(item); setShowStickers(false); }} style={styles.stickerItem}>
                <Text style={{ fontSize: 28 }}>{item}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(_, i) => i.toString()}
            style={styles.stickerGrid}
          />
        </View>
      )}
      <View style={styles.inputBar}>
        <TouchableOpacity onPress={() => setShowStickers(!showStickers)} style={styles.stickerBtn}>
          <Text style={{ fontSize: 22 }}>😊</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          placeholderTextColor="#8696a0"
          multiline
          maxLength={2000}
        />
        <TouchableOpacity onPress={isRecording ? stopRecording : startRecording} style={styles.recordBtn}>
          <Ionicons name={isRecording ? "stop" : "mic"} size={22} color={isRecording ? "#f44336" : "#00a884"} />
        </TouchableOpacity>
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>{formatRecordingTime(recordingTime)}</Text>
          </View>
        )}
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
  stickerPicker: {
    backgroundColor: '#1f2c33',
    borderTopWidth: 1,
    borderTopColor: '#222d34',
    maxHeight: 300,
  },
  stickerPackTabs: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  stickerPackTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2a3942',
  },
  stickerPackTabActive: {
    backgroundColor: '#00a884',
  },
  stickerPackTabText: {
    color: '#fff',
    fontSize: 14,
  },
  stickerGrid: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  stickerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  stickerBtn: {
    paddingBottom: 6,
    marginRight: 4,
  },
  recordBtn: {
    paddingBottom: 6,
    marginRight: 4,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f44336',
  },
  recordingTime: {
    color: '#f44336',
    fontSize: 13,
    fontWeight: '600',
  },
});
