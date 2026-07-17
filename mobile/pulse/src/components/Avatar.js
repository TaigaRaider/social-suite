import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = [
  '#0084ff', '#00c6ff', '#7c4dff', '#ff6b6b', '#feca57',
  '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4',
];

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({ name, size = 44, online = false }) {
  const bg = getColor(name || '');
  const initials = getInitials(name);

  return (
    <View style={{ position: 'relative' }}>
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
          {initials}
        </Text>
      </View>
      {online && (
        <View
          style={[
            styles.dot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              borderWidth: size * 0.05,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '700',
  },
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00c853',
    borderColor: '#1a1a2e',
  },
});
