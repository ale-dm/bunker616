import { AxiosInstance } from 'axios';
import { useMutation } from '@tanstack/react-query';
import { updateReadProgress } from '@shared/api/komga';

export function useReaderProgress(api: AxiosInstance | null, bookId: string, totalPages: number) {
  const mutation = useMutation({
    mutationFn: (payload: { page: number; completed: boolean }) =>
      updateReadProgress(api!, bookId, payload),
  });

  function reportPage(index: number) {
    if (!api || totalPages === 0) {
      return;
    }
    const page = index + 1;
    mutation.mutate({ page, completed: page >= totalPages });
  }

  return { reportPage };
}
