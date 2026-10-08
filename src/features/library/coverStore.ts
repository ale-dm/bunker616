import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import RNBlobUtil from 'react-native-blob-util';
import { seriesThumbnailUrl } from '@shared/api/komga';

const KEY = 'bunker616.customCovers';
const COVER_DIR = `${RNBlobUtil.fs.dirs.DocumentDir}/covers`;

const covers = new Map<string, string>();

async function persist() {
  await AsyncStorage.setItem(KEY, JSON.stringify(Object.fromEntries(covers)));
}

export async function loadCustomCovers(): Promise<void> {
  const raw = await AsyncStorage.getItem(KEY);
  const saved: Record<string, string> = raw ? JSON.parse(raw) : {};
  for (const [seriesId, path] of Object.entries(saved)) {
    if (await RNBlobUtil.fs.exists(path)) {
      covers.set(seriesId, path);
    }
  }
}

export function hasCustomCover(seriesId: string): boolean {
  return covers.has(seriesId);
}

export function seriesCoverUri(baseUrl: string, seriesId: string): string {
  const path = covers.get(seriesId);
  return path ? `file://${path}` : seriesThumbnailUrl(baseUrl, seriesId);
}

// Devuelve false si el usuario canceló el selector.
export async function pickCustomCover(seriesId: string): Promise<boolean> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
    includeBase64: true,
    maxWidth: 800,
    maxHeight: 1200,
    quality: 0.8,
  });
  if (result.didCancel) {
    return false;
  }
  if (result.errorCode) {
    throw new Error(result.errorMessage ?? 'No se pudo abrir la galería');
  }
  const asset = result.assets?.[0];
  if (!asset?.base64) {
    throw new Error('No se pudo leer la imagen seleccionada');
  }
  const extension = asset.type === 'image/png' ? 'png' : 'jpg';
  await RNBlobUtil.fs.mkdir(COVER_DIR).catch(() => undefined);
  const path = `${COVER_DIR}/${seriesId}-${Date.now()}.${extension}`;
  await RNBlobUtil.fs.writeFile(path, asset.base64, 'base64');

  const previous = covers.get(seriesId);
  covers.set(seriesId, path);
  await persist();
  if (previous) {
    await RNBlobUtil.fs.unlink(previous).catch(() => undefined);
  }
  return true;
}

export async function removeCustomCover(seriesId: string): Promise<void> {
  const path = covers.get(seriesId);
  if (!path) {
    return;
  }
  covers.delete(seriesId);
  await persist();
  await RNBlobUtil.fs.unlink(path).catch(() => undefined);
}
