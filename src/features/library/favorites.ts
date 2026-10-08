import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bunker616.favoriteSeriesIds';

export async function getFavoriteIds(): Promise<string[]> {
  const stored = await AsyncStorage.getItem(KEY);
  if (!stored) {
    return [];
  }
  try {
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

export async function toggleFavorite(seriesId: string): Promise<string[]> {
  const current = await getFavoriteIds();
  const next = current.includes(seriesId)
    ? current.filter(id => id !== seriesId)
    : [...current, seriesId];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
