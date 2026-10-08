import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface Props {
  label: string;
  active?: boolean;
  onPress: () => void;
}

const ACTIVE_TEXT = '#FF9F0A';
const INACTIVE_TEXT = '#C7C7CC';

export function ReaderChip({ label, active = false, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.text, { color: active ? ACTIVE_TEXT : INACTIVE_TEXT }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
  },
  chipActive: { backgroundColor: 'rgba(255,159,10,0.18)' },
  text: { fontSize: 13, fontWeight: '600' },
});
