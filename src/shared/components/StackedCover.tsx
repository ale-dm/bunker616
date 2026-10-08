import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@features/auth/AuthContext';
import { bookThumbnailUrl, getSeriesBooks } from '@shared/api/komga';
import { useTheme } from '@shared/theme';
import { nextBooks } from '@shared/utils/stackedBooks';
import { CoverImage } from './CoverImage';

const STEP = 6;

interface Props {
  seriesId: string;
  fromBookId?: string;
  width: number;
  children: React.ReactNode;
}

// Muestra detrás de la portada los dos números siguientes, cada uno asomando un
// poco más por la derecha y por abajo.
export function StackedCover({ seriesId, fromBookId, width, children }: Props) {
  const { api, credentials } = useAuth();
  const { colors, radii } = useTheme();
  const booksQuery = useQuery({
    queryKey: ['series', seriesId, 'books'],
    queryFn: () => getSeriesBooks(api!, seriesId, 0, 500),
    enabled: !!api,
    staleTime: 5 * 60_000,
  });

  const backs = credentials ? nextBooks(booksQuery.data?.content ?? [], fromBookId) : [];

  return (
    <View style={{ width: width + STEP * 2, paddingBottom: STEP * 2, alignSelf: 'flex-start' }}>
      {[...backs].reverse().map((book, reversedIndex) => {
        const depth = backs.length - reversedIndex;
        return (
        <View
          key={book.id}
          style={[
            styles.back,
            {
              width,
              left: STEP * depth,
              top: STEP * depth,
              borderRadius: radii.md,
              backgroundColor: colors.tertiaryBackground,
            },
          ]}>
          <CoverImage uri={bookThumbnailUrl(credentials!.baseUrl, book.id)} style={styles.image} />
        </View>
        );
      })}
      <View style={{ width }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', aspectRatio: 2 / 3, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
