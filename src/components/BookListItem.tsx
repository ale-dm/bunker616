import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Book } from '../types/komga';
import { CoverImage } from './CoverImage';
import { bookThumbnailUrl } from '../api/komga';
import { useAuth } from '../auth/AuthContext';

interface Props {
  book: Book;
  onPress: () => void;
}

export function BookListItem({ book, onPress }: Props) {
  const { credentials } = useAuth();
  if (!credentials) {
    return null;
  }
  const progress = book.readProgress;
  const isRead = progress?.completed;
  const percent = progress
    ? Math.min(
        100,
        Math.round((progress.page / Math.max(book.media.pagesCount, 1)) * 100),
      )
    : 0;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.coverWrapper}>
        <CoverImage
          uri={bookThumbnailUrl(credentials.baseUrl, book.id)}
          style={styles.cover}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {book.metadata.title || book.name}
        </Text>
        <Text style={styles.subtitle}>
          {book.media.pagesCount} páginas
          {isRead ? ' · Leído' : progress ? ` · ${percent}%` : ''}
        </Text>
        {!isRead && progress && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 14, alignItems: 'center' },
  coverWrapper: {
    width: 56,
    aspectRatio: 2 / 3,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#1c1c22',
  },
  cover: { width: '100%', height: '100%' },
  info: { flex: 1, marginLeft: 12 },
  title: { color: '#e4e4e9', fontSize: 14, fontWeight: '600' },
  subtitle: { color: '#8b8b96', fontSize: 12, marginTop: 4 },
  progressTrack: {
    height: 4,
    backgroundColor: '#2a2a33',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#5865f2' },
});
