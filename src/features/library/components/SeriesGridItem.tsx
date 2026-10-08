import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Series } from '@shared/types/komga';
import { CoverImage, Badge } from '@shared/components';
import { seriesThumbnailUrl } from '@shared/api/komga';
import { useAuth } from '@features/auth/AuthContext';
import { useTheme } from '@shared/theme';

interface Props {
  series: Series;
  onPress: () => void;
  columns?: number;
}

export function SeriesGridItem({ series, onPress, columns = 3 }: Props) {
  const { credentials } = useAuth();
  const { colors, radii, typography, spacing } = useTheme();
  if (!credentials) {
    return null;
  }
  const hasProgress = series.booksInProgressCount > 0;
  const badgeCount = hasProgress ? series.booksInProgressCount : series.booksUnreadCount;

  return (
    <TouchableOpacity style={[styles.card, { width: `${100 / columns - 2}%` }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.shadowWrapper, { shadowColor: colors.label }]}>
        <View
          style={[
            styles.coverWrapper,
            { borderRadius: radii.md, backgroundColor: colors.tertiaryBackground },
          ]}>
          <CoverImage uri={seriesThumbnailUrl(credentials.baseUrl, series.id)} style={styles.cover} />
          <Badge count={badgeCount} tone={hasProgress ? 'progress' : 'accent'} />
        </View>
      </View>
      <Text
        numberOfLines={2}
        style={[typography.footnote, { color: colors.label, marginTop: spacing.xs }]}>
        {series.metadata.title || series.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 18 },
  shadowWrapper: {
    aspectRatio: 2 / 3,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 3 },
    }),
  },
  coverWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: '100%' },
});
