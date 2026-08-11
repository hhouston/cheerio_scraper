"""Shared plumbing for the Orbital EO pipeline.

Every script fetches open satellite data (no API keys), processes a small
window of it, and writes:
  - imagery  -> <repo>/public/imagery/<slug>/
  - metadata -> <repo>/src/data/generated/<slug>.json  (shape: GeneratedPocData
    in src/lib/registry.ts — keep them in sync)
"""

from __future__ import annotations

import datetime as dt
import io
import json
import math
import os
from typing import Any

import numpy as np
import requests
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CA_BUNDLE = os.environ.get("EO_CA_BUNDLE", "/root/.ccr/ca-bundle.crt")
if not os.path.exists(CA_BUNDLE):
    CA_BUNDLE = True  # fall back to system certs outside the sandbox

MAX_IMAGE_BYTES = 2 * 1024 * 1024

EARTH_SEARCH = "https://earth-search.aws.element84.com/v1"
PC_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"
GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best"

session = requests.Session()
session.verify = CA_BUNDLE


def stac_search(
    api_url: str,
    collections: list[str],
    bbox: list[float],
    datetime_range: str | None = None,
    max_cloud: float | None = None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """POST /search, newest first."""
    body: dict[str, Any] = {
        "collections": collections,
        "bbox": bbox,
        "limit": limit,
        "sortby": [{"field": "properties.datetime", "direction": "desc"}],
    }
    if datetime_range:
        body["datetime"] = datetime_range
    if max_cloud is not None:
        body["query"] = {"eo:cloud_cover": {"lt": max_cloud}}
    r = session.post(f"{api_url}/search", json=body, timeout=60)
    r.raise_for_status()
    return r.json().get("features", [])


def pc_sign(item_or_href):
    """Sign a Planetary Computer STAC item (or href) with an anonymous SAS token."""
    import planetary_computer

    return planetary_computer.sign(item_or_href)


def rasterio_env():
    import rasterio

    return rasterio.Env(
        CURL_CA_BUNDLE=CA_BUNDLE if isinstance(CA_BUNDLE, str) else None,
        GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
        GDAL_HTTP_MAX_RETRY="4",
        GDAL_HTTP_RETRY_DELAY="2",
        VSI_CACHE=True,
    )


def windowed_read(href: str, bbox4326: list[float], max_px: int = 4000):
    """Read only the window covering bbox4326 from a (possibly huge) remote COG.

    Handles GCP-georeferenced rasters (Sentinel-1 GRD) via WarpedVRT.
    Returns (array[bands,h,w], transform, crs).
    """
    import rasterio
    from rasterio.vrt import WarpedVRT
    from rasterio.warp import transform_bounds
    from rasterio.windows import from_bounds

    with rasterio_env():
        with rasterio.open(href) as src:
            needs_warp = src.transform.is_identity and src.gcps[0]
            if needs_warp:
                vrt = WarpedVRT(src, crs="EPSG:4326")
                reader = vrt
            else:
                reader = src
            bounds = transform_bounds("EPSG:4326", reader.crs, *bbox4326)
            win = from_bounds(*bounds, transform=reader.transform)
            win = win.round_offsets().round_lengths()
            h, w = int(win.height), int(win.width)
            if h > max_px or w > max_px:
                raise ValueError(f"window {w}x{h} exceeds max_px={max_px}; shrink the bbox")
            data = reader.read(window=win)
            transform = reader.window_transform(win)
            crs = reader.crs
            if needs_warp:
                vrt.close()
    return data, transform, crs


def percentile_stretch(arr: np.ndarray, lo: float = 2, hi: float = 98) -> np.ndarray:
    """Stretch to uint8 using percentiles of finite values."""
    finite = arr[np.isfinite(arr)]
    if finite.size == 0:
        return np.zeros_like(arr, dtype=np.uint8)
    p_lo, p_hi = np.percentile(finite, [lo, hi])
    if p_hi <= p_lo:
        p_hi = p_lo + 1
    out = np.clip((arr - p_lo) / (p_hi - p_lo), 0, 1)
    out[~np.isfinite(arr)] = 0
    return (out * 255).astype(np.uint8)


def tile_xyz(lat: float, lon: float, z: int) -> tuple[int, int]:
    n = 2**z
    lat = max(-85.0511, min(85.0511, lat))
    x = int((lon + 180.0) / 360.0 * n)
    y = int((1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n)
    return max(0, min(n - 1, x)), max(0, min(n - 1, y))


def gibs_tile_url(layer: str, tms: str, ext: str, date: str, z: int, y: int, x: int) -> str:
    return f"{GIBS_BASE}/{layer}/default/{date}/{tms}/{z}/{y}/{x}.{ext}"


def gibs_mosaic(
    layer: str,
    tms: str,
    ext: str,
    date: str,
    lat: float,
    lon: float,
    z: int,
    nx: int,
    ny: int,
) -> tuple[Image.Image, tuple[int, int]]:
    """Fetch an nx x ny tile mosaic centred on lat/lon. Returns (RGBA image, top-left tile xy)."""
    cx, cy = tile_xyz(lat, lon, z)
    x0, y0 = cx - nx // 2, cy - ny // 2
    mosaic = Image.new("RGBA", (256 * nx, 256 * ny), (0, 0, 0, 0))
    for dy in range(ny):
        for dx in range(nx):
            url = gibs_tile_url(layer, tms, ext, date, z, y0 + dy, x0 + dx)
            r = session.get(url, timeout=30)
            if r.ok and r.headers.get("content-type", "").startswith("image"):
                tile = Image.open(io.BytesIO(r.content)).convert("RGBA")
                mosaic.paste(tile, (256 * dx, 256 * dy))
    return mosaic, (x0, y0)


def tile_origin_latlon(x: int, y: int, z: int) -> tuple[float, float]:
    """Lat/lon of the NW corner of a web-mercator tile."""
    n = 2**z
    lon = x / n * 360.0 - 180.0
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    return lat, lon


def imagery_dir(slug: str) -> str:
    d = os.path.join(REPO, "public", "imagery", slug)
    os.makedirs(d, exist_ok=True)
    return d


def _check_size(path: str) -> None:
    size = os.path.getsize(path)
    if size > MAX_IMAGE_BYTES:
        raise ValueError(f"{path} is {size / 1e6:.1f} MB (> {MAX_IMAGE_BYTES / 1e6:.0f} MB cap); "
                         "downscale or raise JPEG compression")


def save_jpeg(img: Image.Image, path: str, quality: int = 85) -> None:
    img.convert("RGB").save(path, "JPEG", quality=quality, optimize=True)
    _check_size(path)
    print(f"wrote {path} ({os.path.getsize(path) // 1024} KB)")


def save_png(img: Image.Image, path: str) -> None:
    img.save(path, "PNG", optimize=True)
    _check_size(path)
    print(f"wrote {path} ({os.path.getsize(path) // 1024} KB)")


def write_generated(
    slug: str,
    images: list[dict[str, str]],
    stats: list[dict[str, str]] | None = None,
    series: dict[str, Any] | None = None,
) -> None:
    """Write src/data/generated/<slug>.json in the shape the app expects."""
    out: dict[str, Any] = {
        "generatedAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "images": images,
    }
    if stats:
        out["stats"] = stats
    if series:
        out["series"] = series
    d = os.path.join(REPO, "src", "data", "generated")
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, f"{slug}.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"wrote {path}")


def utc_yesterday() -> str:
    return (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)).strftime("%Y-%m-%d")


def tile4326_rowcol(lat: float, lon: float, z: int) -> tuple[int, int]:
    """GIBS EPSG:4326 tile grid: square tiles of 180/2^z degrees."""
    span = 180.0 / 2**z
    col = int((lon + 180.0) / span)
    row = int((90.0 - lat) / span)
    return row, col


def fetch_fire_points(
    date: str,
    bbox4326: list[float],
    z: int = 5,
    layer: str = "VIIRS_NOAA20_Thermal_Anomalies_375m_All",
) -> list[dict[str, Any]]:
    """Active-fire detections as points from GIBS Mapbox vector tiles.

    The thermal-anomaly layers are vector (MVT), served from the EPSG:4326
    endpoint with TileMatrixSet "500m". Returns [{lat, lon, **properties}].
    """
    import mapbox_vector_tile

    span = 180.0 / 2**z
    r0, c0 = tile4326_rowcol(bbox4326[3], bbox4326[0], z)  # NW
    r1, c1 = tile4326_rowcol(bbox4326[1], bbox4326[2], z)  # SE
    points: list[dict[str, Any]] = []
    for row in range(r0, r1 + 1):
        for col in range(c0, c1 + 1):
            url = (
                f"https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{layer}/default/"
                f"{date}/500m/{z}/{row}/{col}.mvt"
            )
            resp = session.get(url, timeout=30)
            if not resp.ok or not resp.content:
                continue
            try:
                tile = mapbox_vector_tile.decode(resp.content)
            except Exception:
                continue
            west = -180.0 + col * span
            north = 90.0 - row * span
            for tlayer in tile.values():
                extent = tlayer.get("extent", 4096)
                for feat in tlayer["features"]:
                    geom = feat.get("geometry", {})
                    if geom.get("type") != "Point":
                        continue
                    x, y = geom["coordinates"]
                    lon = west + (x / extent) * span
                    lat = (north - span) + (y / extent) * span  # y is bottom-up
                    if bbox4326[0] <= lon <= bbox4326[2] and bbox4326[1] <= lat <= bbox4326[3]:
                        points.append({"lat": lat, "lon": lon, **feat.get("properties", {})})
    return points
