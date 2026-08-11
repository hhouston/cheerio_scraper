import { describe, expect, it } from 'vitest';
import { freshnessLadder } from './freshness';

describe('freshnessLadder', () => {
  it('is ordered fastest-refresh first, starting with GOES', () => {
    const rungs = freshnessLadder();
    expect(rungs.length).toBeGreaterThanOrEqual(5);
    expect(rungs[0]?.source).toContain('GOES');
    expect(rungs[0]?.cadence).toContain('10 minutes');
  });

  it('includes the 10 m Sentinel-2 rung', () => {
    const s2 = freshnessLadder().find((r) => r.source.includes('Sentinel-2'));
    expect(s2?.resolution).toBe('10 m');
  });

  it('every rung documents access without API keys', () => {
    for (const rung of freshnessLadder()) {
      expect(rung.access.toLowerCase()).toContain('anonymous');
    }
  });
});
