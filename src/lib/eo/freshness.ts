import type { FreshnessRung } from './types';

/**
 * The freshness ladder: every rung live-verified from this project on
 * 2026-08-11. Ordered from fastest refresh to sharpest resolution.
 */
export function freshnessLadder(): FreshnessRung[] {
  return [
    {
      source: 'NOAA GOES-19 (GOES-East)',
      sensor: 'ABI, geostationary',
      cadence: 'every 10 minutes',
      latency: '~10 minutes',
      resolution: '0.5–2 km',
      access: 'Anonymous CDN JPEG + public S3 bucket',
      bestFor: 'Weather, storms, fire smoke, anything "right now"',
    },
    {
      source: 'NASA TEMPO via GIBS',
      sensor: 'UV-Vis spectrometer, geostationary',
      cadence: 'hourly (daylight)',
      latency: 'hours',
      resolution: '~2–5 km',
      access: 'Anonymous WMTS tiles',
      bestFor: 'Air quality / NO2 pollution over North America',
    },
    {
      source: 'NASA VIIRS/MODIS via GIBS',
      sensor: 'Optical + thermal, polar orbit',
      cadence: 'daily global',
      latency: '~3–24 hours',
      resolution: '250–375 m',
      access: 'Anonymous WMTS tiles',
      bestFor: 'Daily monitoring: fires, floods, smoke, ice',
    },
    {
      source: 'ESA Sentinel-1 via Planetary Computer',
      sensor: 'C-band SAR (radar)',
      cadence: 'every ~1–6 days per site',
      latency: 'hours–1 day',
      resolution: '~10–20 m',
      access: 'Anonymous STAC + short-lived SAS tokens',
      bestFor: 'Ships, night, through-cloud imaging — the maritime workhorse',
    },
    {
      source: 'ESA Sentinel-2 via Earth Search',
      sensor: 'Multispectral optical (13 bands)',
      cadence: 'every ~5 days per site',
      latency: 'hours–2 days',
      resolution: '10 m',
      access: 'Anonymous STAC + range-readable COGs on S3',
      bestFor: 'Sharpest free imagery: land change, crops, construction',
    },
    {
      source: 'ESA Sentinel-5P via Planetary Computer',
      sensor: 'TROPOMI spectrometer',
      cadence: 'daily global',
      latency: '~1 day',
      resolution: '~5.5 km',
      access: 'Anonymous STAC + SAS tokens (netCDF)',
      bestFor: 'Global emissions: NO2, CH4, CO, SO2',
    },
  ];
}
