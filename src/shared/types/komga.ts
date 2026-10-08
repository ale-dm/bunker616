export interface ServerCredentials {
  baseUrl: string;
  email: string;
  password: string;
}

export interface ServerProfile extends ServerCredentials {
  id: string;
}

export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number; // current page, zero-based
  size: number;
  first: boolean;
  last: boolean;
}

export interface Library {
  id: string;
  name: string;
  root: string;
}

export interface ReadProgress {
  page: number;
  completed: boolean;
  readDate?: string;
}

export interface Author {
  name: string;
  role: string;
}

export interface Series {
  id: string;
  libraryId: string;
  name: string;
  booksCount: number;
  booksReadCount: number;
  booksUnreadCount: number;
  booksInProgressCount: number;
  metadata: {
    title: string;
    summary?: string;
    status?: string;
    genres?: string[];
    publisher?: string;
    ageRating?: number | null;
    language?: string;
  };
}

export interface BookPage {
  number: number; // 1-based
  fileName: string;
  mediaType: string;
  width?: number;
  height?: number;
}

export interface Book {
  id: string;
  seriesId: string;
  libraryId: string;
  name: string;
  number: number;
  created?: string;
  media: {
    status: string;
    pagesCount: number;
  };
  metadata: {
    title: string;
    number: string;
    numberSort?: number;
    releaseDate?: string;
    summary?: string;
    authors?: Author[];
  };
  readProgress?: ReadProgress;
}

export interface Collection {
  id: string;
  name: string;
  ordered: boolean;
  seriesIds: string[];
}

export interface ReadList {
  id: string;
  name: string;
  ordered: boolean;
  bookIds: string[];
}

export interface UserInfo {
  id: string;
  email: string;
  roles: string[];
}
