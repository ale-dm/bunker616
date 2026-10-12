import { DeviceEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';

interface AppNativeModule {
  setOrientationLock(landscapeOnly: boolean): void;
  setVolumeKeysEnabled(enabled: boolean): void;
  showNotification(id: number, title: string, body: string): void;
}

// Solo existe en Android; en otras plataformas (o si el módulo no se ha
// registrado) las llamadas son no-ops.
const native: AppNativeModule | undefined =
  Platform.OS === 'android' ? NativeModules.AppNative : undefined;

export function setReaderLandscapeLock(landscapeOnly: boolean): void {
  native?.setOrientationLock(landscapeOnly);
}

export function setVolumeKeysEnabled(enabled: boolean): void {
  native?.setVolumeKeysEnabled(enabled);
}

/** Se suscribe a las teclas de volumen mientras el lector las tiene capturadas. */
export function onVolumeKey(handler: (direction: 'up' | 'down') => void): () => void {
  const subscription = DeviceEventEmitter.addListener('VolumeKey', (event: { direction: 'up' | 'down' }) =>
    handler(event.direction),
  );
  return () => subscription.remove();
}

export function showLocalNotification(id: number, title: string, body: string): void {
  native?.showNotification(id, title, body);
}

/**
 * Pide permiso de notificaciones. Desde Android 13 hace falta preguntar; antes
 * el permiso viene concedido por defecto.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  if (Number(Platform.Version) < 33) {
    return true;
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
