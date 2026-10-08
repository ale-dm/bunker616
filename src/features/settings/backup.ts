import AsyncStorage from '@react-native-async-storage/async-storage';
import RNBlobUtil from 'react-native-blob-util';

const BACKUP_KEYS = [
  'bunker616.themePreference',
  'bunker616.readingDirection',
  'bunker616.readerBackground',
  'bunker616.readerFit',
  'bunker616.nightDimming',
  'bunker616.libraryViewMode',
  'bunker616.favoriteSeriesIds',
  'bunker616.seriesLastSeen',
  'bunker616.bookmarks',
  'bunker616.readLog',
  'bunker616.seriesNotes',
  'bunker616.customLists',
];

export async function exportBackup(): Promise<string> {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      data[key] = JSON.parse(value);
    }
  }
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `bunker616-backup-${stamp}.json`;
  const tempPath = `${RNBlobUtil.fs.dirs.CacheDir}/${fileName}`;
  await RNBlobUtil.fs.writeFile(tempPath, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }), 'utf8');
  try {
    await RNBlobUtil.MediaCollection.copyToMediaStore(
      { name: fileName, parentFolder: 'Bunker616', mimeType: 'application/json' },
      'Download',
      tempPath,
    );
  } finally {
    await RNBlobUtil.fs.unlink(tempPath).catch(() => undefined);
  }
  return fileName;
}
