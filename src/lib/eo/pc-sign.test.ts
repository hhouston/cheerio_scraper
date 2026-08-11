import { describe, expect, it } from 'vitest';
import { sasTokenUrl, signHref } from './pc-sign';

describe('sasTokenUrl', () => {
  it('targets the SAS endpoint for a collection', () => {
    expect(sasTokenUrl('sentinel-1-grd')).toBe(
      'https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-1-grd',
    );
  });
});

describe('signHref', () => {
  const token = 'st=2026-08-10&se=2026-08-11&sig=abc';

  it('appends with ? when the href has no query', () => {
    expect(signHref('https://blob.example.com/a.tif', token)).toBe(
      `https://blob.example.com/a.tif?${token}`,
    );
  });

  it('appends with & when the href already has a query', () => {
    expect(signHref('https://blob.example.com/a.tif?v=1', token)).toBe(
      `https://blob.example.com/a.tif?v=1&${token}`,
    );
  });
});
