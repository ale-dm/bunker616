import React, { useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LibraryScreenProps } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import { getLibraries, getSeries, SeriesSort } from '@shared/api/komga';
import { EmptyState } from '@shared/components';
import { useTheme } from '@shared/theme';
import { Series } from '@shared/types/komga';
import { SeriesGridItem } from './components/SeriesGridItem';

const PAGE_SIZE = 24;

const SORT_OPTIONS: { value: SeriesSort; label: string }[] = [
  { value: 'title', label: 'Título' },
  { value: 'recent', label: 'Recientes' },
];

export function LibraryScreen({ navigation }: LibraryScreenProps) {
  const { api } = useAuth();
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [libraryId, setLibraryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SeriesSort>('title');

  const librariesQuery = useQuery({
    queryKey: ['libraries'],
    queryFn: () => getLibraries(api!),
    enabled: !!api,
  });

  const seriesQuery = useInfiniteQuery({
    queryKey: ['series', libraryId, search, sort],
    queryFn: ({ pageParam = 0 }) =>
      getSeries(api!, { libraryId, search, sort, page: pageParam, size: PAGE_SIZE }),
    enabled: !!api,
    initialPageParam: 0,
    getNextPageParam: lastPage => (lastPage.last ? undefined : lastPage.number + 1),
  });

  const handleRefresh = () => {
    librariesQuery.refetch();
    seriesQuery.refetch();
  };

  const series: Series[] = useMemo(
    () => seriesQuery.data?.pages.flatMap(p => p.content) ?? [],
    [seriesQuery.data],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Text style={[typography.largeTitle, { color: colors.label, marginTop: spacing.sm }]}>
          Biblioteca
        </Text>

        <TextInput
          style={[
            styles.search,
            typography.body,
            {
              backgroundColor: colors.secondaryBackground,
              borderRadius: radii.md,
              color: colors.label,
              marginTop: spacing.md,
            },
          ]}
          placeholder="Buscar series"
          placeholderTextColor={colors.tertiaryLabel}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {librariesQuery.data && librariesQuery.data.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginTop: spacing.md }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          data={[{ id: undefined, name: 'Todas' }, ...librariesQuery.data]}
          keyExtractor={item => item.id ?? 'all'}
          renderItem={({ item }) => {
            const active = libraryId === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    borderRadius: radii.pill,
                    backgroundColor: active ? colors.accent : colors.secondaryBackground,
                  },
                ]}
                onPress={() => setLibraryId(item.id)}>
                <Text
                  style={[
                    typography.subhead,
                    { color: active ? '#FFFFFF' : colors.label, fontWeight: active ? '600' : '400' },
                  ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <View style={[styles.sortRow, { paddingHorizontal: spacing.lg, marginTop: spacing.sm }]}>
        <Text style={[typography.footnote, { color: colors.secondaryLabel, marginRight: spacing.sm }]}>
          Ordenar:
        </Text>
        {SORT_OPTIONS.map(option => {
          const active = sort === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => setSort(option.value)}
              style={{ marginRight: spacing.md }}>
              <Text
                style={[
                  typography.footnote,
                  { color: active ? colors.accent : colors.secondaryLabel, fontWeight: active ? '700' : '400' },
                ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {seriesQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={series}
          keyExtractor={item => item.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl }}
          refreshControl={
            <RefreshControl
              refreshing={seriesQuery.isRefetching && !seriesQuery.isFetchingNextPage}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
            />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (seriesQuery.hasNextPage && !seriesQuery.isFetchingNextPage) {
              seriesQuery.fetchNextPage();
            }
          }}
          renderItem={({ item }) => (
            <SeriesGridItem
              series={item}
              onPress={() =>
                navigation.navigate('Series', {
                  seriesId: item.id,
                  title: item.metadata.title || item.name,
                })
              }
            />
          )}
          ListEmptyComponent={<EmptyState message="No se encontraron series." />}
          ListFooterComponent={
            seriesQuery.isFetchingNextPage ? <ActivityIndicator color={colors.accent} /> : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: { paddingHorizontal: 14, paddingVertical: 10 },
  sortRow: { flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  row: { justifyContent: 'space-between' },
  loader: { marginTop: 40 },
});
