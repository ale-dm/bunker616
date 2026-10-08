import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@shared/theme';

interface Props {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: Props) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.container, { paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm }]}>
      <Text style={[typography.headline, { color: colors.label }]}>{title}</Text>
      {!!subtitle && (
        <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});
