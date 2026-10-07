import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';
import { getSeriesBooks } from '../api/komga';
import { BookListItem } from '../components/BookListItem';

type Props = NativeStackScreenProps<RootStackParamList, 'Series'>;

export function SeriesScreen({ route, navigation }: Props) {
  const { seriesId, title } = route.params;
  const { api } = useAuth();

  const booksQuery = useQuery({
    queryKey: ['series', seriesId, 'books'],
    queryFn: () => getSeriesBooks(api!, seriesId),
    enabled: !!api,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {booksQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color="#5865f2" />
      ) : (
        <FlatList
          data={booksQuery.data?.content ?? []}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
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
  container: { flex: 1, backgroundColor: '#0f0f12', padding: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  list: { paddingBottom: 24 },
  loader: { marginTop: 40 },
});
