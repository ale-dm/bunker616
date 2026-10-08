import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SettingsScreenProps } from '@navigation/types';
import { useAuth } from '@features/auth/AuthContext';
import { disableAppLock, enableAppLock, isAppLockEnabled, isBiometrySupported } from '@features/auth/appLock';
import {
  getDefaultReadingDirection,
  ReadingDirection,
  setDefaultReadingDirection,
} from '@features/reader/readingDirection';
import { deleteOfflineBook, formatBytes } from '@features/offline/offlineStore';
import { useOfflineRecords } from '@features/offline/useOfflineBook';
import { ThemePreference, useTheme } from '@shared/theme';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

const DIRECTION_OPTIONS: { value: ReadingDirection; label: string }[] = [
  { value: 'ltr', label: 'Occidental' },
  { value: 'rtl', label: 'Manga (RTL)' },
];

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { servers, activeServer, switchServer, removeServer } = useAuth();
  const { colors, spacing, radii, typography, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const [biometrySupported, setBiometrySupported] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [readingDirection, setReadingDirection] = useState<ReadingDirection>('ltr');

  useEffect(() => {
    isBiometrySupported().then(setBiometrySupported);
    isAppLockEnabled().then(setAppLockEnabled);
    getDefaultReadingDirection().then(setReadingDirection);
  }, []);

  const onChangeReadingDirection = (direction: ReadingDirection) => {
    setReadingDirection(direction);
    setDefaultReadingDirection(direction);
  };

  const onToggleAppLock = async (value: boolean) => {
    if (value) {
      await enableAppLock();
    } else {
      await disableAppLock();
    }
    setAppLockEnabled(value);
  };

  const offlineRecords = useOfflineRecords();
  const offlineBytes = offlineRecords.reduce((sum, record) => sum + record.bytes, 0);

  const confirmDeleteDownload = (bookId: string, title: string) => {
    Alert.alert('Borrar descarga', `¿Quitar "${title}" del almacenamiento del móvil?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => deleteOfflineBook(bookId) },
    ]);
  };

  const confirmRemoveServer = (id: string, baseUrl: string) => {
    Alert.alert('Quitar servidor', `¿Seguro que quieres quitar ${baseUrl}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => removeServer(id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Text style={[typography.largeTitle, { color: colors.label, paddingHorizontal: spacing.lg, marginTop: spacing.sm }]}>
        Ajustes
      </Text>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
        <Text style={[typography.footnote, { color: colors.secondaryLabel, marginBottom: spacing.xs }]}>
          SERVIDORES
        </Text>
        {servers.map(server => {
          const isActive = server.id === activeServer?.id;
          return (
            <TouchableOpacity
              key={server.id}
              style={[
                styles.card,
                styles.row,
                {
                  backgroundColor: colors.secondaryBackground,
                  borderRadius: radii.md,
                  marginBottom: spacing.xs,
                  borderWidth: isActive ? 1.5 : 0,
                  borderColor: colors.accent,
                },
              ]}
              onPress={() => !isActive && switchServer(server.id)}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.label }]} numberOfLines={1}>
                  {server.baseUrl}
                </Text>
                <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]} numberOfLines={1}>
                  {server.email}
                  {isActive ? ' · Activo' : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => confirmRemoveServer(server.id, server.baseUrl)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[typography.footnote, { color: colors.danger }]}>Quitar</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.card, styles.addCard, { borderColor: colors.separator, borderRadius: radii.md }]}
          onPress={() => navigation.navigate('AddServer')}>
          <Text style={[typography.body, { color: colors.accent, fontWeight: '600' }]}>+ Añadir servidor</Text>
        </TouchableOpacity>

        <Text style={[typography.footnote, { color: colors.secondaryLabel, marginBottom: spacing.xs, marginTop: spacing.lg }]}>
          TEMA
        </Text>
        <View
          style={[
            styles.segmented,
            { backgroundColor: colors.secondaryBackground, borderRadius: radii.md },
          ]}>
          {THEME_OPTIONS.map(option => {
            const active = preference === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.segmentItem,
                  { borderRadius: radii.sm },
                  active && { backgroundColor: colors.accent },
                ]}
                onPress={() => setPreference(option.value)}>
                <Text
                  style={[
                    typography.subhead,
                    { color: active ? '#FFFFFF' : colors.label, fontWeight: active ? '600' : '400' },
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[typography.footnote, { color: colors.secondaryLabel, marginBottom: spacing.xs, marginTop: spacing.lg }]}>
          DIRECCIÓN DE LECTURA
        </Text>
        <View
          style={[
            styles.segmented,
            { backgroundColor: colors.secondaryBackground, borderRadius: radii.md },
          ]}>
          {DIRECTION_OPTIONS.map(option => {
            const active = readingDirection === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.segmentItem,
                  { borderRadius: radii.sm },
                  active && { backgroundColor: colors.accent },
                ]}
                onPress={() => onChangeReadingDirection(option.value)}>
                <Text
                  style={[
                    typography.subhead,
                    { color: active ? '#FFFFFF' : colors.label, fontWeight: active ? '600' : '400' },
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[typography.footnote, { color: colors.secondaryLabel, marginBottom: spacing.xs, marginTop: spacing.lg }]}>
          DESCARGAS · {formatBytes(offlineBytes)}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.secondaryBackground, borderRadius: radii.md }]}>
          {offlineRecords.length === 0 ? (
            <Text style={[typography.footnote, { color: colors.secondaryLabel }]}>
              No hay capítulos descargados. Puedes descargarlos desde el lector.
            </Text>
          ) : (
            offlineRecords.map(record => (
              <View key={record.bookId} style={[styles.row, { paddingVertical: spacing.xs }]}>
                <View style={styles.offlineInfo}>
                  <Text style={[typography.body, { color: colors.label }]} numberOfLines={1}>
                    {record.title}
                  </Text>
                  <Text style={[typography.footnote, { color: colors.secondaryLabel }]}>
                    {formatBytes(record.bytes)} · {record.pages.length} páginas
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmDeleteDownload(record.bookId, record.title)}>
                  <Text style={[typography.footnote, { color: colors.danger }]}>Borrar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {biometrySupported && (
          <>
            <Text style={[typography.footnote, { color: colors.secondaryLabel, marginBottom: spacing.xs, marginTop: spacing.lg }]}>
              SEGURIDAD
            </Text>
            <View
              style={[
                styles.card,
                styles.row,
                { backgroundColor: colors.secondaryBackground, borderRadius: radii.md },
              ]}>
              <Text style={[typography.body, { color: colors.label }]}>Bloqueo con biometría</Text>
              <Switch value={appLockEnabled} onValueChange={onToggleAppLock} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addCard: { alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
  segmented: { flexDirection: 'row', padding: 4 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  offlineInfo: { flex: 1, marginRight: 12 },
});
