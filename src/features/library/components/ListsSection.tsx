import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EmptyState } from '@shared/components';
import { useTheme } from '@shared/theme';
import { CustomList, getCustomLists } from '../customLists';
import { CustomListsModal } from './CustomListsModal';

interface Props {
  onOpenSeries: (seriesId: string, title: string) => void;
}

export function ListsSection({ onOpenSeries }: Props) {
  const { colors, spacing, radii, typography } = useTheme();
  const [lists, setLists] = useState<CustomList[]>([]);
  const [browseListId, setBrowseListId] = useState<string | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);

  const reload = () => {
    getCustomLists().then(setLists);
  };
  useFocusEffect(useCallback(reload, []));

  const openModal = (listId?: string) => {
    setBrowseListId(listId);
    setShowModal(true);
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
      <TouchableOpacity
        onPress={() => openModal(undefined)}
        style={[styles.newButton, { backgroundColor: colors.secondaryBackground, borderRadius: radii.md, marginTop: spacing.md }]}>
        <Text style={[typography.body, { color: colors.accent, fontWeight: '600' }]}>+ Nueva lista</Text>
      </TouchableOpacity>
      <FlatList
        data={lists}
        keyExtractor={list => list.id}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xl }}
        ListEmptyComponent={<EmptyState message="Crea una lista para agrupar series, por ejemplo «Para este mes»." />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openModal(item.id)}
            style={[styles.row, { backgroundColor: colors.secondaryBackground, borderRadius: radii.md, marginBottom: spacing.sm }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.label, fontWeight: '600' }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[typography.footnote, { color: colors.secondaryLabel, marginTop: 2 }]}>
                {item.seriesIds.length} {item.seriesIds.length === 1 ? 'serie' : 'series'}
              </Text>
            </View>
            <Text style={{ color: colors.tertiaryLabel, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        )}
      />
      <CustomListsModal
        visible={showModal}
        browseListId={browseListId}
        onClose={() => {
          setShowModal(false);
          reload();
        }}
        onOpenSeries={onOpenSeries}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  newButton: { alignItems: 'center', paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
});
