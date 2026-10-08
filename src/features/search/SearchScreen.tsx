import { seriesCoverUri } from '@features/library/coverStore';
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import { bookThumbnailUrl, getCollections, getSeries, searchBooks } from '@shared/api/komga';
import { CoverImage, EmptyState } from '@shared/components';
import { useTheme } from '@shared/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 12;

export function SearchScreen({ navigation }: Props) {
  const { api, credentials } = useAuth();
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setTerm(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const enabled = !!api && term.length > 0;

  const seriesQuery = useQuery({
    queryKey: ['search', 'series', term],
    queryFn: () => getSeries(api!, { search: term, size: RESULT_LIMIT }),
    enabled,
  });

  const booksQuery = useQuery({
    queryKey: ['search', 'books', term],
    queryFn: () => searchBooks(api!, term, RESULT_LIMIT),
    enabled,
  });

  const collectionsQuery = useQuery({
    queryKey: ['collections'],
    queryFn: () => getCollections(api!),
    enabled,
  });

  const matchingCollections = (collectionsQuery.data?.content ?? []).filter(collection =>
    collection.name.toLowerCase().includes(term.toLowerCase()),
  );

  const isLoading = enabled && (seriesQuery.isLoading || booksQuery.isLoading);
  const noResults =
    enabled &&
    !isLoading &&
    !seriesQuery.data?.content.length &&
    !booksQuery.data?.content.length &&
    !matchingCollections.length;

  const sectionTitle = (label: string) => (
    <Text
      style={[
        typography.footnote,
        { color: colors.secondaryLabel, marginTop: spacing.lg, marginBottom: spacing.xs, textTransform: 'uppercase' },
      ]}>
      {label}
    </Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[typography.body, { color: colors.accent }]}>‹ Volver</Text>
        </TouchableOpacity>
        <TextInput
          autoFocus
          value={input}
          onChangeText={setInput}
          placeholder="Series, números o colecciones"
          placeholderTextColor={colors.tertiaryLabel}
          returnKeyType="search"
          style={[
            styles.input,
            typography.body,
            { backgroundColor: colors.secondaryBackground, borderRadius: radii.md, color: colors.label, marginTop: spacing.sm },
          ]}
        />
      </View>

      {!enabled ? (
        <EmptyState message="Escribe para buscar en tu servidor." />
      ) : isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      ) : noResults ? (
        <EmptyState message={`Sin resultados para "${term}".`} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
          {!!seriesQuery.data?.content.length && (
            <>
              {sectionTitle('Series')}
              {seriesQuery.data.content.map(series => (
                <TouchableOpacity
                  key={series.id}
                  style={styles.row}
                  onPress={() =>
                    navigation.navigate('Series', { seriesId: series.id, title: series.metadata.title || series.name })
                  }>
                  <View style={[styles.thumb, { borderRadius: radii.sm, backgroundColor: colors.tertiaryBackground }]}>
                    <CoverImage uri={seriesCoverUri(credentials!.baseUrl, series.id)} style={styles.thumbImage} />
                  </View>
                  <Text style={[typography.body, { color: colors.label, flex: 1 }]} numberOfLines={2}>
                    {series.metadata.title || series.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {!!booksQuery.data?.content.length && (
            <>
              {sectionTitle('Números')}
              {booksQuery.data.content.map(book => (
                <TouchableOpacity
                  key={book.id}
                  style={styles.row}
                  onPress={() =>
                    navigation.navigate('Reader', {
                      bookId: book.id,
                      title: book.metadata.title || book.name,
                      seriesId: book.seriesId,
                    })
                  }>
                  <View style={[styles.thumb, { borderRadius: radii.sm, backgroundColor: colors.tertiaryBackground }]}>
                    <CoverImage uri={bookThumbnailUrl(credentials!.baseUrl, book.id)} style={styles.thumbImage} />
                  </View>
                  <Text style={[typography.body, { color: colors.label, flex: 1 }]} numberOfLines={2}>
                    {book.metadata.title || book.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {!!matchingCollections.length && (
            <>
              {sectionTitle('Colecciones')}
              {matchingCollections.map(collection => (
                <TouchableOpacity
                  key={collection.id}
                  style={styles.row}
                  onPress={() => navigation.navigate('Collection', { collectionId: collection.id, title: collection.name })}>
                  <Text style={[typography.body, { color: colors.label, flex: 1 }]} numberOfLines={1}>
                    {collection.name}
                  </Text>
                  <Text style={[typography.footnote, { color: colors.secondaryLabel }]}>
                    {collection.seriesIds.length} series
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 8 },
  input: { paddingHorizontal: 14, paddingVertical: 10 },
  loader: { marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  thumb: { width: 44, aspectRatio: 2 / 3, overflow: 'hidden', marginRight: 12 },
  thumbImage: { width: '100%', height: '100%' },
});
