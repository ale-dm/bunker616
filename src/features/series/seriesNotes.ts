import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bunker616.seriesNotes';

async function readAll(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function getSeriesNote(seriesId: string): Promise<string> {
  return (await readAll())[seriesId] ?? '';
}

export async function setSeriesNote(seriesId: string, note: string): Promise<void> {
  const all = await readAll();
  if (note.trim()) {
    all[seriesId] = note;
  } else {
    delete all[seriesId];
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}
