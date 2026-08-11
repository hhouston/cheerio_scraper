/**
 * NOAA GOES-19 (GOES-East) — geostationary full-disk imagery every 10 minutes.
 * Two access paths, both anonymous:
 *  - Pre-rendered GeoColor JPEGs on the NOAA STAR CDN (simplest).
 *  - Raw ABI netCDF granules in the public `noaa-goes19` S3 bucket.
 */

const GOES_CDN_BASE = 'https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR';

export const GOES_CDN_SIZES = [339, 678, 1808, 5424, 10848] as const;
export type GoesCdnSize = (typeof GOES_CDN_SIZES)[number];

/** URL of the latest pre-rendered GeoColor full disk at a given square size. */
export function goesCdnLatestUrl(size: GoesCdnSize = 1808): string {
  return `${GOES_CDN_BASE}/${size}x${size}.jpg`;
}

export const GOES_BUCKET_URL = 'https://noaa-goes19.s3.amazonaws.com';

/** Day-of-year (1-based) for a UTC date. */
export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

/**
 * S3 listing prefix for an ABI product at a given UTC hour,
 * e.g. ABI-L2-CMIPF/2026/223/16/.
 */
export function goesBucketPrefix(product: string, date: Date): string {
  const year = date.getUTCFullYear();
  const doy = String(dayOfYear(date)).padStart(3, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  return `${product}/${year}/${doy}/${hour}/`;
}
