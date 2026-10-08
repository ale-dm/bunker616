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
import { getBook, getBookPages, bookPageUrl } from '@shared/api/komga';
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
import { PageSource } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;
type ReaderMode = 'paged' | 'webtoon';

// No hay un slider real (evita añadir una nueva dependencia nativa solo
// para esto): se simula el brillo atenuando la pantalla con una capa negra.
const DIM_LEVELS = [0, 0.15, 0.35, 0.55, 0.75];

export function ReaderScreen({ route, navigation }: Props) {
  const { bookId, title } = route.params;
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
  const { record, progress } = useOfflineBook(bookId);

  useEffect(() => {
    getDefaultReadingDirection().then(direction => {
      setRtl(direction === 'rtl');
      setRtlLoaded(true);
    });
  }, []);

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
    setActivePageIndex(pageIndex);
    if (!incognito) {
      reportPage(pageIndex);
    }
  };

  const goToPage = (pageIndex: number) => {
    if (readerMode === 'paged') {
      pagedRef.current?.goToPage(pageIndex);
    } else {
      webtoonRef.current?.goToPage(pageIndex);
    }
  };

  const getPageSource = (page: BookPage): PageSource =>
    record
      ? { uri: localPageUri(bookId, page) }
      : {
          uri: bookPageUrl(credentials.baseUrl, bookId, page.number),
          headers: { Authorization: authHeader },
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
    <View style={styles.container}>
      <StatusBar hidden={!showOverlay} />

      {readerMode === 'paged' ? (
        <PagedReader
          ref={pagedRef}
          pages={pages}
          getPageSource={getPageSource}
          rtl={rtl}
          doublePage={doublePage}
          initialPageIndex={initialIndex}
          onPageIndexChange={handlePageIndexChange}
          onTapCenter={() => setShowOverlay(v => !v)}
        />
      ) : (
        <WebtoonReader
          ref={webtoonRef}
          pages={pages}
          getPageSource={getPageSource}
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
                  <TouchableOpacity onPress={() => setDoublePage(v => !v)} style={styles.chipButton}>
                    <Text style={[styles.chipText, doublePage && styles.chipTextActive]}>
                      {doublePage ? '2 páginas' : '1 página'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={savePage} disabled={saving} style={styles.chipButton}>
                <Text style={styles.chipText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
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
  container: { flex: 1, backgroundColor: '#000' },
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
});
