"""POC 5 — Construction & Property Intel.

Compares Sentinel-2 scenes of the NW Las Vegas fringe (one of the fastest-growing US
suburbs) about a year apart on the same UTM grid, renders before/after and
a change overlay, and reports the built-up area delta.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

import common

SLUG = "construction"
# NW Las Vegas growth frontier (Skye Canyon / Grand Teton corridor): pure
# desert being converted to subdivisions — no farmland to confuse the change
# signal, unlike the Phoenix-area fringe.
BBOX = [-115.40, 36.28, -115.28, 36.36]
PLACE = "NW Las Vegas, NV"
BRIGHT_DELTA = 26.0  # mean-RGB brightening that marks new construction in desert
NDVI_BARE = 0.22  # both dates must be non-vegetated: kills crop-rotation false alarms
MIN_CLUSTER_PX = 30


def newest_scene(**kwargs):
    scenes = common.stac_search(common.EARTH_SEARCH, ["sentinel-2-l2a"], BBOX, **kwargs)
    # only scenes whose footprint fully contains the window — otherwise the
    # windowed read comes back clipped at an MGRS tile edge
    return [
        s
        for s in scenes
        if s.get("bbox")
        and s["bbox"][0] <= BBOX[0]
        and s["bbox"][1] <= BBOX[1]
        and s["bbox"][2] >= BBOX[2]
        and s["bbox"][3] >= BBOX[3]
    ]


def read_rgb(scene):
    data, transform, crs = common.windowed_read(scene["assets"]["visual"]["href"], BBOX)
    return np.transpose(data[:3], (1, 2, 0)).astype(np.float64), transform


def read_ndvi(scene):
    red, _, _ = common.windowed_read(scene["assets"]["red"]["href"], BBOX)
    nir, _, _ = common.windowed_read(scene["assets"]["nir"]["href"], BBOX)
    r = red[0].astype(np.float64)
    n = nir[0].astype(np.float64)
    return (n - r) / (n + r + 1e-9)


def label_half(img, text):
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, img.width, 30], fill=(8, 10, 16))
    d.text((10, 6), text, fill=(255, 178, 36), font=ImageFont.load_default(size=17))
    return img


def main():
    after_candidates = newest_scene(max_cloud=10, limit=10)
    if not after_candidates:
        after_candidates = newest_scene(max_cloud=25, limit=10)
    after = after_candidates[0]
    grid = after["properties"].get("grid:code")
    # Match the season (sun elevation) of the "after" scene as closely as
    # possible — a Sept-vs-Aug pair paints every desert ridge as false change.
    before_candidates = [
        s
        for s in newest_scene(
            datetime_range="2025-07-20T00:00:00Z/2025-08-31T23:59:59Z", max_cloud=10, limit=20
        )
        if s["properties"].get("grid:code") == grid
    ]
    if not before_candidates:
        before_candidates = [
            s
            for s in newest_scene(
                datetime_range="2025-05-01T00:00:00Z/2025-09-30T23:59:59Z", max_cloud=10, limit=20
            )
            if s["properties"].get("grid:code") == grid
        ]
    before = before_candidates[0]
    d_after = after["properties"]["datetime"][:10]
    d_before = before["properties"]["datetime"][:10]
    print(f"before {before['id']} ({d_before})  after {after['id']} ({d_after})  grid {grid}")

    rgb_b, _ = read_rgb(before)
    rgb_a, _ = read_rgb(after)
    h = min(rgb_b.shape[0], rgb_a.shape[0])
    w = min(rgb_b.shape[1], rgb_a.shape[1])
    rgb_b, rgb_a = rgb_b[:h, :w], rgb_a[:h, :w]

    ndvi_b = read_ndvi(before)[:h, :w]
    ndvi_a = read_ndvi(after)[:h, :w]

    bright_b = rgb_b.mean(axis=2)
    bright_a = rgb_a.mean(axis=2)
    # Construction in the desert Southwest = bare ground that brightens strongly
    # (graded lots, roads, roofs) and STAYS bare. Requiring low NDVI on both
    # dates excludes the irrigated fields' crop-rotation noise entirely.
    changed = (
        (bright_a - bright_b > BRIGHT_DELTA) & (ndvi_b < NDVI_BARE) & (ndvi_a < NDVI_BARE)
    )
    changed = ndimage.binary_opening(changed, iterations=1)
    labels, n = ndimage.label(changed)
    sizes = ndimage.sum(changed, labels, range(1, n + 1))
    for idx, size in enumerate(sizes, start=1):
        if size < MIN_CLUSTER_PX:
            changed[labels == idx] = False
    km2 = changed.sum() * 100 / 1e6  # 10 m pixels
    print(f"changed area: {km2:.2f} km^2 ({100 * changed.mean():.1f}% of window)")

    out_dir = common.imagery_dir(SLUG)

    # before/after side-by-side
    half_w = 690
    scale = half_w / w
    im_b = label_half(
        Image.fromarray(rgb_b.astype(np.uint8)).resize((half_w, int(h * scale))), f"{PLACE} · {d_before}"
    )
    im_a = label_half(
        Image.fromarray(rgb_a.astype(np.uint8)).resize((half_w, int(h * scale))), f"{PLACE} · {d_after}"
    )
    pair = Image.new("RGB", (half_w * 2 + 4, im_b.height), (8, 10, 16))
    pair.paste(im_b, (0, 0))
    pair.paste(im_a, (half_w + 4, 0))
    common.save_jpeg(pair, f"{out_dir}/before-after.jpg", quality=85)

    # change overlay on the after image
    overlay = rgb_a.copy()
    overlay[changed] = overlay[changed] * 0.35 + np.array([255, 40, 40]) * 0.65
    ov = Image.fromarray(overlay.astype(np.uint8)).resize((1100, int(h * 1100 / w)))
    ov = label_half(ov, f"New construction {d_before} → {d_after} · {km2:.1f} km² changed")
    common.save_jpeg(ov, f"{out_dir}/change-overlay.jpg", quality=85)

    common.write_generated(
        SLUG,
        images=[
            {
                "src": f"/imagery/{SLUG}/before-after.jpg",
                "caption": (
                    f"{PLACE}, {d_before} vs {d_after}: watch one of America's "
                    "fastest-growing metro fringes turn desert into subdivisions. Same "
                    "satellite, same grid, one year apart."
                ),
                "acquired": f"{d_before} and {d_after}",
                "source": "Sentinel-2 L2A via Earth Search (anonymous COGs)",
            },
            {
                "src": f"/imagery/{SLUG}/change-overlay.jpg",
                "caption": (
                    f"Change mask over the new scene: {km2:.1f} km² of desert brightened or "
                    "lost vegetation the way graded lots, roads and roofs do. Builders, "
                    "assessors and land investors pay for exactly this growth-frontier map."
                ),
                "acquired": d_after,
                "source": "Sentinel-2 L2A via Earth Search (anonymous COGs)",
            },
        ],
        stats=[
            {"label": "changed area", "value": f"{km2:.1f} km²"},
            {"label": "period", "value": f"{d_before} → {d_after}"},
            {"label": "location", "value": PLACE},
        ],
    )


if __name__ == "__main__":
    main()
