import type { GeneratedImage } from '@/lib/registry';

export function ImageryFigure({ image }: { image: GeneratedImage }) {
  return (
    <figure className="border-line overflow-hidden rounded-xl border bg-panel">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={image.caption} className="w-full" loading="lazy" />
      <figcaption className="space-y-1 p-4">
        <div className="text-sm">{image.caption}</div>
        <div className="font-mono text-xs text-dim">
          acquired {image.acquired} · {image.source}
        </div>
      </figcaption>
    </figure>
  );
}
