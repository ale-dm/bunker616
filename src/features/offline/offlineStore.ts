import AsyncStorage from '@react-native-async-storage/async-storage';
import RNBlobUtil from 'react-native-blob-util';
import { bookPageUrl } from '@shared/api/komga';
import { BookPage } from '@shared/types/komga';

const RECORDS_KEY = 'bunker616.offlineBooks';
const OFFLINE_ROOT = `${RNBlobUtil.fs.dirs.DocumentDir}/offline`;
// Las descargas de página completa son más pesadas que las peticiones de la
// API: un timeout corto haría fallar capítulos enteros (ver Koharia#94).
const PAGE_TIMEOUT_MS = 60_000;
const PAGE_ATTEMPTS = 3;

export interface OfflineBookRecord {
  bookId: string;
  title: string;
  pages: BookPage[];
  bytes: number;
  downloadedAt: number;
}

export interface DownloadProgress {
  done: number;
  total: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();
const progressByBook = new Map<string, DownloadProgress>();
let queue: Promise<unknown> = Promise.resolve();

function notify() {
  listeners.forEach(listener => listener());
}

export function subscribeOffline(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDownloadProgress(bookId: string): DownloadProgress | undefined {
  return progressByBook.get(bookId);
}

function bookDir(bookId: string) {
  return `${OFFLINE_ROOT}/${bookId}`;
}

export function extensionFor(mediaType: string): string {
  switch (mediaType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

export function localPagePath(bookId: string, page: BookPage): string {
  return `${bookDir(bookId)}/${page.number}.${extensionFor(page.mediaType)}`;
}

export function localPageUri(bookId: string, page: BookPage): string {
  return `file://${localPagePath(bookId, page)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function getOfflineRecords(): Promise<OfflineBookRecord[]> {
  const raw = await AsyncStorage.getItem(RECORDS_KEY);
  const records: OfflineBookRecord[] = raw ? JSON.parse(raw) : [];
  // Si el usuario limpió el almacenamiento de la app, el índice queda huérfano.
  const existing: OfflineBookRecord[] = [];
  for (const record of records) {
    if (await RNBlobUtil.fs.exists(bookDir(record.bookId))) {
      existing.push(record);
    }
  }
  if (existing.length !== records.length) {
    await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(existing));
  }
  return existing;
}

async function saveRecord(record: OfflineBookRecord) {
  const records = (await getOfflineRecords()).filter(r => r.bookId !== record.bookId);
  records.push(record);
  await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

async function fetchPageWithRetry(url: string, authHeader: string, destination: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= PAGE_ATTEMPTS; attempt++) {
    try {
      const response = await RNBlobUtil.config({ path: destination, timeout: PAGE_TIMEOUT_MS }).fetch(
        'GET',
        url,
        { Authorization: authHeader },
      );
      if (response.info().status !== 200) {
        throw new Error(`HTTP ${response.info().status}`);
      }
      return;
    } catch (error) {
      lastError = error;
      await new Promise<void>(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
  throw lastError;
}

interface DownloadParams {
  baseUrl: string;
  authHeader: string;
  bookId: string;
  title: string;
  pages: BookPage[];
}

export function downloadBook(params: DownloadParams): Promise<void> {
  const task = queue.then(() => runDownload(params));
  queue = task.catch(() => undefined);
  return task;
}

async function runDownload({ baseUrl, authHeader, bookId, title, pages }: DownloadParams) {
  const dir = bookDir(bookId);
  await RNBlobUtil.fs.mkdir(dir).catch(() => undefined);
  progressByBook.set(bookId, { done: 0, total: pages.length });
  notify();

  try {
    for (const page of pages) {
      await fetchPageWithRetry(bookPageUrl(baseUrl, bookId, page.number), authHeader, localPagePath(bookId, page));
      progressByBook.set(bookId, { done: page.number, total: pages.length });
      notify();
    }

    let bytes = 0;
    for (const page of pages) {
      const stat = await RNBlobUtil.fs.stat(localPagePath(bookId, page));
      bytes += stat.size;
    }

    await saveRecord({ bookId, title, pages, bytes, downloadedAt: Date.now() });
  } catch (error) {
    await RNBlobUtil.fs.unlink(dir).catch(() => undefined);
    throw error;
  } finally {
    progressByBook.delete(bookId);
    notify();
  }
}

export async function deleteOfflineBook(bookId: string) {
  await RNBlobUtil.fs.unlink(bookDir(bookId)).catch(() => undefined);
  const records = (await getOfflineRecords()).filter(r => r.bookId !== bookId);
  await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  notify();
}
