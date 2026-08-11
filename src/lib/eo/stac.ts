import type { SceneSummary, StacSearchParams } from './types';

/** Element84 Earth Search — Sentinel-2 L2A COGs on AWS, anonymous. */
export const EARTH_SEARCH_URL = 'https://earth-search.aws.element84.com/v1';

/** Microsoft Planetary Computer — Sentinel-1 GRD/RTC, Sentinel-5P, Landsat; needs SAS signing. */
export const PC_STAC_URL = 'https://planetarycomputer.microsoft.com/api/stac/v1';

export interface StacSearchRequest {
  url: string;
  body: Record<string, unknown>;
}

/** Build a POST /search request for any STAC API endpoint. */
export function buildStacSearch(apiUrl: string, params: StacSearchParams): StacSearchRequest {
  const body: Record<string, unknown> = {
    collections: params.collections,
    bbox: [...params.bbox],
    limit: params.limit ?? 10,
  };
  if (params.datetime !== undefined) {
    body.datetime = params.datetime;
  }
  if (params.maxCloudCover !== undefined) {
    body.query = { 'eo:cloud_cover': { lt: params.maxCloudCover } };
  }
  if (params.newestFirst !== false) {
    body.sortby = [{ field: 'properties.datetime', direction: 'desc' }];
  }
  return { url: `${apiUrl}/search`, body };
}

interface RawAsset {
  href?: unknown;
}

interface RawFeature {
  id?: unknown;
  collection?: unknown;
  properties?: { datetime?: unknown; 'eo:cloud_cover'?: unknown };
  assets?: Record<string, RawAsset>;
}

/** Defensively parse a STAC ItemCollection into flat scene summaries. */
export function parseItemCollection(json: unknown): SceneSummary[] {
  if (typeof json !== 'object' || json === null) return [];
  const features = (json as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];

  const scenes: SceneSummary[] = [];
  for (const raw of features as RawFeature[]) {
    if (typeof raw !== 'object' || raw === null) continue;
    const id = typeof raw.id === 'string' ? raw.id : undefined;
    const datetime =
      typeof raw.properties?.datetime === 'string' ? raw.properties.datetime : undefined;
    if (id === undefined || datetime === undefined) continue;

    const assets: Record<string, string> = {};
    for (const [key, asset] of Object.entries(raw.assets ?? {})) {
      if (typeof asset?.href === 'string') assets[key] = asset.href;
    }

    const scene: SceneSummary = {
      id,
      collection: typeof raw.collection === 'string' ? raw.collection : 'unknown',
      datetime,
      assets,
    };
    const cloud = raw.properties?.['eo:cloud_cover'];
    if (typeof cloud === 'number') scene.cloudCover = cloud;
    scenes.push(scene);
  }
  return scenes;
}

/** Search a STAC API and return parsed scenes (newest first by default). */
export async function searchScenes(
  apiUrl: string,
  params: StacSearchParams,
  fetchImpl: typeof fetch = fetch,
): Promise<SceneSummary[]> {
  const { url, body } = buildStacSearch(apiUrl, params);
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`STAC search failed: ${res.status} ${res.statusText}`);
  }
  return parseItemCollection(await res.json());
}
