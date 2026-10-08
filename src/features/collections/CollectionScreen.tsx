import React, { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import { getCollectionSeries } from '@shared/api/komga';
import { EmptyState } from '@shared/components';
import { useTheme } from '@shared/theme';
import { Series } from '@shared/types/komga';
import { SeriesGridItem } from '@features/library/components/SeriesGridItem';
import { useGridColumns } from '@shared/utils/useGridColumns';

type Props = NativeStackScreenProps<RootStackParamList, 'Collection'>;

const PAGE_SIZE = 24;

export function CollectionScreen({ route, navigation }: Props) {
  const { collectionId, title } = route.params;
  const { api } = useAuth();
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const columns = useGridColumns();

  const seriesQuery = useInfiniteQuery({
    queryKey: ['collection', collectionId, 'series'],
    queryFn: ({ pageParam = 0 }) => getCollectionSeries(api!, collectionId, pageParam, PAGE_SIZE),
    enabled: !!api,
    initialPageParam: 0,
    getNextPageParam: lastPage => (lastPage.last ? undefined : lastPage.number + 1),
  });

  const series: Series[] = useMemo(
    () => seriesQuery.data?.pages.flatMap(p => p.content) ?? [],
    [seriesQuery.data],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Text
        style={[
          typography.title,
          { color: colors.label, paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md },
        ]}
        numberOfLines={2}>
        {title}
      </Text>

      {seriesQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={series}
          keyExtractor={item => item.id}
          numColumns={columns}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
          refreshControl={
            <RefreshControl
              refreshing={seriesQuery.isRefetching && !seriesQuery.isFetchingNextPage}
              onRefresh={() => {
                seriesQuery.refetch();
              }}
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
              columns={columns}
              series={item}
              onPress={() =>
                navigation.navigate('Series', {
                  seriesId: item.id,
                  title: item.metadata.title || item.name,
                })
              }
            />
          )}
          ListEmptyComponent={<EmptyState message="Esta colección no tiene series." />}
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
  row: { justifyContent: 'space-between' },
  loader: { marginTop: 40 },
});
