import React, { useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';
import { getLibraries, getSeries } from '../api/komga';
import { SeriesGridItem } from '../components/SeriesGridItem';
import { Series } from '../types/komga';

type Props = NativeStackScreenProps<RootStackParamList, 'Library'>;

const PAGE_SIZE = 24;

export function LibraryScreen({ navigation }: Props) {
  const { api, logout, credentials } = useAuth();
  const [libraryId, setLibraryId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');

  const librariesQuery = useQuery({
    queryKey: ['libraries'],
    queryFn: () => getLibraries(api!),
    enabled: !!api,
  });

  const seriesQuery = useInfiniteQuery({
    queryKey: ['series', libraryId, search],
    queryFn: ({ pageParam = 0 }) =>
      getSeries(api!, { libraryId, search, page: pageParam, size: PAGE_SIZE }),
    enabled: !!api,
    initialPageParam: 0,
    getNextPageParam: lastPage =>
      lastPage.last ? undefined : lastPage.number + 1,
  });

  const series: Series[] = useMemo(
    () => seriesQuery.data?.pages.flatMap(p => p.content) ?? [],
    [seriesQuery.data],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {credentials ? new URL(credentials.baseUrl).host : 'Bunker616'}
        </Text>
        <TouchableOpacity onPress={() => logout()}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Buscar series..."
        placeholderTextColor="#777"
        value={search}
        onChangeText={setSearch}
      />

      {librariesQuery.data && librariesQuery.data.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.libraryTabs}
          data={[{ id: undefined, name: 'Todas' }, ...librariesQuery.data]}
          keyExtractor={item => item.id ?? 'all'}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.libraryTab,
                libraryId === item.id && styles.libraryTabActive,
              ]}
              onPress={() => setLibraryId(item.id)}>
              <Text
                style={[
                  styles.libraryTabText,
                  libraryId === item.id && styles.libraryTabTextActive,
                ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {seriesQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color="#5865f2" />
      ) : (
        <FlatList
          data={series}
          keyExtractor={item => item.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
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
          ListEmptyComponent={
            <Text style={styles.empty}>No se encontraron series.</Text>
          }
          ListFooterComponent={
            seriesQuery.isFetchingNextPage ? (
              <ActivityIndicator color="#5865f2" />
            ) : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f12', paddingTop: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  logout: { color: '#ff6b6b', fontSize: 14 },
  search: {
    marginHorizontal: 16,
    backgroundColor: '#1c1c22',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a33',
  },
  libraryTabs: { flexGrow: 0, marginBottom: 10, paddingLeft: 16 },
  libraryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1c1c22',
    marginRight: 8,
  },
  libraryTabActive: { backgroundColor: '#5865f2' },
  libraryTabText: { color: '#c7c7d1', fontSize: 13 },
  libraryTabTextActive: { color: '#fff', fontWeight: '600' },
  grid: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { justifyContent: 'space-between' },
  loader: { marginTop: 40 },
  empty: { color: '#777', textAlign: 'center', marginTop: 40 },
});
