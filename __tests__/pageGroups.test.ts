import { buildPageGroups, findGroupIndex } from '../src/features/reader/pageGroups';

describe('buildPageGroups', () => {
  it('returns no groups for an empty book', () => {
    expect(buildPageGroups(0, false)).toEqual([]);
    expect(buildPageGroups(0, true)).toEqual([]);
  });

  it('puts every page alone in single-page mode', () => {
    expect(buildPageGroups(3, false)).toEqual([[0], [1], [2]]);
  });

  it('keeps the cover alone and pairs the rest in double-page mode', () => {
    expect(buildPageGroups(5, true)).toEqual([[0], [1, 2], [3, 4]]);
  });

  it('leaves an odd trailing page alone in double-page mode', () => {
    expect(buildPageGroups(4, true)).toEqual([[0], [1, 2], [3]]);
  });

  it('handles a single page in double-page mode', () => {
    expect(buildPageGroups(1, true)).toEqual([[0]]);
  });
});

describe('findGroupIndex', () => {
  const groups = buildPageGroups(5, true);

  it('finds the group that contains a page', () => {
    expect(findGroupIndex(groups, 0)).toBe(0);
    expect(findGroupIndex(groups, 1)).toBe(1);
    expect(findGroupIndex(groups, 2)).toBe(1);
    expect(findGroupIndex(groups, 4)).toBe(2);
  });

  it('falls back to the first group for an unknown page', () => {
    expect(findGroupIndex(groups, 99)).toBe(0);
  });
});
