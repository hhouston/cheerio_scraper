/**
 * NASA GIBS (Global Imagery Browse Services) — daily global satellite layers
 * as WMTS tiles, no auth. Layer IDs verified against the live
 * GetCapabilities document on 2026-08-11.
 */

export interface GibsLayer {
  id: string;
  tileMatrixSet: string;
  ext: 'jpg' | 'png';
  maxZoom: number;
  /** Human description used in UI captions. */
  label: string;
}

export const GIBS_LAYERS = {
  trueColor: {
    id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    ext: 'jpg',
    maxZoom: 9,
    label: 'VIIRS true color (daily global, ~375 m)',
  },
  trueColorNoaa20: {
    id: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    ext: 'jpg',
    maxZoom: 9,
    label: 'VIIRS NOAA-20 true color (daily global, ~375 m)',
  },
  thermalAnomalies: {
    id: 'VIIRS_NOAA20_Thermal_Anomalies_375m_All',
    tileMatrixSet: 'GoogleMapsCompatible_Level8',
    ext: 'png',
    maxZoom: 8,
    label: 'VIIRS active-fire detections (375 m, day+night)',
  },
  tempoNo2: {
    id: 'TEMPO_L3_NO2_Vertical_Column_Troposphere',
    tileMatrixSet: 'GoogleMapsCompatible_Level7',
    ext: 'png',
    maxZoom: 7,
    label: 'TEMPO tropospheric NO2 (hourly, North America)',
  },
} as const satisfies Record<string, GibsLayer>;

export type GibsLayerKey = keyof typeof GIBS_LAYERS;

const GIBS_BASE = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

/**
 * WMTS REST tile URL. `date` is an ISO date (YYYY-MM-DD) or, for sub-daily
 * layers like TEMPO, a full ISO timestamp.
 */
export function gibsTileUrl(layer: GibsLayer, date: string, z: number, y: number, x: number): string {
  return `${GIBS_BASE}/${layer.id}/default/${date}/${layer.tileMatrixSet}/${z}/${y}/${x}.${layer.ext}`;
}

/** Web-mercator tile indices containing a lat/lon at zoom z. */
export function latLonToTile(lat: number, lon: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

/**
 * Latest date GIBS will reliably have full imagery for: UTC yesterday.
 * (Same-day imagery appears swath-by-swath during the day.)
 */
export function latestGibsDate(now: Date = new Date()): string {
  const d = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}
