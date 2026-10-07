import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Series } from '../types/komga';
import { CoverImage } from './CoverImage';
import { seriesThumbnailUrl } from '../api/komga';
import { useAuth } from '../auth/AuthContext';

interface Props {
  series: Series;
  onPress: () => void;
}

export function SeriesGridItem({ series, onPress }: Props) {
  const { credentials } = useAuth();
  if (!credentials) {
    return null;
  }
  const unread = series.booksUnreadCount + series.booksInProgressCount;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.coverWrapper}>
        <CoverImage
          uri={seriesThumbnailUrl(credentials.baseUrl, series.id)}
          style={styles.cover}
        />
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread}</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={styles.title}>
        {series.metadata.title || series.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: '31%', marginBottom: 18 },
  coverWrapper: {
    aspectRatio: 2 / 3,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1c1c22',
  },
  cover: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#5865f2',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  title: { color: '#e4e4e9', fontSize: 12, marginTop: 6 },
});
