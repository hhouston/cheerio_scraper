"""POC 1 — Dark Vessel Watch: SAR ship detection over the Singapore Strait.

Streams a ~30x19 km window of the newest Sentinel-1 radar scene (never the
full ~1 GB file), finds bright ship returns against the dark sea with a
robust threshold, and renders annotated imagery for the app.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

import common

SLUG = "dark-vessel"
# Water band of the eastern Singapore Strait anchorage, between Singapore's
# south coast (~1.23 N) and the islands off Batam (~1.12 N).
BBOX = [103.70, 1.125, 104.00, 1.215]
K_SIGMA = 5.0
MIN_AREA_PX = 5
MAX_AREA_PX = 3000
LAND_BLOCK = 64  # px — block size for the auto land/water mask
LAND_MARGIN_DB = 3.0


def find_scene():
    items = common.stac_search(common.PC_STAC, ["sentinel-1-grd"], BBOX, limit=5)
    for item in items:
        if "vv" in item.get("assets", {}):
            return item
    raise SystemExit("no Sentinel-1 GRD scene with a VV asset found")


def water_mask(db: np.ndarray) -> np.ndarray:
    """Auto land/water mask: land blocks have a much brighter median backscatter
    than open sea. Blocks brighter than (sea median + margin) are masked out,
    with one block of dilation to swallow coastlines."""
    h, w = db.shape
    bh, bw = h // LAND_BLOCK + 1, w // LAND_BLOCK + 1
    block_med = np.full((bh, bw), np.nan)
    for i in range(bh):
        for j in range(bw):
            blk = db[i * LAND_BLOCK : (i + 1) * LAND_BLOCK, j * LAND_BLOCK : (j + 1) * LAND_BLOCK]
            finite = blk[np.isfinite(blk)]
            if finite.size:
                block_med[i, j] = np.median(finite)
    sea_level = np.nanmedian(block_med)
    land_blocks = block_med > sea_level + LAND_MARGIN_DB
    land_blocks = ndimage.binary_dilation(land_blocks, iterations=1)
    water = ~np.kron(land_blocks, np.ones((LAND_BLOCK, LAND_BLOCK), dtype=bool))[:h, :w]
    return water & np.isfinite(db)


def detect(db: np.ndarray):
    water = water_mask(db)
    sea = db[water]
    med = float(np.median(sea))
    mad = float(np.median(np.abs(sea - med)))
    thr = med + K_SIGMA * 1.4826 * mad
    mask = water & (db > thr)
    # merge sidelobe cross-arms of the same ship into one component
    mask = ndimage.binary_dilation(mask, iterations=2)
    labels, n = ndimage.label(mask)
    detections = []
    for sl, idx in zip(ndimage.find_objects(labels), range(1, n + 1)):
        area = int((labels[sl] == idx).sum())
        if not MIN_AREA_PX <= area <= MAX_AREA_PX:
            continue
        ys, xs = np.nonzero(labels[sl] == idx)
        peak = float(db[sl][ys, xs].max())
        cy = sl[0].start + float(ys.mean())
        cx = sl[1].start + float(xs.mean())
        # hull size from the bright core only — the dilated sidelobe cross
        # would wildly overestimate vessel length
        core_ys, core_xs = np.nonzero((labels[sl] == idx) & (db[sl] > peak - 12))
        if core_ys.size:
            box_h = int(core_ys.max() - core_ys.min() + 1)
            box_w = int(core_xs.max() - core_xs.min() + 1)
        else:
            box_h = sl[0].stop - sl[0].start
            box_w = sl[1].stop - sl[1].start
        detections.append(
            {"row": cy, "col": cx, "area_px": area, "peak_db": peak, "box": (box_w, box_h)}
        )
    return detections, thr, med, water


def main():
    item = find_scene()
    scene_id = item["id"]
    acquired = item["properties"]["datetime"][:16].replace("T", " ") + " UTC"
    href = common.pc_sign(item["assets"]["vv"]["href"])
    print(f"scene {scene_id} acquired {acquired}")

    data, transform, _crs = common.windowed_read(href, BBOX, max_px=4200)
    db = 20 * np.log10(np.maximum(data[0].astype(np.float64), 1))
    detections, thr, med, water = detect(db)
    pct_water = 100 * water.mean()
    print(
        f"{len(detections)} detections (threshold {thr:.1f} dB over sea median {med:.1f} dB, "
        f"{pct_water:.0f}% of window classed as water)"
    )

    # meters per pixel (EPSG:4326 after the GCP warp; ~equator so cos(lat)~1)
    m_per_px = abs(transform.a) * 111_320
    for d in detections:
        lon, lat = transform * (d["col"], d["row"])
        d["lat"], d["lon"] = round(lat, 5), round(lon, 5)
        d["approx_length_m"] = int(max(d["box"]) * m_per_px)

    out_dir = common.imagery_dir(SLUG)

    # --- scene.jpg: annotated overview -------------------------------------
    stretched = common.percentile_stretch(db)
    full = Image.fromarray(stretched, mode="L").convert("RGB")
    scale = 1400 / full.width
    scene_img = full.resize((1400, int(full.height * scale)), Image.LANCZOS)
    draw = ImageDraw.Draw(scene_img)
    for d in detections:
        x, y = d["col"] * scale, d["row"] * scale
        r = max(8, (max(d["box"]) * scale) / 2 + 4)
        draw.rectangle([x - r, y - r, x + r, y + r], outline=(255, 60, 60), width=2)
    font = ImageFont.load_default(size=22)
    strip_h = 40
    annotated = Image.new("RGB", (scene_img.width, scene_img.height + strip_h), (8, 10, 16))
    annotated.paste(scene_img, (0, strip_h))
    ImageDraw.Draw(annotated).text(
        (12, 9),
        f"Sentinel-1 VV radar · {acquired} · Singapore Strait anchorage · "
        f"{len(detections)} vessels detected",
        fill=(255, 178, 36),
        font=font,
    )
    common.save_jpeg(annotated, f"{out_dir}/scene.jpg", quality=86)

    # --- chips.jpg: top-5 brightest returns --------------------------------
    top = sorted(detections, key=lambda d: d["peak_db"], reverse=True)[:5]
    chips = []
    for d in top:
        r0, c0 = int(d["row"]), int(d["col"])
        r_lo, c_lo = max(0, r0 - 50), max(0, c0 - 50)
        crop = stretched[r_lo : r_lo + 100, c_lo : c_lo + 100]
        chip = Image.fromarray(crop, mode="L").convert("RGB").resize((300, 300), Image.NEAREST)
        d_draw = ImageDraw.Draw(chip)
        d_draw.text(
            (8, 272),
            f"~{d['approx_length_m']} m · {d['peak_db']:.0f} dB",
            fill=(255, 178, 36),
            font=ImageFont.load_default(size=18),
        )
        chips.append(chip)
    row = Image.new("RGB", (300 * len(chips) + 4 * (len(chips) - 1), 300), (8, 10, 16))
    for i, chip in enumerate(chips):
        row.paste(chip, (i * 304, 0))
    common.save_jpeg(row, f"{out_dir}/chips.jpg", quality=88)

    common.write_generated(
        SLUG,
        images=[
            {
                "src": f"/imagery/{SLUG}/scene.jpg",
                "caption": (
                    f"Every red box is a ship: {len(detections)} vessels detected in one radar "
                    "pass over the Singapore Strait anchorage — one of the busiest shipping "
                    "lanes on Earth. Radar sees through cloud and darkness, which is why it is "
                    "the workhorse for finding vessels that switch their transponders off."
                ),
                "acquired": acquired,
                "source": "Sentinel-1 SAR via Microsoft Planetary Computer (anonymous)",
            },
            {
                "src": f"/imagery/{SLUG}/chips.jpg",
                "caption": (
                    "The five strongest radar returns, zoomed in — estimated lengths from the "
                    "detection footprint. Cross-matching these against live AIS transponder "
                    "feeds is what separates honest traffic from dark vessels."
                ),
                "acquired": acquired,
                "source": "Sentinel-1 SAR via Microsoft Planetary Computer (anonymous)",
            },
        ],
        stats=[
            {"label": "vessels detected", "value": str(len(detections))},
            {"label": "scene acquired", "value": acquired},
            {"label": "works at night / through cloud", "value": "yes — radar"},
        ],
    )
    print("scene:", scene_id)


if __name__ == "__main__":
    main()
