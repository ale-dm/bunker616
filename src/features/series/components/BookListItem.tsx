import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Book } from '@shared/types/komga';
import { CoverImage } from '@shared/components';
import { bookThumbnailUrl } from '@shared/api/komga';
import { useAuth } from '@features/auth/AuthContext';
import { useTheme } from '@shared/theme';

interface Props {
  book: Book;
  onPress: () => void;
}

export function BookListItem({ book, onPress }: Props) {
  const { credentials } = useAuth();
  const { colors, radii, spacing, typography } = useTheme();
  if (!credentials) {
    return null;
  }
  const progress = book.readProgress;
  const isRead = progress?.completed;
  const percent = progress
    ? Math.min(100, Math.round((progress.page / Math.max(book.media.pagesCount, 1)) * 100))
    : 0;

  return (
    <TouchableOpacity
      style={[styles.row, { paddingVertical: spacing.sm }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[styles.coverWrapper, { borderRadius: radii.sm, backgroundColor: colors.tertiaryBackground }]}>
        <CoverImage uri={bookThumbnailUrl(credentials.baseUrl, book.id)} style={styles.cover} />
      </View>
      <View style={[styles.info, { marginLeft: spacing.md }]}>
        <Text style={[typography.headline, { color: colors.label }]} numberOfLines={1}>
          {book.metadata.title || book.name}
        </Text>
        <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]}>
          {book.media.pagesCount} páginas
          {isRead ? ' · Leído' : progress ? ` · ${percent}%` : ''}
        </Text>
        {!isRead && progress && (
          <View style={[styles.progressTrack, { backgroundColor: colors.tertiaryBackground, marginTop: spacing.xs }]}>
            <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: colors.accent }]} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  coverWrapper: { width: 56, aspectRatio: 2 / 3, overflow: 'hidden' },
  cover: { width: '100%', height: '100%' },
  info: { flex: 1 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%' },
});
