import { FreshnessLadder } from '@/components/freshness-ladder';
import { LiveImagery } from '@/components/live-imagery';
import { PocCard } from '@/components/poc-card';
import { getGenerated, listPocs } from '@/lib/registry';

export default function Home() {
  const pocs = listPocs();
  return (
    <div className="space-y-14 pt-10">
      <section className="space-y-4">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-scan">
          open data · no api keys · no contracts
        </p>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Satellite intelligence from <span className="text-signal">free, live</span> Earth
          observation.
        </h1>
        <p className="max-w-2xl text-dim">
          Everything on this site is pulled from open satellite sources — NOAA GOES, NASA
          VIIRS/TEMPO, ESA Sentinel-1 radar and Sentinel-2 optical — refreshed from minutes to days,
          and each proof-of-concept below is a real business built on top of it.
        </p>
      </section>

      <section id="live" className="space-y-4">
        <h2 className="text-xl font-semibold">
          Live right now <span className="font-mono text-xs text-dim">(fetched by your browser)</span>
        </h2>
        <LiveImagery />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">The freshness ladder</h2>
        <p className="max-w-2xl text-sm text-dim">
          How current is “current”? Every rung below was verified live from this project — pick the
          rung that matches the question you’re asking.
        </p>
        <FreshnessLadder />
      </section>

      <section id="pocs" className="space-y-4">
        <h2 className="text-xl font-semibold">Proof-of-concept businesses</h2>
        <p className="max-w-2xl text-sm text-dim">
          Six working demos, each processing real scenes through{' '}
          <span className="font-mono">tools/eo-pipeline</span>. Public-interest applications are
          tagged; the full write-up lives in{' '}
          <span className="font-mono">docs/SATELLITE_BUSINESS_ANALYSIS.md</span>.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {pocs.map((poc) => (
            <PocCard key={poc.slug} poc={poc} generated={getGenerated(poc.slug)} />
          ))}
        </div>
      </section>
    </div>
  );
}
