import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import { getReadListBooks, updateReadProgress } from '@shared/api/komga';
import { EmptyState } from '@shared/components';
import { useTheme } from '@shared/theme';
import { BookListItem } from '@features/series/components/BookListItem';

type Props = NativeStackScreenProps<RootStackParamList, 'ReadList'>;

export function ReadListScreen({ route, navigation }: Props) {
  const { readListId, title } = route.params;
  const { api } = useAuth();
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const booksQueryKey = ['readlist', readListId, 'books'];

  const booksQuery = useQuery({
    queryKey: booksQueryKey,
    queryFn: () => getReadListBooks(api!, readListId),
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
      <Text
        style={[
          typography.title,
          { color: colors.label, paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md },
        ]}
        numberOfLines={2}>
        {title}
      </Text>

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
                  seriesId: item.seriesId,
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
          ListEmptyComponent={<EmptyState message="Esta read list no tiene libros." />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 40 },
});
