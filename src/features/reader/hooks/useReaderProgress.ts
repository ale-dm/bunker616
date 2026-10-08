import { AxiosInstance } from 'axios';
import { updateReadProgress } from '@shared/api/komga';
import { discardPendingProgress, enqueueProgress } from '@features/sync/progressQueue';

export function useReaderProgress(api: AxiosInstance | null, bookId: string, totalPages: number) {
  function reportPage(index: number) {
    if (!api || totalPages === 0) {
      return;
    }
    const page = index + 1;
    const progress = { page, completed: page >= totalPages };
    updateReadProgress(api, bookId, progress)
      .then(() => discardPendingProgress(bookId))
      .catch(() => enqueueProgress(bookId, progress));
  }

  return { reportPage };
}
