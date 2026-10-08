import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReadingDirection = 'ltr' | 'rtl';

const KEY = 'bunker616.readingDirection';

export async function getDefaultReadingDirection(): Promise<ReadingDirection> {
  const stored = await AsyncStorage.getItem(KEY);
  return stored === 'rtl' ? 'rtl' : 'ltr';
}

export async function setDefaultReadingDirection(direction: ReadingDirection): Promise<void> {
  await AsyncStorage.setItem(KEY, direction);
}
