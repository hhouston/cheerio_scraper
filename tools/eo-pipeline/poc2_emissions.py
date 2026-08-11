"""POC 2 — Emissions Monitor.

Maps tropospheric NO2 from NASA TEMPO — the first geostationary air-quality
instrument, scanning North America hourly in daylight — composited over
true-color basemaps for an industrial corridor and the eastern US.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import common

SLUG = "emissions"
NO2 = ("TEMPO_L3_NO2_Vertical_Column_Troposphere", "GoogleMapsCompatible_Level7", "png")
BASE = ("VIIRS_SNPP_CorrectedReflectance_TrueColor", "GoogleMapsCompatible_Level9", "jpg")
# Yesterday mid-afternoon Eastern time: full-coverage TEMPO scan, peak activity.
# (Houston was tried first but sat under monsoon convection both scans.)
TIMESTAMP = f"{common.utc_yesterday()}T20:00:00Z"
BASE_DATE = common.utc_yesterday()
ALPHA = 0.80


def no2_over_base(lat, lon, z, nx, ny):
    base, _ = common.gibs_mosaic(*BASE, BASE_DATE, lat, lon, z, nx, ny)
    no2, _ = common.gibs_mosaic(*NO2, TIMESTAMP, lat, lon, z, nx, ny)
    n = np.array(no2, dtype=np.float64)
    # The GIBS TEMPO palette runs pale-yellow (low) -> deep red (high); a flat
    # alpha buries the map under yellow. Scale opacity by colormap position
    # (green channel drops as NO2 rises) so only meaningful NO2 shows.
    intensity = np.clip(1.0 - n[..., 1] / 255.0, 0, 1) ** 0.6
    n[..., 3] = np.where(n[..., 3] > 0, intensity * 255, 0)
    # saturate the hot end so plumes glow
    hot = intensity > 0.45
    n[..., 0][hot] = np.minimum(255, n[..., 0][hot] * 1.25)
    overlay = Image.fromarray(n.astype(np.uint8))
    comp = Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB")
    coverage = float((np.array(no2)[..., 3] > 0).mean())
    return comp, coverage


def frame(img, title):
    strip_h = 34
    font = ImageFont.load_default(size=18)
    framed = Image.new("RGB", (img.width, img.height + strip_h), (8, 10, 16))
    framed.paste(img, (0, strip_h))
    d = ImageDraw.Draw(framed)
    d.text((10, 8), title, fill=(255, 178, 36), font=font)
    # simple legend gradient, right-aligned in the strip
    lx = img.width - 190
    for i in range(120):
        # match the general GIBS NO2 palette direction: transparent->yellow->red
        t = i / 119
        color = (int(255 * min(1, 0.4 + t)), int(220 * (1 - t * 0.85)), int(60 * (1 - t)))
        d.line([(lx + i, 12), (lx + i, 24)], fill=color)
    d.text((lx - 32, 8), "low", fill=(200, 205, 215), font=ImageFont.load_default(size=14))
    d.text((lx + 126, 8), "high", fill=(200, 205, 215), font=ImageFont.load_default(size=14))
    return framed


def main():
    out_dir = common.imagery_dir(SLUG)

    northeast, cov_h = no2_over_base(40.9, -74.0, 6, 3, 2)
    print(f"Northeast-corridor NO2 coverage: {cov_h:.0%}")
    img1 = frame(
        northeast.resize((northeast.width * 2, northeast.height * 2), Image.LANCZOS),
        f"TEMPO tropospheric NO2 · New York / I-95 corridor · {TIMESTAMP}",
    )
    common.save_jpeg(img1, f"{out_dir}/no2-northeast.jpg", quality=86)

    east, cov_e = no2_over_base(36.0, -85.0, 5, 4, 3)
    print(f"Eastern US NO2 coverage: {cov_e:.0%}")
    img2 = frame(east, f"TEMPO tropospheric NO2 · eastern United States · {TIMESTAMP}")
    common.save_jpeg(img2, f"{out_dir}/no2-eastern-us.jpg", quality=86)

    common.write_generated(
        SLUG,
        images=[
            {
                "src": f"/imagery/{SLUG}/no2-northeast.jpg",
                "caption": (
                    "Nitrogen dioxide over New York and the I-95 corridor, mid-afternoon: "
                    "NO2 tracks combustion, so highways, power plants and industry light up "
                    "red. TEMPO measures this every daylight hour from geostationary orbit — "
                    "hourly emissions accountability, free."
                ),
                "acquired": TIMESTAMP.replace("T", " ").replace("Z", " UTC"),
                "source": "NASA TEMPO L3 via GIBS (anonymous tiles)",
            },
            {
                "src": f"/imagery/{SLUG}/no2-eastern-us.jpg",
                "caption": (
                    "The same hour across the eastern US: city and industrial NO2 plumes "
                    "resolve individually — the raw material for facility-level emissions "
                    "attribution, the layer sold by climate-intelligence companies."
                ),
                "acquired": TIMESTAMP.replace("T", " ").replace("Z", " UTC"),
                "source": "NASA TEMPO L3 via GIBS (anonymous tiles)",
            },
        ],
        stats=[
            {"label": "instrument", "value": "TEMPO — hourly, geostationary"},
            {"label": "scan shown", "value": TIMESTAMP.replace("T", " ").replace("Z", "Z")},
            {"label": "global fallback", "value": "Sentinel-5P daily (NO2, CH4, CO, SO2)"},
        ],
    )


if __name__ == "__main__":
    main()
