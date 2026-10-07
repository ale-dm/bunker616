import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@shared/theme';

interface Props {
  count: number;
}

export function Badge({ count }: Props) {
  const { colors, radii } = useTheme();
  if (count <= 0) {
    return null;
  }
  return (
    <View style={[styles.badge, { backgroundColor: colors.accent, borderRadius: radii.pill }]}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
