import { seriesCoverUri } from '@features/library/coverStore';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Series } from '@shared/types/komga';
import { CoverImage, Badge } from '@shared/components';
import { useAuth } from '@features/auth/AuthContext';
import { useTheme } from '@shared/theme';

interface Props {
  series: Series;
  onPress: () => void;
}

export function SeriesListItem({ series, onPress }: Props) {
  const { credentials } = useAuth();
  const { colors, radii, spacing, typography } = useTheme();
  if (!credentials) {
    return null;
  }
  const hasProgress = series.booksInProgressCount > 0;
  const badgeCount = hasProgress ? series.booksInProgressCount : series.booksUnreadCount;

  return (
    <TouchableOpacity
      style={[styles.row, { paddingVertical: spacing.sm }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.coverWrapper, { borderRadius: radii.sm, backgroundColor: colors.tertiaryBackground }]}>
        <CoverImage uri={seriesCoverUri(credentials.baseUrl, series.id)} style={styles.cover} />
        <Badge count={badgeCount} tone={hasProgress ? 'progress' : 'accent'} />
      </View>
      <View style={[styles.info, { marginLeft: spacing.md }]}>
        <Text style={[typography.headline, { color: colors.label }]} numberOfLines={1}>
          {series.metadata.title || series.name}
        </Text>
        <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]}>
          {series.booksCount} números
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  coverWrapper: { width: 48, aspectRatio: 2 / 3, overflow: 'hidden' },
  cover: { width: '100%', height: '100%' },
  info: { flex: 1 },
});
