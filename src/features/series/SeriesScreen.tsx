import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import { getSeriesBooks, updateReadProgress } from '@shared/api/komga';
import { getFavoriteIds, toggleFavorite } from '@features/library/favorites';
import { useTheme } from '@shared/theme';
import { BookListItem } from './components/BookListItem';

type Props = NativeStackScreenProps<RootStackParamList, 'Series'>;

export function SeriesScreen({ route, navigation }: Props) {
  const { seriesId, title } = route.params;
  const { api } = useAuth();
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    getFavoriteIds().then(ids => setIsFavorite(ids.includes(seriesId)));
  }, [seriesId]);

  const onToggleFavorite = async () => {
    const ids = await toggleFavorite(seriesId);
    setIsFavorite(ids.includes(seriesId));
  };

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md }]}>
        <Text style={[typography.title, { color: colors.label, flex: 1 }]} numberOfLines={2}>
          {title}
        </Text>
        <TouchableOpacity
          onPress={onToggleFavorite}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginLeft: spacing.sm }}>
          <Text style={{ fontSize: 24, color: isFavorite ? colors.progress : colors.secondaryLabel }}>
            {isFavorite ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      </View>

      {booksQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={booksQuery.data?.content ?? []}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
          refreshControl={
            <RefreshControl
              refreshing={booksQuery.isRefetching}
              onRefresh={() => {
                booksQuery.refetch();
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
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  loader: { marginTop: 40 },
});
