import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '@features/auth/AuthContext';
import { getSeriesById } from '@shared/api/komga';
import { useTheme } from '@shared/theme';
import {
  createCustomList,
  CustomList,
  deleteCustomList,
  getCustomLists,
  toggleSeriesInList,
} from '../customLists';

interface Props {
  visible: boolean;
  onClose: () => void;
  // Modo "añadir": marca en qué listas está la serie.
  seriesId?: string;
  // Modo "ver": muestra las series de una lista concreta.
  browseListId?: string;
  onOpenSeries?: (seriesId: string, title: string) => void;
}

export function CustomListsModal({ visible, onClose, seriesId, browseListId, onOpenSeries }: Props) {
  const { api } = useAuth();
  const { colors, spacing, radii, typography } = useTheme();
  const [lists, setLists] = useState<CustomList[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (visible) {
      getCustomLists().then(setLists);
    }
  }, [visible]);

  const browseList = lists.find(list => list.id === browseListId);

  const browseQuery = useQuery({
    queryKey: ['customList', browseListId, browseList?.seriesIds.join(',')],
    queryFn: () => Promise.all((browseList?.seriesIds ?? []).map(id => getSeriesById(api!, id))),
    enabled: !!api && !!browseList && browseList.seriesIds.length > 0,
  });

  const onToggle = async (listId: string) => {
    if (!seriesId) {
      return;
    }
    setLists(await toggleSeriesInList(listId, seriesId));
  };

  const onCreate = async () => {
    if (!newName.trim()) {
      return;
    }
    setLists(await createCustomList(newName));
    setNewName('');
  };

  const onDelete = async (listId: string) => {
    setLists(await deleteCustomList(listId));
    onClose();
  };

  const title = browseList ? browseList.name : 'Añadir a lista';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.sheet, { backgroundColor: colors.secondaryBackground, borderRadius: radii.lg }]}>
          <Text style={[typography.headline, { color: colors.label, marginBottom: spacing.md }]}>{title}</Text>

          {browseList ? (
            <ScrollView style={styles.scroll}>
              {browseList.seriesIds.length === 0 && (
                <Text style={[typography.footnote, { color: colors.secondaryLabel }]}>
                  Esta lista está vacía. Añade series desde su pantalla.
                </Text>
              )}
              {(browseQuery.data ?? []).map(series => (
                <TouchableOpacity
                  key={series.id}
                  style={styles.row}
                  onPress={() => {
                    onClose();
                    onOpenSeries?.(series.id, series.metadata.title || series.name);
                  }}>
                  <Text style={[typography.body, { color: colors.label }]} numberOfLines={1}>
                    {series.metadata.title || series.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => onDelete(browseList.id)} style={styles.row}>
                <Text style={[typography.body, { color: colors.danger }]}>Borrar lista</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <ScrollView style={styles.scroll}>
              {lists.length === 0 && (
                <Text style={[typography.footnote, { color: colors.secondaryLabel }]}>
                  Todavía no tienes listas. Crea una abajo.
                </Text>
              )}
              {lists.map(list => {
                const checked = !!seriesId && list.seriesIds.includes(seriesId);
                return (
                  <TouchableOpacity key={list.id} style={styles.row} onPress={() => onToggle(list.id)}>
                    <Text style={[typography.body, { color: colors.label, flex: 1 }]} numberOfLines={1}>
                      {list.name}
                    </Text>
                    {!!seriesId && (
                      <Text style={{ fontSize: 18, color: checked ? colors.accent : colors.tertiaryLabel }}>
                        {checked ? '✓' : '+'}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {!browseList && (
            <View style={[styles.createRow, { marginTop: spacing.md }]}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Nombre de la nueva lista"
                placeholderTextColor={colors.tertiaryLabel}
                style={[
                  typography.body,
                  styles.input,
                  { backgroundColor: colors.background, borderRadius: radii.md, color: colors.label },
                ]}
              />
              <TouchableOpacity onPress={onCreate} style={styles.createButton}>
                <Text style={[typography.body, { color: colors.accent, fontWeight: '600' }]}>Crear</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { marginTop: spacing.md }]}>
            <Text style={[typography.body, { color: colors.accent, fontWeight: '600' }]}>Cerrar</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { padding: 20, maxHeight: '75%' },
  scroll: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  createRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 8 },
  createButton: { paddingHorizontal: 12, paddingVertical: 8 },
  closeButton: { alignItems: 'center', paddingVertical: 8 },
});
