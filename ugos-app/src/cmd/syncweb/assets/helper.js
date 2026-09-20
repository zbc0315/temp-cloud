// `*=` rather than `$=`: the packaging step appends a content hash to the URL
// (app.js?v=...) so an upgraded application is never served against a bundle a
// browser cached 30 days ago, and `$=` would stop matching that suffix.
const APP_BASE = (() => {
  const el = document.querySelector('script[src*="app.js"]') || document.currentScript;
  if (el && el.src) return new URL("./", el.src);
  return new URL("./", document.baseURI);
})();

// Resolve an API path against the directory the application is mounted at, so
// the UI works both at the site root and under a gateway sub-path.
function apiUrl(path) {
  return new URL(String(path).replace(/^\//, ""), APP_BASE).toString();
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

