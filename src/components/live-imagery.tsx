'use client';

import { useState } from 'react';
import { GIBS_LAYERS, gibsTileUrl, goesCdnLatestUrl, latLonToTile, latestGibsDate } from '@/lib/eo';

interface LiveImg {
  src: string;
  title: string;
  detail: string;
}

function buildLiveImages(): LiveImg[] {
  const date = latestGibsDate();
  const sf = latLonToTile(37.77, -122.42, 6);
  const gulf = latLonToTile(29.5, -94.5, 6);
  return [
    {
      src: goesCdnLatestUrl(1808),
      title: 'GOES-19 full disk — right now',
      detail: 'GeoColor composite, refreshed every 10 minutes (NOAA)',
    },
    {
      src: gibsTileUrl(GIBS_LAYERS.trueColor, date, 6, sf.y, sf.x),
      title: `California — ${date}`,
      detail: 'VIIRS true color, daily global coverage (NASA GIBS)',
    },
    {
      src: gibsTileUrl(GIBS_LAYERS.trueColor, date, 6, gulf.y, gulf.x),
      title: `Gulf Coast — ${date}`,
      detail: 'VIIRS true color, daily global coverage (NASA GIBS)',
    },
  ];
}

/**
 * Live external imagery, computed client-side so the statically-built page
 * always shows the freshest available data. Images that fail to load
 * (offline, source hiccup) hide themselves.
 */
export function LiveImagery() {
  const [images] = useState(buildLiveImages);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const visible = images.filter((img) => !failed[img.src]);
  if (visible.length === 0) {
    return (
      <p className="text-sm text-dim">
        Live imagery unavailable right now (offline?) — the POC pages below use committed imagery
        and always work.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {visible.map((img) => (
        <figure key={img.src} className="border-line overflow-hidden rounded-xl border bg-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.src}
            alt={img.title}
            className="aspect-square w-full object-cover"
            loading="lazy"
            onError={() => setFailed((f) => ({ ...f, [img.src]: true }))}
          />
          <figcaption className="space-y-0.5 p-3">
            <div className="text-sm font-medium">{img.title}</div>
            <div className="text-xs text-dim">{img.detail}</div>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
