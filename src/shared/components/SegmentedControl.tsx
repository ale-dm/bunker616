import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@shared/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors, radii, typography, spacing } = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: colors.tertiaryBackground, borderRadius: radii.md, marginTop: spacing.md }]}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onChange(option.value)}
            activeOpacity={0.8}
            style={[styles.segment, { borderRadius: radii.sm, backgroundColor: active ? colors.secondaryBackground : 'transparent' }]}>
            <Text
              style={[
                typography.footnote,
                { color: active ? colors.label : colors.secondaryLabel, fontWeight: active ? '700' : '500' },
              ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 7 },
});
