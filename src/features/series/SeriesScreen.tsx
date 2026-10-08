import { hasCustomCover, pickCustomCover, removeCustomCover, seriesCoverUri } from '@features/library/coverStore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import { getBookPages, getSeriesBooks, getSeriesById, updateReadProgress } from '@shared/api/komga';
import { getAuthHeader } from '@shared/api/client';
import { downloadBook, getOfflineRecords } from '@features/offline/offlineStore';
import { markSeriesSeen } from '@features/library/seriesSeen';
import { getSeriesNote, setSeriesNote } from './seriesNotes';
import { CustomListsModal } from '@features/library/components/CustomListsModal';
import { getFavoriteIds, toggleFavorite } from '@features/library/favorites';
import { Chip, CoverImage } from '@shared/components';
import { useTheme } from '@shared/theme';
import { BookListItem } from './components/BookListItem';

type Props = NativeStackScreenProps<RootStackParamList, 'Series'>;

const STATUS_LABELS: Record<string, string> = {
  ONGOING: 'En curso',
  ENDED: 'Terminada',
  HIATUS: 'En pausa',
  ABANDONED: 'Abandonada',
};

const SORT_OPTIONS: { value: 'number' | 'date'; label: string }[] = [
  { value: 'number', label: 'Por número' },
  { value: 'date', label: 'Por fecha' },
];

const STATUS_FILTERS: { value: 'all' | 'unread' | 'inProgress' | 'read'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'unread', label: 'Sin leer' },
  { value: 'inProgress', label: 'En progreso' },
  { value: 'read', label: 'Leídos' },
];

export function SeriesScreen({ route, navigation }: Props) {
  const { seriesId, title } = route.params;
  const { api, credentials } = useAuth();
  const { colors, spacing, radii, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [isFavorite, setIsFavorite] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [sortMode, setSortMode] = useState<'number' | 'date'>('number');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'inProgress' | 'read'>('all');
  const [note, setNote] = useState('');
  const [showLists, setShowLists] = useState(false);
  const [, setCoverVersion] = useState(0);

  const onChangeCover = async () => {
    try {
      if (await pickCustomCover(seriesId)) {
        setCoverVersion(v => v + 1);
      }
    } catch (error) {
      Alert.alert('No se pudo cambiar la portada', error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const onRemoveCover = async () => {
    await removeCustomCover(seriesId);
    setCoverVersion(v => v + 1);
  };
  const [seriesDownload, setSeriesDownload] = useState<{ done: number; total: number } | null>(null);
  const cancelDownloadRef = useRef(false);

  useEffect(() => {
    getFavoriteIds().then(ids => setIsFavorite(ids.includes(seriesId)));
  }, [seriesId]);

  useEffect(() => () => {
    markSeriesSeen(seriesId);
  }, [seriesId]);

  const noteRef = useRef('');
  useEffect(() => {
    getSeriesNote(seriesId).then(saved => {
      noteRef.current = saved;
      setNote(saved);
    });
    return () => {
      setSeriesNote(seriesId, noteRef.current);
    };
  }, [seriesId]);

  const onShare = () => {
    const name = seriesQuery.data?.metadata.title || title;
    const summary = seriesQuery.data?.metadata.summary;
    Share.share({ title: name, message: summary ? `${name}\n\n${summary}` : name }).catch(() => undefined);
  };

  const onToggleFavorite = async () => {
    const ids = await toggleFavorite(seriesId);
    setIsFavorite(ids.includes(seriesId));
  };

  const seriesQuery = useQuery({
    queryKey: ['series', seriesId],
    queryFn: () => getSeriesById(api!, seriesId),
    enabled: !!api,
  });

  const booksQueryKey = ['series', seriesId, 'books'];

  const booksQuery = useQuery({
    queryKey: booksQueryKey,
    queryFn: () => getSeriesBooks(api!, seriesId, 0, 500),
    enabled: !!api,
  });

  const visibleBooks = useMemo(() => {
    const books = booksQuery.data?.content ?? [];
    const filtered = books.filter(book => {
      const progress = book.readProgress;
      switch (statusFilter) {
        case 'unread':
          return !progress;
        case 'inProgress':
          return !!progress && !progress.completed;
        case 'read':
          return !!progress?.completed;
        default:
          return true;
      }
    });
    if (sortMode === 'date') {
      return [...filtered].sort((a, b) => (a.metadata.releaseDate ?? '').localeCompare(b.metadata.releaseDate ?? ''));
    }
    return filtered;
  }, [booksQuery.data, sortMode, statusFilter]);

  const downloadSeries = async () => {
    if (!api || !credentials || !booksQuery.data) {
      return;
    }
    const authHeader = getAuthHeader(credentials);
    const downloaded = new Set((await getOfflineRecords()).map(record => record.bookId));
    const pending = booksQuery.data.content.filter(book => !downloaded.has(book.id));
    cancelDownloadRef.current = false;
    setSeriesDownload({ done: 0, total: pending.length });
    try {
      for (let index = 0; index < pending.length; index++) {
        if (cancelDownloadRef.current) {
          break;
        }
        const book = pending[index];
        const pages = await getBookPages(api, book.id);
        await downloadBook({
          baseUrl: credentials.baseUrl,
          authHeader,
          bookId: book.id,
          seriesId,
          title: book.metadata.title || book.name,
          pages,
        });
        setSeriesDownload({ done: index + 1, total: pending.length });
      }
    } catch (error) {
      Alert.alert('Descarga fallida', error instanceof Error ? error.message : 'Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setSeriesDownload(null);
    }
  };

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

  const [seriesMarking, setSeriesMarking] = useState<{ done: number; total: number } | null>(null);

  const markWholeSeries = async (completed: boolean) => {
    if (!api || !booksQuery.data) {
      return;
    }
    const books = booksQuery.data.content.filter(book => !!book.readProgress?.completed !== completed);
    setSeriesMarking({ done: 0, total: books.length });
    try {
      for (let start = 0; start < books.length; start += 5) {
        const batch = books.slice(start, start + 5);
        await Promise.all(
          batch.map(book =>
            updateReadProgress(api, book.id, { page: completed ? book.media.pagesCount : 0, completed }),
          ),
        );
        setSeriesMarking({ done: Math.min(start + 5, books.length), total: books.length });
      }
      await queryClient.invalidateQueries({ queryKey: booksQueryKey });
    } catch (error) {
      Alert.alert('No se pudo actualizar', error instanceof Error ? error.message : 'Revisa la conexión.');
      queryClient.invalidateQueries({ queryKey: booksQueryKey });
    } finally {
      setSeriesMarking(null);
    }
  };

  const confirmMarkWholeSeries = (completed: boolean) => {
    Alert.alert(
      completed ? 'Marcar serie como leída' : 'Marcar serie como no leída',
      completed ? '¿Marcar todos los números como leídos?' : '¿Quitar el progreso de todos los números?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aceptar', onPress: () => markWholeSeries(completed) },
      ],
    );
  };

  const metadata = seriesQuery.data?.metadata;
  const statusLabel = metadata?.status ? STATUS_LABELS[metadata.status] ?? metadata.status : null;

  const infoHeader = (
    <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
      <View style={styles.topRow}>
        {credentials && (
          <View style={[styles.cover, { borderRadius: radii.md, backgroundColor: colors.tertiaryBackground }]}>
            <CoverImage uri={seriesCoverUri(credentials.baseUrl, seriesId)} style={styles.coverImage} />
          </View>
        )}
        <View style={[styles.infoColumn, { marginLeft: spacing.md }]}>
          <View style={styles.titleRow}>
            <Text style={[typography.title, { color: colors.label, flex: 1 }]} numberOfLines={3}>
              {metadata?.title || title}
            </Text>
            <TouchableOpacity onPress={onShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: spacing.sm }}>
              <Text style={{ fontSize: 20, color: colors.accent }}>⇪</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onToggleFavorite}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ marginLeft: spacing.sm }}>
              <Text style={{ fontSize: 22, color: isFavorite ? colors.progress : colors.secondaryLabel }}>
                {isFavorite ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          </View>

          {statusLabel && (
            <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: spacing.xs }]}>
              {statusLabel}
            </Text>
          )}
          {metadata?.publisher && (
            <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]} numberOfLines={1}>
              {metadata.publisher}
            </Text>
          )}
          <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]}>
            {seriesQuery.data?.booksCount ?? 0} números
          </Text>
        </View>
      </View>

      {!!metadata?.genres?.length && (
        <View style={[styles.genreWrap, { marginTop: spacing.md }]}>
          {metadata.genres.map(genre => (
            <View
              key={genre}
              style={[styles.genreChip, { backgroundColor: colors.secondaryBackground, borderRadius: radii.pill }]}>
              <Text style={[typography.caption, { color: colors.label }]}>{genre}</Text>
            </View>
          ))}
        </View>
      )}

      {!!metadata?.summary && (
        <TouchableOpacity onPress={() => setSummaryExpanded(v => !v)} style={{ marginTop: spacing.md }}>
          <Text
            style={[typography.subhead, { color: colors.label, lineHeight: 20 }]}
            numberOfLines={summaryExpanded ? undefined : 4}>
            {metadata.summary}
          </Text>
          <Text style={[typography.footnote, { color: colors.accent, marginTop: spacing.xs }]}>
            {summaryExpanded ? 'Leer menos' : 'Leer más'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Text style={[typography.footnote, { color: colors.secondaryLabel, marginBottom: spacing.xs }]}>NOTAS</Text>
        <TextInput
          multiline
          value={note}
          onChangeText={text => {
            noteRef.current = text;
            setNote(text);
          }}
          onBlur={() => setSeriesNote(seriesId, noteRef.current)}
          placeholder="Escribe una nota sobre esta serie…"
          placeholderTextColor={colors.tertiaryLabel}
          style={[
            typography.body,
            styles.noteInput,
            { backgroundColor: colors.secondaryBackground, borderRadius: radii.md, color: colors.label },
          ]}
        />
      </View>

      <View style={[styles.controlRow, { marginTop: spacing.lg }]}>
        {SORT_OPTIONS.map(option => (
          <Chip
            key={option.value}
            label={option.label}
            active={sortMode === option.value}
            onPress={() => setSortMode(option.value)}
          />
        ))}
      </View>
      <View style={[styles.controlRow, { marginTop: spacing.sm }]}>
        {STATUS_FILTERS.map(option => (
          <Chip
            key={option.value}
            label={option.label}
            active={statusFilter === option.value}
            onPress={() => setStatusFilter(option.value)}
          />
        ))}
      </View>
      <View style={[styles.controlRow, { marginTop: spacing.md }]}>
        <TouchableOpacity
          onPress={onChangeCover}
          style={[styles.controlChip, { borderRadius: radii.pill, backgroundColor: colors.secondaryBackground }]}>
          <Text style={[typography.footnote, { color: colors.accent, fontWeight: '600' }]}>Cambiar portada</Text>
        </TouchableOpacity>
        {hasCustomCover(seriesId) && (
          <TouchableOpacity
            onPress={onRemoveCover}
            style={[styles.controlChip, { borderRadius: radii.pill, backgroundColor: colors.secondaryBackground }]}>
            <Text style={[typography.footnote, { color: colors.danger, fontWeight: '600' }]}>Quitar portada</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setShowLists(true)}
          style={[styles.controlChip, { borderRadius: radii.pill, backgroundColor: colors.secondaryBackground }]}>
          <Text style={[typography.footnote, { color: colors.accent, fontWeight: '600' }]}>Añadir a lista</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => confirmMarkWholeSeries(true)}
          disabled={!!seriesMarking}
          style={[styles.controlChip, { borderRadius: radii.pill, backgroundColor: colors.secondaryBackground }]}>
          <Text style={[typography.footnote, { color: colors.accent, fontWeight: '600' }]}>
            {seriesMarking ? `Marcando ${seriesMarking.done}/${seriesMarking.total}…` : 'Marcar serie leída'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => confirmMarkWholeSeries(false)}
          disabled={!!seriesMarking}
          style={[styles.controlChip, { borderRadius: radii.pill, backgroundColor: colors.secondaryBackground }]}>
          <Text style={[typography.footnote, { color: colors.accent, fontWeight: '600' }]}>Marcar sin leer</Text>
        </TouchableOpacity>
        {seriesDownload ? (
          <TouchableOpacity
            onPress={() => {
              cancelDownloadRef.current = true;
            }}
            style={[styles.controlChip, { borderRadius: radii.pill, backgroundColor: colors.secondaryBackground }]}>
            <Text style={[typography.footnote, { color: colors.label }]}>
              Descargando serie {seriesDownload.done}/{seriesDownload.total} · Cancelar
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={downloadSeries}
            style={[styles.controlChip, { borderRadius: radii.pill, backgroundColor: colors.secondaryBackground }]}>
            <Text style={[typography.footnote, { color: colors.accent, fontWeight: '600' }]}>
              Descargar serie para leer sin conexión
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {booksQuery.isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={visibleBooks}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.sm }}
          ListHeaderComponent={infoHeader}
          refreshControl={
            <RefreshControl
              refreshing={booksQuery.isRefetching}
              onRefresh={() => {
                booksQuery.refetch();
                seriesQuery.refetch();
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
                  seriesId,
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
        />
      )}
      <CustomListsModal visible={showLists} onClose={() => setShowLists(false)} seriesId={seriesId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 40 },
  topRow: { flexDirection: 'row' },
  cover: { width: 110, aspectRatio: 2 / 3, overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  infoColumn: { flex: 1, justifyContent: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  genreWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  genreChip: { paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  controlRow: { flexDirection: 'row', flexWrap: 'wrap' },
  noteInput: { minHeight: 70, padding: 12, textAlignVertical: 'top' },
  controlChip: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 4 },
});
