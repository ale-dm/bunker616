import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import {
  buildSeriesSearchQuery,
  getCollections,
  getLibraries,
  getReadLists,
  getSeries,
  getSeriesById,
  SeriesSearchFilters,
  SeriesSort,
} from '@shared/api/komga';
import { getFavoriteIds } from './favorites';
import { CustomListsModal } from './components/CustomListsModal';
import { CustomList, getCustomLists } from './customLists';
import { useGridColumns } from '@shared/utils/useGridColumns';
import { Chip, EmptyState } from '@shared/components';
import { useTheme } from '@shared/theme';
import { Series } from '@shared/types/komga';
import { SeriesGridItem } from './components/SeriesGridItem';
import { SeriesListItem } from './components/SeriesListItem';

const PAGE_SIZE = 24;
const VIEW_MODE_KEY = 'bunker616.libraryViewMode';

type ViewMode = 'grid' | 'list';

const SORT_OPTIONS: { value: SeriesSort; label: string }[] = [
  { value: 'title', label: 'Título' },
  { value: 'recent', label: 'Recientes' },
];

const STATUS_OPTIONS: { value: SeriesSearchFilters['status']; label: string }[] = [
  { value: undefined, label: 'Cualquiera' },
  { value: 'ongoing', label: 'En curso' },
  { value: 'ended', label: 'Terminada' },
  { value: 'hiatus', label: 'En pausa' },
  { value: 'abandoned', label: 'Abandonada' },
];

export function LibraryScreen({ navigation, route }: LibraryScreenProps) {
  const { api } = useAuth();
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const columns = useGridColumns();
  const [libraryId, setLibraryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SeriesSort>('title');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [showListsModal, setShowListsModal] = useState(false);
  const [browseListId, setBrowseListId] = useState<string | undefined>(undefined);

  const reloadCustomLists = () => {
    getCustomLists().then(setCustomLists);
  };
  useFocusEffect(useCallback(() => {
    reloadCustomLists();
  }, []));

  useFocusEffect(
    useCallback(() => {
      getFavoriteIds().then(setFavoriteIds);
    }, []),
  );
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [status, setStatus] = useState<SeriesSearchFilters['status']>(undefined);
  const [draftAuthor, setDraftAuthor] = useState('');
  const [draftGenre, setDraftGenre] = useState('');
  const [draftStatus, setDraftStatus] = useState<SeriesSearchFilters['status']>(undefined);

  const presetGenre = route.params?.presetGenre;
  useEffect(() => {
    if (presetGenre) {
      setGenre(presetGenre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetGenre]);

  const hasActiveFilters = !!author || !!genre || !!status;

  const openFilters = () => {
    setDraftAuthor(author);
    setDraftGenre(genre);
    setDraftStatus(status);
    setShowFilters(true);
  };

  const applyFilters = () => {
    setAuthor(draftAuthor);
    setGenre(draftGenre);
    setStatus(draftStatus);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setDraftAuthor('');
    setDraftGenre('');
    setDraftStatus(undefined);
    setAuthor('');
    setGenre('');
    setStatus(undefined);
    setShowFilters(false);
  };

  const effectiveSearch = buildSeriesSearchQuery({ title: search, author, genre, status });

  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_KEY).then(stored => {
      if (stored === 'grid' || stored === 'list') {
        setViewMode(stored);
      }
    });
  }, []);

  const toggleViewMode = () => {
    const next = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(next);
    AsyncStorage.setItem(VIEW_MODE_KEY, next);
  };

  const librariesQuery = useQuery({
    queryKey: ['libraries'],
    queryFn: () => getLibraries(api!),
    enabled: !!api,
  });

  const collectionsQuery = useQuery({
    queryKey: ['collections'],
    queryFn: () => getCollections(api!),
    enabled: !!api,
  });

  const readListsQuery = useQuery({
    queryKey: ['readlists'],
    queryFn: () => getReadLists(api!),
    enabled: !!api,
  });

  const seriesQuery = useInfiniteQuery({
    queryKey: ['series', libraryId, effectiveSearch, sort],
    queryFn: ({ pageParam = 0 }) =>
      getSeries(api!, { libraryId, search: effectiveSearch, sort, page: pageParam, size: PAGE_SIZE }),
    enabled: !!api,
    initialPageParam: 0,
    getNextPageParam: lastPage => (lastPage.last ? undefined : lastPage.number + 1),
  });

  const favoritesQuery = useQuery({
    queryKey: ['favorites', favoriteIds],
    queryFn: () => Promise.all(favoriteIds.map(id => getSeriesById(api!, id))),
    enabled: !!api && favoritesOnly && favoriteIds.length > 0,
  });

  const handleRefresh = () => {
    librariesQuery.refetch();
    collectionsQuery.refetch();
    readListsQuery.refetch();
    if (favoritesOnly) {
      favoritesQuery.refetch();
    } else {
      seriesQuery.refetch();
    }
  };

  const series: Series[] = useMemo(() => {
    if (favoritesOnly) {
      return favoriteIds.length > 0 ? favoritesQuery.data ?? [] : [];
    }
    return seriesQuery.data?.pages.flatMap(p => p.content) ?? [];
  }, [favoritesOnly, favoriteIds, favoritesQuery.data, seriesQuery.data]);

  const isLoadingSeries = favoritesOnly ? favoritesQuery.isLoading && favoriteIds.length > 0 : seriesQuery.isLoading;
  const isRefetchingSeries = favoritesOnly ? favoritesQuery.isRefetching : seriesQuery.isRefetching && !seriesQuery.isFetchingNextPage;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Text style={[typography.largeTitle, { color: colors.label, marginTop: spacing.sm }]}>
          Biblioteca
        </Text>

        <View style={[styles.searchRow, { marginTop: spacing.md }]}>
          <TextInput
            style={[
              styles.search,
              typography.body,
              {
                flex: 1,
                backgroundColor: colors.secondaryBackground,
                borderRadius: radii.md,
                color: colors.label,
              },
            ]}
            placeholder="Buscar series"
            placeholderTextColor={colors.tertiaryLabel}
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity
            onPress={openFilters}
            style={[
              styles.filterButton,
              {
                borderRadius: radii.md,
                backgroundColor: hasActiveFilters ? colors.accent : colors.secondaryBackground,
                marginLeft: spacing.sm,
              },
            ]}>
            <Text style={{ color: hasActiveFilters ? '#FFFFFF' : colors.label, fontSize: 16 }}>⚲</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showFilters}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilters(false)}>
        <TouchableOpacity
          style={styles.filtersBackdrop}
          activeOpacity={1}
          onPress={() => setShowFilters(false)}>
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.filtersSheet, { backgroundColor: colors.secondaryBackground, borderRadius: radii.lg }]}>
            <Text style={[typography.headline, { color: colors.label, marginBottom: spacing.md }]}>
              Filtros avanzados
            </Text>

            <Text style={[typography.footnote, { color: colors.secondaryLabel, marginBottom: spacing.xs }]}>
              AUTOR
            </Text>
            <TextInput
              style={[
                styles.search,
                typography.body,
                { backgroundColor: colors.background, borderRadius: radii.md, color: colors.label, marginBottom: spacing.md },
              ]}
              placeholder="p. ej. Sean Murphy"
              placeholderTextColor={colors.tertiaryLabel}
              value={draftAuthor}
              onChangeText={setDraftAuthor}
            />

            <Text style={[typography.footnote, { color: colors.secondaryLabel, marginBottom: spacing.xs }]}>
              GÉNERO
            </Text>
            <TextInput
              style={[
                styles.search,
                typography.body,
                { backgroundColor: colors.background, borderRadius: radii.md, color: colors.label, marginBottom: spacing.md },
              ]}
              placeholder="p. ej. Action"
              placeholderTextColor={colors.tertiaryLabel}
              value={draftGenre}
              onChangeText={setDraftGenre}
            />

            <Text style={[typography.footnote, { color: colors.secondaryLabel, marginBottom: spacing.xs }]}>
              ESTADO
            </Text>
            <View style={styles.statusWrap}>
              {STATUS_OPTIONS.map(option => (
                <Chip
                  key={option.label}
                  label={option.label}
                  active={draftStatus === option.value}
                  onPress={() => setDraftStatus(option.value)}
                />
              ))}
            </View>

            <View style={[styles.filtersActions, { marginTop: spacing.md }]}>
              <TouchableOpacity onPress={clearFilters} style={styles.filtersActionButton}>
                <Text style={[typography.body, { color: colors.danger }]}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={applyFilters}
                style={[styles.filtersActionButton, styles.filtersApplyButton, { backgroundColor: colors.accent, borderRadius: radii.md }]}>
                <Text style={[typography.body, { color: '#FFFFFF', fontWeight: '600' }]}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {librariesQuery.data && librariesQuery.data.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginTop: spacing.md }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          data={[{ id: undefined, name: 'Todas' }, ...librariesQuery.data]}
          keyExtractor={item => item.id ?? 'all'}
          renderItem={({ item }) => (
            <Chip label={item.name} active={libraryId === item.id} onPress={() => setLibraryId(item.id)} />
          )}
        />
      )}

      {collectionsQuery.data && collectionsQuery.data.content.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginTop: spacing.md }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          data={collectionsQuery.data.content}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.collectionCard,
                { backgroundColor: colors.secondaryBackground, borderRadius: radii.md },
              ]}
              onPress={() => navigation.navigate('Collection', { collectionId: item.id, title: item.name })}>
              <Text style={[typography.subhead, { color: colors.label, fontWeight: '600' }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[typography.caption, { color: colors.secondaryLabel, marginTop: 2 }]}>
                {item.seriesIds.length} series
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginTop: spacing.sm }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        data={[...customLists.map(list => ({ id: list.id, name: list.name, count: list.seriesIds.length })), { id: '__new', name: '+ Mis listas', count: -1 }]}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.collectionCard, { backgroundColor: colors.secondaryBackground, borderRadius: radii.md }]}
            onPress={() => {
              setBrowseListId(item.id === '__new' ? undefined : item.id);
              setShowListsModal(true);
            }}>
            <Text style={[typography.subhead, { color: colors.label, fontWeight: '600' }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.count >= 0 && (
              <Text style={[typography.caption, { color: colors.secondaryLabel, marginTop: 2 }]}>{item.count} series</Text>
            )}
          </TouchableOpacity>
        )}
      />
      <CustomListsModal
        visible={showListsModal}
        browseListId={browseListId}
        onClose={() => {
          setShowListsModal(false);
          reloadCustomLists();
        }}
        onOpenSeries={(seriesId, seriesTitle) => navigation.navigate('Series', { seriesId, title: seriesTitle })}
      />

      {readListsQuery.data && readListsQuery.data.content.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginTop: spacing.sm }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          data={readListsQuery.data.content}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.collectionCard,
                { backgroundColor: colors.secondaryBackground, borderRadius: radii.md },
              ]}
              onPress={() => navigation.navigate('ReadList', { readListId: item.id, title: item.name })}>
              <Text style={[typography.subhead, { color: colors.label, fontWeight: '600' }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[typography.caption, { color: colors.secondaryLabel, marginTop: 2 }]}>
                {item.bookIds.length} libros
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <View
        style={[
          styles.sortRow,
          { paddingHorizontal: spacing.lg, marginTop: spacing.sm, justifyContent: 'space-between' },
        ]}>
        <View style={styles.sortRow}>
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
        <View style={styles.sortRow}>
          <TouchableOpacity
            onPress={() => setFavoritesOnly(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ marginRight: spacing.md }}>
            <Text style={{ fontSize: 16, color: favoritesOnly ? colors.progress : colors.secondaryLabel }}>
              {favoritesOnly ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleViewMode} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[typography.footnote, { color: colors.accent, fontWeight: '600' }]}>
              {viewMode === 'grid' ? 'Ver en lista' : 'Ver en grid'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoadingSeries ? (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      ) : (
        <FlatList
          key={viewMode}
          data={series}
          keyExtractor={item => item.id}
          numColumns={viewMode === 'grid' ? columns : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.row : undefined}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl }}
          ItemSeparatorComponent={
            viewMode === 'list'
              ? () => <View style={{ height: 1, backgroundColor: colors.separator }} />
              : undefined
          }
          refreshControl={
            <RefreshControl refreshing={isRefetchingSeries} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!favoritesOnly && seriesQuery.hasNextPage && !seriesQuery.isFetchingNextPage) {
              seriesQuery.fetchNextPage();
            }
          }}
          renderItem={({ item }) => {
            const onPress = () =>
              navigation.navigate('Series', {
                seriesId: item.id,
                title: item.metadata.title || item.name,
              });
            return viewMode === 'grid' ? (
              <SeriesGridItem series={item} onPress={onPress} columns={columns} />
            ) : (
              <SeriesListItem series={item} onPress={onPress} />
            );
          }}
          ListEmptyComponent={
            <EmptyState
              message={favoritesOnly ? 'Todavía no tienes series favoritas.' : 'No se encontraron series.'}
            />
          }
          ListFooterComponent={
            !favoritesOnly && seriesQuery.isFetchingNextPage ? <ActivityIndicator color={colors.accent} /> : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  search: { paddingHorizontal: 14, paddingVertical: 10 },
  filterButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  sortRow: { flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  collectionCard: { width: 140, padding: 12, marginRight: 10 },
  row: { justifyContent: 'space-between' },
  loader: { marginTop: 40 },
  filtersBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  filtersSheet: { padding: 20 },
  statusWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  filtersActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filtersActionButton: { paddingVertical: 10, paddingHorizontal: 16 },
  filtersApplyButton: { flex: 1, alignItems: 'center', marginLeft: 12 },
});
