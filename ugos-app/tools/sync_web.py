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

# The UGREEN review rules require a privacy policy to be reachable from inside
# the application and to be surfaced when it is first launched. Temp Cloud
# collects no personal information at all, so this is purely informational: it
# is not a consent gate, and dismissing it never changes how the app behaves.
PRIVACY_MARKUP = '''    <footer class="app-footer" id="app-footer"></footer>
    <div class="privacy-modal" id="privacy-modal" hidden>
      <div class="privacy-modal-box" role="dialog" aria-modal="true"></div>
    </div>

'''

PRIVACY_CSS = '''
/* ---------------------------------------------------------------------------
   Privacy footer and first-launch notice (injected by tools/sync_web.py).
   --------------------------------------------------------------------------- */
.app-footer {
  width: min(1180px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 20px 0 40px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 0.82rem;
  line-height: 1.7;
  text-align: center;
}
.app-footer p { margin: 0.15rem 0; }
.app-footer a { color: var(--accent); }

.privacy-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(20, 18, 15, 0.5);
}
.privacy-modal[hidden] { display: none; }
.privacy-modal-box {
  width: min(30rem, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  padding: 24px 26px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface-strong);
  color: var(--text);
  box-shadow: var(--shadow);
}
.privacy-modal-box h2 { margin: 0 0 10px; font-size: 1.1rem; }
.privacy-modal-box p { margin: 0 0 20px; color: var(--muted); font-size: 0.92rem; line-height: 1.75; }
.privacy-modal-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.privacy-modal-actions .primary {
  display: inline-block;
  margin-top: 0;
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  text-decoration: none;
  font-size: 0.9rem;
}
.privacy-modal-actions .primary:hover { background: var(--accent-strong); }
'''

PRIVACY_JS = '''
// ---------------------------------------------------------------------------
// Privacy footer and first-launch notice (injected by tools/sync_web.py).
//
// The UGREEN review rules require the privacy policy to be reachable from
// within the application and to be surfaced on first launch. Temp Cloud
// collects no personal information, so this notice is informational only: it
// gates nothing, and dismissing it or never opening the policy changes nothing
// about how the application works.
// ---------------------------------------------------------------------------
const PRIVACY_TEXT = {
  zh: {
    footerNote: "本应用不收集任何个人信息",
    footerLink: "隐私政策",
    listCollected: "收集个人信息清单：无",
    listShared: "共享个人信息清单：无",
    listSdk: "第三方 SDK 清单：无",
    title: "隐私说明",
    body:
      "Temp Cloud 完全运行在你的 NAS 本地，不收集任何个人信息，不含账号体系、统计埋点或第三方 SDK，也不向设备外部发送任何数据。你上传的内容只保存在自己的 NAS 上，并会在你设定的时长后自动删除。",
    read: "阅读完整隐私政策",
    close: "我知道了"
  },
  en: {
    footerNote: "No personal information is collected",
    footerLink: "Privacy Policy",
    listCollected: "Personal information collected: none",
    listShared: "Personal information shared: none",
    listSdk: "Third-party SDKs: none",
    title: "Privacy notice",
    body:
      "Temp Cloud runs entirely on your own NAS. It collects no personal information, has no account system, analytics or third-party SDK, and sends no data off the device. Content you upload stays on your NAS and is deleted automatically once the retention period you chose elapses.",
    read: "Read the full privacy policy",
    close: "Got it"
  }
};

const PRIVACY_SEEN_KEY = "temp-cloud-privacy-notice-v1";

function privacyStrings() {
  return PRIVACY_TEXT[state.language] || PRIVACY_TEXT.zh;
}

function renderPrivacyFooter() {
  const strings = privacyStrings();
  const footer = document.getElementById("app-footer");
  if (!footer) return;

  footer.innerHTML = "";

  const note = document.createElement("p");
  note.append(strings.footerNote + " · ");
  const link = document.createElement("a");
  link.href = "privacy.html";
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = strings.footerLink;
  note.append(link);

  const lists = document.createElement("p");
  lists.textContent = [strings.listCollected, strings.listShared, strings.listSdk].join(" · ");

  footer.append(note, lists);
}

function dismissPrivacyNotice() {
  const modal = document.getElementById("privacy-modal");
  if (modal) {
    modal.hidden = true;
    modal.dataset.open = "0";
  }
  try {
    localStorage.setItem(PRIVACY_SEEN_KEY, "1");
  } catch (error) {
    /* Private browsing or storage disabled; the notice simply reappears. */
  }
}

function showPrivacyNotice() {
  const modal = document.getElementById("privacy-modal");
  if (!modal || modal.dataset.open === "1") return;

  const strings = privacyStrings();
  const box = modal.querySelector(".privacy-modal-box");
  if (!box) return;

  box.innerHTML = "";

  const heading = document.createElement("h2");
  heading.textContent = strings.title;

  const body = document.createElement("p");
  body.textContent = strings.body;

  const actions = document.createElement("div");
  actions.className = "privacy-modal-actions";

  const read = document.createElement("a");
  read.className = "primary";
  read.href = "privacy.html";
  read.target = "_blank";
  read.rel = "noopener";
  read.textContent = strings.read;

  const close = document.createElement("button");
  close.type = "button";
  close.className = "ghost-btn";
  close.textContent = strings.close;
  close.addEventListener("click", dismissPrivacyNotice);

  actions.append(read, close);
  box.append(heading, body, actions);

  modal.hidden = false;
  modal.dataset.open = "1";
}

renderPrivacyFooter();

// The language toggle handler is registered earlier in this file, so state.language
// is already updated by the time this listener runs.
if (typeof languageToggle !== "undefined" && languageToggle) {
  languageToggle.addEventListener("click", renderPrivacyFooter);
}

try {
  if (!localStorage.getItem(PRIVACY_SEEN_KEY)) showPrivacyNotice();
} catch (error) {
  showPrivacyNotice();
}
'''


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

    # Footer (always-visible policy link plus the three lists) and the
    # first-launch notice container.
    anchor = '    <script src="app.js"></script>'
    if anchor not in html:
        sys.exit("index.html: script anchor not found")
    html = html.replace(anchor, PRIVACY_MARKUP + anchor, 1)

    path.write_text(html, encoding="utf-8")
    print(f"index.html: relative assets, Google Fonts removed ({before - len(html)} bytes), privacy footer + notice added")


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
    path.write_text(css.replace(old, new) + PRIVACY_CSS, encoding="utf-8")
    print("styles.css: system font stack replaces the remote Manrope webfont; privacy styles appended")


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
    print(f"app.js: {len(REPLACEMENTS)} patch sites applied, API calls resolve against APP_BASE")

    path.write_text(js + PRIVACY_JS, encoding="utf-8")
    print("app.js: privacy footer + first-launch notice appended")


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
