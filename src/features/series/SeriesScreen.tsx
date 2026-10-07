import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import { getSeriesBooks } from '@shared/api/komga';
import { useTheme } from '@shared/theme';
import { BookListItem } from './components/BookListItem';

type Props = NativeStackScreenProps<RootStackParamList, 'Series'>;

export function SeriesScreen({ route, navigation }: Props) {
  const { seriesId, title } = route.params;
  const { api } = useAuth();
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const booksQuery = useQuery({
    queryKey: ['series', seriesId, 'books'],
    queryFn: () => getSeriesBooks(api!, seriesId),
    enabled: !!api,
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
});
