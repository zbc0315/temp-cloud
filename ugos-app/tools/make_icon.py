"""Generate the 256x256 application icon for the Temp Cloud UGOS Pro app.

Design constraints taken from the UGREEN developer docs:
  * 256x256 PNG
  * light/white background
  * square with rounded corners
  * subtle border (0.5px, 8% black)
  * under 100 KiB

The glyph is a cloud with an upload arrow, using the application's own accent
colour (#ba4a2f) so the App Center tile matches the web UI.

Usage:
    python tools/make_icon.py
"""
import pathlib
import sys

try:
    from PIL import Image, ImageDraw
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required: python -m pip install pillow")

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = PROJECT_ROOT / "rootfs_common" / "icon.png"

SIZE = 256
SS = 4                      # supersampling factor for smooth edges
N = SIZE * SS

BG = (244, 241, 234, 255)       # #f4f1ea - the app's light background
ACCENT = (186, 74, 47, 255)     # #ba4a2f - the app's accent colour
BORDER = (0, 0, 0, 20)          # 8% black


def sc(v: float) -> int:
    return int(round(v * SS))


def main() -> None:
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Rounded-square tile.
    d.rounded_rectangle([0, 0, N - 1, N - 1], radius=sc(56), fill=BG)
    d.rounded_rectangle(
        [sc(0.5), sc(0.5), N - 1 - sc(0.5), N - 1 - sc(0.5)],
        radius=sc(56),
        outline=BORDER,
        width=max(1, sc(0.5)),
    )

    # Cloud body: three symmetric lobes over a flat base, centred at x=128.
    cloud = [
        (80, 84, 176, 180),    # main lobe
        (48, 122, 112, 186),   # left lobe
        (144, 122, 208, 186),  # right lobe
    ]
    for box in cloud:
        d.ellipse([sc(box[0]), sc(box[1]), sc(box[2]), sc(box[3])], fill=ACCENT)
    # Flat cloud base so the lobes merge into one silhouette.
    d.rounded_rectangle(
        [sc(48), sc(150), sc(208), sc(186)], radius=sc(18), fill=ACCENT
    )

    # Upload arrow knocked out of the cloud in the tile background colour.
    d.rectangle([sc(118), sc(128), sc(138), sc(178)], fill=BG)
    d.polygon(
        [(sc(96), sc(140)), (sc(160), sc(140)), (sc(128), sc(102))],
        fill=BG,
    )

    icon = img.resize((SIZE, SIZE), Image.LANCZOS)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    icon.save(OUT, "PNG", optimize=True)

    size_bytes = OUT.stat().st_size
    print(f"wrote {OUT.relative_to(PROJECT_ROOT)}")
    print(f"  mode={icon.mode} size={icon.size} bytes={size_bytes} ({size_bytes / 1024:.1f} KiB)")
    if size_bytes > 100 * 1024:
        sys.exit("icon exceeds the documented 100 KiB limit")
    print("  within the documented <100 KiB limit")


if __name__ == "__main__":
    main()
