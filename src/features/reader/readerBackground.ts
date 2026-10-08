import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReaderBackground = 'black' | 'sepia' | 'white';

export const READER_BACKGROUND_COLORS: Record<ReaderBackground, string> = {
  black: '#000000',
  sepia: '#F4ECD8',
  white: '#FFFFFF',
};

const KEY = 'bunker616.readerBackground';
const ORDER: ReaderBackground[] = ['black', 'sepia', 'white'];

export function nextReaderBackground(current: ReaderBackground): ReaderBackground {
  return ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
}

export async function getReaderBackground(): Promise<ReaderBackground> {
  const stored = await AsyncStorage.getItem(KEY);
  return stored === 'sepia' || stored === 'white' ? stored : 'black';
}

export async function setReaderBackground(background: ReaderBackground): Promise<void> {
  await AsyncStorage.setItem(KEY, background);
}
