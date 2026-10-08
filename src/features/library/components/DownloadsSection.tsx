import React from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { deleteOfflineBook, formatBytes } from '@features/offline/offlineStore';
import { useOfflineRecords } from '@features/offline/useOfflineBook';
import { EmptyState } from '@shared/components';
import { useTheme } from '@shared/theme';

export function DownloadsSection() {
  const { colors, spacing, radii, typography } = useTheme();
  const records = useOfflineRecords();
  const totalBytes = records.reduce((sum, record) => sum + record.bytes, 0);

  const confirmDelete = (bookId: string, title: string) => {
    Alert.alert('Borrar descarga', `¿Quitar "${title}" del móvil?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => deleteOfflineBook(bookId) },
    ]);
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
      <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: spacing.md }]}>
        {records.length} {records.length === 1 ? 'número' : 'números'} · {formatBytes(totalBytes)}
      </Text>
      <FlatList
        data={records}
        keyExtractor={record => record.bookId}
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xl }}
        ListEmptyComponent={<EmptyState message="No tienes números descargados. Puedes descargarlos desde el lector." />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => confirmDelete(item.bookId, item.title)}
            onPress={() => confirmDelete(item.bookId, item.title)}
            style={[styles.row, { backgroundColor: colors.secondaryBackground, borderRadius: radii.md, marginBottom: spacing.sm }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.label, fontWeight: '600' }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]}>
                {formatBytes(item.bytes)} · {item.pages.length} páginas
              </Text>
            </View>
            <Text style={[typography.footnote, { color: colors.danger }]}>Borrar</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
});
