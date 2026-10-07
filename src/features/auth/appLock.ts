import * as Keychain from 'react-native-keychain';

const APP_LOCK_SERVICE = 'bunker616.applock';

export async function isBiometrySupported(): Promise<boolean> {
  const type = await Keychain.getSupportedBiometryType();
  return type !== null;
}

export async function isAppLockEnabled(): Promise<boolean> {
  return Keychain.hasGenericPassword({ service: APP_LOCK_SERVICE });
}

export async function enableAppLock(): Promise<void> {
  await Keychain.setGenericPassword('bunker616', 'locked', {
    service: APP_LOCK_SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
  });
}

export async function disableAppLock(): Promise<void> {
  await Keychain.resetGenericPassword({ service: APP_LOCK_SERVICE });
}

export async function unlockWithBiometrics(): Promise<boolean> {
  try {
    const result = await Keychain.getGenericPassword({ service: APP_LOCK_SERVICE });
    return result !== false;
  } catch {
    return false;
  }
}
