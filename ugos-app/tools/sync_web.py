"""Seed and patch the web UI that ships inside the UGOS application.

The upstream project keeps its frontend in `public/` and serves it from the site
root. A UGOS Pro application is served through the system gateway, so the mount
point is not guaranteed to be the root. This script:

  1. copies `public/*` from the upstream Node.js project into `src/web/`, then
  2. rewrites absolute references (`/app.js`, `/api/...`) to be resolved against
     the directory the application was mounted at, and
  3. makes the Google Fonts stylesheet non-blocking, because a NAS commonly sits
     on a LAN without internet access and a render-blocking remote stylesheet
     would stall the first paint.

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

    html = html.replace('href="/styles.css"', 'href="styles.css"')
    html = html.replace('src="/app.js"', 'src="app.js"')

    html, n = re.subn(
        r'(<link\s+href="https://fonts\.googleapis\.com[^>]*?rel="stylesheet")\s*/>',
        lambda m: m.group(1) + ' media="print" onload="this.media=\'all\'" />',
        html,
        flags=re.S,
    )
    print(f"index.html: relative assets, fonts non-blocking (links patched: {n})")
    path.write_text(html, encoding="utf-8")


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
    leftover = []
    for f in sorted(WEB.iterdir()):
        if f.suffix not in {".js", ".html", ".css"}:
            continue
        text = f.read_text(encoding="utf-8")
        for m in re.finditer(r'(?:href|src)="/[^"]*"|fetch\("/[^"]*"', text):
            leftover.append(f"{f.name}: {m.group(0)}")
    print("leftover absolute references:", leftover or "none")
    if leftover:
        sys.exit("absolute references remain; the UI would break under a sub-path")


def main() -> None:
    seed()
    patch_html()
    patch_js()
    report_leftovers()


if __name__ == "__main__":
    main()
