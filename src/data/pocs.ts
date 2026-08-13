export interface PocBusiness {
  market: string;
  customers: string[];
  revenueModel: string;
  unitEconomics: string;
  productionPath: string[];
  honestLimits: string;
  precedents: string[];
}

export interface PocEntry {
  slug: string;
  title: string;
  tagline: string;
  publicInterest: boolean;
  dataSources: string[];
  method: string[];
  business: PocBusiness;
}

export const POCS: PocEntry[] = [
  {
    slug: 'dark-vessel',
    title: 'Dark Vessel Watch',
    tagline:
      'Radar ship detection over the Singapore Strait — the foundation of spotting vessels that turn their transponders off.',
    publicInterest: true,
    dataSources: [
      'Sentinel-1 C-band SAR (Planetary Computer, anonymous SAS)',
      'Ship transponder (AIS) feeds for correlation — free tiers exist',
    ],
    method: [
      'Query the Planetary Computer STAC API for the newest Sentinel-1 radar scene over the Singapore Strait anchorage, one of the busiest shipping lanes on Earth.',
      'Stream only a ~20×22 km window of the ~1 GB scene using HTTP range reads against the cloud-optimized GeoTIFF.',
      'Convert backscatter to decibels; the sea returns almost nothing to the radar, while steel hulls return strongly.',
      'Threshold at median + 5 robust deviations (a compact stand-in for CFAR detection), then cluster bright pixels and filter clusters to ship-plausible sizes (30 m–500 m).',
      'Map each cluster centroid back to lat/lon and estimate vessel length from its footprint.',
    ],
    business: {
      market:
        'Maritime domain awareness: illegal fishing alone is estimated at $10–25B/yr; sanctions-evasion tracking, insurance risk, and port intelligence all buy vessel data.',
      customers: [
        'Fisheries regulators and coast guards',
        'NGOs (illegal-fishing and sanctions watchdogs)',
        'Marine insurers and P&I clubs',
        'Commodity traders tracking tanker movements',
      ],
      revenueModel:
        'SaaS alerts per region of interest + API per-detection pricing; free public tier for NGOs/journalists as the credibility engine.',
      unitEconomics:
        'Input data is $0 (Sentinel-1 is open). One region processed daily ≈ pennies of compute. A single enterprise seat at $1–3k/mo covers hundreds of regions of processing.',
      productionPath: [
        'Correlate every radar detection against live AIS transponder feeds (aisstream.io has a free tier) — detections with no AIS match are the "dark vessels".',
        'Add Sentinel-1 + Sentinel-2 fusion and coastline masks to cut false positives from islets and fixed infrastructure.',
        'Historical pattern-of-life per anchorage; alerting webhooks; chart overlays.',
      ],
      honestLimits:
        'Sentinel-1 revisit over a given site is 1–6 days, so this is monitoring, not continuous tracking. Detection works today; the "dark" classification requires the AIS join (a free API key away). Global Fishing Watch proves the approach at scale.',
      precedents: ['Global Fishing Watch', 'Spire Maritime', 'Unseenlabs', 'Skylight (Allen AI)'],
    },
  },
  {
    slug: 'wildfire',
    title: 'Wildfire & Disaster Watch',
    tagline:
      'Auto-locating active fires from thermal satellites and zooming in — minutes-fresh at continental scale, no keys required.',
    publicInterest: true,
    dataSources: [
      'VIIRS 375 m active-fire detections (NASA GIBS tiles)',
      'VIIRS daily true color (NASA GIBS)',
      'GOES-19 GeoColor full disk, 10-minute refresh (NOAA CDN)',
    ],
    method: [
      'Scan VIIRS thermal-anomaly tiles across the western US for the most recent day and cluster the fire pixels.',
      'Auto-select the largest active cluster — no human picks the target.',
      'Fetch high-zoom true-color tiles centered on the cluster and composite the fire detections on top.',
      'Pair with the latest GOES-19 full disk (10-minute cadence) for the "what is happening right now" view.',
    ],
    business: {
      market:
        'US wildfire suppression costs exceed $3B/yr; utilities face tens of billions in fire liability (PG&E settlements alone: $13.5B). Parametric insurers, utilities, and land managers all pay for earlier awareness.',
      customers: [
        'Electric utilities (asset-proximity alerts)',
        'Property insurers and reinsurers',
        'Timberland owners and ranches',
        'County emergency management',
      ],
      revenueModel:
        'Per-asset-portfolio monitoring subscription (upload your transmission lines / parcels, get proximity alerts), plus a free public map for trust-building.',
      unitEconomics:
        'All input data is free and keyless. A national-scale hourly scan is a few thousand tile fetches ≈ negligible cost; one utility contract ($50k+/yr) carries the whole pipeline.',
      productionPath: [
        'Add NASA FIRMS point API (free key) for sub-hourly detections and per-fire confidence values.',
        'GOES-based hot-spot detection closes the gap to ~10-minute latency.',
        'Wind-field overlay (NOAA HRRR, also free) for spread-direction context; SMS/webhook alerting per asset portfolio.',
      ],
      honestLimits:
        '375 m thermal pixels detect fires reliably once they are a few acres; very small ignitions can be missed and clouds can mask detections. This complements, not replaces, ground/911 reporting.',
      precedents: ['Pano AI (camera-based, $44M raised)', 'OroraTech (satellite fire alerts)', 'Watch Duty (nonprofit app, massive adoption)'],
    },
  },
  {
    slug: 'emissions',
    title: 'Emissions Monitor',
    tagline:
      'Hourly NO2 pollution from geostationary orbit over North America — who is emitting, where, watchable by anyone.',
    publicInterest: true,
    dataSources: [
      'NASA TEMPO tropospheric NO2, hourly (GIBS tiles)',
      'Sentinel-5P TROPOMI NO2/CH4/CO/SO2, daily global (Planetary Computer netCDF)',
    ],
    method: [
      'Fetch TEMPO hourly NO2 column tiles — TEMPO is the first geostationary air-quality instrument, staring at North America all day.',
      'Composite the NO2 field over a reference basemap for the New York / I-95 corridor and the eastern US (Houston was tried first but sat under storm cloud — a real constraint the fallback radar/S5P path exists for).',
      'For global or methane coverage, fall back to daily Sentinel-5P granules: quality-filter the retrievals and grid them into a heatmap.',
    ],
    business: {
      market:
        'Carbon/emissions intelligence is a fast-growing compliance market: ESG reporting, EPA enforcement support, methane fees (IRA charges $900–1,500/ton for reported leaks), and journalism.',
      customers: [
        'ESG data platforms and index providers',
        'Environmental litigation and enforcement teams',
        'Commodity/energy analysts (refinery activity signals)',
        'Newsrooms and environmental NGOs',
      ],
      revenueModel:
        'Data API (facility-level emission-proxy time series), monitoring dashboards per industrial cluster, custom investigations.',
      unitEconomics:
        'TEMPO/S5P data is free; the sellable layer is attribution — turning column measurements into per-facility signals. Zero marginal data cost means gross margin is essentially the analytics.',
      productionPath: [
        'Facility registry join (EPA FLIGHT database is public) to attribute plumes to plants.',
        'Wind-rotated plume averaging (standard technique) to isolate individual sources.',
        'Methane: S5P CH4 + targeted follow-up via commercial point-source instruments (GHGSat, Carbon Mapper).',
      ],
      honestLimits:
        'Column NO2 is an activity proxy, not a smokestack meter — attribution needs the wind-rotation analysis and care with weather. Methane point-source quantification at facility scale needs finer instruments than the free tier provides.',
      precedents: ['Climate TRACE (coalition)', 'Kayrros', 'GHGSat', 'Carbon Mapper (nonprofit)'],
    },
  },
  {
    slug: 'route-overwatch',
    title: 'Route Overwatch',
    tagline:
      'Consent-based satellite overwatch of your own route — the freshest imagery and hazard flags along a track you share.',
    publicInterest: true,
    dataSources: [
      'Sentinel-2 10 m optical chips along the route (Earth Search)',
      'VIIRS active-fire tiles for hazard flags (GIBS)',
      'GOES-19 for current weather context (NOAA CDN)',
    ],
    method: [
      'Parse a GPX track you shared (the POC ships with a Marin Headlands hiking loop) and sample waypoints every ~2 km.',
      'For each waypoint, query the newest cloud-acceptable Sentinel-2 scene, stream a 256×256 chip around the point, and record how old the imagery is.',
      'Check the active-fire layer at each waypoint and flag any thermal detections near the route.',
      'Stitch the chips into a labeled strip — a "satellite flyover" of your route with per-segment freshness and hazard status.',
    ],
    business: {
      market:
        'Outdoor safety & expedition tech: 60M+ US hikers, sailing rallies, overlanding, backcountry ops teams. Garmin inReach proved people pay monthly for satellite-linked safety.',
      customers: [
        'Backcountry hikers/hunters and their families',
        'Sailing rallies and race organizers',
        'Guiding companies and SAR teams',
        'Utilities/pipeline walkers and remote field crews',
      ],
      revenueModel:
        'Consumer subscription (share your track, get pre-trip and during-trip overwatch briefs) + B2B per-crew safety monitoring.',
      unitEconomics:
        'A route brief costs fractions of a cent in data (all free sources) — priced like a $5–15/mo companion app; B2B crew monitoring at $100+/crew/mo.',
      productionPath: [
        'Live track ingestion from Garmin/Spot devices (with the user’s consent and API tokens).',
        'Add weather (HRRR/GFS), snow cover (VIIRS), and flood layers along the corridor.',
        'For true on-demand "look at me now": broker tasked commercial imagery (Planet/Umbra/ICEYE) as a premium tier — a tasked SAR shot runs low-hundreds of dollars today.',
      ],
      honestLimits:
        'Free imagery cannot literally follow a person in real time: 10 m pixels cannot resolve people, and revisit is daily-to-5-day. What it CAN do — fresh terrain/hazard awareness along a consented track — is real and useful. Anything resembling tracking people without their consent is out of scope by design: this product only ever watches a track its owner shares.',
      precedents: ['Garmin inReach ecosystem', 'Windy/PredictWind route weather', 'onX Backcountry'],
    },
  },
  {
    slug: 'construction',
    title: 'Construction & Property Intel',
    tagline:
      'Watching one of America’s fastest-growing suburbs turn desert into rooftops — change detection from 10 m optical.',
    publicInterest: false,
    dataSources: ['Sentinel-2 L2A true color + red/NIR bands, two dates (Earth Search)'],
    method: [
      'Pick Buckeye, AZ — routinely a top-3 fastest-growing US city — and pull the same Sentinel-2 tile from ~one year apart (same UTM grid, so pixels align).',
      'Render the before/after true-color pair.',
      'Compute vegetation index (NDVI) for both dates; flag pixels that flipped from vegetated/bare to built-up.',
      'Report changed area in km² and overlay the change mask on the "after" image.',
    ],
    business: {
      market:
        'Construction-activity data feeds real-estate investment, building-products sales territories, tax assessment, and infrastructure planning — a slice of the $10B+ property-data market.',
      customers: [
        'Homebuilder & building-products sales teams',
        'Land investors and REIT analysts',
        'County assessors',
        'Market-research firms',
      ],
      revenueModel:
        'Quarterly growth-frontier reports per metro + API of change polygons; land-brokerage lead-gen partnerships.',
      unitEconomics:
        'A metro-scale change sweep is a few hundred COG window reads (free data, trivial compute). One report subscription at $500–2k/quarter is nearly pure margin.',
      productionPath: [
        'Grid the metro into tiles and run the change sweep monthly.',
        'Vectorize change clusters into parcels and join county parcel/permit records (public).',
        'Classify change type (clearing → foundation → roofed) from spectral trajectory.',
      ],
      honestLimits:
        '10 m pixels see subdivisions, not single-family remodels. Parcel-level attribution needs the county-records join; building-level detail needs commercial sub-meter imagery.',
      precedents: ['Zonda/Metrostudy (survey-based)', 'Cape Analytics', 'Regrid'],
    },
  },
  {
    slug: 'steel-intel',
    title: 'Steel Demand Intel',
    tagline:
      'Built for a real prospect (JD Fields & Co., Houston): satellite demand signals for a steel pipe & piling distributor — pads before rig counts, grading before permits, ports from orbit.',
    publicInterest: false,
    dataSources: [
      'Sentinel-2 L2A change pairs with SCL cloud masking (Earth Search)',
      'Umbra Open Data 25 cm SAR over ports (free) — rack-level upgrade path',
    ],
    method: [
      'Permian: season-matched Sentinel-2 pair over Reeves County, TX — bare desert that brightened strongly = new well pads and lease roads, a signal that leads the rig count steel distributors already buy.',
      'Houston fringe: vegetated land in Fulshear that lost vegetation AND brightened = cleared-and-graded construction sites, with the scene-classification band masking cloud and shadow on both dates.',
      'Port Houston: year-over-year Turning Basin comparison — berth and laydown activity visible at 10 m, shipment-arrival confirmation for free.',
    ],
    business: {
      market:
        'US steel service centers and distributors move ~$100B+/yr; sales teams buy demand signals (rig counts, permits, Dodge reports) that all lag what satellites see directly.',
      customers: [
        'Pipe & piling distributors (JD Fields profile: API line pipe + H-piles/sheet piling)',
        'Steel service centers and mills',
        'Construction-products sales teams',
      ],
      revenueModel:
        'Weekly lead feed per territory (georeferenced new-clearing sites + basin pad starts), CRM-ready export; pilot-priced per metro/basin.',
      unitEconomics:
        'Data cost $0 at 10 m; a territory sweep is minutes of compute. One distributor seat priced like the rig-count subscriptions they already pay for.',
      productionPath: [
        'Weekly automated sweeps over the Gulf Coast metros + Permian/Eagle Ford with parcel joins for site addresses.',
        'One ~$300 SkyFi 50 cm tasking per key site: rack-level yard inventory and project-stage detail.',
        'Storm-response mode: post-hurricane coastal damage sweeps for sheet-piling demand.',
      ],
      honestLimits:
        'At 10 m we see sites and yards, not individual pipe racks — rack-level counts need a ~$300 tasked sub-meter shot. Attribution of a graded site to a buyer still needs parcel/permit joins (public records).',
      precedents: ['Rig-count data (Baker Hughes) as a paid category', 'Dodge Construction Network', 'Genscape/Wood Mackenzie satellite monitoring'],
    },
  },
  {
    slug: 'crop-health',
    title: 'Crop Health Monitor',
    tagline:
      'Field-by-field vegetation vigor over the Central Valley, updated every ~5 days — the classic satellite business, free to run.',
    publicInterest: false,
    dataSources: ['Sentinel-2 L2A red + NIR bands (Earth Search), multi-date'],
    method: [
      'Pull red and near-infrared bands over irrigated fields west of Fresno, CA.',
      'Compute NDVI — healthy crops reflect NIR strongly and absorb red, so vigor pops out per field.',
      'Render a colormapped field-level map.',
      'Sample the same fields across ~4 months of scenes for a season vigor curve.',
    ],
    business: {
      market:
        'Precision-ag imagery is an established market (~$1B+ segment) — crop consultants, input retailers, crop insurers, and lenders all consume field-health data.',
      customers: [
        'Agronomy consultants and co-ops',
        'Crop insurers (loss verification)',
        'Farmland investors/lenders (due diligence)',
        'Irrigation districts',
      ],
      revenueModel:
        'Per-acre/season monitoring subscriptions; white-label field-health API for agtech platforms; insurer loss-event reports.',
      unitEconomics:
        'Data is free; a county of fields is minutes of compute. Incumbents charge $1–3/acre/season — margin is effectively the software.',
      productionPath: [
        'Field-boundary ingestion (USDA CLU or customer shapefiles).',
        'Anomaly alerts: a field dropping vs. its own history and vs. neighbors.',
        'Add soil-moisture proxy from Sentinel-1 radar (free) and yield-model integration.',
      ],
      honestLimits:
        'Clouds interrupt optical monitoring (radar fills gaps); NDVI shows vigor, not cause — diagnosing pest vs. water stress needs agronomy context. Crowded incumbent space; wedge is price and API-first delivery.',
      precedents: ['Planet Ag', 'Sentinel Hub / EOSDA', 'Climate FieldView'],
    },
  },
];
