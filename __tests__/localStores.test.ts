const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => (mockStore.has(key) ? mockStore.get(key)! : null),
    setItem: async (key: string, value: string) => {
      mockStore.set(key, value);
    },
  },
}));

import { dayKey, getReadStats } from '../src/features/history/readingLog';
import { getBookmarks, toggleBookmark } from '../src/features/reader/bookmarks';
import { createCustomList, getCustomLists, toggleSeriesInList } from '../src/features/library/customLists';

function daysAgo(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return dayKey(date);
}

beforeEach(() => {
  mockStore.clear();
});

describe('getReadStats', () => {
  it('reports zero when nothing has been read', async () => {
    const stats = await getReadStats();
    expect(stats.today).toBe(0);
    expect(stats.streak).toBe(0);
    expect(stats.last7Days).toHaveLength(7);
  });

  it('counts a streak that includes today', async () => {
    mockStore.set(
      'bunker616.readLog',
      JSON.stringify({ [daysAgo(0)]: 4, [daysAgo(1)]: 2, [daysAgo(2)]: 9 }),
    );
    const stats = await getReadStats();
    expect(stats.today).toBe(4);
    expect(stats.streak).toBe(3);
  });

  it('keeps the streak alive when today has no reading yet', async () => {
    mockStore.set('bunker616.readLog', JSON.stringify({ [daysAgo(1)]: 5, [daysAgo(2)]: 5 }));
    const stats = await getReadStats();
    expect(stats.today).toBe(0);
    expect(stats.streak).toBe(2);
  });

  it('breaks the streak on the first empty day', async () => {
    mockStore.set('bunker616.readLog', JSON.stringify({ [daysAgo(0)]: 1, [daysAgo(2)]: 1 }));
    expect((await getReadStats()).streak).toBe(1);
  });
});

describe('bookmarks', () => {
  it('toggles a page on and off', async () => {
    expect(await toggleBookmark('book-1', 3)).toBe(true);
    expect((await getBookmarks('book-1')).map(b => b.pageIndex)).toEqual([3]);
    expect(await toggleBookmark('book-1', 3)).toBe(false);
    expect(await getBookmarks('book-1')).toEqual([]);
  });

  it('keeps bookmarks sorted and scoped per book', async () => {
    await toggleBookmark('book-1', 9);
    await toggleBookmark('book-1', 2);
    await toggleBookmark('book-2', 5);
    expect((await getBookmarks('book-1')).map(b => b.pageIndex)).toEqual([2, 9]);
    expect((await getBookmarks('book-2')).map(b => b.pageIndex)).toEqual([5]);
  });
});

describe('custom lists', () => {
  it('creates a list and toggles series membership', async () => {
    await createCustomList('  Para este mes  ');
    const [list] = await getCustomLists();
    expect(list.name).toBe('Para este mes');

    await toggleSeriesInList(list.id, 'series-a');
    expect((await getCustomLists())[0].seriesIds).toEqual(['series-a']);

    await toggleSeriesInList(list.id, 'series-a');
    expect((await getCustomLists())[0].seriesIds).toEqual([]);
  });
});

describe('reader presets', () => {
  it('resolves series over library over global defaults', async () => {
    const { savePreset, resolvePrefs } = require('../src/features/reader/readerPresets');
    const base = await resolvePrefs('lib-1', 'series-1');
    expect(base.rtl).toBe(false);
    expect(base.doublePage).toBe(false);

    await savePreset({ type: 'library', id: 'lib-1' }, { ...base, rtl: true });
    await savePreset({ type: 'series', id: 'series-1' }, { ...base, rtl: false, doublePage: true });

    const inSeries = await resolvePrefs('lib-1', 'series-1');
    expect(inSeries.rtl).toBe(false);
    expect(inSeries.doublePage).toBe(true);

    const otherSeries = await resolvePrefs('lib-1', 'series-2');
    expect(otherSeries.rtl).toBe(true);
    expect(otherSeries.doublePage).toBe(false);
  });
});

describe('nextBooks', () => {
  const { nextBooks } = require('../src/shared/utils/stackedBooks');
  const book = (id: string, completed = false) => ({ id, readProgress: completed ? { completed: true } : undefined });

  it('returns the books after a given book', () => {
    const books = [book('1'), book('2'), book('3'), book('4')];
    expect(nextBooks(books, '2').map((b: { id: string }) => b.id)).toEqual(['3', '4']);
  });

  it('returns nothing for the last book', () => {
    expect(nextBooks([book('1'), book('2')], '2')).toEqual([]);
  });

  it('starts after the first unread book when no book is given', () => {
    const books = [book('1', true), book('2', true), book('3'), book('4'), book('5')];
    expect(nextBooks(books).map((b: { id: string }) => b.id)).toEqual(['4', '5']);
  });
});

describe('buildReadingGroups', () => {
  const { buildReadingGroups, findSlotGroupIndex } = require('../src/features/reader/pageGroups');
  const portrait = { width: 800, height: 1200 };
  const spread = { width: 1600, height: 1200 };

  it('splits landscape pages into two halves in reading order', () => {
    const groups = buildReadingGroups([portrait, spread, portrait], false, true, false);
    expect(groups).toEqual([
      [{ pageIndex: 0 }],
      [{ pageIndex: 1, half: 'first' }],
      [{ pageIndex: 1, half: 'second' }],
      [{ pageIndex: 2 }],
    ]);
  });

  it('reverses the halves for right-to-left reading', () => {
    const groups = buildReadingGroups([spread], false, true, true);
    expect(groups).toEqual([[{ pageIndex: 0, half: 'second' }], [{ pageIndex: 0, half: 'first' }]]);
  });

  it('keeps spreads whole when splitting is off or in double-page mode', () => {
    expect(buildReadingGroups([spread], false, false, false)).toEqual([[{ pageIndex: 0 }]]);
    expect(buildReadingGroups([portrait, spread], true, true, false)).toEqual([[{ pageIndex: 0 }], [{ pageIndex: 1 }]]);
  });

  it('finds the group of a page even when it is split', () => {
    const groups = buildReadingGroups([portrait, spread, portrait], false, true, false);
    expect(findSlotGroupIndex(groups, 1)).toBe(1);
    expect(findSlotGroupIndex(groups, 2)).toBe(3);
  });
});
