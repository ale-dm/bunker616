import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SeriesSearchFilters } from '@shared/api/komga';

const KEY = 'bunker616.savedFilters';

export interface SavedFilter {
  id: string;
  name: string;
  filters: SeriesSearchFilters;
}

export async function getSavedFilters(): Promise<SavedFilter[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveFilter(filters: SeriesSearchFilters): Promise<SavedFilter[]> {
  const parts = [filters.genre, filters.author, filters.status].filter(Boolean) as string[];
  const name = parts.join(' · ') || 'Búsqueda';
  const current = await getSavedFilters();
  const next = [...current, { id: `${Date.now()}`, name, filters }];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function deleteSavedFilter(id: string): Promise<SavedFilter[]> {
  const next = (await getSavedFilters()).filter(item => item.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
