import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import MessageBubble from '../components/MessageBubble';

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (msgDate.getTime() === today.getTime()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function groupMessagesByDate(messages) {
  const groups = [];
  let currentDate = null;

  for (const msg of messages) {
    const dateStr = msg.createdAt || msg.timestamp;
    const label = formatDateLabel(dateStr);

    if (label !== currentDate) {
      currentDate = label;
      groups.push({ type: 'date', label, id: `date-${label}` });
    }
    groups.push({ type: 'message', ...msg });
  }
  return groups;
}

export default function ChatScreen({ route }) {
  const { conversationId, name } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.getMessages(conversationId);
      const list = Array.isArray(data) ? data : data.messages || [];
      setMessages(list);
    } catch (err) {
      console.warn('Failed to load messages:', err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages, shouldAutoScroll]);

  async function handleSend() {
    const content = text.trim();
    if (!content) return;
    setText('');
    setShouldAutoScroll(true);

    try {
      await api.sendMessage(conversationId, content);
      await fetchMessages();
    } catch (err) {
      setText(content);
    }
  }

  function handleScroll(e) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    setShouldAutoScroll(distanceFromBottom < 50);
  }

  const grouped = groupMessagesByDate(messages);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={grouped}
        keyExtractor={(item) => String(item.id || item._id || item.label)}
        renderItem={({ item }) => {
          if (item.type === 'date') {
            return (
              <View style={styles.dateLabel}>
                <Text style={styles.dateText}>{item.label}</Text>
              </View>
            );
          }
          const isSent =
            (item.senderId || item.sender) === user?.id ||
            (item.senderId || item.sender) === user?._id;
          return <MessageBubble message={item} isSent={isSent} />;
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Send a message to start the conversation</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.plusButton}>
          <Ionicons name="add-circle" size={30} color="#0084ff" />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Aa"
          placeholderTextColor="#555"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={20} color="#0084ff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  dateLabel: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateText: {
    color: '#8899a6',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#16213e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#16213e',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2a2a4a',
  },
  plusButton: {
    paddingBottom: 6,
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#ffffff',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  sendButton: {
    paddingBottom: 6,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 120,
  },
  emptyText: {
    color: '#8899a6',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#555',
    fontSize: 13,
    marginTop: 4,
  },
});
