import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ImageryFigure } from '@/components/imagery-figure';
import { Sparkline } from '@/components/sparkline';
import { getGenerated, getPoc, listPocs } from '@/lib/registry';

export const dynamicParams = false;

export function generateStaticParams() {
  return listPocs().map((poc) => ({ slug: poc.slug }));
}

export default async function PocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const poc = getPoc(slug);
  if (!poc) notFound();
  const generated = getGenerated(slug);

  return (
    <div className="space-y-10 pt-10">
      <div className="space-y-3">
        <Link href="/#pocs" className="font-mono text-xs text-dim hover:text-star">
          ← all POCs
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold">{poc.title}</h1>
          {poc.publicInterest && (
            <span className="rounded-full border border-scan/40 px-2.5 py-1 text-[10px] uppercase tracking-wider text-scan">
              public interest
            </span>
          )}
        </div>
        <p className="max-w-2xl text-dim">{poc.tagline}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {poc.dataSources.map((s) => (
            <span
              key={s}
              className="border-line rounded-full border bg-panel px-3 py-1 font-mono text-[11px] text-dim"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {generated ? (
        <section className="space-y-4">
          {generated.stats && generated.stats.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {generated.stats.map((s) => (
                <div key={s.label} className="border-line rounded-xl border bg-panel px-4 py-3">
                  <div className="font-mono text-2xl text-signal">{s.value}</div>
                  <div className="text-xs uppercase tracking-wider text-dim">{s.label}</div>
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-4">
            {generated.images.map((img) => (
              <ImageryFigure key={img.src} image={img} />
            ))}
          </div>
          {generated.series && <Sparkline label={generated.series.label} points={generated.series.points} />}
          <p className="font-mono text-xs text-dim">
            pipeline run {generated.generatedAt} · rerun with{' '}
            <span className="text-star">tools/eo-pipeline</span>
          </p>
        </section>
      ) : (
        <section className="border-line rounded-xl border border-dashed bg-panel p-6 text-sm text-dim">
          The data pipeline hasn’t produced imagery for this POC yet — run the matching script in{' '}
          <span className="font-mono text-star">tools/eo-pipeline/</span> to populate this page.
        </section>
      )}

      <section className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="space-y-2 text-sm text-dim">
            {poc.method.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="font-mono text-signal">{String(i + 1).padStart(2, '0')}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold">The business</h2>
            <p className="mt-2 text-sm text-dim">{poc.business.market}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-dim">Who pays</h3>
            <ul className="mt-1 list-inside list-disc text-sm text-dim">
              {poc.business.customers.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-dim">Model</h3>
            <p className="mt-1 text-sm text-dim">{poc.business.revenueModel}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-dim">
              Unit economics
            </h3>
            <p className="mt-1 text-sm text-dim">{poc.business.unitEconomics}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-dim">
              Path to production
            </h3>
            <ol className="mt-1 list-inside list-decimal text-sm text-dim">
              {poc.business.productionPath.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          </div>
          <div className="border-line rounded-xl border bg-panel p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-signal">
              Honest limits
            </h3>
            <p className="mt-1 text-sm text-dim">{poc.business.honestLimits}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-dim">
              Proof it’s a market
            </h3>
            <p className="mt-1 text-sm text-dim">{poc.business.precedents.join(' · ')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
