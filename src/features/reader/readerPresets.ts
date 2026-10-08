import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDefaultReadingDirection } from './readingDirection';
import { getReaderBackground, ReaderBackground } from './readerBackground';
import { FitMode, getFitMode } from './readerPrefs';

export interface ReaderPrefs {
  readerMode: 'paged' | 'webtoon';
  rtl: boolean;
  doublePage: boolean;
  fitMode: FitMode;
  background: ReaderBackground;
}

type Overrides = Partial<ReaderPrefs>;

interface PresetStore {
  libraries: Record<string, Overrides>;
  series: Record<string, Overrides>;
}

const KEY = 'bunker616.readerPresets';

async function readStore(): Promise<PresetStore> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : { libraries: {}, series: {} };
}

async function writeStore(store: PresetStore) {
  await AsyncStorage.setItem(KEY, JSON.stringify(store));
}

export async function getGlobalPrefs(): Promise<ReaderPrefs> {
  const [direction, background, fitMode] = await Promise.all([
    getDefaultReadingDirection(),
    getReaderBackground(),
    getFitMode(),
  ]);
  return { readerMode: 'paged', rtl: direction === 'rtl', doublePage: false, fitMode, background };
}

// Orden de prioridad: serie > biblioteca > ajustes globales.
export async function resolvePrefs(libraryId: string | undefined, seriesId: string): Promise<ReaderPrefs> {
  const [base, store] = await Promise.all([getGlobalPrefs(), readStore()]);
  return {
    ...base,
    ...(libraryId ? store.libraries[libraryId] : undefined),
    ...store.series[seriesId],
  };
}

export async function getPresetStatus(
  libraryId: string | undefined,
  seriesId: string,
): Promise<{ series: boolean; library: boolean }> {
  const store = await readStore();
  return {
    series: !!store.series[seriesId],
    library: !!libraryId && !!store.libraries[libraryId],
  };
}

export async function savePreset(scope: { type: 'series' | 'library'; id: string }, prefs: ReaderPrefs) {
  const store = await readStore();
  if (scope.type === 'series') {
    store.series[scope.id] = prefs;
  } else {
    store.libraries[scope.id] = prefs;
  }
  await writeStore(store);
}

export async function clearSeriesPreset(seriesId: string) {
  const store = await readStore();
  delete store.series[seriesId];
  await writeStore(store);
}
