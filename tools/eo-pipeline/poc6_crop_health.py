"""POC 6 — Crop Health Monitor.

NDVI over irrigated fields west of Fresno, CA: a colormapped vigor map from
the newest clear Sentinel-2 scene plus a season time series over one field
block — the classic satellite-agriculture product, at zero data cost.
"""

import datetime as dt

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

import common

SLUG = "crop-health"
BBOX = [-120.30, 36.40, -120.10, 36.55]
BLOCK = [-120.29, 36.52, -120.26, 36.545]  # actively-cropped field block (NW green cluster)
SERIES_START = "2026-04-01T00:00:00Z"
MIN_GAP_DAYS = 14
MAX_SERIES = 6


def contained(scenes):
    return [
        s
        for s in scenes
        if s.get("bbox")
        and s["bbox"][0] <= BBOX[0]
        and s["bbox"][1] <= BBOX[1]
        and s["bbox"][2] >= BBOX[2]
        and s["bbox"][3] >= BBOX[3]
    ]


def ndvi_for(scene, bbox):
    red, _, _ = common.windowed_read(scene["assets"]["red"]["href"], bbox)
    nir, _, _ = common.windowed_read(scene["assets"]["nir"]["href"], bbox)
    r = red[0].astype(np.float64)
    n = nir[0].astype(np.float64)
    return (n - r) / (n + r + 1e-9)


def main():
    scenes = contained(
        common.stac_search(common.EARTH_SEARCH, ["sentinel-2-l2a"], BBOX, max_cloud=10, limit=10)
    )
    latest = scenes[0]
    date = latest["properties"]["datetime"][:10]
    print(f"map scene {latest['id']} ({date})")

    ndvi = ndvi_for(latest, BBOX)
    out_dir = common.imagery_dir(SLUG)

    fig, ax = plt.subplots(figsize=(11, 8.5), dpi=110)
    im = ax.imshow(ndvi, cmap="RdYlGn", vmin=0.0, vmax=0.9)
    ax.set_title(f"Crop vigor (NDVI) · irrigated fields west of Fresno, CA · {date}", fontsize=13)
    ax.set_xticks([])
    ax.set_yticks([])
    cbar = fig.colorbar(im, ax=ax, fraction=0.04, pad=0.02)
    cbar.set_label("NDVI — brown: bare/stressed · green: vigorous crop")
    fig.tight_layout()
    fig.savefig(f"{out_dir}/ndvi-map.png", facecolor="white")
    plt.close(fig)
    import os

    common._check_size(f"{out_dir}/ndvi-map.png")
    print(f"wrote {out_dir}/ndvi-map.png ({os.path.getsize(f'{out_dir}/ndvi-map.png') // 1024} KB)")

    # --- season series over one field block ----------------------------------
    candidates = contained(
        common.stac_search(
            common.EARTH_SEARCH,
            ["sentinel-2-l2a"],
            BBOX,
            datetime_range=f"{SERIES_START}/{dt.datetime.now(dt.timezone.utc).isoformat()}",
            max_cloud=15,
            limit=60,
        )
    )
    picked = []
    last: dt.datetime | None = None
    for s in sorted(candidates, key=lambda s: s["properties"]["datetime"]):
        t = dt.datetime.fromisoformat(s["properties"]["datetime"].replace("Z", "+00:00"))
        if last is None or (t - last).days >= MIN_GAP_DAYS:
            picked.append(s)
            last = t
    picked = picked[-MAX_SERIES:]
    points = []
    for s in picked:
        block = ndvi_for(s, BLOCK)
        points.append(
            {"date": s["properties"]["datetime"][:10], "value": round(float(np.mean(block)), 3)}
        )
        print(f"series {points[-1]['date']}: {points[-1]['value']}")

    common.write_generated(
        SLUG,
        images=[
            {
                "src": f"/imagery/{SLUG}/ndvi-map.png",
                "caption": (
                    "Field-by-field crop vigor west of Fresno: every green square is a "
                    "thriving irrigated field, every brown one is fallow or freshly "
                    "harvested. Computed from red vs near-infrared reflectance — updated "
                    "every ~5 days per field, from free data."
                ),
                "acquired": date,
                "source": "Sentinel-2 L2A via Earth Search (anonymous COGs)",
            },
        ],
        stats=[
            {"label": "latest block NDVI", "value": f"{points[-1]['value']:.2f}" if points else "—"},
            {"label": "season scenes sampled", "value": str(len(points))},
            {"label": "revisit", "value": "~5 days"},
        ],
        series={
            "label": "Mean NDVI — field block west of Fresno (Apr–Aug 2026)",
            "points": points,
        },
    )


if __name__ == "__main__":
    main()
