import { PC_STAC_URL } from './stac';

/** Planetary Computer anonymous SAS token endpoint for a collection. */
export function sasTokenUrl(collection: string): string {
  const base = PC_STAC_URL.replace('/api/stac/v1', '/api/sas/v1');
  return `${base}/token/${collection}`;
}

/**
 * Append a SAS token (already URL-encoded, as returned by the token endpoint)
 * to an asset href so it can be fetched anonymously.
 */
export function signHref(href: string, token: string): string {
  const sep = href.includes('?') ? '&' : '?';
  return `${href}${sep}${token}`;
}

interface SasTokenResponse {
  token?: unknown;
  'msft:expiry'?: unknown;
}

/** Fetch an anonymous, short-lived SAS token for a Planetary Computer collection. */
export async function fetchSasToken(
  collection: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(sasTokenUrl(collection));
  if (!res.ok) {
    throw new Error(`SAS token request failed: ${res.status}`);
  }
  const json = (await res.json()) as SasTokenResponse;
  if (typeof json.token !== 'string') {
    throw new Error('SAS token response missing token field');
  }
  return json.token;
}
