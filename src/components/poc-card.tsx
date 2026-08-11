import Link from 'next/link';
import type { PocEntry } from '@/data/pocs';
import type { GeneratedPocData } from '@/lib/registry';

export function PocCard({ poc, generated }: { poc: PocEntry; generated: GeneratedPocData | null }) {
  const cover = generated?.images[0];
  return (
    <Link
      href={`/poc/${poc.slug}`}
      className="border-line group flex flex-col overflow-hidden rounded-xl border bg-panel transition-colors hover:border-signal/60"
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover.src}
          alt={cover.caption}
          className="aspect-[16/9] w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-[16/9] w-full items-center justify-center bg-panel-2 font-mono text-xs text-dim">
          pipeline pending
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold group-hover:text-signal">{poc.title}</h3>
          {poc.publicInterest && (
            <span className="rounded-full border border-scan/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-scan">
              public interest
            </span>
          )}
        </div>
        <p className="text-sm text-dim">{poc.tagline}</p>
        {generated?.stats && generated.stats.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-3 pt-2">
            {generated.stats.slice(0, 3).map((s) => (
              <div key={s.label} className="font-mono text-xs">
                <span className="text-signal">{s.value}</span>{' '}
                <span className="text-dim">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
