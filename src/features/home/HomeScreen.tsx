import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreenProps } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import { bookThumbnailUrl, getBooksInProgress, getSeries } from '@shared/api/komga';
import { CoverImage, EmptyState } from '@shared/components';
import { useTheme } from '@shared/theme';
import { SeriesGridItem } from '@features/library/components/SeriesGridItem';

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { api, credentials } = useAuth();
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();

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

  const hasInProgress = !inProgressQuery.isError && (inProgressQuery.data?.content.length ?? 0) > 0;
  const hasRecent = (recentQuery.data?.content.length ?? 0) > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Text style={[typography.largeTitle, { color: colors.label, paddingHorizontal: spacing.lg, marginTop: spacing.sm }]}>
        Inicio
      </Text>

      {hasInProgress && (
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
            data={inProgressQuery.data?.content ?? []}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.continueCard}
                onPress={() =>
                  navigation.navigate('Reader', {
                    bookId: item.id,
                    title: item.metadata.title || item.name,
                    seriesId: item.seriesId,
                  })
                }>
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
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
          renderItem={({ item }) => (
            <SeriesGridItem
              series={item}
              onPress={() =>
                navigation.navigate('Series', { seriesId: item.id, title: item.metadata.title || item.name })
              }
            />
          )}
        />
      ) : (
        <EmptyState message="Todavía no hay series en la biblioteca." />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { justifyContent: 'space-between' },
  continueCard: { width: 110, marginRight: 12 },
  continueCover: { aspectRatio: 2 / 3, overflow: 'hidden' },
  continueCoverImage: { width: '100%', height: '100%' },
});
