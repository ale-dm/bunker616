import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@shared/theme';

interface Props {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function Chip({ label, active = false, onPress }: Props) {
  const { colors, radii, typography } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.chip,
        { borderRadius: radii.pill, backgroundColor: active ? colors.accent : colors.secondaryBackground },
      ]}>
      <Text style={[typography.footnote, { color: active ? '#FFFFFF' : colors.label, fontWeight: active ? '600' : '400' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, marginBottom: 4 },
});
