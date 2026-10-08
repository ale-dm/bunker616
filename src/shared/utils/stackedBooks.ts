import { Book } from '@shared/types/komga';

// Devuelve los números que se muestran detrás de una portada apilada. Con
// fromBookId, los números que vienen después de ese; si no, los que siguen al
// primero sin leer de la serie.
export function nextBooks(books: Book[], fromBookId?: string, count = 2): Book[] {
  if (fromBookId) {
    const index = books.findIndex(book => book.id === fromBookId);
    return index >= 0 ? books.slice(index + 1, index + 1 + count) : [];
  }
  const firstUnread = books.findIndex(book => !book.readProgress?.completed);
  const start = firstUnread >= 0 ? firstUnread : 0;
  return books.slice(start + 1, start + 1 + count);
}
