import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bunker616.readLog';

export interface ReadStats {
  today: number;
  last7Days: number[];
  streak: number;
}

type ReadLog = Record<string, number>;

export function dayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function readLog(): Promise<ReadLog> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function recordPageTurn(): Promise<void> {
  const log = await readLog();
  const key = dayKey();
  log[key] = (log[key] ?? 0) + 1;
  await AsyncStorage.setItem(KEY, JSON.stringify(log));
}

export async function getReadStats(): Promise<ReadStats> {
  const log = await readLog();
  const today = new Date();
  const last7Days: number[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    last7Days.push(log[dayKey(date)] ?? 0);
  }

  // La racha cuenta desde hoy; si hoy aún no se ha leído, cuenta desde ayer.
  let streak = 0;
  const cursor = new Date(today);
  if (!log[dayKey(cursor)]) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (log[dayKey(cursor)]) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { today: log[dayKey(today)] ?? 0, last7Days, streak };
}
