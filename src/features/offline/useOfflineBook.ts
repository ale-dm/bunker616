import { useEffect, useState } from 'react';
import {
  DownloadProgress,
  getDownloadProgress,
  getOfflineRecords,
  OfflineBookRecord,
  subscribeOffline,
} from './offlineStore';

export function useOfflineBook(bookId: string) {
  const [record, setRecord] = useState<OfflineBookRecord | undefined>(undefined);
  const [progress, setProgress] = useState<DownloadProgress | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      setProgress(getDownloadProgress(bookId));
      getOfflineRecords().then(records => {
        if (active) {
          setRecord(records.find(r => r.bookId === bookId));
        }
      });
    };
    refresh();
    const unsubscribe = subscribeOffline(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [bookId]);

  return { record, progress };
}

export function useOfflineRecords() {
  const [records, setRecords] = useState<OfflineBookRecord[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      getOfflineRecords().then(next => {
        if (active) {
          setRecords(next);
        }
      });
    };
    refresh();
    const unsubscribe = subscribeOffline(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return records;
}
