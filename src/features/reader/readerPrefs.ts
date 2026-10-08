import AsyncStorage from '@react-native-async-storage/async-storage';

export type FitMode = 'contain' | 'cover';

const FIT_KEY = 'bunker616.readerFit';
const NIGHT_KEY = 'bunker616.nightDimming';

// Ventana fija para el modo nocturno automático: de 22:00 a 07:00.
const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 7;

export async function getFitMode(): Promise<FitMode> {
  return (await AsyncStorage.getItem(FIT_KEY)) === 'cover' ? 'cover' : 'contain';
}

export async function setFitMode(mode: FitMode): Promise<void> {
  await AsyncStorage.setItem(FIT_KEY, mode);
}

export async function getNightDimmingEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(NIGHT_KEY)) === 'true';
}

export async function setNightDimmingEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NIGHT_KEY, enabled ? 'true' : 'false');
}

export function isNightHour(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}
