import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorCodes, isErrorWithCode, keepLocalCopy, pick, types } from '@react-native-documents/picker';
import RNBlobUtil from 'react-native-blob-util';
import { BACKUP_KEYS } from './backup';

export interface RestoreResult {
  restored: number;
}

// Devuelve null si el usuario cancela el selector.
export async function restoreBackupFromFile(): Promise<RestoreResult | null> {
  let picked;
  try {
    [picked] = await pick({ type: [types.json] });
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
      return null;
    }
    throw error;
  }

  const [copy] = await keepLocalCopy({
    files: [{ uri: picked.uri, fileName: picked.name ?? 'backup.json' }],
    destination: 'cachesDirectory',
  });
  if (copy.status !== 'success') {
    throw new Error('No se pudo leer el archivo seleccionado.');
  }

  const path = copy.localUri.replace(/^file:\/\//, '');
  const contents = await RNBlobUtil.fs.readFile(path, 'utf8');
  await RNBlobUtil.fs.unlink(path).catch(() => undefined);

  const backup = JSON.parse(contents);
  if (backup?.version !== 1 || typeof backup.data !== 'object' || backup.data === null) {
    throw new Error('El archivo no es una copia de seguridad de Bunker616.');
  }

  let restored = 0;
  for (const key of BACKUP_KEYS) {
    if (key in backup.data) {
      await AsyncStorage.setItem(key, JSON.stringify(backup.data[key]));
      restored++;
    }
  }
  return { restored };
}
