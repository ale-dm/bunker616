import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'bunker616.customLists';

export interface CustomList {
  id: string;
  name: string;
  seriesIds: string[];
}

export async function getCustomLists(): Promise<CustomList[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

async function save(lists: CustomList[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(lists));
}

export async function createCustomList(name: string): Promise<CustomList[]> {
  const lists = await getCustomLists();
  lists.push({ id: `${Date.now()}`, name: name.trim(), seriesIds: [] });
  await save(lists);
  return lists;
}

export async function deleteCustomList(listId: string): Promise<CustomList[]> {
  const lists = (await getCustomLists()).filter(list => list.id !== listId);
  await save(lists);
  return lists;
}

export async function toggleSeriesInList(listId: string, seriesId: string): Promise<CustomList[]> {
  const lists = await getCustomLists();
  const list = lists.find(item => item.id === listId);
  if (list) {
    list.seriesIds = list.seriesIds.includes(seriesId)
      ? list.seriesIds.filter(id => id !== seriesId)
      : [...list.seriesIds, seriesId];
  }
  await save(lists);
  return lists;
}
