import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosInstance } from 'axios';
import { updateReadProgress } from '@shared/api/komga';

const KEY = 'bunker616.pendingProgress';

export interface PendingProgress {
  page: number;
  completed: boolean;
}

type Store = Record<string, PendingProgress>;

async function readStore(): Promise<Store> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

async function writeStore(store: Store) {
  if (Object.keys(store).length === 0) {
    await AsyncStorage.removeItem(KEY);
    return;
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(store));
}

// Solo se guarda el último progreso de cada número: el más reciente es el que vale.
export async function enqueueProgress(bookId: string, progress: PendingProgress): Promise<void> {
  const store = await readStore();
  store[bookId] = progress;
  await writeStore(store);
}

// Un progreso enviado con éxito deja obsoleto cualquier pendiente de ese número.
export async function discardPendingProgress(bookId: string): Promise<void> {
  const store = await readStore();
  if (bookId in store) {
    delete store[bookId];
    await writeStore(store);
  }
}

export async function flushPendingProgress(api: AxiosInstance): Promise<void> {
  const pending = await readStore();
  for (const [bookId, progress] of Object.entries(pending)) {
    try {
      await updateReadProgress(api, bookId, progress);
      await discardPendingProgress(bookId);
    } catch {
      // Sin conexión: se queda pendiente para el siguiente intento.
    }
  }
}
