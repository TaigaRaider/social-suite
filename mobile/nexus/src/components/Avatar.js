import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const COLORS = [
  '#475569', '#42b72a', '#f02849', '#f7b928',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

function getColor(name) {
  if (!name) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function Avatar({ name, uri, size = 40, style }) {
  const s = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[s, styles.image, style]}
      />
    );
  }

  return (
    <View style={[s, styles.container, { backgroundColor: getColor(name) }, style]}>
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '600',
  },
  image: {
    backgroundColor: '#ddd',
  },
});
