import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Bookmark {
  bookId: string;
  pageIndex: number;
  createdAt: number;
}

const KEY = 'bunker616.bookmarks';

async function readAll(): Promise<Bookmark[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getBookmarks(bookId: string): Promise<Bookmark[]> {
  return (await readAll())
    .filter(bookmark => bookmark.bookId === bookId)
    .sort((a, b) => a.pageIndex - b.pageIndex);
}

// Devuelve true si la página quedó marcada, false si se quitó el marcador.
export async function toggleBookmark(bookId: string, pageIndex: number): Promise<boolean> {
  const all = await readAll();
  const existing = all.findIndex(b => b.bookId === bookId && b.pageIndex === pageIndex);
  if (existing >= 0) {
    all.splice(existing, 1);
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
    return false;
  }
  all.push({ bookId, pageIndex, createdAt: Date.now() });
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return true;
}
