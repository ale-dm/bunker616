import React, { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PagerView, { PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import { getAuthHeader } from '@shared/api/client';
import { getBook, getBookPages, bookPageUrl } from '@shared/api/komga';
import { ZoomablePage } from './components/ZoomablePage';
import { useReaderProgress } from './hooks/useReaderProgress';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

export function ReaderScreen({ route, navigation }: Props) {
  const { bookId, title } = route.params;
  const { api, credentials } = useAuth();
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  const bookQuery = useQuery({
    queryKey: ['book', bookId],
    queryFn: () => getBook(api!, bookId),
    enabled: !!api,
  });

  const pagesQuery = useQuery({
    queryKey: ['book', bookId, 'pages'],
    queryFn: () => getBookPages(api!, bookId),
    enabled: !!api,
  });

  const pages = pagesQuery.data ?? [];
  const { reportPage } = useReaderProgress(api, bookId, pages.length);

  const initialIndex = useMemo(() => {
    const progress = bookQuery.data?.readProgress;
    if (!progress || progress.completed || pages.length === 0) {
      return 0;
    }
    return Math.min(Math.max(progress.page - 1, 0), pages.length - 1);
  }, [bookQuery.data, pages.length]);

  if (!credentials || bookQuery.isLoading || pagesQuery.isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator color="#5865f2" size="large" />
      </View>
    );
  }

  const activeIndex = currentIndex ?? initialIndex;
  const authHeader = getAuthHeader(credentials);
  const progressRatio = pages.length > 0 ? (activeIndex + 1) / pages.length : 0;

  const handleTap = (xRatio: number) => {
    if (xRatio < 0.3 && activeIndex > 0) {
      pagerRef.current?.setPage(activeIndex - 1);
    } else if (xRatio > 0.7 && activeIndex < pages.length - 1) {
      pagerRef.current?.setPage(activeIndex + 1);
    } else {
      setShowOverlay(v => !v);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden={!showOverlay} />
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={initialIndex}
        onPageSelected={(e: PagerViewOnPageSelectedEvent) => {
          const index = e.nativeEvent.position;
          setCurrentIndex(index);
          reportPage(index);
        }}>
        {pages.map(page => (
          <View key={page.number} collapsable={false}>
            <ZoomablePage
              uri={bookPageUrl(credentials.baseUrl, bookId, page.number)}
              authHeader={authHeader}
              onTap={handleTap}
            />
          </View>
        ))}
      </PagerView>

      {showOverlay && (
        <>
          <View style={[styles.overlayTop, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backButton}>‹ Volver</Text>
            </TouchableOpacity>
            <Text style={styles.overlayTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.pageCounter}>
              {activeIndex + 1} / {pages.length}
            </Text>
          </View>
          <View style={[styles.overlayBottom, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  pager: { flex: 1 },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  backButton: { color: '#fff', fontSize: 16, marginRight: 12 },
  overlayTitle: { color: '#fff', fontSize: 14, flex: 1 },
  pageCounter: { color: '#c7c7d1', fontSize: 13, marginLeft: 12 },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#5865f2' },
});
