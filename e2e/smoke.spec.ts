import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/poc/dark-vessel',
  '/poc/wildfire',
  '/poc/emissions',
  '/poc/route-overwatch',
  '/poc/construction',
  '/poc/crop-health',
  '/poc/steel-intel',
];

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

for (const route of routes) {
  for (const vp of viewports) {
    test(`${route} renders at ${vp.name} (${vp.width}px) without horizontal scroll`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on ${route} at ${vp.width}px`).toBeLessThanOrEqual(0);
    });
  }
}

test('health endpoint responds', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { status: string; service: string };
  expect(body.status).toBe('ok');
  expect(body.service).toBe('orbital');
});
