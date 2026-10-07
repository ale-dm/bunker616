import { AxiosInstance } from 'axios';
import {
  Book,
  BookPage,
  Collection,
  Library,
  Page,
  ReadList,
  Series,
  UserInfo,
} from '../types/komga';

export async function getCurrentUser(api: AxiosInstance): Promise<UserInfo> {
  const { data } = await api.get<UserInfo>('/api/v2/users/me');
  return data;
}

export async function getLibraries(api: AxiosInstance): Promise<Library[]> {
  const { data } = await api.get<Library[]>('/api/v1/libraries');
  return data;
}

export async function getCollections(api: AxiosInstance): Promise<Page<Collection>> {
  const { data } = await api.get<Page<Collection>>('/api/v1/collections', {
    params: { size: 100 },
  });
  return data;
}

export async function getCollectionSeries(
  api: AxiosInstance,
  collectionId: string,
  page = 0,
  size = 24,
): Promise<Page<Series>> {
  const { data } = await api.get<Page<Series>>(
    `/api/v1/collections/${collectionId}/series`,
    { params: { page, size } },
  );
  return data;
}

export async function getReadLists(api: AxiosInstance): Promise<Page<ReadList>> {
  const { data } = await api.get<Page<ReadList>>('/api/v1/readlists', {
    params: { size: 100 },
  });
  return data;
}

export async function getReadListBooks(
  api: AxiosInstance,
  readListId: string,
  page = 0,
  size = 24,
): Promise<Page<Book>> {
  const { data } = await api.get<Page<Book>>(
    `/api/v1/readlists/${readListId}/books`,
    { params: { page, size } },
  );
  return data;
}

// Komga soporta filtros de campo dentro del propio parámetro `search`
// (ver https://komga.org/docs/guides/search), p. ej. "batman author:(sean
// murphy) genre:action status:ongoing". No hace falta ningún parámetro
// nuevo en la API: basta con construir bien el string de búsqueda.
export interface SeriesSearchFilters {
  title?: string;
  author?: string;
  genre?: string;
  status?: 'ongoing' | 'ended' | 'hiatus' | 'abandoned';
}

export function buildSeriesSearchQuery(filters: SeriesSearchFilters): string {
  const parts: string[] = [];
  if (filters.title?.trim()) {
    parts.push(filters.title.trim());
  }
  if (filters.author?.trim()) {
    parts.push(`author:(${filters.author.trim()})`);
  }
  if (filters.genre?.trim()) {
    const genre = filters.genre.trim();
    parts.push(genre.includes(' ') ? `genre:"${genre}"` : `genre:${genre}`);
  }
  if (filters.status) {
    parts.push(`status:${filters.status}`);
  }
  return parts.join(' ');
}

export type SeriesSort = 'title' | 'recent';

const SERIES_SORT_PARAMS: Record<SeriesSort, string> = {
  title: 'metadata.titleSort,asc',
  recent: 'createdDate,desc',
};

export async function getSeries(
  api: AxiosInstance,
  opts: {
    libraryId?: string;
    search?: string;
    page?: number;
    size?: number;
    sort?: SeriesSort;
  },
): Promise<Page<Series>> {
  const { data } = await api.get<Page<Series>>('/api/v1/series', {
    params: {
      library_id: opts.libraryId,
      search: opts.search || undefined,
      page: opts.page ?? 0,
      size: opts.size ?? 24,
      sort: SERIES_SORT_PARAMS[opts.sort ?? 'title'],
    },
  });
  return data;
}

export async function getBooksInProgress(api: AxiosInstance, size = 10): Promise<Page<Book>> {
  const { data } = await api.get<Page<Book>>('/api/v1/books', {
    params: { read_status: 'IN_PROGRESS', sort: 'readProgress.readDate,desc', size },
  });
  return data;
}

export async function getBook(
  api: AxiosInstance,
  bookId: string,
): Promise<Book> {
  const { data } = await api.get<Book>(`/api/v1/books/${bookId}`);
  return data;
}

export async function getSeriesBooks(
  api: AxiosInstance,
  seriesId: string,
  page = 0,
  size = 100,
): Promise<Page<Book>> {
  const { data } = await api.get<Page<Book>>(
    `/api/v1/series/${seriesId}/books`,
    { params: { page, size, sort: 'metadata.numberSort,asc' } },
  );
  return data;
}

export async function getBookPages(
  api: AxiosInstance,
  bookId: string,
): Promise<BookPage[]> {
  const { data } = await api.get<BookPage[]>(
    `/api/v1/books/${bookId}/pages`,
  );
  return data;
}

export async function updateReadProgress(
  api: AxiosInstance,
  bookId: string,
  payload: { page: number; completed: boolean },
): Promise<void> {
  await api.patch(`/api/v1/books/${bookId}/read-progress`, payload);
}

export function seriesThumbnailUrl(baseUrl: string, seriesId: string): string {
  return `${baseUrl}/api/v1/series/${seriesId}/thumbnail`;
}

export function bookThumbnailUrl(baseUrl: string, bookId: string): string {
  return `${baseUrl}/api/v1/books/${bookId}/thumbnail`;
}

export function bookPageUrl(
  baseUrl: string,
  bookId: string,
  pageNumber: number,
): string {
  return `${baseUrl}/api/v1/books/${bookId}/pages/${pageNumber}`;
}
