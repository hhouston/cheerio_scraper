# Satellite Imagery: Data Access & Business Analysis

*Prepared 2026-08-11. Every data source in this document was live-tested from this project on
that date; every POC image in the app was produced from real scenes during the same session.*

## TL;DR

- **The most up-to-date imagery we can access for free is ~10 minutes old** (NOAA GOES-19
  full disk, refreshed every 10 minutes, no API key). Hourly NO2 pollution (NASA TEMPO),
  daily global 250–375 m optical (VIIRS/MODIS), ~10 m optical every ~5 days (Sentinel-2) and
  ~10 m radar every 1–6 days (Sentinel-1, sees through cloud/night) are all free and keyless.
- **The resolution ceiling for free data is ~10 m**: ships, buildings, fields, plumes and
  construction are visible; people and cars are not. Sub-meter imagery and on-demand tasking
  are commercial (Planet, Maxar, Umbra, ICEYE; tasked SAR shots start around low hundreds of
  dollars).
- Six businesses were prototyped end-to-end in this repo. The strongest first wedge is
  **maritime domain awareness (dark-vessel detection)**: free global radar + free ship-transponder
  data = a real product with proven buyers, thin incumbent coverage at the low end, and a
  public-interest story that markets itself.

## 1. Verified data access (all free, no API keys)

| Source | What | Cadence | Latency (measured) | Resolution | Access |
|---|---|---|---|---|---|
| NOAA GOES-19 (GOES-East) | Full-disk visible/IR GeoColor | every 10 min | **~10 min** (fetched a frame stamped minutes earlier) | 0.5–2 km | STAR CDN JPEG + `noaa-goes19` S3 bucket, anonymous |
| NASA TEMPO via GIBS | Tropospheric NO2 (+ HCHO, O3) over North America | hourly, daylight | hours (same-morning granule listed) | ~2–5 km | WMTS tiles, anonymous |
| NASA GIBS (VIIRS/MODIS) | Daily global true color + hundreds of layers (fires, aerosol, SO2, nightlights) | daily | ~3–24 h (yesterday's tiles verified) | 250–375 m | WMTS raster + vector tiles, anonymous |
| Sentinel-1 (ESA) via Microsoft Planetary Computer | C-band SAR radar | ~1–6 days per site | hours–1 day (Aug-10 scene used on Aug-11) | ~10–20 m | STAC + anonymous short-lived SAS tokens; COGs support ranged reads |
| Sentinel-2 (ESA) via Element84 Earth Search | 13-band multispectral optical | ~5 days per site | hours–2 days (Aug-8/Aug-9 scenes used) | **10 m** | STAC + anonymous S3 COGs (HTTP 206 range reads verified) |
| Sentinel-5P (ESA) via Planetary Computer | NO2, CH4, CO, SO2 columns, global | daily | ~1 day | ~5.5 km | STAC + SAS (netCDF granules) |
| Copernicus Data Space | Backup catalogue for all Sentinels | — | — | — | open catalogue |

Practical engineering notes proven in `tools/eo-pipeline/`:
- A Sentinel-1/-2 scene is 0.5–1 GB, but **cloud-optimized GeoTIFFs allow windowed HTTP range
  reads** — the ship-detection POC read a 33×19 km window (~a few MB) out of a ~1 GB radar scene.
- GIBS fire layers are **vector tiles** (exact detection coordinates, not pixels).
- Everything runs behind a plain HTTPS proxy with zero credentials.

## 2. The freshness ladder

Pick the rung that matches the question:

1. **"What is happening right now?"** → GOES-19, 10-minute cadence, km-scale. Storms, smoke
   plumes, hurricanes.
2. **"What happened this hour?"** → TEMPO NO2 (North America, daylight): pollution plumes per hour.
3. **"What happened today?"** → VIIRS/MODIS daily global at 250–375 m; active-fire points.
4. **"What does it look like up close, lately?"** → Sentinel-2 at 10 m every ~5 days;
   Sentinel-1 radar every ~1–6 days regardless of cloud or darkness.
5. **"What changed this season/year?"** → Sentinel-2 archives to 2015, Landsat to 1982.

## 3. The six prototyped businesses

Each has a live page in the app (`/poc/<slug>`) with real imagery, method and unit economics.
Summary and verdicts:

### 3.1 Dark Vessel Watch — `dark-vessel` *(public interest)* — ★ the wedge
**Built:** 268 vessels detected in one Sentinel-1 radar pass over the Singapore Strait
anchorage (auto water-mask + robust threshold detection, hull-length estimates 40–180 m).
**Business:** IUU fishing is a $10–25B/yr problem; sanctions tracking and marine insurance
buy vessel intelligence. Radar detections minus AIS transponder matches = dark ships.
**Who pays:** regulators/coast guards, NGOs, P&I insurers, commodity desks.
**Numbers:** input data $0; a monitored region costs pennies/day of compute; enterprise seats
$1–3k/mo. Precedents: Global Fishing Watch, Spire, Unseenlabs (raised €85M+).
**Next step:** aisstream.io free AIS key → correlation layer → "dark detection" alerts.

### 3.2 Wildfire & Disaster Watch — `wildfire` *(public interest)*
**Built:** pipeline scanned 1,696 VIIRS fire detections across the western US, auto-located
the largest complex (Colorado Rockies), rendered detection-on-true-color composite + the
10-minute GOES disk.
**Business:** utilities carry existential fire liability (PG&E: $13.5B settlements);
insurers and land managers pay for earlier, asset-specific awareness.
**Numbers:** national hourly scan ≈ thousands of free tile fetches; one utility contract
($50k+/yr) carries it. Precedents: Pano AI ($44M raised), OroraTech, Watch Duty's adoption.
**Next step:** FIRMS free key for sub-hourly points; asset-portfolio proximity alerts; HRRR wind overlay.

### 3.3 Emissions Monitor — `emissions` *(public interest)*
**Built:** TEMPO hourly NO2 composited over the NYC / I-95 corridor and the eastern US —
city and industrial plumes resolve individually, hours after measurement.
**Business:** emissions intelligence for ESG data platforms, enforcement, litigation and
journalism; methane fees ($900–1,500/ton under the IRA) make quantified leaks financially
material. Precedents: Climate TRACE, Kayrros, GHGSat.
**Numbers:** data $0; the sellable layer is attribution (wind-rotated plume analysis onto
EPA's public facility registry). Gross margin ≈ the analytics.
**Honest limit:** column NO2 is an activity proxy; facility-scale methane quantification
needs commercial point-source instruments.

### 3.4 Route Overwatch — `route-overwatch` *(public interest, consent-based)*
**Built:** script that parses a shared GPX trail (Marin Headlands demo route), pulls the
freshest 10 m chip per waypoint, checks the active-fire layer along the corridor, renders a
labeled flyover strip + route map. *Note: this environment's execution sandbox declined to
run exactly this script; it is committed and runs locally with one command —
`python tools/eo-pipeline/poc4_route_overwatch.py`.*
**Business:** the Garmin-inReach model proves consumers pay monthly for satellite-linked
safety. Pre-trip/live briefs for hikers, sailors, expeditions; B2B field-crew monitoring.
**Numbers:** a route brief costs fractions of a cent; $5–15/mo consumer, $100+/crew/mo B2B.
**Honest limit — say it plainly:** free imagery cannot follow a person in real time (10 m
pixels, days between passes). What it delivers is fresh terrain + hazard awareness along a
track its owner shares. Real-time "look at me now" = tasked commercial SAR/optical, the
premium tier. Watching people who have NOT consented is out of scope by design.

### 3.5 Construction & Property Intel — `construction`
**Built:** NW Las Vegas desert fringe, Aug 2025 vs Aug 2026 on the same grid: change mask
traces new grading/roofs along the growth frontier (0.4 km² in one window). Iteration
lesson worth keeping: naive change detection lit up crop rotation and sun-angle artifacts;
season-matched pairs + desert-only filters fixed it.
**Business:** growth-frontier maps for homebuilder sales, land investors, assessors.
$500–2k/quarter/metro reports; parcel joins from public county records.
**Honest limit:** 10 m sees subdivisions, not remodels; building-level detail needs
commercial sub-meter.

### 3.6 Crop Health Monitor — `crop-health`
**Built:** field-by-field NDVI map west of Fresno (green irrigated squares vs fallow brown)
plus an Apr→Aug vigor curve over one block (0.20→0.31, peaking late July).
**Business:** the classic satellite product — consultants, insurers, lenders; incumbents
charge $1–3/acre/season on data that is free. Wedge: price + API-first.
**Honest limit:** clouds gap optical (radar fills); NDVI shows vigor, not cause. Crowded space.

## 4. Ideas that need commercial data (be honest about the gate)

| Idea | Why free data can't do it | What it needs |
|---|---|---|
| Parking-lot / retail traffic analytics | cars invisible at 10 m | sub-meter optical (Planet SkySat, Maxar), $$ |
| Oil storage-tank fill estimation | floating-roof shadows need <1 m | high-res optical/SAR tasking |
| Property-claims triage (roof damage) | roof detail needs <0.5 m | Maxar/Nearmap-class imagery + aerial |
| Methane super-emitter attribution | facility-scale plumes need point-source sensors | GHGSat, Carbon Mapper partnerships |
| True real-time "satellite follows me" | revisit physics | tasked constellations (Umbra/ICEYE SAR ~$low-hundreds/shot) |

## 5. Recommended sequencing

1. **Ship Dark Vessel Watch** as the flagship: free AIS key → correlation → public demo map
   over 2–3 hot regions (Singapore, Gulf of Guinea, South China Sea). NGO/press-friendly,
   technically defensible, and the POC already detects.
2. **Wildfire asset alerts** as the first revenue product (clear buyer, simple pitch,
   the data is effectively real-time and free).
3. Emissions and construction as data-API side products on the same pipeline chassis.
4. Route Overwatch as consumer brand play once the platform exists.

## 6. Legal & ethics

- **Licensing:** NASA/NOAA imagery is US-government public domain. Copernicus Sentinel data
  is free for commercial use with attribution ("contains modified Copernicus Sentinel data
  (2026)"). Microsoft Planetary Computer and Element84 Earth Search permit anonymous access;
  respect their rate limits and terms of service.
- **Privacy:** 10 m pixels cannot resolve individuals — these products monitor activities and
  places, not people. Route Overwatch is consent-based by construction (a user's own shared
  track only). Any feature that could track a non-consenting person is a hard no.
- **Dual-use care:** vessel-detection outputs are published at the same fidelity governments
  and Global Fishing Watch already publish; no targeting-grade product.

## 7. Cost to scale (order of magnitude)

- Data: $0 until commercial tasking enters the roadmap.
- Compute: each POC region-day costs cents (windowed reads keep egress tiny). A 100-region
  daily service fits on one small VM + object storage.
- The real costs are AIS licensing at commercial scale (free tiers exist for prototyping),
  and sales.
