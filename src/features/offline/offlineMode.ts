import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bunker616.offlineMode';

const listeners = new Set<() => void>();

export async function getOfflineMode(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === 'true';
}

export async function setOfflineMode(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, enabled ? 'true' : 'false');
  listeners.forEach(listener => listener());
}

export function useOfflineMode(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      getOfflineMode().then(value => {
        if (active) {
          setEnabled(value);
        }
      });
    };
    refresh();
    listeners.add(refresh);
    return () => {
      active = false;
      listeners.delete(refresh);
    };
  }, []);
  return enabled;
}
