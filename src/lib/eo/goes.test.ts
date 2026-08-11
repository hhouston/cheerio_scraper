import { describe, expect, it } from 'vitest';
import { dayOfYear, goesBucketPrefix, goesCdnLatestUrl } from './goes';

describe('goesCdnLatestUrl', () => {
  it('builds the sized GeoColor URL', () => {
    expect(goesCdnLatestUrl(1808)).toBe(
      'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/1808x1808.jpg',
    );
  });
});

describe('dayOfYear', () => {
  it('handles a mid-year date', () => {
    expect(dayOfYear(new Date('2026-08-11T16:00:00Z'))).toBe(223);
  });

  it('handles leap years', () => {
    expect(dayOfYear(new Date('2028-03-01T00:00:00Z'))).toBe(61);
    expect(dayOfYear(new Date('2026-03-01T00:00:00Z'))).toBe(60);
  });
});

describe('goesBucketPrefix', () => {
  it('builds the ABI product listing prefix with zero-padded day and hour', () => {
    expect(goesBucketPrefix('ABI-L2-CMIPF', new Date('2026-08-11T06:20:00Z'))).toBe(
      'ABI-L2-CMIPF/2026/223/06/',
    );
  });
});
