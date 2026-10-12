import RNBlobUtil from 'react-native-blob-util';
import { bookPageUrl } from '@shared/api/komga';
import { BookPage } from '@shared/types/komga';
import { extensionFor } from '@features/offline/offlineStore';

const MAX_CACHED = 8;
const PAGE_TIMEOUT_MS = 60_000;

const cached = new Map<string, string>();
const inFlight = new Set<string>();

function cacheKey(bookId: string, pageNumber: number) {
  return `${bookId}:${pageNumber}`;
}

export function cachedPagePath(bookId: string, page: BookPage): string | undefined {
  return cached.get(cacheKey(bookId, page.number));
}

function evictOldest() {
  while (cached.size > MAX_CACHED) {
    const oldest = cached.entries().next().value;
    if (!oldest) {
      return;
    }
    cached.delete(oldest[0]);
    RNBlobUtil.fs.unlink(oldest[1]).catch(() => undefined);
  }
}

interface PrefetchParams {
  baseUrl: string;
  authHeader: string;
  bookId: string;
  pages: BookPage[];
  fromIndex: number;
  count: number;
  onReady: () => void;
}

export async function prefetchPages({
  baseUrl,
  authHeader,
  bookId,
  pages,
  fromIndex,
  count,
  onReady,
}: PrefetchParams): Promise<void> {
  const end = Math.min(pages.length, fromIndex + count);
  for (let index = fromIndex; index < end; index++) {
    const page = pages[index];
    const key = cacheKey(bookId, page.number);
    if (cached.has(key) || inFlight.has(key)) {
      continue;
    }
    inFlight.add(key);
    const path = `${RNBlobUtil.fs.dirs.CacheDir}/prefetch-${bookId}-${page.number}.${extensionFor(page.mediaType)}`;
    try {
      const response = await RNBlobUtil.config({ path, timeout: PAGE_TIMEOUT_MS }).fetch(
        'GET',
        bookPageUrl(baseUrl, bookId, page.number),
        { Authorization: authHeader },
      );
      if (response.info().status === 200) {
        cached.set(key, path);
        evictOldest();
        onReady();
      }
    } catch {
      // Un fallo de prefetch no es grave: la página se pedirá al mostrarla.
    } finally {
      inFlight.delete(key);
    }
  }
}

const PREFETCH_PREFIX = 'prefetch-';

export async function prefetchCacheBytes(): Promise<number> {
  const dir = RNBlobUtil.fs.dirs.CacheDir;
  const names = (await RNBlobUtil.fs.ls(dir)).filter(name => name.startsWith(PREFETCH_PREFIX));
  let total = 0;
  for (const name of names) {
    total += (await RNBlobUtil.fs.stat(`${dir}/${name}`)).size;
  }
  return total;
}

export async function clearPrefetchCache(): Promise<void> {
  cached.clear();
  const dir = RNBlobUtil.fs.dirs.CacheDir;
  const names = (await RNBlobUtil.fs.ls(dir)).filter(name => name.startsWith(PREFETCH_PREFIX));
  await Promise.all(names.map(name => RNBlobUtil.fs.unlink(`${dir}/${name}`).catch(() => undefined)));
}
