"""POC 7 — Steel Demand Intel (JD Fields pitch).

Three real demos from free data, aimed at a steel pipe & piling distributor:
  1. Permian Basin: new well-pad clearing detected before rig counts move
     (line-pipe demand signal).
  2. Houston metro fringe: land being graded for construction — piling leads.
  3. Houston Ship Channel: port/laydown activity monitoring (supply chain).
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

import common

SLUG = "steel-intel"

PERMIAN = [-103.65, 31.30, -103.45, 31.45]  # Reeves County, TX — Delaware Basin
HOUSTON_FRINGE = [-96.02, 29.65, -95.90, 29.75]  # Fulshear / Cross Creek Ranch
SHIP_CHANNEL = [-95.31, 29.71, -95.24, 29.78]  # Port Houston Turning Basin area


def contained(scenes, bbox):
    return [
        s
        for s in scenes
        if s.get("bbox")
        and s["bbox"][0] <= bbox[0]
        and s["bbox"][1] <= bbox[1]
        and s["bbox"][2] >= bbox[2]
        and s["bbox"][3] >= bbox[3]
    ]


def scene_pair(bbox, before_range, max_cloud=12):
    after = contained(
        common.stac_search(common.EARTH_SEARCH, ["sentinel-2-l2a"], bbox, max_cloud=max_cloud,
                           limit=10), bbox)
    if not after:
        after = contained(
            common.stac_search(common.EARTH_SEARCH, ["sentinel-2-l2a"], bbox, max_cloud=30,
                               limit=10), bbox)
    a = after[0]
    grid = a["properties"].get("grid:code")
    before = [
        s
        for s in contained(
            common.stac_search(common.EARTH_SEARCH, ["sentinel-2-l2a"], bbox,
                               datetime_range=before_range, max_cloud=max_cloud, limit=20), bbox)
        if s["properties"].get("grid:code") == grid
    ]
    return before[0], a


def read_rgb(scene, bbox):
    data, transform, _ = common.windowed_read(scene["assets"]["visual"]["href"], bbox)
    return np.transpose(data[:3], (1, 2, 0)).astype(np.float64), transform


def read_ndvi(scene, bbox):
    red, _, _ = common.windowed_read(scene["assets"]["red"]["href"], bbox)
    nir, _, _ = common.windowed_read(scene["assets"]["nir"]["href"], bbox)
    r = red[0].astype(np.float64)
    n = nir[0].astype(np.float64)
    return (n - r) / (n + r + 1e-9)


def read_valid(scene, bbox, h, w):
    """True where the scene-classification band says clear ground: not cloud,
    not cloud shadow, not cirrus. SCL is 20 m — upsampled to the 10 m grid."""
    scl, _, _ = common.windowed_read(scene["assets"]["scl"]["href"], bbox)
    arr = scl[0].astype(np.uint8)
    up = np.array(
        Image.fromarray(arr, mode="L").resize((w, h), Image.NEAREST)
    )
    return np.isin(up, (4, 5, 6, 7))  # vegetation, bare, water, unclassified


def crop_pair(rgb_b, rgb_a):
    h = min(rgb_b.shape[0], rgb_a.shape[0])
    w = min(rgb_b.shape[1], rgb_a.shape[1])
    return rgb_b[:h, :w], rgb_a[:h, :w], h, w


def clean_mask(mask, min_px):
    mask = ndimage.binary_opening(mask, iterations=1)
    labels, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, labels, range(1, n + 1))
    for idx, size in enumerate(sizes, start=1):
        if size < min_px:
            mask[labels == idx] = False
    return mask, int(ndimage.label(mask)[1])


def title_bar(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, im.width, 32], fill=(8, 10, 16))
    d.text((10, 7), text, fill=(255, 178, 36), font=ImageFont.load_default(size=17))
    return im


def overlay_img(rgb, mask, w_out, label):
    out = rgb.copy()
    out[mask] = out[mask] * 0.3 + np.array([255, 40, 40]) * 0.7
    h, w = out.shape[:2]
    im = Image.fromarray(out.astype(np.uint8)).resize((w_out, int(h * w_out / w)), Image.LANCZOS)
    return title_bar(im, label)


def main():
    out_dir = common.imagery_dir(SLUG)

    # ---- 1. Permian: new pads (bare desert that brightened strongly) --------
    b, a = scene_pair(PERMIAN, "2025-07-15T00:00:00Z/2025-09-10T23:59:59Z")
    db, da = b["properties"]["datetime"][:10], a["properties"]["datetime"][:10]
    print(f"Permian pair: {db} -> {da}")
    rgb_b, _ = read_rgb(b, PERMIAN)
    rgb_a, _ = read_rgb(a, PERMIAN)
    rgb_b, rgb_a, h, w = crop_pair(rgb_b, rgb_a)
    nb = read_ndvi(b, PERMIAN)[:h, :w]
    na = read_ndvi(a, PERMIAN)[:h, :w]
    valid = read_valid(b, PERMIAN, h, w) & read_valid(a, PERMIAN, h, w)
    brighten = rgb_a.mean(axis=2) - rgb_b.mean(axis=2)
    mask = (brighten > 30) & (nb < 0.25) & (na < 0.25) & valid
    mask, clusters = clean_mask(mask, 60)
    ha = mask.sum() * 100 / 10_000
    print(f"Permian: {clusters} new-pad/road clusters, {ha:.0f} ha cleared")
    im = overlay_img(rgb_a, mask, 1300,
                     f"Reeves County TX (Delaware Basin) · new pad & lease-road clearing "
                     f"{db} → {da} · {clusters} sites")
    common.save_jpeg(im, f"{out_dir}/permian-pads.jpg", quality=85)

    # ---- 2. Houston fringe: vegetated land graded (piling leads) ------------
    b2, a2 = scene_pair(HOUSTON_FRINGE, "2025-06-01T00:00:00Z/2025-09-30T23:59:59Z", max_cloud=15)
    db2, da2 = b2["properties"]["datetime"][:10], a2["properties"]["datetime"][:10]
    print(f"Houston pair: {db2} -> {da2}")
    rgb_b2, _ = read_rgb(b2, HOUSTON_FRINGE)
    rgb_a2, _ = read_rgb(a2, HOUSTON_FRINGE)
    rgb_b2, rgb_a2, h2, w2 = crop_pair(rgb_b2, rgb_a2)
    nb2 = read_ndvi(b2, HOUSTON_FRINGE)[:h2, :w2]
    na2 = read_ndvi(a2, HOUSTON_FRINGE)[:h2, :w2]
    # vegetated land that lost vegetation AND brightened = cleared & graded;
    # SCL cloud/shadow masking on BOTH dates kills popcorn-cloud false alarms
    valid2 = read_valid(b2, HOUSTON_FRINGE, h2, w2) & read_valid(a2, HOUSTON_FRINGE, h2, w2)
    mask2 = (
        (nb2 > 0.35)
        & (na2 < 0.24)
        & (rgb_a2.mean(axis=2) - rgb_b2.mean(axis=2) > 12)
        & valid2
    )
    mask2, clusters2 = clean_mask(mask2, 80)
    ha2 = mask2.sum() * 100 / 10_000
    print(f"Houston fringe: {clusters2} grading sites, {ha2:.0f} ha")
    im2 = overlay_img(rgb_a2, mask2, 1300,
                      f"Fulshear TX (Houston fringe) · land cleared & graded {db2} → {da2} · "
                      f"{clusters2} active sites, ~{ha2:.0f} ha")
    common.save_jpeg(im2, f"{out_dir}/houston-fringe.jpg", quality=85)

    # ---- 3. Ship Channel: port laydown activity, year over year -------------
    b3, a3 = scene_pair(SHIP_CHANNEL, "2025-06-01T00:00:00Z/2025-09-30T23:59:59Z", max_cloud=15)
    db3, da3 = b3["properties"]["datetime"][:10], a3["properties"]["datetime"][:10]
    print(f"Ship channel pair: {db3} -> {da3}")
    rgb_b3, _ = read_rgb(b3, SHIP_CHANNEL)
    rgb_a3, _ = read_rgb(a3, SHIP_CHANNEL)
    rgb_b3, rgb_a3, h3, w3 = crop_pair(rgb_b3, rgb_a3)
    half = 650
    sb = Image.fromarray(rgb_b3.astype(np.uint8)).resize((half, int(h3 * half / w3)))
    sa = Image.fromarray(rgb_a3.astype(np.uint8)).resize((half, int(h3 * half / w3)))
    title_bar(sb, f"Port Houston · Turning Basin · {db3}")
    title_bar(sa, f"Port Houston · Turning Basin · {da3}")
    pair = Image.new("RGB", (half * 2 + 4, sb.height), (8, 10, 16))
    pair.paste(sb, (0, 0))
    pair.paste(sa, (half + 4, 0))
    common.save_jpeg(pair, f"{out_dir}/ship-channel.jpg", quality=86)

    common.write_generated(
        SLUG,
        images=[
            {
                "src": f"/imagery/{SLUG}/permian-pads.jpg",
                "caption": (
                    f"Rig counts, but earlier: {clusters} new well-pad and lease-road sites "
                    f"({ha:.0f} ha) cleared in Reeves County since last summer, detected from "
                    "free 10 m imagery. Pads are cleared before rigs arrive — this signal "
                    "leads the rig count JD Fields already buys."
                ),
                "acquired": f"{db} vs {da}",
                "source": "Sentinel-2 L2A via Earth Search (anonymous)",
            },
            {
                "src": f"/imagery/{SLUG}/houston-fringe.jpg",
                "caption": (
                    f"Piling leads before permits: {clusters2} sites (~{ha2:.0f} ha) went from "
                    "vegetated to cleared-and-graded in one of Houston's fastest-growing "
                    "corridors. Deep-foundation bids follow grading by weeks — the call "
                    "list writes itself."
                ),
                "acquired": f"{db2} vs {da2}",
                "source": "Sentinel-2 L2A via Earth Search (anonymous)",
            },
            {
                "src": f"/imagery/{SLUG}/ship-channel.jpg",
                "caption": (
                    "Supply chain from orbit: the Turning Basin docks a year apart — berth and "
                    "laydown activity is visible at 10 m, shipment-arrival confirmation and "
                    "yard-inventory trends come free; rack-level counts need one ~$300 tasked "
                    "sub-meter shot."
                ),
                "acquired": f"{db3} vs {da3}",
                "source": "Sentinel-2 L2A via Earth Search (anonymous)",
            },
        ],
        stats=[
            {"label": "new Permian pad sites", "value": str(clusters)},
            {"label": "Houston grading sites", "value": f"{clusters2} (~{ha2:.0f} ha)"},
            {"label": "data cost", "value": "$0"},
        ],
    )


if __name__ == "__main__":
    main()
