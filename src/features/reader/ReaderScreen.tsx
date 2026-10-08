import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import { getAuthHeader } from '@shared/api/client';
import { bookPageUrl, bookThumbnailUrl, getBook, getBookPages, getSeriesBooks } from '@shared/api/komga';
import { CoverImage } from '@shared/components';
import { BookPage } from '@shared/types/komga';
import {
  deleteOfflineBook,
  downloadBook,
  extensionFor,
  formatBytes,
  localPagePath,
  localPageUri,
} from '@features/offline/offlineStore';
import { useOfflineBook } from '@features/offline/useOfflineBook';
import { savePageToGallery } from '@features/offline/gallery';
import { PagedReader, PagedReaderRef } from './components/PagedReader';
import { WebtoonReader, WebtoonReaderRef } from './components/WebtoonReader';
import { useReaderProgress } from './hooks/useReaderProgress';
import { getDefaultReadingDirection } from './readingDirection';
import {
  getReaderBackground,
  nextReaderBackground,
  READER_BACKGROUND_COLORS,
  ReaderBackground,
  setReaderBackground,
} from './readerBackground';
import { PageSource } from './types';
import { Bookmark, getBookmarks, toggleBookmark } from './bookmarks';
import { cachedPagePath, prefetchPages } from './pagePrefetch';
import {
  FitMode,
  getFitMode,
  getNightDimmingEnabled,
  isNightHour,
  setFitMode,
} from './readerPrefs';
import { recordPageTurn } from '@features/history/readingLog';

const BACKGROUND_LABELS: Record<ReaderBackground, string> = {
  black: 'Negro',
  sepia: 'Sepia',
  white: 'Blanco',
};

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;
type ReaderMode = 'paged' | 'webtoon';

// No hay un slider real (evita añadir una nueva dependencia nativa solo
// para esto): se simula el brillo atenuando la pantalla con una capa negra.
const DIM_LEVELS = [0, 0.15, 0.35, 0.55, 0.75];

export function ReaderScreen({ route, navigation }: Props) {
  const { bookId, title, seriesId } = route.params;
  const { api, credentials } = useAuth();
  const insets = useSafeAreaInsets();
  const pagedRef = useRef<PagedReaderRef>(null);
  const webtoonRef = useRef<WebtoonReaderRef>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [activePageIndex, setActivePageIndex] = useState<number | null>(null);
  const [dimIndex, setDimIndex] = useState(0);
  const [incognito, setIncognito] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showPageGrid, setShowPageGrid] = useState(false);
  const [rtl, setRtl] = useState(false);
  const [rtlLoaded, setRtlLoaded] = useState(false);
  const [doublePage, setDoublePage] = useState(false);
  const [readerMode, setReaderMode] = useState<ReaderMode>('paged');
  const [saving, setSaving] = useState(false);
  const [background, setBackground] = useState<ReaderBackground>('black');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [fitMode, setFitModeState] = useState<FitMode>('contain');
  const [, setPrefetchTick] = useState(0);
  const sessionStartRef = useRef(Date.now());
  const sessionTurnsRef = useRef(0);
  const { record, progress } = useOfflineBook(bookId);

  useEffect(() => {
    getDefaultReadingDirection().then(direction => {
      setRtl(direction === 'rtl');
      setRtlLoaded(true);
    });
    getReaderBackground().then(setBackground);
  }, []);

  useEffect(() => {
    getBookmarks(bookId).then(setBookmarks);
    getFitMode().then(setFitModeState);
    getNightDimmingEnabled().then(enabled => {
      if (enabled && isNightHour()) {
        setDimIndex(2);
      }
    });
  }, [bookId]);


  const cycleBackground = () => {
    const next = nextReaderBackground(background);
    setBackground(next);
    setReaderBackground(next);
  };
  const backgroundColor = READER_BACKGROUND_COLORS[background];

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

  const pages: BookPage[] = pagesQuery.data ?? record?.pages ?? [];
  const { reportPage } = useReaderProgress(api, bookId, pages.length);

  const initialIndex = useMemo(() => {
    const progressInfo = bookQuery.data?.readProgress;
    if (!progressInfo || progressInfo.completed || pages.length === 0) {
      return 0;
    }
    return Math.min(Math.max(progressInfo.page - 1, 0), pages.length - 1);
  }, [bookQuery.data, pages.length]);

  const currentIndex = activePageIndex ?? initialIndex;
  const credentialsBaseUrl = credentials?.baseUrl;
  useEffect(() => {
    if (record || !credentials || pages.length === 0) {
      return;
    }
    prefetchPages({
      baseUrl: credentials.baseUrl,
      authHeader: getAuthHeader(credentials),
      bookId,
      pages,
      fromIndex: currentIndex + 1,
      count: 3,
      onReady: () => setPrefetchTick(tick => tick + 1),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, pages.length, record, credentialsBaseUrl, bookId]);

  const isAtEnd = pages.length > 0 && (activePageIndex ?? initialIndex) === pages.length - 1;
  const seriesBooksQuery = useQuery({
    queryKey: ['series', seriesId, 'books', 'reader'],
    queryFn: () => getSeriesBooks(api!, seriesId, 0, 500),
    enabled: !!api && isAtEnd,
  });
  const currentBookIndex = seriesBooksQuery.data?.content.findIndex(b => b.id === bookId) ?? -1;
  const nextBook =
    currentBookIndex >= 0 ? seriesBooksQuery.data?.content[currentBookIndex + 1] : undefined;

  // Un capítulo descargado se abre aunque no haya conexión con el servidor.
  const waitingForServer = !record && (bookQuery.isLoading || pagesQuery.isLoading);
  if (!credentials || !rtlLoaded || waitingForServer) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator color="#5865f2" size="large" />
      </View>
    );
  }

  const activeIndex = activePageIndex ?? initialIndex;
  const authHeader = getAuthHeader(credentials);
  const progressRatio = pages.length > 0 ? (activeIndex + 1) / pages.length : 0;
  const bookTitle = bookQuery.data?.metadata.title || title;

  const handlePageIndexChange = (pageIndex: number) => {
    if (!incognito && pageIndex !== activeIndex) {
      recordPageTurn();
      sessionTurnsRef.current += 1;
      reportPage(pageIndex);
    }
    setActivePageIndex(pageIndex);
  };

  const onToggleFitMode = () => {
    const next: FitMode = fitMode === 'contain' ? 'cover' : 'contain';
    setFitModeState(next);
    setFitMode(next);
  };

  const pagesLeft = pages.length - activeIndex - 1;
  const minutesElapsed = (Date.now() - sessionStartRef.current) / 60000;
  const pagesPerMinute =
    minutesElapsed >= 2 && sessionTurnsRef.current >= 3 ? sessionTurnsRef.current / minutesElapsed : null;
  const timeLeftLabel =
    pagesLeft <= 0
      ? 'Última página'
      : pagesPerMinute
        ? `~${Math.ceil(pagesLeft / pagesPerMinute)} min restantes`
        : `${pagesLeft} páginas restantes`;

  const isBookmarked = bookmarks.some(bookmark => bookmark.pageIndex === activeIndex);

  const onToggleBookmark = async () => {
    await toggleBookmark(bookId, activeIndex);
    setBookmarks(await getBookmarks(bookId));
  };

  const goToPage = (pageIndex: number) => {
    if (readerMode === 'paged') {
      pagedRef.current?.goToPage(pageIndex);
    } else {
      webtoonRef.current?.goToPage(pageIndex);
    }
  };

  const getPageSource = (page: BookPage): PageSource => {
    if (record) {
      return { uri: localPageUri(bookId, page) };
    }
    const prefetched = cachedPagePath(bookId, page);
    if (prefetched) {
      return { uri: `file://${prefetched}` };
    }
    return {
      uri: bookPageUrl(credentials.baseUrl, bookId, page.number),
      headers: { Authorization: authHeader },
    };
  };

  const savePage = async () => {
    const page = pages[activeIndex];
    if (!page || saving) {
      return;
    }
    setSaving(true);
    try {
      await savePageToGallery({
        fileName: `${bookTitle} - p${String(page.number).padStart(3, '0')}.${extensionFor(page.mediaType)}`,
        mediaType: page.mediaType,
        localPath: record ? localPagePath(bookId, page) : undefined,
        remoteUrl: record ? undefined : bookPageUrl(credentials.baseUrl, bookId, page.number),
        authHeader,
      });
      Alert.alert('Página guardada', 'Se ha guardado en la galería, en la carpeta Bunker616.');
    } catch (error) {
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  };

  const startDownload = () => {
    if (!pagesQuery.data) {
      return;
    }
    downloadBook({
      baseUrl: credentials.baseUrl,
      authHeader,
      bookId,
      title: bookTitle,
      pages: pagesQuery.data,
    }).catch(error =>
      Alert.alert(
        'Descarga fallida',
        error instanceof Error ? error.message : 'Revisa la conexión e inténtalo de nuevo.',
      ),
    );
  };

  const removeDownload = () => {
    deleteOfflineBook(bookId);
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar hidden={!showOverlay} />

      {readerMode === 'paged' ? (
        <PagedReader
          ref={pagedRef}
          pages={pages}
          getPageSource={getPageSource}
          rtl={rtl}
          doublePage={doublePage}
          backgroundColor={backgroundColor}
          fitMode={fitMode}
          initialPageIndex={initialIndex}
          onPageIndexChange={handlePageIndexChange}
          onTapCenter={() => setShowOverlay(v => !v)}
        />
      ) : (
        <WebtoonReader
          ref={webtoonRef}
          pages={pages}
          getPageSource={getPageSource}
          backgroundColor={backgroundColor}
          initialPageIndex={initialIndex}
          onPageIndexChange={handlePageIndexChange}
          onTapCenter={() => setShowOverlay(v => !v)}
        />
      )}

      {DIM_LEVELS[dimIndex] > 0 && (
        <View
          pointerEvents="none"
          style={[styles.dimOverlay, { opacity: DIM_LEVELS[dimIndex] }]}
        />
      )}

      {isAtEnd && nextBook && (
        <View style={[styles.nextCard, { bottom: insets.bottom + 120 }]}>
          <View style={styles.nextCover}>
            <CoverImage uri={bookThumbnailUrl(credentials.baseUrl, nextBook.id)} style={styles.nextCoverImage} />
          </View>
          <View style={styles.nextInfo}>
            <Text style={styles.nextLabel}>SIGUIENTE</Text>
            <Text style={styles.nextTitle} numberOfLines={2}>
              {nextBook.metadata.title || nextBook.name}
            </Text>
            <TouchableOpacity
              style={styles.nextButton}
              onPress={() =>
                navigation.replace('Reader', {
                  bookId: nextBook.id,
                  title: nextBook.metadata.title || nextBook.name,
                  seriesId,
                })
              }>
              <Text style={styles.nextButtonText}>Leer ▸</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showOverlay && (
        <>
          <View style={[styles.overlayTop, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backButton}>‹ Volver</Text>
            </TouchableOpacity>
            <Text style={styles.overlayTitle} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={() => setShowInfo(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.infoButton}>
              <Text style={styles.infoButtonText}>ⓘ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIncognito(v => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.chipButton}>
              <Text style={[styles.chipText, incognito && styles.chipTextActive]}>
                {incognito ? 'Incógnito ●' : 'Incógnito'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPageGrid(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.pageCounter}>
                {activeIndex + 1} / {pages.length}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.overlayBottom, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.modeRow}>
              <TouchableOpacity
                onPress={() => setReaderMode(m => (m === 'paged' ? 'webtoon' : 'paged'))}
                style={styles.chipButton}>
                <Text style={[styles.chipText, readerMode === 'webtoon' && styles.chipTextActive]}>
                  {readerMode === 'webtoon' ? 'Webtoon' : 'Paginado'}
                </Text>
              </TouchableOpacity>
              {readerMode === 'paged' && (
                <>
                  <TouchableOpacity onPress={() => setRtl(v => !v)} style={styles.chipButton}>
                    <Text style={[styles.chipText, rtl && styles.chipTextActive]}>
                      {rtl ? 'Manga (RTL)' : 'Occidental'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onToggleFitMode} style={styles.chipButton}>
                    <Text style={[styles.chipText, fitMode === 'cover' && styles.chipTextActive]}>
                      {fitMode === 'cover' ? 'Llenar' : 'Completa'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setDoublePage(v => !v)} style={styles.chipButton}>
                    <Text style={[styles.chipText, doublePage && styles.chipTextActive]}>
                      {doublePage ? '2 páginas' : '1 página'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={onToggleBookmark} style={styles.chipButton}>
                <Text style={[styles.chipText, isBookmarked && styles.chipTextActive]}>
                  {isBookmarked ? '★ Marcada' : '☆ Marcar'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={savePage} disabled={saving} style={styles.chipButton}>
                <Text style={styles.chipText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cycleBackground} style={styles.chipButton}>
                <Text style={styles.chipText}>Fondo: {BACKGROUND_LABELS[background]}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.brightnessRow}>
              <Text style={styles.brightnessLabel}>Brillo</Text>
              {DIM_LEVELS.map((level, index) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setDimIndex(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  style={[
                    styles.brightnessDot,
                    {
                      backgroundColor: `rgba(255,255,255,${1 - level * 0.8})`,
                      borderWidth: dimIndex === index ? 2 : 0,
                    },
                  ]}
                />
              ))}
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
            </View>
            <Text style={styles.timeLeft}>{timeLeftLabel}</Text>
          </View>
        </>
      )}

      <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <TouchableOpacity
          style={styles.infoBackdrop}
          activeOpacity={1}
          onPress={() => setShowInfo(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.infoSheet}>
            <Text style={styles.infoTitle}>{bookTitle}</Text>
            {!!bookQuery.data?.metadata.number && (
              <Text style={styles.infoSubtitle}>Número {bookQuery.data.metadata.number}</Text>
            )}
            {!!bookQuery.data?.metadata.authors?.length && (
              <Text style={styles.infoAuthors} numberOfLines={2}>
                {bookQuery.data.metadata.authors.map(a => `${a.name} (${a.role})`).join(' · ')}
              </Text>
            )}
            <ScrollView style={styles.infoScroll}>
              <Text style={styles.infoSummary}>
                {bookQuery.data?.metadata.summary || 'Sin resumen disponible para este número.'}
              </Text>
            </ScrollView>
            <Text style={styles.infoPages}>{pages.length} páginas</Text>

            {bookmarks.length > 0 && (
              <ScrollView style={styles.bookmarkList}>
                {bookmarks.map(bookmark => (
                  <TouchableOpacity
                    key={bookmark.pageIndex}
                    style={styles.bookmarkItem}
                    onPress={() => {
                      setShowInfo(false);
                      goToPage(bookmark.pageIndex);
                    }}>
                    <Text style={styles.bookmarkText}>★ Página {bookmark.pageIndex + 1}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {progress ? (
              <Text style={styles.offlineText}>
                Descargando {progress.done} / {progress.total}…
              </Text>
            ) : record ? (
              <TouchableOpacity onPress={removeDownload} style={styles.offlineButton}>
                <Text style={styles.offlineButtonText}>
                  Eliminar descarga · {formatBytes(record.bytes)}
                </Text>
              </TouchableOpacity>
            ) : pagesQuery.data ? (
              <TouchableOpacity onPress={startDownload} style={styles.offlineButton}>
                <Text style={styles.offlineButtonText}>Descargar para leer sin conexión</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.infoCloseButton} onPress={() => setShowInfo(false)}>
              <Text style={styles.infoCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showPageGrid}
        animationType="slide"
        onRequestClose={() => setShowPageGrid(false)}>
        <View style={[styles.gridContainer, { paddingTop: insets.top }]}>
          <View style={styles.gridHeader}>
            <Text style={styles.gridTitle}>Páginas</Text>
            <TouchableOpacity onPress={() => setShowPageGrid(false)}>
              <Text style={styles.gridCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={pages}
            numColumns={4}
            keyExtractor={page => String(page.number)}
            contentContainerStyle={styles.gridList}
            renderItem={({ item: page, index }) => (
              <TouchableOpacity
                style={[styles.gridItem, index === activeIndex && styles.gridItemActive]}
                onPress={() => {
                  setShowPageGrid(false);
                  goToPage(index);
                }}>
                <Image source={getPageSource(page)} style={styles.gridThumb} resizeMode="cover" />
                <Text style={styles.gridPageNumber}>{index + 1}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  chipButton: { paddingHorizontal: 8 },
  chipText: { color: '#8e8e93', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#FF9500' },
  infoButton: { paddingHorizontal: 8 },
  infoButtonText: { color: '#fff', fontSize: 18 },
  infoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  infoSheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '60%',
  },
  infoTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  infoSubtitle: { color: '#9b9ba1', fontSize: 13, marginTop: 4 },
  infoAuthors: { color: '#9b9ba1', fontSize: 12, marginTop: 6 },
  infoScroll: { marginTop: 12, marginBottom: 12 },
  infoSummary: { color: '#d1d1d6', fontSize: 14, lineHeight: 20 },
  infoPages: { color: '#9b9ba1', fontSize: 12, marginBottom: 12 },
  offlineText: { color: '#9b9ba1', fontSize: 13, marginBottom: 12 },
  bookmarkList: { maxHeight: 120, marginBottom: 12 },
  bookmarkItem: { paddingVertical: 8 },
  bookmarkText: { color: '#FF9F0A', fontSize: 14, fontWeight: '600' },
  offlineButton: {
    borderWidth: 1,
    borderColor: '#5865f2',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  offlineButtonText: { color: '#5865f2', fontWeight: '600' },
  infoCloseButton: {
    backgroundColor: '#5865f2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  infoCloseText: { color: '#fff', fontWeight: '600' },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#5865f2' },
  timeLeft: { color: '#c7c7d1', fontSize: 11, marginTop: 4, marginBottom: 6 },
  dimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  brightnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  brightnessLabel: { color: '#c7c7d1', fontSize: 12, marginRight: 10 },
  brightnessDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderColor: '#5865f2',
    marginRight: 8,
  },
  gridContainer: { flex: 1, backgroundColor: '#000' },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  gridTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  gridCloseText: { color: '#5865f2', fontSize: 15, fontWeight: '600' },
  gridList: { paddingHorizontal: 8, paddingBottom: 24 },
  gridItem: { width: '25%', padding: 6 },
  gridItemActive: { opacity: 0.6 },
  gridThumb: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 6,
    backgroundColor: '#1c1c1e',
  },
  gridPageNumber: { color: '#9b9ba1', fontSize: 11, textAlign: 'center', marginTop: 4 },
  nextCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    backgroundColor: 'rgba(28,28,30,0.95)',
    borderRadius: 14,
    padding: 10,
  },
  nextCover: { width: 70, aspectRatio: 2 / 3, borderRadius: 6, overflow: 'hidden' },
  nextCoverImage: { width: '100%', height: '100%' },
  nextInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  nextLabel: { color: '#FF9F0A', fontSize: 11, fontWeight: '700' },
  nextTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginTop: 2 },
  nextButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#5865f2',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  nextButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
