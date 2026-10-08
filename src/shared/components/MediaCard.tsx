import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CoverImage } from './CoverImage';
import { useTheme } from '@shared/theme';

interface Props {
  coverUri: string;
  title: string;
  subtitle?: string;
  subtitleTone?: 'secondary' | 'progress';
  width?: number;
  onPress: () => void;
}

export function MediaCard({ coverUri, title, subtitle, subtitleTone = 'secondary', width = 110, onPress }: Props) {
  const { colors, radii, spacing, typography } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.card, { width }]}>
      <View style={[styles.cover, { borderRadius: radii.md, backgroundColor: colors.tertiaryBackground }]}>
        <CoverImage uri={coverUri} style={styles.coverImage} />
      </View>
      <Text style={[typography.footnote, { color: colors.label, marginTop: spacing.xs }]} numberOfLines={2}>
        {title}
      </Text>
      {!!subtitle && (
        <Text
          style={[
            typography.caption,
            { color: subtitleTone === 'progress' ? colors.progress : colors.secondaryLabel, fontWeight: '700', marginTop: 2 },
          ]}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginRight: 12 },
  cover: { aspectRatio: 2 / 3, overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
});
