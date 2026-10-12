import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosInstance } from 'axios';
import { getSeriesBooks, getSeriesById } from '@shared/api/komga';
import { showLocalNotification } from '@shared/native/appNative';
import { getFavoriteIds } from '@features/library/favorites';
import { getSeriesLastSeen } from '@features/library/seriesSeen';

const ENABLED_KEY = 'bunker616.newIssueAlerts';
const ALERTED_KEY = 'bunker616.alertedBooks';

export async function getNewIssueAlertsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === 'true';
}

export async function setNewIssueAlertsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}

async function getAlerted(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(ALERTED_KEY);
  return raw ? JSON.parse(raw) : {};
}

// Id estable por serie para que una notificación nueva sustituya a la anterior
// de la misma serie en vez de apilarse.
function notificationId(seriesId: string): number {
  let hash = 0;
  for (let i = 0; i < seriesId.length; i++) {
    hash = (hash * 31 + seriesId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100000 + 1000;
}

/**
 * Compara los números de las series seguidas con lo último avisado y muestra
 * una notificación local por serie con números nuevos.
 *
 * Solo se ejecuta con la app abierta (al volver a Inicio): no hay servidor de
 * push ni trabajo en segundo plano, así que no avisa con la app cerrada.
 */
export async function checkNewIssueAlerts(api: AxiosInstance): Promise<number> {
  if (!(await getNewIssueAlertsEnabled())) {
    return 0;
  }
  const followedIds = await getFavoriteIds();
  const lastSeen = await getSeriesLastSeen();
  const alerted = await getAlerted();
  let notifiedSeries = 0;

  for (const seriesId of followedIds) {
    try {
      const [series, books] = await Promise.all([
        getSeriesById(api, seriesId),
        getSeriesBooks(api, seriesId, 0, 500),
      ]);
      const createdTimes = books.content
        .map(book => (book.created ? Date.parse(book.created) : NaN))
        .filter(time => !Number.isNaN(time));
      if (createdTimes.length === 0) {
        continue;
      }

      // Lo último avisado o lo último visto en la app, lo que sea más reciente.
      const baseline = Math.max(
        alerted[seriesId] ? Date.parse(alerted[seriesId]) : 0,
        lastSeen[seriesId] ? Date.parse(lastSeen[seriesId]) : 0,
      );
      if (baseline === 0) {
        // Primera vez: fijamos el punto de partida sin avisar de lo que ya había.
        alerted[seriesId] = new Date(Math.max(...createdTimes)).toISOString();
        continue;
      }

      const fresh = createdTimes.filter(time => time > baseline);
      if (fresh.length === 0) {
        continue;
      }

      const count = fresh.length;
      showLocalNotification(
        notificationId(seriesId),
        series.metadata.title,
        count === 1 ? 'Hay 1 número nuevo' : `Hay ${count} números nuevos`,
      );
      alerted[seriesId] = new Date(Math.max(...fresh)).toISOString();
      notifiedSeries += 1;
    } catch {
      // Una serie que falla (servidor caído, etc.) no debe frenar al resto.
    }
  }

  await AsyncStorage.setItem(ALERTED_KEY, JSON.stringify(alerted));
  return notifiedSeries;
}
