import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import api from '../api';

function timeAgo(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ route }) {
  const { userId, userName } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const pollingRef = useRef(null);
  const [page, setPage] = useState(1);

  const fetchMessages = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await api.messages.getMessages(userId, pageNum);
      const msgs = res.messages || res || [];
      if (append) {
        setMessages((prev) => [...prev, ...msgs]);
      } else {
        setMessages(msgs);
      }
    } catch (err) {
      // silent
    }
  }, [userId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchMessages(1);
      setLoading(false);
    })();
  }, [fetchMessages]);

  useEffect(() => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.messages.getMessages(userId, 1);
        const msgs = res.messages || res || [];
        setMessages((prev) => {
          const prevIds = new Set(prev.map((m) => m._id));
          const newMsgs = msgs.filter((m) => !prevIds.has(m._id));
          if (newMsgs.length === 0) return prev;
          return [...newMsgs.filter((m) => {
            const prevIds2 = new Set(prev.map((p) => p._id));
            return !prevIds2.has(m._id);
          }), ...prev];
        });
      } catch (err) {
        // silent
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [userId]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending) return;
    const msgText = text.trim();
    setText('');
    setSending(true);

    const optimistic = {
      _id: 'temp-' + Date.now(),
      text: msgText,
      sender: user?._id,
      senderId: user?._id,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [optimistic, ...prev]);

    try {
      const res = await api.messages.sendMessage(userId, { text: msgText });
      const sent = res.message || res;
      setMessages((prev) => prev.map((m) => (m._id === optimistic._id ? sent : m)));
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m._id === optimistic._id ? { ...m, failed: true } : m))
      );
    } finally {
      setSending(false);
    }
  }, [text, sending, userId, user]);

  const loadMore = useCallback(async () => {
    if (messages.length < 20) return;
    const nextPage = page + 1;
    await fetchMessages(nextPage, true);
    setPage(nextPage);
  }, [page, messages.length, fetchMessages]);

  const isOwn = (msg) => {
    const senderId = msg.sender?._id || msg.sender?.id || msg.sender || msg.senderId;
    return senderId === user?._id || senderId === user?.id;
  };

  const renderItem = ({ item, index }) => {
    const own = isOwn(item);
    const showTime =
      index === messages.length - 1 ||
      (messages[index + 1] &&
        new Date(item.createdAt) - new Date(messages[index + 1].createdAt) > 300000);

    return (
      <View style={[styles.msgRow, own ? styles.msgRowOwn : styles.msgRowOther]}>
        {!own && (
          <Avatar
            name={userName}
            uri={item.sender?.avatar}
            size={28}
            style={{ marginTop: 4 }}
          />
        )}
        <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleOther]}>
          <Text style={[styles.msgText, own ? styles.msgTextOwn : styles.msgTextOther]}>
            {item.text}
          </Text>
          {item.pending && <Text style={styles.pending}>Sending...</Text>}
          {item.failed && <Text style={styles.failed}>Failed to send</Text>}
          {showTime && (
            <Text style={[styles.msgTime, own ? styles.msgTimeOwn : styles.msgTimeOther]}>
              {timeAgo(item.createdAt)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#1877f2" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id || String(Math.random())}
          renderItem={renderItem}
          inverted
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyText}>Say hello!</Text>
            </View>
          }
        />
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Aa"
          placeholderTextColor="#65676b"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Text style={[styles.sendBtnText, !text.trim() && styles.sendBtnTextDisabled]}>
            Send
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    fontSize: 15,
    color: '#65676b',
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 4,
    maxWidth: '75%',
  },
  msgRowOwn: {
    alignSelf: 'flex-end',
  },
  msgRowOther: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  bubbleOwn: {
    backgroundColor: '#1877f2',
  },
  bubbleOther: {
    backgroundColor: '#e4e6eb',
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
  },
  msgTextOwn: {
    color: '#fff',
  },
  msgTextOther: {
    color: '#1c1e21',
  },
  pending: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  failed: {
    fontSize: 10,
    color: '#ff6b6b',
    marginTop: 2,
  },
  msgTime: {
    fontSize: 10,
    marginTop: 4,
  },
  msgTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  msgTimeOther: {
    color: '#65676b',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e4e6eb',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1c1e21',
    maxHeight: 100,
  },
  sendBtn: {
    marginLeft: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendBtnDisabled: {},
  sendBtnText: {
    color: '#1877f2',
    fontSize: 16,
    fontWeight: '600',
  },
  sendBtnTextDisabled: {
    color: '#bcc0c4',
  },
});
