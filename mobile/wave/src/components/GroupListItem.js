import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Avatar from './Avatar';

const GROUP_COLORS = ['#00a884', '#53bdeb', '#ff6b6b', '#ffa500', '#a855f7', '#ec4899', '#14b8a6', '#eab308'];

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800000) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function GroupListItem({ group, onPress }) {
  const colorIndex = (group.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % GROUP_COLORS.length;
  const lastMsg = group.lastMessage;
  const unread = group.unreadCount || 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.avatarWrap, { backgroundColor: GROUP_COLORS[colorIndex] }]}>
        <Text style={styles.avatarText}>{(group.name || '?')[0].toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
          <Text style={styles.time}>{formatTime(lastMsg?.createdAt)}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.lastMsg} numberOfLines={1}>
            {lastMsg ? (lastMsg.content || lastMsg.text || 'No messages yet') : 'No messages yet'}
          </Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#111b21',
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { color: '#e9edef', fontSize: 16, fontWeight: '600', flex: 1 },
  time: { color: '#8696a0', fontSize: 12, marginLeft: 8 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { color: '#8696a0', fontSize: 13, flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: '#00a884',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
