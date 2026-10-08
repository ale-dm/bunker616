import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import { getSeriesBooks, getSeriesById, seriesThumbnailUrl, updateReadProgress } from '@shared/api/komga';
import { getFavoriteIds, toggleFavorite } from '@features/library/favorites';
import { CoverImage } from '@shared/components';
import { useTheme } from '@shared/theme';
import { BookListItem } from './components/BookListItem';

type Props = NativeStackScreenProps<RootStackParamList, 'Series'>;

const STATUS_LABELS: Record<string, string> = {
  ONGOING: 'En curso',
  ENDED: 'Terminada',
  HIATUS: 'En pausa',
  ABANDONED: 'Abandonada',
};

export function SeriesScreen({ route, navigation }: Props) {
  const { seriesId, title } = route.params;
  const { api, credentials } = useAuth();
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [isFavorite, setIsFavorite] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  useEffect(() => {
    getFavoriteIds().then(ids => setIsFavorite(ids.includes(seriesId)));
  }, [seriesId]);

  const onToggleFavorite = async () => {
    const ids = await toggleFavorite(seriesId);
    setIsFavorite(ids.includes(seriesId));
  };

  const seriesQuery = useQuery({
    queryKey: ['series', seriesId],
    queryFn: () => getSeriesById(api!, seriesId),
    enabled: !!api,
  });

  const booksQueryKey = ['series', seriesId, 'books'];

  const booksQuery = useQuery({
    queryKey: booksQueryKey,
    queryFn: () => getSeriesBooks(api!, seriesId),
    enabled: !!api,
  });

  const toggleReadMutation = useMutation({
    mutationFn: ({
      bookId,
      completed,
      totalPages,
    }: {
      bookId: string;
      completed: boolean;
      totalPages: number;
    }) => updateReadProgress(api!, bookId, { page: completed ? totalPages : 0, completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: booksQueryKey }),
  });

  const metadata = seriesQuery.data?.metadata;
  const statusLabel = metadata?.status ? STATUS_LABELS[metadata.status] ?? metadata.status : null;

  const infoHeader = (
    <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
      <View style={styles.topRow}>
        {credentials && (
          <View style={[styles.cover, { borderRadius: radii.md, backgroundColor: colors.tertiaryBackground }]}>
            <CoverImage uri={seriesThumbnailUrl(credentials.baseUrl, seriesId)} style={styles.coverImage} />
          </View>
        )}
        <View style={[styles.infoColumn, { marginLeft: spacing.md }]}>
          <View style={styles.titleRow}>
            <Text style={[typography.title, { color: colors.label, flex: 1 }]} numberOfLines={3}>
              {metadata?.title || title}
            </Text>
            <TouchableOpacity
              onPress={onToggleFavorite}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: spacing.sm }}>
              <Text style={{ fontSize: 22, color: isFavorite ? colors.progress : colors.secondaryLabel }}>
                {isFavorite ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          </View>

          {statusLabel && (
            <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: spacing.xs }]}>
              {statusLabel}
            </Text>
          )}
          {metadata?.publisher && (
            <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]} numberOfLines={1}>
              {metadata.publisher}
            </Text>
          )}
          <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]}>
            {seriesQuery.data?.booksCount ?? 0} números
          </Text>
        </View>
      </View>

      {!!metadata?.genres?.length && (
        <View style={[styles.genreWrap, { marginTop: spacing.md }]}>
          {metadata.genres.map(genre => (
            <View
              key={genre}
              style={[styles.genreChip, { backgroundColor: colors.secondaryBackground, borderRadius: radii.pill }]}>
              <Text style={[typography.caption, { color: colors.label }]}>{genre}</Text>
            </View>
          ))}
        </View>
      )}

      {!!metadata?.summary && (
        <TouchableOpacity onPress={() => setSummaryExpanded(v => !v)} style={{ marginTop: spacing.md }}>
          <Text
            style={[typography.subhead, { color: colors.label, lineHeight: 20 }]}
            numberOfLines={summaryExpanded ? undefined : 4}>
            {metadata.summary}
          </Text>
          <Text style={[typography.footnote, { color: colors.accent, marginTop: spacing.xs }]}>
            {summaryExpanded ? 'Leer menos' : 'Leer más'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {booksQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={booksQuery.data?.content ?? []}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.sm }}
          ListHeaderComponent={infoHeader}
          refreshControl={
            <RefreshControl
              refreshing={booksQuery.isRefetching}
              onRefresh={() => {
                booksQuery.refetch();
                seriesQuery.refetch();
              }}
              tintColor={colors.accent}
            />
          }
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: colors.separator }} />
          )}
          renderItem={({ item }) => (
            <BookListItem
              book={item}
              onPress={() =>
                navigation.navigate('Reader', {
                  bookId: item.id,
                  title: item.metadata.title || item.name,
                  seriesId,
                })
              }
              onToggleRead={() =>
                toggleReadMutation.mutate({
                  bookId: item.id,
                  completed: !item.readProgress?.completed,
                  totalPages: item.media.pagesCount,
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 40 },
  topRow: { flexDirection: 'row' },
  cover: { width: 110, aspectRatio: 2 / 3, overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  infoColumn: { flex: 1, justifyContent: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  genreChip: { paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
});
