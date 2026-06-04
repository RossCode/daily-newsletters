import { describe, it, expect } from 'vitest';
import { parseNewsletterPath, extractTitle, formatDate, formatShortDate } from './newsletters';

describe('parseNewsletterPath', () => {
  it('extracts year, month (lowercased), slug, and url', () => {
    expect(parseNewsletterPath('/newsletters/2026/June/2026-06-04.md')).toEqual({
      year: '2026',
      month: 'june',
      slug: '2026-06-04',
      url: '/2026/june/2026-06-04',
    });
  });

  it('lowercases month regardless of casing', () => {
    expect(parseNewsletterPath('/newsletters/2025/DECEMBER/2025-12-31.md').month).toBe('december');
    expect(parseNewsletterPath('/newsletters/2025/december/2025-12-31.md').month).toBe('december');
  });

  it('builds url from year, lowercased month, and slug', () => {
    expect(parseNewsletterPath('/newsletters/2025/May/2025-05-15.md').url).toBe('/2025/may/2025-05-15');
  });
});

describe('extractTitle', () => {
  it('returns text of the first h1 heading', () => {
    const md = '# Morning Digest, June 4, 2026\n\n*14 newsletters*';
    expect(extractTitle(md, 'fallback')).toBe('Morning Digest, June 4, 2026');
  });

  it('returns fallback when no h1 exists', () => {
    expect(extractTitle('## Only an H2\n\nsome content', '2026-06-04')).toBe('2026-06-04');
  });

  it('trims whitespace from the heading', () => {
    expect(extractTitle('#  Spaced Title  ', 'fallback')).toBe('Spaced Title');
  });
});

describe('formatDate', () => {
  it('formats YYYY-MM-DD as "Mon D, YYYY"', () => {
    expect(formatDate('2026-06-04')).toBe('Jun 4, 2026');
  });

  it('removes leading zero from day', () => {
    expect(formatDate('2026-01-08')).toBe('Jan 8, 2026');
  });

  it('handles end of year', () => {
    expect(formatDate('2025-12-31')).toBe('Dec 31, 2025');
  });
});

describe('formatShortDate', () => {
  it('formats YYYY-MM-DD as "Mon D" without year', () => {
    expect(formatShortDate('2026-06-04')).toBe('Jun 4');
  });

  it('removes leading zero from day', () => {
    expect(formatShortDate('2026-06-01')).toBe('Jun 1');
  });
});
