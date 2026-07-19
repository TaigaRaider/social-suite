import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, isSent }) {
  return (
    <View style={[styles.row, isSent ? styles.sentRow : styles.receivedRow]}>
      <View style={[styles.bubble, isSent ? styles.sent : styles.received]}>
        <Text style={[styles.text, isSent ? styles.sentText : styles.receivedText]}>
          {message.encrypted ? '🔒 ' : ''}{message.content}
        </Text>
        <Text style={[styles.time, isSent ? styles.sentTime : styles.receivedTime]}>
          {formatTime(message.createdAt || message.timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 2,
    paddingHorizontal: 12,
  },
  sentRow: {
    alignItems: 'flex-end',
  },
  receivedRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sent: {
    backgroundColor: '#0084ff',
    borderBottomRightRadius: 4,
  },
  received: {
    backgroundColor: '#303030',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  sentText: {
    color: '#ffffff',
  },
  receivedText: {
    color: '#e4e6eb',
  },
  time: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  sentTime: {
    color: 'rgba(255,255,255,0.6)',
  },
  receivedTime: {
    color: 'rgba(255,255,255,0.4)',
  },
});
