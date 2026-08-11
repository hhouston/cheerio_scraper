/** [west, south, east, north] in EPSG:4326 degrees. */
export type BBox = readonly [number, number, number, number];

export interface StacSearchParams {
  collections: string[];
  bbox: BBox;
  /** ISO interval, e.g. "2026-07-01T00:00:00Z/2026-08-11T23:59:59Z" */
  datetime?: string;
  limit?: number;
  /** Max cloud cover percentage (adds a query on eo:cloud_cover). */
  maxCloudCover?: number;
  /** Sort newest-first by acquisition time (default true). */
  newestFirst?: boolean;
}

export interface SceneSummary {
  id: string;
  collection: string;
  /** ISO acquisition timestamp. */
  datetime: string;
  cloudCover?: number;
  /** Asset key → href. */
  assets: Record<string, string>;
}

export interface FreshnessRung {
  source: string;
  sensor: string;
  cadence: string;
  latency: string;
  resolution: string;
  access: string;
  bestFor: string;
}

export interface Detection {
  lat: number;
  lon: number;
  /** Rough length estimate in meters from the bounding box of the bright cluster. */
  approxLengthM: number;
  peakDb: number;
}
