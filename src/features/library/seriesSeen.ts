import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bunker616.seriesLastSeen';

async function readAll(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function getSeriesLastSeen(): Promise<Record<string, string>> {
  return readAll();
}

export async function markSeriesSeen(seriesId: string): Promise<void> {
  const all = await readAll();
  all[seriesId] = new Date().toISOString();
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}
