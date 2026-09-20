"""Seed and patch the web UI that ships inside the UGOS application.

The upstream project keeps its frontend in `public/` and serves it from the site
root. A UGOS Pro application is served through the system gateway, so the mount
point is not guaranteed to be the root. This script:

  1. copies `public/*` from the upstream Node.js project into `src/web/`, then
  2. rewrites absolute references (`/app.js`, `/api/...`) to be resolved against
     the directory the application was mounted at, and
  3. removes the Google Fonts dependency, so the UI makes no third-party request
     and works on a LAN with no internet access (styles.css uses a system stack).

Run it whenever the upstream frontend changes:

    python tools/sync_web.py [path/to/upstream/public]

The upstream frontend defaults to the `public/` directory of the Node.js
project that contains this application directory.
"""
import pathlib
import re
import shutil
import sys

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
WEB = PROJECT_ROOT / "src" / "web"

CANDIDATE_UPSTREAM = [
    PROJECT_ROOT.parent / "public",                        # ugos-app/ inside the repo
    PROJECT_ROOT.parent / "temp-cloud" / "public",         # sibling checkout
]


def locate_upstream() -> pathlib.Path:
    if len(sys.argv) > 1:
        candidate = pathlib.Path(sys.argv[1]).resolve()
        if not candidate.is_dir():
            sys.exit(f"not a directory: {candidate}")
        return candidate
    for candidate in CANDIDATE_UPSTREAM:
        if (candidate / "app.js").is_file():
            return candidate
    sys.exit(
        "upstream frontend not found. Looked in:\n  "
        + "\n  ".join(str(c) for c in CANDIDATE_UPSTREAM)
        + "\nPass the path explicitly: python tools/sync_web.py <path/to/public>"
    )

HELPER = '''const APP_BASE = (() => {
  const el = document.querySelector('script[src$="app.js"]') || document.currentScript;
  if (el && el.src) return new URL("./", el.src);
  return new URL("./", document.baseURI);
})();

// Resolve an API path against the directory the application is mounted at, so
// the UI works both at the site root and under a gateway sub-path.
function apiUrl(path) {
  return new URL(String(path).replace(/^\\//, ""), APP_BASE).toString();
}

// The UGOS gateway fronts applications with nginx, whose http-level
// `client_max_body_size 20m` is not overridden for third-party apps. Bodies
// above that get a 413 HTML page (or a plain 500 from the gateway service),
// neither of which is JSON. The backend itself accepts 100 MB, so large files
// work when the NAS is addressed directly on the backend port.
function uploadErrorMessage(status) {
  if (status !== 413 && status !== 500) {
    return t("saveFailed");
  }
  return state.language === "zh"
    ? "文件超过网关代理上限（约 20 MB）。大文件请改用直连地址：在浏览器打开 NAS 的 21039 端口。"
    : "File exceeds the gateway proxy limit (~20 MB). For large files, open the NAS directly on port 21039 in a browser.";
}

'''

REPLACEMENTS = [
    ('fetch("/api/config")', 'fetch(apiUrl("api/config"))'),
    ('fetch("/api/items/public")', 'fetch(apiUrl("api/items/public"))'),
    ('fetch("/api/items", {', 'fetch(apiUrl("api/items"), {'),
    ('fetch("/api/access", {', 'fetch(apiUrl("api/access"), {'),
    (
        'fetch(`/api/items/${item.id}/content${token ? `?token=${encodeURIComponent(token)}` : ""}`)',
        'fetch(apiUrl(`api/items/${item.id}/content${token ? `?token=${encodeURIComponent(token)}` : ""}`))',
    ),
    (
        'new URL(`/api/files/${item.id}`, window.location.origin)',
        'new URL(`api/files/${item.id}`, APP_BASE)',
    ),
    # Surface gateway rejections with an actionable message instead of the
    # default "save failed".
    (
        'setStatus(formStatus, data.error || t("saveFailed"), true);',
        'setStatus(formStatus, data.error || uploadErrorMessage(res.status), true);',
    ),
]


def seed() -> None:
    upstream = locate_upstream()
    if WEB.exists():
        shutil.rmtree(WEB)
    shutil.copytree(upstream, WEB)
    print(f"seeded {WEB.relative_to(PROJECT_ROOT)} from {upstream}")


def patch_html() -> None:
    path = WEB / "index.html"
    html = path.read_text(encoding="utf-8")
    before = len(html)

    html = html.replace('href="/styles.css"', 'href="styles.css"')
    html = html.replace('src="/app.js"', 'src="app.js"')

    # Drop the Google Fonts dependency entirely.
    #
    # The upstream project loads the Manrope webfont from Google. A NAS
    # application is expected to run on a LAN that may have no internet access
    # at all, and a tool whose whole point is keeping data on the local network
    # should not make a third-party request (DNS, TLS, CSS, then font files) on
    # every page load. styles.css falls back to a system font stack instead.
    html = re.sub(
        r'[ \t]*<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>[ \t]*\r?\n?',
        "",
        html,
    )

    path.write_text(html, encoding="utf-8")
    print(f"index.html: relative assets, Google Fonts links removed ({before - len(html)} bytes)")


def patch_css() -> None:
    path = WEB / "styles.css"
    css = path.read_text(encoding="utf-8")

    old = 'font-family: "Manrope", sans-serif;'
    if old not in css:
        sys.exit("styles.css: Manrope font-family declaration not found")

    # A system stack that keeps the geometric-sans look on every platform, and
    # covers the CJK glyphs the bilingual UI needs (the UI ships zh + en).
    new = (
        "font-family: system-ui, -apple-system, \"Segoe UI\", Roboto,\n"
        "    \"Helvetica Neue\", Arial, \"PingFang SC\", \"Hiragino Sans GB\",\n"
        "    \"Microsoft YaHei\", \"Noto Sans CJK SC\", sans-serif;"
    )
    path.write_text(css.replace(old, new), encoding="utf-8")
    print("styles.css: system font stack replaces the remote Manrope webfont")


def patch_js() -> None:
    path = WEB / "app.js"
    js = path.read_text(encoding="utf-8")

    marker = "const state = {"
    if marker not in js:
        sys.exit("app.js: insertion marker not found")
    js = js.replace(marker, HELPER + marker, 1)

    for old, new in REPLACEMENTS:
        count = js.count(old)
        if count == 0:
            sys.exit(f"app.js: pattern not found: {old!r}")
        js = js.replace(old, new)
    print(f"app.js: {len(REPLACEMENTS)} API call sites now resolve against APP_BASE")

    path.write_text(js, encoding="utf-8")


def report_leftovers() -> None:
    leftovers = []
    for f in sorted(WEB.iterdir()):
        if f.suffix not in {".js", ".html", ".css"}:
            continue
        text = f.read_text(encoding="utf-8")
        for m in re.finditer(r'(?:href|src)="/[^"]*"|fetch\("/[^"]*"', text):
            leftovers.append(f"{f.name}: absolute reference {m.group(0)}")
        for m in re.finditer(r'https?://[^"\')\s]+', text):
            if "fonts.googleapis.com" in m.group(0) or "fonts.gstatic.com" in m.group(0):
                leftovers.append(f"{f.name}: remote font {m.group(0)}")
    print("problems found:", leftovers or "none")
    if leftovers:
        sys.exit(
            "the UI still has absolute references or third-party font requests:\n  "
            + "\n  ".join(leftovers)
        )


def main() -> None:
    seed()
    patch_html()
    patch_css()
    patch_js()
    report_leftovers()


if __name__ == "__main__":
    main()
