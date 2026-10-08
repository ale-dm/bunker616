import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { Dimensions, FlatList, Image, TouchableOpacity } from 'react-native';
import type { ListViewToken as ViewToken } from '@react-native/virtualized-lists';
import { bookPageUrl } from '@shared/api/komga';
import { BookPage } from '@shared/types/komga';

const { width: SCREEN_W } = Dimensions.get('window');
const FALLBACK_ASPECT = 1.4; // alto/ancho típico de una página de cómic

export interface WebtoonReaderRef {
  goToPage: (pageIndex: number) => void;
}

interface Props {
  pages: BookPage[];
  baseUrl: string;
  bookId: string;
  authHeader: string;
  initialPageIndex: number;
  onPageIndexChange: (pageIndex: number) => void;
  onTapCenter: () => void;
}

export const WebtoonReader = forwardRef<WebtoonReaderRef, Props>(function WebtoonReaderImpl(
  { pages, baseUrl, bookId, authHeader, initialPageIndex, onPageIndexChange, onTapCenter },
  ref,
) {
  const listRef = useRef<FlatList<BookPage>>(null);

  useImperativeHandle(ref, () => ({
    goToPage: (pageIndex: number) => {
      listRef.current?.scrollToIndex({ index: pageIndex, animated: true });
    },
  }));

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length === 0) {
      return;
    }
    const topMost = viewableItems[0].index;
    if (topMost !== null && topMost !== undefined) {
      onPageIndexChange(topMost);
    }
  }).current;

  return (
    <FlatList
      ref={listRef}
      data={pages}
      keyExtractor={page => String(page.number)}
      initialScrollIndex={initialPageIndex > 0 ? initialPageIndex : undefined}
      onScrollToIndexFailed={info => {
        // Sin layout exacto de cada imagen, el salto inicial es una
        // estimación; si falla, nos acercamos por offset y punto.
        listRef.current?.scrollToOffset({
          offset: info.averageItemLength * info.index,
          animated: false,
        });
      }}
      viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
      onViewableItemsChanged={onViewableItemsChanged}
      renderItem={({ item }) => {
        const aspect = item.width && item.height ? item.height / item.width : FALLBACK_ASPECT;
        return (
          <TouchableOpacity activeOpacity={1} onPress={onTapCenter}>
            <Image
              source={{
                uri: bookPageUrl(baseUrl, bookId, item.number),
                headers: { Authorization: authHeader },
              }}
              style={{ width: SCREEN_W, height: SCREEN_W * aspect, backgroundColor: '#000' }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        );
      }}
    />
  );
});
