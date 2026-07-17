import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import MessageBubble from '../components/MessageBubble';

export default function GroupChatScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [memberCount, setMemberCount] = useState(0);
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

  useEffect(() => {
    fetchMessages();
    fetchMembers();
  }, [fetchMessages, fetchMembers]);

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
        <TouchableOpacity
          onPress={() => navigation.navigate('Members', { groupId, groupName })}
          style={styles.membersBtn}
        >
          <Text style={styles.membersBtnText}>Members</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, groupName, memberCount, groupId]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    try {
      await api.sendMessage(groupId, { content: msg, text: msg }, token);
      await fetchMessages();
    } catch (err) {
      setText(msg);
      console.log('send error:', err.message);
    }
  };

  return (
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
});
