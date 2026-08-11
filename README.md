# Orbital

Satellite intelligence from **free, open, no-API-key data** — a working Next.js app plus a
Python data pipeline, with six proof-of-concept businesses built on live Earth observation.

> This repo was repurposed from a 2017 scraping sandbox; the original code lives on in the
> `master` branch history.

## What you get

- **Live imagery** with zero configuration: GOES-19 full disk (10-minute refresh), NASA GIBS
  VIIRS/TEMPO tiles (daily/hourly), Sentinel-2 10 m optical and Sentinel-1 radar via STAC.
- **Six POC pages** (`/poc/<slug>`), each backed by real processed scenes committed to
  `public/imagery/` — the app runs fully offline from the repo:
  - `dark-vessel` — SAR ship detection over the Singapore Strait *(public interest)*
  - `wildfire` — auto-located active fires from thermal tiles *(public interest)*
  - `emissions` — hourly TEMPO NO2 pollution mapping *(public interest)*
  - `route-overwatch` — consent-based satellite overwatch of a shared GPX route *(public interest)*
  - `construction` — year-over-year change detection in Buckeye, AZ
  - `crop-health` — NDVI field monitoring in the Central Valley
- **Business analysis**: `docs/SATELLITE_BUSINESS_ANALYSIS.md` — verified data-access matrix,
  per-POC market/unit-economics, what needs commercial data, and a recommended first wedge.

## Quickstart (app)

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # vitest unit tests
pnpm typecheck
pnpm build
pnpm test:e2e     # playwright smoke (375/768/1440 px, no-horizontal-scroll)
```

No env vars needed — every data source is anonymous.

## Quickstart (data pipeline)

The imagery in the app was produced by `tools/eo-pipeline/` (Python 3.11+):

```bash
cd tools/eo-pipeline
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python poc1_dark_vessel.py     # each script writes into ../../public/imagery + src/data/generated
```

Scripts are idempotent and stream only small windows of large scenes (a Sentinel-1 scene is
~1 GB; the pipeline reads a few MB of it via HTTP range requests).

## Structure

```
src/app                 Next.js App Router pages (all static, SSG)
src/lib/eo              typed clients for STAC / GIBS / GOES / PC SAS signing (unit-tested)
src/data/pocs.ts        the POC registry: method + business analysis content
src/data/generated      JSON written by the pipeline (committed)
public/imagery          processed satellite imagery (committed)
tools/eo-pipeline       Python fetch/processing scripts
docs                    business analysis
e2e                     playwright smoke tests
```

## Data sources & attribution

- **NOAA GOES-19** — public domain. Pre-rendered GeoColor via NOAA STAR CDN; raw ABI netCDF in
  the `noaa-goes19` S3 bucket.
- **NASA GIBS** — public domain imagery services (VIIRS, MODIS, TEMPO, Black Marble…).
- **Copernicus Sentinel-1/2/5P** — free under the Copernicus open licence; imagery here
  “contains modified Copernicus Sentinel data (2026)”. Accessed via Element84 Earth Search and
  Microsoft Planetary Computer (anonymous SAS).

## Ethics

Public-interest POCs (dark vessels, emissions, wildfire) monitor *activities*, not people —
10 m pixels cannot resolve individuals. Route Overwatch is consent-based by design: it only ever
looks at a track its owner explicitly shares.
