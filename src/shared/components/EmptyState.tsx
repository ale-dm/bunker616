import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from '@shared/theme';

interface Props {
  message: string;
}

export function EmptyState({ message }: Props) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Text
      style={[
        styles.text,
        typography.body,
        { color: colors.secondaryLabel, marginTop: spacing.xxl },
      ]}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { textAlign: 'center' },
});
