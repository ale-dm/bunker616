import { PermissionsAndroid, Platform } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';

const DOWNLOAD_TIMEOUT_MS = 60_000;

interface SavePageParams {
  fileName: string;
  mediaType: string;
  localPath?: string;
  remoteUrl?: string;
  authHeader?: string;
}

// Android < 10 necesita permiso de escritura para tocar la galería; desde
// Android 10 MediaStore permite escribir sin él.
async function ensureGalleryPermission() {
  if (Platform.OS !== 'android' || Platform.Version >= 29) {
    return;
  }
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Permiso de almacenamiento denegado');
  }
}

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();
}

export async function savePageToGallery({
  fileName,
  mediaType,
  localPath,
  remoteUrl,
  authHeader,
}: SavePageParams): Promise<void> {
  await ensureGalleryPermission();

  let sourcePath = localPath;
  let temporary = false;
  if (!sourcePath) {
    if (!remoteUrl) {
      throw new Error('Falta la fuente de la imagen');
    }
    const response = await RNBlobUtil.config({ fileCache: true, timeout: DOWNLOAD_TIMEOUT_MS }).fetch(
      'GET',
      remoteUrl,
      authHeader ? { Authorization: authHeader } : {},
    );
    if (response.info().status !== 200) {
      throw new Error(`HTTP ${response.info().status}`);
    }
    sourcePath = response.path();
    temporary = true;
  }

  try {
    await RNBlobUtil.MediaCollection.copyToMediaStore(
      { name: safeFileName(fileName), parentFolder: 'Bunker616', mimeType: mediaType },
      'Image',
      sourcePath,
    );
  } finally {
    if (temporary) {
      await RNBlobUtil.fs.unlink(sourcePath).catch(() => undefined);
    }
  }
}
