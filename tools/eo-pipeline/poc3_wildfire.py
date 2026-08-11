"""POC 3 — Wildfire & Disaster Watch.

Pulls yesterday's VIIRS 375 m active-fire detections (vector points) across
the western US, auto-locates the largest cluster, renders a zoomed
true-color composite with the detections glowing on top, and grabs the
latest 10-minute GOES-19 full disk.
"""

import datetime as dt
import io
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

import common

SLUG = "wildfire"
WEST_US = [-125.0, 32.0, -105.0, 49.0]
FALLBACKS = [[-125.0, 25.0, -66.0, 49.0], [-10.0, 36.0, 30.0, 46.0]]  # CONUS, S. Europe
TRUE_COLOR = ("VIIRS_SNPP_CorrectedReflectance_TrueColor", "GoogleMapsCompatible_Level9", "jpg")
CLUSTER_DEG = 0.05  # grid size for clustering fire points


def largest_cluster(points):
    """Bin points to a grid, connect neighbours, return the biggest cluster."""
    lats = np.array([p["lat"] for p in points])
    lons = np.array([p["lon"] for p in points])
    gi = ((lats - lats.min()) / CLUSTER_DEG).astype(int)
    gj = ((lons - lons.min()) / CLUSTER_DEG).astype(int)
    grid = np.zeros((gi.max() + 1, gj.max() + 1), dtype=bool)
    grid[gi, gj] = True
    labels, n = ndimage.label(grid, structure=np.ones((3, 3)))
    counts = np.zeros(n + 1, dtype=int)
    member = labels[gi, gj]
    for m in member:
        counts[m] += 1
    best = int(counts[1:].argmax()) + 1
    sel = member == best
    return {
        "lat": float(lats[sel].mean()),
        "lon": float(lons[sel].mean()),
        "points": int(sel.sum()),
        "clusters": n,
    }


def region_name(lat, lon):
    if lat > 38.5 and -125 < lon < -119:
        return "Northern California"
    if lat > 42 and -125 < lon < -116:
        return "Pacific Northwest"
    if 32 < lat < 38.5 and -122 < lon < -114:
        return "Southern California / Southwest"
    if -119 <= lon < -102 and 31 < lat < 49:
        return "US Interior West"
    return f"{lat:.1f}N {abs(lon):.1f}W"


def merc_px(lat, lon, z):
    n = 2**z
    x = (lon + 180.0) / 360.0 * n * 256
    y = (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n * 256
    return x, y


def main():
    date = common.utc_yesterday()
    points = common.fetch_fire_points(date, WEST_US, z=5)
    scanned = "western US"
    if not points:
        for bbox, name in zip(FALLBACKS, ["continental US", "southern Europe"]):
            points = common.fetch_fire_points(date, bbox, z=4)
            if points:
                scanned = name
                break
    if not points:
        raise SystemExit("no active-fire detections found in any scanned region")

    hit = largest_cluster(points)
    region = region_name(hit["lat"], hit["lon"])
    print(
        f"{len(points)} fire detections in {scanned}; largest cluster {hit['points']} points "
        f"at {hit['lat']:.3f}, {hit['lon']:.3f} ({region}); {hit['clusters']} clusters"
    )

    out_dir = common.imagery_dir(SLUG)

    # --- zoomed composite: true color + glowing fire points ------------------
    z = 8
    base, (tx0, ty0) = common.gibs_mosaic(*TRUE_COLOR, date, hit["lat"], hit["lon"], z, 3, 3)
    base = base.convert("RGB")
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    local = [p for p in points if abs(p["lat"] - hit["lat"]) < 1.5 and abs(p["lon"] - hit["lon"]) < 2]
    for p in local:
        px, py = merc_px(p["lat"], p["lon"], z)
        x, y = px - tx0 * 256, py - ty0 * 256
        if 0 <= x < base.width and 0 <= y < base.height:
            gd.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(255, 60, 20, 200))
    glow = glow.filter(ImageFilter.GaussianBlur(2.0))
    comp = Image.alpha_composite(base.convert("RGBA"), glow).convert("RGB")

    strip_h = 36
    font = ImageFont.load_default(size=20)
    framed = Image.new("RGB", (comp.width, comp.height + strip_h), (8, 10, 16))
    framed.paste(comp, (0, strip_h))
    ImageDraw.Draw(framed).text(
        (10, 8),
        f"VIIRS active-fire detections ({len(local)} points) over true color · {date} · "
        f"{region} ({hit['lat']:.2f}, {hit['lon']:.2f})",
        fill=(255, 178, 36),
        font=font,
    )
    common.save_jpeg(framed, f"{out_dir}/fire-composite.jpg", quality=87)

    # --- GOES full disk -------------------------------------------------------
    r = common.session.get(
        "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/FD/GEOCOLOR/1808x1808.jpg", timeout=60
    )
    r.raise_for_status()
    goes = Image.open(io.BytesIO(r.content)).resize((1080, 1080), Image.LANCZOS)
    common.save_jpeg(goes, f"{out_dir}/goes-fulldisk.jpg", quality=85)
    now = dt.datetime.now(dt.timezone.utc)
    goes_time = now.replace(minute=now.minute - now.minute % 10).strftime("%Y-%m-%d %H:%M UTC")

    common.write_generated(
        SLUG,
        images=[
            {
                "src": f"/imagery/{SLUG}/fire-composite.jpg",
                "caption": (
                    f"Auto-located: the largest active fire in the {scanned} on {date} — "
                    f"{region}. Each glowing dot is a 375 m VIIRS thermal detection drawn on "
                    "the same day's true-color pass; no human picked this location, the "
                    "pipeline found it by scanning the whole region's detections."
                ),
                "acquired": date,
                "source": "NASA VIIRS via GIBS vector tiles (anonymous)",
            },
            {
                "src": f"/imagery/{SLUG}/goes-fulldisk.jpg",
                "caption": (
                    "The 'right now' rung: GOES-19 GeoColor full disk, refreshed every 10 "
                    "minutes — smoke plumes, storms and hurricanes are watchable in near "
                    "real time at zero cost."
                ),
                "acquired": goes_time,
                "source": "NOAA GOES-19 via STAR CDN (anonymous)",
            },
        ],
        stats=[
            {"label": "fire detections scanned", "value": f"{len(points)} ({scanned})"},
            {"label": "largest fire", "value": f"{hit['points']} hot spots · {region}"},
            {"label": "detection latency", "value": "< 24 h (VIIRS) / 10 min (GOES)"},
        ],
    )


if __name__ == "__main__":
    main()
