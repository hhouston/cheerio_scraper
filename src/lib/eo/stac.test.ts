import { describe, expect, it } from 'vitest';
import { EARTH_SEARCH_URL, buildStacSearch, parseItemCollection } from './stac';

describe('buildStacSearch', () => {
  it('builds a POST search with bbox, collections, and newest-first sort', () => {
    const { url, body } = buildStacSearch(EARTH_SEARCH_URL, {
      collections: ['sentinel-2-l2a'],
      bbox: [-122.52, 37.7, -122.35, 37.85],
      limit: 3,
    });
    expect(url).toBe('https://earth-search.aws.element84.com/v1/search');
    expect(body).toEqual({
      collections: ['sentinel-2-l2a'],
      bbox: [-122.52, 37.7, -122.35, 37.85],
      limit: 3,
      sortby: [{ field: 'properties.datetime', direction: 'desc' }],
    });
  });

  it('adds cloud-cover query and datetime interval when provided', () => {
    const { body } = buildStacSearch(EARTH_SEARCH_URL, {
      collections: ['sentinel-2-l2a'],
      bbox: [0, 0, 1, 1],
      datetime: '2026-07-01T00:00:00Z/2026-08-11T23:59:59Z',
      maxCloudCover: 10,
    });
    expect(body.query).toEqual({ 'eo:cloud_cover': { lt: 10 } });
    expect(body.datetime).toBe('2026-07-01T00:00:00Z/2026-08-11T23:59:59Z');
    expect(body.limit).toBe(10);
  });

  it('omits sort when newestFirst is false', () => {
    const { body } = buildStacSearch(EARTH_SEARCH_URL, {
      collections: ['c'],
      bbox: [0, 0, 1, 1],
      newestFirst: false,
    });
    expect(body.sortby).toBeUndefined();
  });
});

describe('parseItemCollection', () => {
  const sample = {
    type: 'FeatureCollection',
    features: [
      {
        id: 'S2B_10SEG_20260806_0_L2A',
        collection: 'sentinel-2-l2a',
        properties: { datetime: '2026-08-06T19:04:09Z', 'eo:cloud_cover': 36.99 },
        assets: {
          visual: { href: 'https://example.com/TCI.tif' },
          broken: {},
        },
      },
      {
        id: 'missing-datetime',
        properties: {},
        assets: {},
      },
      {
        id: 'no-cloud-field',
        collection: 'sentinel-1-grd',
        properties: { datetime: '2026-08-10T11:24:56Z' },
        assets: { vv: { href: 'https://example.com/vv.tiff' } },
      },
    ],
  };

  it('parses valid features and drops invalid ones', () => {
    const scenes = parseItemCollection(sample);
    expect(scenes).toHaveLength(2);
    expect(scenes[0]).toEqual({
      id: 'S2B_10SEG_20260806_0_L2A',
      collection: 'sentinel-2-l2a',
      datetime: '2026-08-06T19:04:09Z',
      cloudCover: 36.99,
      assets: { visual: 'https://example.com/TCI.tif' },
    });
    expect(scenes[1]?.cloudCover).toBeUndefined();
    expect(scenes[1]?.assets.vv).toBe('https://example.com/vv.tiff');
  });

  it('returns [] for malformed input', () => {
    expect(parseItemCollection(null)).toEqual([]);
    expect(parseItemCollection('nope')).toEqual([]);
    expect(parseItemCollection({ features: 'nope' })).toEqual([]);
  });
});
