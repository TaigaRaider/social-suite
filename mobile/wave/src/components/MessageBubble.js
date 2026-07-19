import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SENDER_COLORS = ['#00a884', '#53bdeb', '#ff6b6b', '#ffa500', '#a855f7', '#ec4899', '#14b8a6', '#eab308', '#06b6d4', '#f97316'];

function getSenderColor(name) {
  if (!name) return SENDER_COLORS[0];
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % SENDER_COLORS.length;
  return SENDER_COLORS[idx];
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isOwn }) {
  const senderName = message.senderName || message.sender?.name || 'Unknown';
  const content = message.content || message.text || '';
  const time = formatTime(message.createdAt);

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {!isOwn && (
          <Text style={[styles.sender, { color: getSenderColor(senderName) }]}>{senderName}</Text>
        )}
        <Text style={styles.content}>{message.encrypted ? '🔒 ' : ''}{content}</Text>
        <Text style={[styles.time, isOwn && styles.timeOwn]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, marginVertical: 2 },
  rowOwn: { alignItems: 'flex-end' },
  rowOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bubbleOwn: { backgroundColor: '#005c4b', borderBottomRightRadius: 0 },
  bubbleOther: { backgroundColor: '#1f2c33', borderBottomLeftRadius: 0 },
  sender: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  content: { color: '#e9edef', fontSize: 15, lineHeight: 20 },
  time: { color: '#8696a0', fontSize: 11, textAlign: 'right', marginTop: 2 },
  timeOwn: { color: '#8696a0' },
});
