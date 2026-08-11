import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { POCS } from '@/data/pocs';
import { generatedSlugs, getGenerated, getPoc } from './registry';

describe('POC registry', () => {
  it('has unique slugs', () => {
    const slugs = POCS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('covers the four explicitly requested public-interest ideas', () => {
    for (const slug of ['dark-vessel', 'emissions', 'wildfire', 'route-overwatch']) {
      expect(getPoc(slug), `missing POC ${slug}`).toBeDefined();
    }
  });

  it('every POC has business content and method steps', () => {
    for (const poc of POCS) {
      expect(poc.method.length, poc.slug).toBeGreaterThanOrEqual(3);
      expect(poc.business.customers.length, poc.slug).toBeGreaterThanOrEqual(2);
      expect(poc.business.honestLimits.length, poc.slug).toBeGreaterThan(40);
      expect(poc.business.precedents.length, poc.slug).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('generated pipeline data integrity', () => {
  it('every generated JSON belongs to a registered POC and its images exist on disk', () => {
    for (const slug of generatedSlugs()) {
      expect(getPoc(slug), `generated data for unknown POC ${slug}`).toBeDefined();
      const data = getGenerated(slug);
      expect(data, slug).not.toBeNull();
      expect(data?.generatedAt, slug).toBeTruthy();
      expect(data?.images.length, `${slug} has no images`).toBeGreaterThanOrEqual(1);
      for (const img of data?.images ?? []) {
        expect(img.src.startsWith('/imagery/'), `${slug}: ${img.src}`).toBe(true);
        const onDisk = path.join(process.cwd(), 'public', img.src);
        expect(fs.existsSync(onDisk), `${slug}: missing file ${onDisk}`).toBe(true);
        expect(img.caption.length, `${slug}: empty caption`).toBeGreaterThan(10);
        expect(img.acquired, `${slug}: missing acquisition time`).toBeTruthy();
      }
      const sizeSum = (data?.images ?? [])
        .map((i) => fs.statSync(path.join(process.cwd(), 'public', i.src)).size)
        .reduce((a, b) => a + b, 0);
      expect(sizeSum, `${slug}: imagery too large to commit`).toBeLessThan(6 * 1024 * 1024);
    }
  });
});
