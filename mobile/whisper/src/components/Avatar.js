import React from 'react';
import { View, Text } from 'react-native';

const COLORS = [
  '#f91880', '#00ba7c', '#1d9bf0', '#7856ff',
  '#ff7a00', '#00c2cb', '#794bc4', '#e04f5f',
];

export default function Avatar({ name, size = 40, style }) {
  const initial = (name || '?')[0].toUpperCase();
  const colorIndex = (name || '').charCodeAt(0) % COLORS.length;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: COLORS[colorIndex],
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>
        {initial}
      </Text>
    </View>
  );
}
