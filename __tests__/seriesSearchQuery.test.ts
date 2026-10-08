import { buildSeriesSearchQuery } from '../src/shared/api/komga';

describe('buildSeriesSearchQuery', () => {
  it('returns an empty string when no filters are set', () => {
    expect(buildSeriesSearchQuery({})).toBe('');
  });

  it('ignores blank values', () => {
    expect(buildSeriesSearchQuery({ title: '   ', author: '', genre: ' ' })).toBe('');
  });

  it('uses the trimmed title as free text', () => {
    expect(buildSeriesSearchQuery({ title: '  batman  ' })).toBe('batman');
  });

  it('wraps the author in parentheses for Komga field syntax', () => {
    expect(buildSeriesSearchQuery({ author: 'Sean Murphy' })).toBe('author:(Sean Murphy)');
  });

  it('leaves single-word genres unquoted', () => {
    expect(buildSeriesSearchQuery({ genre: 'action' })).toBe('genre:action');
  });

  it('quotes multi-word genres', () => {
    expect(buildSeriesSearchQuery({ genre: 'science fiction' })).toBe('genre:"science fiction"');
  });

  it('adds the status filter', () => {
    expect(buildSeriesSearchQuery({ status: 'ongoing' })).toBe('status:ongoing');
  });

  it('combines every filter in a single space-separated query', () => {
    expect(
      buildSeriesSearchQuery({
        title: 'batman',
        author: 'Sean Murphy',
        genre: 'action',
        status: 'ended',
      }),
    ).toBe('batman author:(Sean Murphy) genre:action status:ended');
  });
});
