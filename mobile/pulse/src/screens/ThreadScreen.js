import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';

export default function ThreadScreen({ route, navigation }) {
  const { messageId, api, token } = route.params;
  const [messages, setMessages] = useState([]);
  const [parentMessage, setParentMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => { loadThread(); }, []);

  const loadThread = async () => {
    try {
      const details = await api.crypto.getMessageDetails(messageId, token);
      setParentMessage(details.message);
      const data = await api.crypto.getThread(messageId, token);
      setMessages(data.messages || []);
    } catch {}
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    try {
      await api.crypto.sendMessage({
        content: replyText,
        threadId: messageId,
        replyToId: messageId
      }, token);
      setReplyText('');
      loadThread();
    } catch {}
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Thread</Text>
      </View>

      {parentMessage && (
        <View style={styles.parentMsg}>
          <Text style={styles.parentName}>{parentMessage.firstName} {parentMessage.lastName}</Text>
          <Text style={styles.parentContent}>{parentMessage.content}</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id?.toString()}
        renderItem={({ item }) => (
          <View style={[styles.msg, item.senderId === parentMessage?.senderId && styles.ownMsg]}>
            <Text style={styles.msgName}>{item.firstName}</Text>
            <Text style={styles.msgContent}>{item.content}</Text>
            <Text style={styles.msgTime}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 12 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputBar}>
        <TextInput value={replyText} onChangeText={setReplyText} placeholder="Reply in thread..." style={styles.input} />
        <TouchableOpacity onPress={sendReply} style={styles.sendBtn}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 56, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e4e6eb' },
  backBtn: { fontSize: 16, color: '#8b5cf6', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: '#1c1e21' },
  parentMsg: { padding: 12, margin: 12, backgroundColor: '#e7f3ff', borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#8b5cf6' },
  parentName: { fontWeight: '600', fontSize: 13, color: '#1c1e21' },
  parentContent: { fontSize: 14, color: '#1c1e21', marginTop: 4 },
  msg: { marginBottom: 12, padding: 10, backgroundColor: 'white', borderRadius: 12, maxWidth: '80%' },
  ownMsg: { alignSelf: 'flex-end', backgroundColor: '#8b5cf6' },
  msgName: { fontSize: 12, fontWeight: '600', color: '#65676b', marginBottom: 2 },
  msgContent: { fontSize: 14, color: '#1c1e21' },
  msgTime: { fontSize: 11, color: '#999', marginTop: 4 },
  inputBar: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e4e6eb' },
  input: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#e4e6eb', borderRadius: 20, fontSize: 14 },
  sendBtn: { backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, justifyContent: 'center' },
  sendBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
});
