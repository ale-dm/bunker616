import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bunker616.searchHistory';
const MAX_ENTRIES = 10;

export async function getSearchHistory(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addSearchTerm(term: string): Promise<string[]> {
  const cleaned = term.trim();
  if (!cleaned) {
    return getSearchHistory();
  }
  const rest = (await getSearchHistory()).filter(item => item.toLowerCase() !== cleaned.toLowerCase());
  const next = [cleaned, ...rest].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearSearchHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
