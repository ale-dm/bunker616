import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import { getBookPages, getSeriesBooks, getSeriesById, seriesThumbnailUrl, updateReadProgress } from '@shared/api/komga';
import { getAuthHeader } from '@shared/api/client';
import { downloadBook, getOfflineRecords } from '@features/offline/offlineStore';
import { markSeriesSeen } from '@features/library/seriesSeen';
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

const SORT_OPTIONS: { value: 'number' | 'date'; label: string }[] = [
  { value: 'number', label: 'Por número' },
  { value: 'date', label: 'Por fecha' },
];

const STATUS_FILTERS: { value: 'all' | 'unread' | 'inProgress' | 'read'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'unread', label: 'Sin leer' },
  { value: 'inProgress', label: 'En progreso' },
  { value: 'read', label: 'Leídos' },
];

export function SeriesScreen({ route, navigation }: Props) {
  const { seriesId, title } = route.params;
  const { api, credentials } = useAuth();
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [isFavorite, setIsFavorite] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [sortMode, setSortMode] = useState<'number' | 'date'>('number');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'inProgress' | 'read'>('all');
  const [seriesDownload, setSeriesDownload] = useState<{ done: number; total: number } | null>(null);
  const cancelDownloadRef = useRef(false);

  useEffect(() => {
    getFavoriteIds().then(ids => setIsFavorite(ids.includes(seriesId)));
  }, [seriesId]);

  useEffect(() => () => {
    markSeriesSeen(seriesId);
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
    queryFn: () => getSeriesBooks(api!, seriesId, 0, 500),
    enabled: !!api,
  });

  const visibleBooks = useMemo(() => {
    const books = booksQuery.data?.content ?? [];
    const filtered = books.filter(book => {
      const progress = book.readProgress;
      switch (statusFilter) {
        case 'unread':
          return !progress;
        case 'inProgress':
          return !!progress && !progress.completed;
        case 'read':
          return !!progress?.completed;
        default:
          return true;
      }
    });
    if (sortMode === 'date') {
      return [...filtered].sort((a, b) => (a.metadata.releaseDate ?? '').localeCompare(b.metadata.releaseDate ?? ''));
    }
    return filtered;
  }, [booksQuery.data, sortMode, statusFilter]);

  const downloadSeries = async () => {
    if (!api || !credentials || !booksQuery.data) {
      return;
    }
    const authHeader = getAuthHeader(credentials);
    const downloaded = new Set((await getOfflineRecords()).map(record => record.bookId));
    const pending = booksQuery.data.content.filter(book => !downloaded.has(book.id));
    cancelDownloadRef.current = false;
    setSeriesDownload({ done: 0, total: pending.length });
    try {
      for (let index = 0; index < pending.length; index++) {
        if (cancelDownloadRef.current) {
          break;
        }
        const book = pending[index];
        const pages = await getBookPages(api, book.id);
        await downloadBook({
          baseUrl: credentials.baseUrl,
          authHeader,
          bookId: book.id,
          title: book.metadata.title || book.name,
          pages,
        });
        setSeriesDownload({ done: index + 1, total: pending.length });
      }
    } catch (error) {
      Alert.alert('Descarga fallida', error instanceof Error ? error.message : 'Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setSeriesDownload(null);
    }
  };

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

      <View style={[styles.controlRow, { marginTop: spacing.lg }]}>
        {SORT_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setSortMode(option.value)}
            style={[
              styles.controlChip,
              { borderRadius: radii.pill, backgroundColor: sortMode === option.value ? colors.accent : colors.secondaryBackground },
            ]}>
            <Text style={[typography.footnote, { color: sortMode === option.value ? '#FFFFFF' : colors.label }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.controlRow, { marginTop: spacing.sm }]}>
        {STATUS_FILTERS.map(option => (
          <TouchableOpacity
            key={option.value}
            onPress={() => setStatusFilter(option.value)}
            style={[
              styles.controlChip,
              { borderRadius: radii.pill, backgroundColor: statusFilter === option.value ? colors.accent : colors.secondaryBackground },
            ]}>
            <Text style={[typography.footnote, { color: statusFilter === option.value ? '#FFFFFF' : colors.label }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.controlRow, { marginTop: spacing.md }]}>
        {seriesDownload ? (
          <TouchableOpacity
            onPress={() => {
              cancelDownloadRef.current = true;
            }}
            style={[styles.controlChip, { borderRadius: radii.pill, backgroundColor: colors.secondaryBackground }]}>
            <Text style={[typography.footnote, { color: colors.label }]}>
              Descargando serie {seriesDownload.done}/{seriesDownload.total} · Cancelar
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={downloadSeries}
            style={[styles.controlChip, { borderRadius: radii.pill, backgroundColor: colors.secondaryBackground }]}>
            <Text style={[typography.footnote, { color: colors.accent, fontWeight: '600' }]}>
              Descargar serie para leer sin conexión
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {booksQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={visibleBooks}
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
  controlRow: { flexDirection: 'row', flexWrap: 'wrap' },
  controlChip: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 4 },
});
