import { describe, expect, it } from 'vitest';
import { GIBS_LAYERS, gibsTileUrl, latLonToTile, latestGibsDate } from './gibs';

describe('gibsTileUrl', () => {
  it('builds the exact WMTS REST URL', () => {
    expect(gibsTileUrl(GIBS_LAYERS.trueColor, '2026-08-10', 5, 12, 5)).toBe(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/' +
        'VIIRS_SNPP_CorrectedReflectance_TrueColor/default/2026-08-10/' +
        'GoogleMapsCompatible_Level9/5/12/5.jpg',
    );
  });

  it('uses png for overlay layers', () => {
    const url = gibsTileUrl(GIBS_LAYERS.thermalAnomalies, '2026-08-10', 6, 1, 2);
    expect(url.endsWith('/6/1/2.png')).toBe(true);
    expect(url).toContain('GoogleMapsCompatible_Level8');
  });
});

describe('latLonToTile', () => {
  it('maps the origin to the middle tile', () => {
    expect(latLonToTile(0, 0, 1)).toEqual({ x: 1, y: 1 });
  });

  it('maps San Francisco at z5 to the known tile', () => {
    // Verified against a live GIBS fetch during development.
    expect(latLonToTile(37.77, -122.42, 5)).toEqual({ x: 5, y: 12 });
  });

  it('clamps out-of-range latitudes instead of overflowing', () => {
    const { y } = latLonToTile(89.9, 0, 3);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThan(8);
  });
});

describe('latestGibsDate', () => {
  it('returns UTC yesterday', () => {
    expect(latestGibsDate(new Date('2026-08-11T16:00:00Z'))).toBe('2026-08-10');
  });

  it('crosses month boundaries correctly', () => {
    expect(latestGibsDate(new Date('2026-08-01T02:00:00Z'))).toBe('2026-07-31');
  });
});
