"""POC 4 — Route Overwatch: consent-based satellite watch over a shared route.

Parses a GPX track its owner shared, pulls the freshest usable Sentinel-2
chip for each waypoint, checks the active-fire layer along the corridor,
and renders a labeled strip + route map.
"""

import datetime as dt
import os
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import common

SLUG = "route-overwatch"
GPX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "sample-route.gpx")
NS = {"g": "http://www.topografix.com/GPX/1/1"}
N_WAYPOINTS = 8
CHIP_DEG_LON = 0.006
CHIP_DEG_LAT = 0.005
FIRE_RADIUS_DEG = 0.02


def load_track():
    root = ET.parse(GPX).getroot()
    name = root.findtext(".//g:trk/g:name", default="shared route", namespaces=NS)
    pts = [
        (float(p.get("lat")), float(p.get("lon")))
        for p in root.findall(".//g:trkpt", NS)
    ]
    return name, pts


def main():
    name, pts = load_track()
    step = max(1, len(pts) // N_WAYPOINTS)
    waypoints = pts[::step][:N_WAYPOINTS]
    lats = [p[0] for p in pts]
    lons = [p[1] for p in pts]
    bbox = [min(lons) - 0.02, min(lats) - 0.02, max(lons) + 0.02, max(lats) + 0.02]

    scenes = common.stac_search(
        common.EARTH_SEARCH, ["sentinel-2-l2a"], bbox, max_cloud=30, limit=10
    )
    if not scenes:
        raise SystemExit("no Sentinel-2 scenes over the route")
    scene = scenes[0]
    acquired_iso = scene["properties"]["datetime"]
    acquired = acquired_iso[:16].replace("T", " ") + " UTC"
    age_days = (
        dt.datetime.now(dt.timezone.utc)
        - dt.datetime.fromisoformat(acquired_iso.replace("Z", "+00:00"))
    ).days
    visual = scene["assets"]["visual"]["href"]
    print(f"scene {scene['id']} acquired {acquired} ({age_days} d old, "
          f"cloud {scene['properties'].get('eo:cloud_cover', '?'):.0f}%)")

    # --- fire detections along the corridor ---------------------------------
    fire_points = common.fetch_fire_points(common.utc_yesterday(), bbox, z=7)
    flags = []
    for lat, lon in waypoints:
        near = any(
            abs(f["lat"] - lat) < FIRE_RADIUS_DEG and abs(f["lon"] - lon) < FIRE_RADIUS_DEG
            for f in fire_points
        )
        flags.append(near)
    print(f"fire detections in corridor: {len(fire_points)}, flags: {sum(flags)}")

    # --- per-waypoint chips ---------------------------------------------------
    font = ImageFont.load_default(size=16)
    chips = []
    for i, (lat, lon) in enumerate(waypoints):
        cb = [lon - CHIP_DEG_LON, lat - CHIP_DEG_LAT, lon + CHIP_DEG_LON, lat + CHIP_DEG_LAT]
        data, _t, _c = common.windowed_read(visual, cb)
        arr = np.transpose(data[:3], (1, 2, 0)).astype(np.uint8)
        chip = Image.fromarray(arr).resize((190, 190), Image.LANCZOS)
        border = (255, 70, 70) if flags[i] else (62, 207, 142)
        framed = Image.new("RGB", (198, 218), (8, 10, 16))
        ImageDraw.Draw(framed).rectangle([0, 0, 197, 197], outline=border, width=4)
        framed.paste(chip, (4, 4))
        ImageDraw.Draw(framed).text(
            (6, 198),
            f"WP{i + 1} · {'FIRE NEAR' if flags[i] else 'clear'}",
            fill=border,
            font=font,
        )
        chips.append(framed)

    header_h = 46
    strip = Image.new("RGB", (198 * len(chips) + 6 * (len(chips) - 1), 218 + header_h), (8, 10, 16))
    d = ImageDraw.Draw(strip)
    d.text(
        (10, 6),
        f"{name}",
        fill=(233, 237, 246),
        font=ImageFont.load_default(size=19),
    )
    d.text(
        (10, 27),
        f"Sentinel-2 pass {acquired} · imagery age {age_days} days · "
        f"{sum(flags)} hazard flags on {len(chips)} waypoints",
        fill=(255, 178, 36),
        font=ImageFont.load_default(size=14),
    )
    for i, chip in enumerate(chips):
        strip.paste(chip, (i * 204, header_h))
    out_dir = common.imagery_dir(SLUG)
    common.save_jpeg(strip, f"{out_dir}/strip.jpg", quality=86)

    # --- route map ------------------------------------------------------------
    data, transform, _ = common.windowed_read(visual, bbox)
    arr = np.transpose(data[:3], (1, 2, 0)).astype(np.uint8)
    h, w = arr.shape[:2]
    scale = 900 / w
    route_map = Image.fromarray(arr).resize((900, int(h * scale)), Image.LANCZOS)
    md = ImageDraw.Draw(route_map)

    def to_px(lat, lon):
        col, row = ~transform * (lon, lat)
        return col * scale, row * scale

    md.line([to_px(lat, lon) for lat, lon in pts], fill=(255, 178, 36), width=4)
    for i, (lat, lon) in enumerate(waypoints):
        x, y = to_px(lat, lon)
        color = (255, 70, 70) if flags[i] else (69, 213, 255)
        md.ellipse([x - 7, y - 7, x + 7, y + 7], fill=color, outline=(8, 10, 16), width=2)
    common.save_jpeg(route_map, f"{out_dir}/route-map.jpg", quality=87)

    common.write_generated(
        SLUG,
        images=[
            {
                "src": f"/imagery/{SLUG}/strip.jpg",
                "caption": (
                    "A satellite flyover of a route its owner chose to share: the freshest "
                    "10 m Sentinel-2 chip at each waypoint of a Marin Headlands loop, with "
                    "an active-fire check along the corridor. Consent-based by design — the "
                    "system only ever looks at tracks people share."
                ),
                "acquired": acquired,
                "source": "Sentinel-2 via Earth Search + VIIRS fire layer via GIBS",
            },
            {
                "src": f"/imagery/{SLUG}/route-map.jpg",
                "caption": (
                    "The full shared track over the same scene. Free imagery is 10 m and "
                    "days-old — terrain and hazard awareness, not live tracking; literal "
                    "real-time following needs tasked commercial satellites (the premium "
                    "tier of this product, not the free one)."
                ),
                "acquired": acquired,
                "source": "Sentinel-2 L2A via Earth Search (anonymous COGs)",
            },
        ],
        stats=[
            {"label": "waypoints checked", "value": str(len(chips))},
            {"label": "imagery age", "value": f"{age_days} days"},
            {"label": "hazard flags", "value": str(sum(flags))},
        ],
    )


if __name__ == "__main__":
    main()
