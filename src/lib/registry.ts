import fs from 'node:fs';
import path from 'node:path';
import { POCS, type PocEntry } from '@/data/pocs';

export interface GeneratedImage {
  src: string;
  caption: string;
  acquired: string;
  source: string;
}

export interface GeneratedStat {
  label: string;
  value: string;
}

export interface GeneratedSeriesPoint {
  date: string;
  value: number;
}

/** Output written by tools/eo-pipeline scripts for one POC. */
export interface GeneratedPocData {
  generatedAt: string;
  images: GeneratedImage[];
  stats?: GeneratedStat[];
  series?: { label: string; points: GeneratedSeriesPoint[] };
}

const GENERATED_DIR = path.join(process.cwd(), 'src', 'data', 'generated');

export function listPocs(): PocEntry[] {
  return POCS;
}

export function getPoc(slug: string): PocEntry | undefined {
  return POCS.find((p) => p.slug === slug);
}

/** Read pipeline output for a POC; null when the pipeline hasn't produced it yet. */
export function getGenerated(slug: string): GeneratedPocData | null {
  const file = path.join(GENERATED_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as GeneratedPocData;
}

/** Slugs that have generated data on disk (used by tests and the landing page). */
export function generatedSlugs(): string[] {
  if (!fs.existsSync(GENERATED_DIR)) return [];
  return fs
    .readdirSync(GENERATED_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}
