import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type TabParamList = {
  HomeTab: undefined;
  // presetGenre permite que Home (u otra pantalla) abra la Biblioteca con
  // un género ya filtrado, imitando los accesos rápidos de Marvel Unlimited.
  LibraryTab: { presetGenre?: string } | undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  Series: { seriesId: string; title: string };
  Reader: { bookId: string; title: string; seriesId: string };
  Collection: { collectionId: string; title: string };
  ReadList: { readListId: string; title: string };
  AddServer: undefined;
};

// LibraryScreen vive dentro del Tab.Navigator pero necesita poder navegar
// a 'Series', que vive un nivel arriba en el Stack.Navigator raíz.
export type LibraryScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'LibraryTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'HomeTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

// Igual que LibraryScreenProps: SettingsScreen necesita navegar a
// 'AddServer', que vive en el Stack raíz.
export type SettingsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'SettingsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;
