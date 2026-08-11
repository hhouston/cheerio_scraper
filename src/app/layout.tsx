import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Orbital — satellite intelligence from open data',
  description:
    'Live Earth observation from free, no-key satellite sources: GOES, VIIRS, TEMPO, Sentinel-1 SAR, Sentinel-2 — with working business POCs.',
};

export const viewport: Viewport = {
  themeColor: '#06080f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <header className="border-line sticky top-0 z-10 border-b bg-void/85 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold tracking-[0.3em] text-signal">
                ORBITAL
              </span>
              <span className="hidden text-xs text-dim sm:inline">
                satellite intelligence · open data
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-dim">
              <Link href="/#live" className="hover:text-star">
                Live
              </Link>
              <Link href="/#pocs" className="hover:text-star">
                POCs
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-24">{children}</main>
        <footer className="border-line border-t py-8">
          <div className="mx-auto max-w-5xl space-y-2 px-4 text-xs text-dim">
            <p>
              Imagery: NOAA GOES-19 · NASA GIBS (VIIRS, TEMPO) · contains modified Copernicus
              Sentinel data (2026), processed by this project. NASA/NOAA imagery is public domain;
              Copernicus data is free to use with attribution.
            </p>
            <p>
              Sources are keyless and free — see <span className="font-mono">docs/</span> in the
              repo for the full business analysis.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
