import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreenProps } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import {
  bookThumbnailUrl,
  getBooksInProgress,
  getSeries,
  getSeriesById,
  getSeriesBooks,
  seriesThumbnailUrl,
  buildSeriesSearchQuery,
} from '@shared/api/komga';
import { getFavoriteIds } from '@features/library/favorites';
import { getSeriesLastSeen } from '@features/library/seriesSeen';
import { CoverImage, EmptyState } from '@shared/components';
import { useTheme } from '@shared/theme';
import { SeriesGridItem } from '@features/library/components/SeriesGridItem';
import { useGridColumns } from '@shared/utils/useGridColumns';

// Accesos rápidos por género, al estilo de los módulos "Characters" /
// "Creators" de Marvel Unlimited: entradas temáticas a la biblioteca en
// lugar de una única lista plana.
const GENRE_SHORTCUTS = [
  'Acción',
  'Superhéroes',
  'Fantasía',
  'Ciencia ficción',
  'Terror',
  'Comedia',
  'Drama',
  'Misterio',
];

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { api, credentials } = useAuth();
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const columns = useGridColumns();

  const inProgressQuery = useQuery({
    queryKey: ['home', 'in-progress'],
    queryFn: () => getBooksInProgress(api!, 10),
    enabled: !!api,
    retry: false,
  });

  const recentQuery = useQuery({
    queryKey: ['home', 'recent'],
    queryFn: () => getSeries(api!, { sort: 'recent', size: 10 }),
    enabled: !!api,
  });

  const queryClient = useQueryClient();
  const followedQuery = useQuery({
    queryKey: ['home', 'following'],
    queryFn: async () => {
      const ids = await getFavoriteIds();
      const lastSeen = await getSeriesLastSeen();
      const entries = await Promise.all(
        ids.map(async id => {
          const [series, books] = await Promise.all([getSeriesById(api!, id), getSeriesBooks(api!, id, 0, 500)]);
          const since = lastSeen[id] ? Date.parse(lastSeen[id]) : undefined;
          const newCount =
            since === undefined ? 0 : books.content.filter(b => b.created && Date.parse(b.created) > since).length;
          return { series, newCount };
        }),
      );
      return entries.filter(entry => entry.newCount > 0);
    },
    enabled: !!api,
  });

  const readingSeriesIds = [...new Set((inProgressQuery.data?.content ?? []).map(book => book.seriesId))].slice(0, 5);
  const recommendationQuery = useQuery({
    queryKey: ['home', 'recommendations', readingSeriesIds.join(',')],
    queryFn: async () => {
      const readingSeries = await Promise.all(readingSeriesIds.map(id => getSeriesById(api!, id)));
      const genreCounts = new Map<string, number>();
      readingSeries.forEach(series =>
        (series.metadata.genres ?? []).forEach(genre => genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1)),
      );
      const topGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!topGenre) {
        return null;
      }
      const result = await getSeries(api!, {
        search: buildSeriesSearchQuery({ genre: topGenre }),
        size: 12,
        sort: 'title',
      });
      const candidates = result.content.filter(
        series => series.booksReadCount === 0 && !readingSeriesIds.includes(series.id),
      );
      return candidates.length ? { genre: topGenre, series: candidates } : null;
    },
    enabled: !!api && readingSeriesIds.length > 0,
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['home', 'following'] });
    }, [queryClient]),
  );

  const inProgressItems = inProgressQuery.isError ? [] : inProgressQuery.data?.content ?? [];
  const heroItem = inProgressItems[0];
  const railItems = inProgressItems.slice(1);
  const hasRecent = (recentQuery.data?.content.length ?? 0) > 0;

  const goToReader = (item: { id: string; seriesId: string; metadata: { title?: string }; name: string }) =>
    navigation.navigate('Reader', {
      bookId: item.id,
      title: item.metadata.title || item.name,
      seriesId: item.seriesId,
    });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerBanner, { paddingTop: insets.top + spacing.sm }]}>
        <View style={[styles.headerStripe, { backgroundColor: colors.progress }]} />
        <View style={[styles.headerRow, { paddingHorizontal: spacing.lg }]}>
          <Text style={[typography.largeTitle, styles.headerTitle, { color: colors.label }]}>Inicio</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 22, color: colors.accent }}>⌕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
        {heroItem && (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <Text style={[typography.headline, { color: colors.label, marginBottom: spacing.sm }]}>
              Sigue leyendo
            </Text>
            <TouchableOpacity
              style={[
                styles.heroCard,
                { backgroundColor: colors.card, borderRadius: radii.lg, borderLeftColor: colors.progress },
              ]}
              onPress={() => goToReader(heroItem)}>
              <View style={[styles.heroCover, { borderRadius: radii.md, backgroundColor: colors.tertiaryBackground }]}>
                <CoverImage uri={bookThumbnailUrl(credentials!.baseUrl, heroItem.id)} style={styles.heroCoverImage} />
              </View>
              <View style={styles.heroInfo}>
                <Text style={[typography.footnote, { color: colors.progress, fontWeight: '700' }]}>
                  CONTINUAR
                </Text>
                <Text style={[typography.headline, { color: colors.label, marginTop: spacing.xs }]} numberOfLines={2}>
                  {heroItem.metadata.title || heroItem.name}
                </Text>
                <View
                  style={[
                    styles.heroButton,
                    { backgroundColor: colors.accent, borderRadius: radii.pill, marginTop: spacing.sm },
                  ]}>
                  <Text style={[typography.footnote, { color: '#FFFFFF', fontWeight: '700' }]}>
                    Reanudar ▸
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {railItems.length > 0 && (
          <>
            <Text
              style={[
                typography.headline,
                { color: colors.label, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
              ]}>
              Continuar leyendo
            </Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg }}
              data={railItems}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.continueCard} onPress={() => goToReader(item)}>
                  <View style={[styles.continueCover, { borderRadius: radii.md, backgroundColor: colors.tertiaryBackground }]}>
                    <CoverImage uri={bookThumbnailUrl(credentials!.baseUrl, item.id)} style={styles.continueCoverImage} />
                  </View>
                  <Text style={[typography.footnote, { color: colors.label, marginTop: spacing.xs }]} numberOfLines={2}>
                    {item.metadata.title || item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </>
        )}

        {!!recommendationQuery.data && (
          <>
            <Text
              style={[
                typography.headline,
                { color: colors.label, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
              ]}>
              Porque lees {recommendationQuery.data.genre}
            </Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg }}
              data={recommendationQuery.data.series}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.continueCard}
                  onPress={() =>
                    navigation.navigate('Series', { seriesId: item.id, title: item.metadata.title || item.name })
                  }>
                  <View style={[styles.continueCover, { borderRadius: radii.md, backgroundColor: colors.tertiaryBackground }]}>
                    <CoverImage uri={seriesThumbnailUrl(credentials!.baseUrl, item.id)} style={styles.continueCoverImage} />
                  </View>
                  <Text style={[typography.footnote, { color: colors.label, marginTop: spacing.xs }]} numberOfLines={2}>
                    {item.metadata.title || item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </>
        )}

        {!!followedQuery.data?.length && (
          <>
            <Text
              style={[
                typography.headline,
                { color: colors.label, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
              ]}>
              Siguiendo
            </Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg }}
              data={followedQuery.data}
              keyExtractor={item => item.series.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.continueCard}
                  onPress={() =>
                    navigation.navigate('Series', {
                      seriesId: item.series.id,
                      title: item.series.metadata.title || item.series.name,
                    })
                  }>
                  <View style={[styles.continueCover, { borderRadius: radii.md, backgroundColor: colors.tertiaryBackground }]}>
                    <CoverImage uri={seriesThumbnailUrl(credentials!.baseUrl, item.series.id)} style={styles.continueCoverImage} />
                  </View>
                  <Text style={[typography.footnote, { color: colors.label, marginTop: spacing.xs }]} numberOfLines={2}>
                    {item.series.metadata.title || item.series.name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.progress, fontWeight: '700' }]}>
                    {item.newCount} {item.newCount === 1 ? 'nuevo' : 'nuevos'}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </>
        )}

        <Text
          style={[
            typography.headline,
            { color: colors.label, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
          ]}>
          Explorar por género
        </Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          data={GENRE_SHORTCUTS}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.genreChip, { backgroundColor: colors.secondaryBackground, borderRadius: radii.md }]}
              onPress={() => navigation.navigate('LibraryTab', { presetGenre: item })}>
              <Text style={[typography.subhead, { color: colors.label, fontWeight: '600' }]}>{item}</Text>
            </TouchableOpacity>
          )}
        />

        <Text
          style={[
            typography.headline,
            { color: colors.label, paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
          ]}>
          Añadidas recientemente
        </Text>
        {hasRecent ? (
          <FlatList
            data={recentQuery.data?.content ?? []}
            keyExtractor={item => item.id}
            numColumns={columns}
            scrollEnabled={false}
            columnWrapperStyle={styles.row}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            renderItem={({ item }) => (
              <SeriesGridItem
                series={item}
                columns={columns}
                onPress={() =>
                  navigation.navigate('Series', { seriesId: item.id, title: item.metadata.title || item.name })
                }
              />
            )}
          />
        ) : (
          <EmptyState message="Todavía no hay series en la biblioteca." />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBanner: { overflow: 'hidden' },
  headerStripe: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 24,
    opacity: 0.16,
    transform: [{ rotate: '-18deg' }],
  },
  headerTitle: { paddingBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  row: { justifyContent: 'space-between' },
  continueCard: { width: 110, marginRight: 12 },
  continueCover: { aspectRatio: 2 / 3, overflow: 'hidden' },
  continueCoverImage: { width: '100%', height: '100%' },
  heroCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderLeftWidth: 4,
  },
  heroCover: { width: 80, aspectRatio: 2 / 3, overflow: 'hidden' },
  heroCoverImage: { width: '100%', height: '100%' },
  heroInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  heroButton: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6 },
  genreChip: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 10 },
});
