import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = ['#00a884', '#25d366', '#53bdeb', '#ff6b6b', '#ffa500', '#a855f7', '#ec4899', '#14b8a6'];

export default function Avatar({ name, size = 44, style }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colorIndex = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % COLORS.length;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS[colorIndex] }, style]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '700' },
});
