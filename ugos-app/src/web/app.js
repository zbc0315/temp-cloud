const messages = {
  zh: {
    brandStatus: "到期自动清理",
    themeToDark: "深色",
    themeToLight: "浅色",

    composerTitle: "粘贴、拖入，或点按添加内容",
    composerHint: "文本 · 图片 · 文件，都放在这里",
    composerPlaceholder: "也可以直接在这里输入或粘贴文字…",
    composerLabel: "要中转的内容",
    toolFile: "选择文件",
    toolScreenshot: "截图",

    fieldTitle: "标题",
    fieldPassword: "临时密码",
    fieldExpire: "保存时间",
    placeholderTitle: "可选，例如：设计稿、验证码",
    placeholderPassword: "留空即无密码",
    save: "保存",
    saving: "正在保存…",
    saveSuccess: "已保存，可在下方列表中取用",
    saveSuccessProtected: "已保存，输入临时密码即可查看",
    saveFailed: "保存失败",
    emptyComposer: "请先输入文字，或添加一个文件、一张图片",
    bothKinds: "一次只能保存一种内容：请移除附件，或清空上面的文字",
    hourUnit: "{count} 小时",

    attachImage: "图片",
    attachFile: "文件",
    attachJustNow: "刚刚添加",
    attachRemove: "移除",
    clipboardImageName: "剪贴板图片",
    screenshotPrefix: "屏幕截图",
    screenshotFailed: "截图失败",
    screenshotCancelled: "已取消截图",
    screenshotNeedsSecure:
      "当前是 HTTP 访问，浏览器不允许网页截图。按 Win+Shift+S 截图，然后在这里按 Ctrl+V 粘贴即可。",
    screenshotUnsupported: "当前浏览器不支持网页截图，请用系统截图后粘贴。",

    protectedSectionTitle: "密码内容",
    protectedCaptionDefault: "输入密码后显示",
    protectedCaptionCount: "当前显示该密码下的 {count} 项内容",
    lookupLabel: "临时密码",
    placeholderLookupPassword: "输入密码查看对应内容",
    view: "查看",
    enterPassword: "请输入密码",
    lookingUp: "正在查询…",
    lookupFailed: "查询失败",
    noMatch: "没有匹配内容",
    lookupSuccess: "查询成功",

    publicSectionTitle: "无密码内容",
    refresh: "刷新",
    empty: "暂无内容",
    loadFailed: "加载失败",
    initFailed: "初始化失败",
    readFailed: "读取内容失败",
    imagePreviewFailed: "图片加载失败",

    itemKindText: "文本",
    itemKindImage: "图片",
    itemKindFile: "文件",
    itemUntitled: "未命名内容",
    itemExpire: "到期 {time}",
    itemCreated: "创建 {time}",

    copyText: "复制",
    copyImage: "复制图片",
    downloadFile: "下载",
    downloadImage: "下载",
    copiedText: "已复制到剪贴板",
    copiedImage: "已复制图片到剪贴板",
    unsupportedCopy: "当前浏览器不支持自动复制，请手动复制",
    unsupportedImageCopy: "当前浏览器不支持直接复制图片，请改用下载"
  },
  en: {
    brandStatus: "Expires automatically",
    themeToDark: "Dark",
    themeToLight: "Light",

    composerTitle: "Paste, drop, or tap to add",
    composerHint: "Text, images and files all go here",
    composerPlaceholder: "Or just type and paste text right here…",
    composerLabel: "Content to transfer",
    toolFile: "Choose file",
    toolScreenshot: "Screenshot",

    fieldTitle: "Title",
    fieldPassword: "Temporary password",
    fieldExpire: "Retention",
    placeholderTitle: "Optional, e.g. design draft or code",
    placeholderPassword: "Leave empty for public mode",
    save: "Save",
    saving: "Saving…",
    saveSuccess: "Saved — pick it up from the list below",
    saveSuccessProtected: "Saved — enter the temporary password to view it",
    saveFailed: "Save failed",
    emptyComposer: "Type something, or add a file or an image first",
    bothKinds: "One item at a time: remove the attachment, or clear the text above",
    hourUnit: "{count} hour(s)",

    attachImage: "Image",
    attachFile: "File",
    attachJustNow: "just added",
    attachRemove: "Remove",
    clipboardImageName: "Clipboard image",
    screenshotPrefix: "Screenshot",
    screenshotFailed: "Screenshot failed",
    screenshotCancelled: "Screenshot cancelled",
    screenshotNeedsSecure:
      "This page is served over HTTP, so the browser will not let a web page capture the screen. Press Win+Shift+S, then paste here with Ctrl+V.",
    screenshotUnsupported:
      "This browser cannot capture the screen. Take a system screenshot and paste it here.",

    protectedSectionTitle: "Protected content",
    protectedCaptionDefault: "Shown after password lookup",
    protectedCaptionCount: "{count} item(s) matched this password",
    lookupLabel: "Temporary password",
    placeholderLookupPassword: "Enter password to view matched content",
    view: "View",
    enterPassword: "Please enter a password",
    lookingUp: "Looking up…",
    lookupFailed: "Lookup failed",
    noMatch: "No matched content",
    lookupSuccess: "Lookup succeeded",

    publicSectionTitle: "Public content",
    refresh: "Refresh",
    empty: "Nothing here yet",
    loadFailed: "Load failed",
    initFailed: "Initialization failed",
    readFailed: "Failed to read content",
    imagePreviewFailed: "Failed to load the image",

    itemKindText: "Text",
    itemKindImage: "Image",
    itemKindFile: "File",
    itemUntitled: "Untitled",
    itemExpire: "Expires {time}",
    itemCreated: "Created {time}",

    copyText: "Copy",
    copyImage: "Copy image",
    downloadFile: "Download",
    downloadImage: "Download",
    copiedText: "Copied to clipboard",
    copiedImage: "Image copied to clipboard",
    unsupportedCopy: "This browser cannot copy automatically. Please copy manually.",
    unsupportedImageCopy: "This browser cannot copy images directly. Please download it instead."
  }
};

// Storage can throw outright when the browser has it disabled. Preferences are
// a convenience, not a requirement, so a failure falls back to the default
// rather than taking the whole page down before it renders.
function stored(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (error) {
    return fallback;
  }
}

function persist(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    /* The preference is simply not remembered. */
  }
}

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

const state = {
  language: stored("temp-cloud-language", "zh"),
  theme: stored("temp-cloud-theme", "") || defaultTheme(),
  attachment: null,
  saving: false
};

const composer = document.getElementById("composer");
const composerInput = document.getElementById("composer-input");
const attachmentList = document.getElementById("attachment-list");
const fileInput = document.getElementById("file-input");
const pickFileButton = document.getElementById("pick-file");
const screenshotButton = document.getElementById("screenshot");
const titleInput = document.getElementById("title-input");
const passwordInput = document.getElementById("password-input");
const expiresHoursSelect = document.getElementById("expires-hours");
const saveButton = document.getElementById("save");
const formStatus = document.getElementById("composer-status");
const passwordForm = document.getElementById("password-form");
const passwordStatus = document.getElementById("password-status");
const protectedSection = document.getElementById("protected-section");
const protectedList = document.getElementById("protected-list");
const protectedCaption = document.getElementById("protected-caption");
const publicList = document.getElementById("public-list");
const itemTemplate = document.getElementById("item-template");
const languageToggle = document.getElementById("language-toggle");
const themeToggle = document.getElementById("theme-toggle");

function t(key, vars = {}) {
  const dict = messages[state.language] || messages.zh;
  let value = dict[key] || key;
  for (const [name, replacement] of Object.entries(vars)) {
    value = value.replace(`{${name}}`, replacement);
  }
  return value;
}

// Follow the system when the user has never made an explicit choice, which is
// what an Apple-style interface is expected to do.
function defaultTheme() {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch (error) {
    return "light";
  }
}

// tone: true/"error" marks a failure, "ok" marks a success, anything else is a
// neutral progress message.
function setStatus(el, message, tone = "") {
  el.textContent = message || "";
  el.classList.toggle("is-error", tone === true || tone === "error");
  el.classList.toggle("is-ok", tone === "ok");
}

// The UGOS gateway answers an oversized upload with an HTML 413 page and some
// failures with a plain-text 500, so a body that is not JSON is a normal
// outcome here, not an exceptional one. Without this the user would be shown a
// raw "Unexpected token '<'" parser message instead of something actionable.
async function readJSON(res) {
  try {
    return await res.json();
  } catch (error) {
    return null;
  }
}

function toast(message) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => el.classList.remove("show"), 2200);
}

function updateTheme() {
  document.body.dataset.theme = state.theme;
  themeToggle.textContent = state.theme === "light" ? t("themeToDark") : t("themeToLight");
}

function applyI18n() {
  document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
  languageToggle.textContent = state.language === "zh" ? "EN" : "中文";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  });
  updateTheme();
  renderAttachment();
}

function formatTime(value) {
  return new Intl.DateTimeFormat(state.language === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatSize(size = 0) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function firstLine(text, max = 48) {
  const line = String(text).split(/\r?\n/).find((part) => part.trim()) || "";
  const trimmed = line.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function fileDownloadUrl(item, token) {
  const url = new URL(`api/files/${item.id}`, APP_BASE);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

async function loadConfig() {
  const res = await fetch(apiUrl("api/config"));
  const data = await readJSON(res);
  if (!res.ok || !data) throw new Error(t("initFailed"));
  const previous = expiresHoursSelect.value;
  expiresHoursSelect.innerHTML = "";
  for (let i = 1; i <= data.maxExpireHours; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = t("hourUnit", { count: i });
    if (String(i) === previous || (!previous && i === data.defaultExpireHours)) {
      option.selected = true;
    }
    expiresHoursSelect.appendChild(option);
  }
}

/* --- the composer's single attachment ------------------------------------
   Text, an image and a file are all "content", but the backend stores exactly
   one payload per item, so the box holds at most one attachment. Kind is
   inferred from the file itself: no tabs, no type picker. */

function attachmentKind(file) {
  return (file.type || "").startsWith("image/") ? "image" : "file";
}

function setAttachment(file) {
  clearAttachment();
  if (!file) return;

  const isImage = attachmentKind(file) === "image";
  state.attachment = {
    file,
    isImage,
    name: file.name || t("clipboardImageName"),
    size: file.size || 0,
    url: isImage ? URL.createObjectURL(file) : ""
  };
  renderAttachment();
}

function clearAttachment() {
  if (state.attachment?.url) URL.revokeObjectURL(state.attachment.url);
  state.attachment = null;
  renderAttachment();
}

// Built with createElement rather than innerHTML: the file name comes from the
// user and must never be parsed as markup.
function renderAttachment() {
  attachmentList.innerHTML = "";
  const item = state.attachment;
  if (!item) return;

  const row = document.createElement("div");
  row.className = "attached";

  if (item.isImage) {
    const thumb = document.createElement("img");
    thumb.className = "attached-thumb";
    thumb.src = item.url;
    thumb.alt = "";
    row.appendChild(thumb);
  } else {
    const badge = document.createElement("span");
    badge.className = "attached-badge";
    badge.textContent = t("attachFile");
    row.appendChild(badge);
  }

  const main = document.createElement("div");
  main.className = "attached-main";

  const name = document.createElement("p");
  name.className = "attached-name";
  name.textContent = item.name;

  const meta = document.createElement("p");
  meta.className = "attached-meta";
  meta.textContent = [
    item.isImage ? t("attachImage") : t("attachFile"),
    formatSize(item.size),
    t("attachJustNow")
  ]
    .filter(Boolean)
    .join(" · ");

  main.append(name, meta);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "attached-x";
  remove.setAttribute("aria-label", t("attachRemove"));
  remove.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  remove.addEventListener("click", () => {
    clearAttachment();
    composerInput.focus();
  });

  row.append(main, remove);
  attachmentList.appendChild(row);
}

/* --- getting content in: paste, drop, picker, screenshot ------------------ */

// Paste works anywhere on the page, not only while the textarea has focus, so
// "copy on one device, paste here" needs no aiming.
window.addEventListener("paste", (event) => {
  const items = Array.from(event.clipboardData?.items || []);
  const fileItem = items.find((entry) => entry.kind === "file");
  if (fileItem) {
    const file = fileItem.getAsFile();
    if (file) {
      event.preventDefault();
      setAttachment(file);
      setStatus(formStatus, "");
      return;
    }
  }

  if (event.target === composerInput) return;
  const text = event.clipboardData?.getData("text/plain");
  if (!text) return;
  event.preventDefault();
  composerInput.value = composerInput.value ? `${composerInput.value}\n${text}` : text;
  composerInput.focus();
});

function firstFile(list) {
  return Array.from(list || []).find((file) => file && file.size >= 0) || null;
}

composer.addEventListener("dragenter", (event) => {
  event.preventDefault();
  composer.classList.add("is-over");
});
composer.addEventListener("dragover", (event) => {
  event.preventDefault();
  composer.classList.add("is-over");
});
composer.addEventListener("dragleave", (event) => {
  if (composer.contains(event.relatedTarget)) return;
  composer.classList.remove("is-over");
});
composer.addEventListener("drop", (event) => {
  event.preventDefault();
  composer.classList.remove("is-over");
  const file = firstFile(event.dataTransfer?.files);
  if (file) {
    setAttachment(file);
    setStatus(formStatus, "");
  }
});

// A drop anywhere else would make the browser navigate away and lose whatever
// has already been typed, so the default is suppressed document-wide.
["dragover", "drop"].forEach((name) => {
  document.addEventListener(name, (event) => {
    if (composer.contains(event.target)) return;
    event.preventDefault();
  });
});

pickFileButton.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  fileInput.value = "";
  if (!file) return;
  setAttachment(file);
  setStatus(formStatus, "");
});

function screenshotName() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const stamp =
    [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join("-") +
    ` ${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
  return `${t("screenshotPrefix")} ${stamp}.png`;
}

// Screen capture needs a secure context. Over plain HTTP the browser does not
// expose getDisplayMedia at all, so that case is reported as a hint rather than
// as a failure - Win+Shift+S followed by a paste still gets the image in.
async function captureScreen() {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0";
  video.srcObject = stream;
  document.body.appendChild(video);

  try {
    await new Promise((resolve, reject) => {
      video.addEventListener("loadedmetadata", resolve, { once: true });
      video.addEventListener("error", () => reject(new Error(t("screenshotFailed"))), {
        once: true
      });
    });
    await video.play();

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error(t("screenshotFailed"));
    return new File([blob], screenshotName(), { type: "image/png" });
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    video.remove();
  }
}

screenshotButton.addEventListener("click", async () => {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    // A coarse pointer means a phone or tablet, where the system screenshot
    // flow is the only one available.
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    setStatus(
      formStatus,
      window.isSecureContext || coarse ? t("screenshotUnsupported") : t("screenshotNeedsSecure"),
      true
    );
    composerInput.focus();
    return;
  }

  screenshotButton.disabled = true;
  setStatus(formStatus, "");
  try {
    const file = await captureScreen();
    setAttachment(file);
  } catch (error) {
    const cancelled = error?.name === "NotAllowedError" || error?.name === "AbortError";
    setStatus(
      formStatus,
      cancelled ? t("screenshotCancelled") : error.message || t("screenshotFailed"),
      !cancelled
    );
  } finally {
    screenshotButton.disabled = false;
  }
});

/* --- saving --------------------------------------------------------------- */

async function saveComposer() {
  if (state.saving) return;

  const text = composerInput.value;
  const hasText = text.trim() !== "";
  const attachment = state.attachment;

  if (attachment && hasText) {
    setStatus(formStatus, t("bothKinds"), true);
    return;
  }
  if (!attachment && !hasText) {
    setStatus(formStatus, t("emptyComposer"), true);
    composerInput.focus();
    return;
  }

  const formData = new FormData();
  formData.set("title", titleInput.value);
  formData.set("password", passwordInput.value);
  formData.set("expiresHours", expiresHoursSelect.value || "1");

  if (attachment) {
    formData.set("kind", attachment.isImage ? "image" : "file");
    formData.set("file", attachment.file, attachment.name);
  } else {
    formData.set("kind", "text");
    formData.set("text", text);
  }

  const hadPassword = passwordInput.value.trim() !== "";

  state.saving = true;
  saveButton.disabled = true;
  setStatus(formStatus, t("saving"));

  try {
    const res = await fetch(apiUrl("api/items"), {
      method: "POST",
      body: formData
    });
    const data = (await readJSON(res)) || {};
    if (!res.ok) {
      setStatus(formStatus, data.error || uploadErrorMessage(res.status), true);
      return;
    }

    composerInput.value = "";
    titleInput.value = "";
    passwordInput.value = "";
    clearAttachment();
    setStatus(formStatus, hadPassword ? t("saveSuccessProtected") : t("saveSuccess"), "ok");
    // The item is already stored, so a failure to reload the list must not be
    // reported as a failed save.
    try {
      await refreshPublicItems();
    } catch (error) {
      /* Keep the success message. */
    }
  } catch (error) {
    setStatus(formStatus, error.message || t("saveFailed"), true);
  } finally {
    state.saving = false;
    saveButton.disabled = false;
  }
}

saveButton.addEventListener("click", saveComposer);

composerInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    saveComposer();
  }
});

/* --- reading -------------------------------------------------------------- */

function renderEmpty(container, text) {
  container.innerHTML = "";
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = text;
  container.appendChild(empty);
}

function setProtectedSectionVisible(visible) {
  protectedSection.classList.toggle("hidden", !visible);
}

function createActionButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "row-action";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function copyTextLegacy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const success = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (!success) throw new Error(t("unsupportedCopy"));
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  copyTextLegacy(text);
}

async function copyImage(dataUrl) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error(t("unsupportedImageCopy"));
  }
  const blob = await (await fetch(dataUrl)).blob();
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}

async function fetchContent(item, token) {
  const res = await fetch(apiUrl(`api/items/${item.id}/content${token ? `?token=${encodeURIComponent(token)}` : ""}`));
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || t("readFailed"));
  }
  return res.json();
}

function kindLabel(kind) {
  if (kind === "text") return t("itemKindText");
  if (kind === "image") return t("itemKindImage");
  return t("itemKindFile");
}

// A text item usually has no title. Its own first line is a far better label
// than the placeholder "Untitled", and the full text is one copy away.
function itemTitle(item) {
  if (item.title) return item.title;
  if (item.kind === "text" && item.text) return firstLine(item.text) || t("itemUntitled");
  return item.originalName || t("itemUntitled");
}

function renderItems(container, items, token = "") {
  if (!items.length) {
    renderEmpty(container, t("empty"));
    return;
  }

  container.innerHTML = "";

  items.forEach((item) => {
    const node = itemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".row-kind").textContent = kindLabel(item.kind);
    node.querySelector(".row-title").textContent = itemTitle(item);
    node.querySelector(".row-expire").textContent = t("itemExpire", {
      time: formatTime(item.expiresAt)
    });
    node.querySelector(".row-meta").textContent = [
      item.size ? formatSize(item.size) : "",
      t("itemCreated", { time: formatTime(item.createdAt) })
    ]
      .filter(Boolean)
      .join(" · ");

    const actions = node.querySelector(".row-actions");

    if (item.kind === "text") {
      actions.appendChild(
        createActionButton(t("copyText"), async () => {
          try {
            const content = await fetchContent(item, token);
            await copyText(content.text);
            toast(t("copiedText"));
          } catch (error) {
            toast(error.message);
          }
        })
      );
    }

    if (item.kind === "image") {
      const download = document.createElement("a");
      download.className = "row-action";
      download.href = fileDownloadUrl(item, token);
      download.textContent = t("downloadImage");
      download.download = item.originalName || "image";
      actions.appendChild(download);
      actions.appendChild(
        createActionButton(t("copyImage"), async () => {
          try {
            const content = await fetchContent(item, token);
            await copyImage(content.dataUrl);
            toast(t("copiedImage"));
          } catch (error) {
            toast(error.message);
          }
        })
      );
    }

    if (item.kind === "file") {
      const download = document.createElement("a");
      download.className = "row-action";
      download.href = fileDownloadUrl(item, token);
      download.textContent = t("downloadFile");
      download.download = item.originalName || "file";
      actions.appendChild(download);
    }

    container.appendChild(node);
  });
}

async function refreshPublicItems() {
  const res = await fetch(apiUrl("api/items/public"));
  const data = await readJSON(res);
  if (!res.ok || !data) throw new Error(t("loadFailed"));
  renderItems(publicList, data.items || []);
}

/* --- password lookup ------------------------------------------------------ */

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = new FormData(passwordForm).get("password")?.toString() || "";
  if (!password) {
    setProtectedSectionVisible(false);
    renderEmpty(protectedList, t("empty"));
    protectedCaption.textContent = t("protectedCaptionDefault");
    setStatus(passwordStatus, t("enterPassword"), true);
    return;
  }

  setStatus(passwordStatus, t("lookingUp"));
  const res = await fetch(apiUrl("api/access"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
  const data = (await readJSON(res)) || {};
  if (!res.ok) {
    setProtectedSectionVisible(false);
    renderEmpty(protectedList, t("empty"));
    protectedCaption.textContent = t("protectedCaptionDefault");
    setStatus(passwordStatus, data.error || t("lookupFailed"), true);
    return;
  }

  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) {
    setProtectedSectionVisible(false);
    renderEmpty(protectedList, t("empty"));
    protectedCaption.textContent = t("protectedCaptionDefault");
    setStatus(passwordStatus, t("noMatch"), true);
    return;
  }

  setProtectedSectionVisible(true);
  protectedCaption.textContent = t("protectedCaptionCount", { count: items.length });
  renderItems(protectedList, items, data.token);
  setStatus(passwordStatus, t("lookupSuccess"), "ok");
});

/* --- the colour field: Conway's Game of Life ------------------------------
   The background is a real Game of Life running on a board 48 cells wide,
   painted into a small canvas and stretched over the viewport. Four decisions
   make it work as a backdrop rather than as a toy:

   1. The field is drawn from heat, not from life. A live cell sets its cell to
      full heat and a dead one loses a fixed amount each generation, so what
      reaches the screen is a trail rather than the pattern itself. This matters
      more than it sounds: Life settles at three to six percent alive, and at
      that density a blurred board is a spray of unrelated dots. Trails join
      them up, a glider draws a comet, an oscillator breathes in place, and the
      slow drift of structure across the board becomes something you can
      actually see. The rule underneath is untouched - B3/S23, exactly.

   2. Heat picks the shade. A cell that was alive this generation takes the
      deepest blue and one that has been cold for a while takes the palest, so
      the range of blues is the age of the pattern made visible. One flat colour
      would just be a blue wash.

   3. The board starts sparse and is never allowed to empty. Life on a finite
      board runs down, and an empty board is a flat background, so the
      population is topped up whenever it falls below a floor. Only the seeding
      is an addition; the rule stays pure.

   4. Nothing is animated per frame. Generations advance on a timer and the
      canvas is repainted once per generation.

   Softening is the stylesheet's job, not this code's. `ctx.filter` is not used
   anywhere here: applied to a magnified drawImage its radius is not honoured in
   the units it appears to be, and a field that measures perfectly on the canvas
   arrives on screen as faint noise. A CSS blur on the element has an
   unambiguous radius in CSS pixels and scales with the viewport the same way
   the cells do.

   Text contrast is bounded by a single number: the canvas element's opacity in
   the stylesheet. No cell can be more opaque than the ramp colours themselves,
   so the worst the field can do to a panel is one known colour at one known
   alpha. Blur only redistributes that; it cannot raise the maximum. */

function startColourField() {
  const canvas = document.getElementById("colour-field");
  if (!canvas || typeof canvas.getContext !== "function") return;

  const view = canvas.getContext("2d");
  if (!view) return;

  const sim = document.createElement("canvas");
  const simCtx = sim.getContext("2d");
  if (!simCtx) return;

  // Heat decides the shade, deepest first. The two themes need different blues
  // rather than different opacities: light mode needs shades dark enough to
  // read against a pale page, dark mode needs shades light enough to read
  // against a near-black one.
  const RAMPS = {
    light: [[0x12, 0x47, 0x9f], [0x21, 0x66, 0xd6], [0x3f, 0x86, 0xe8],
            [0x6a, 0xa9, 0xf5], [0x9c, 0xcb, 0xff]],
    dark: [[0x2f, 0x66, 0xb8], [0x3f, 0x86, 0xe8], [0x5a, 0xa0, 0xf0],
           [0x86, 0xc4, 0xff], [0xb3, 0xdc, 0xff]]
  };

  const COLS = 48;
  const CELL_PX = 6;           // canvas pixels per cell, before the CSS upscale
  const STEP_MS = 520;         // one generation
  const SEED_DENSITY = 0.30;
  const MIN_POPULATION = 0.09;
  // How much heat a dead cell loses per generation, out of 255. At 16 a trail
  // lasts about sixteen generations, which at this step rate is roughly eight
  // seconds - long enough to read as a path, short enough that the field keeps
  // moving.
  const COOLING = 16;
  const OPENING_STEPS = 10;    // so the page opens on structure, not a flat seed
  const SETTLE_STEPS = 16;     // used to compose the reduced-motion still

  let cols = COLS;
  let rows = 0;
  let cells = null;
  let scratch = null;
  let heat = null;
  let image = null;

  const at = (x, y) => y * cols + x;

  function ramp() {
    return document.body.dataset.theme === "dark" ? RAMPS.dark : RAMPS.light;
  }

  function resize() {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    const wanted = Math.max(12, Math.round((cols * height) / width));
    if (wanted === rows) return;

    const before = cells;
    const beforeRows = rows;

    rows = wanted;
    cells = new Uint8Array(cols * rows);
    scratch = new Uint8Array(cols * rows);
    heat = new Uint8Array(cols * rows);

    // Keep whatever was on screen; only a change of aspect needs a different
    // number of rows.
    if (before) {
      const shared = Math.min(beforeRows, rows);
      for (let y = 0; y < shared; y += 1) {
        for (let x = 0; x < cols; x += 1) cells[at(x, y)] = before[at(x, y)];
      }
    }

    sim.width = cols;
    sim.height = rows;
    image = simCtx.createImageData(cols, rows);

    canvas.width = cols * CELL_PX;
    canvas.height = rows * CELL_PX;
    view.imageSmoothingEnabled = true;
  }

  function seed(density) {
    for (let i = 0; i < cells.length; i += 1) {
      const alive = Math.random() < density ? 1 : 0;
      cells[i] = alive;
      heat[i] = alive ? 255 : 0;
    }
  }

  // Standard B3/S23 on a torus: a dead cell with exactly three live neighbours
  // is born, a live cell with two or three survives, everything else dies.
  function step() {
    for (let y = 0; y < rows; y += 1) {
      const up = (y - 1 + rows) % rows;
      const down = (y + 1) % rows;
      for (let x = 0; x < cols; x += 1) {
        const left = (x - 1 + cols) % cols;
        const right = (x + 1) % cols;
        const neighbours =
          cells[at(left, up)] + cells[at(x, up)] + cells[at(right, up)] +
          cells[at(left, y)] + cells[at(right, y)] +
          cells[at(left, down)] + cells[at(x, down)] + cells[at(right, down)];
        const alive = cells[at(x, y)];
        scratch[at(x, y)] = neighbours === 3 || (alive === 1 && neighbours === 2) ? 1 : 0;
      }
    }

    const spent = cells;
    cells = scratch;
    scratch = spent;

    let population = 0;
    for (let i = 0; i < cells.length; i += 1) {
      if (cells[i]) {
        heat[i] = 255;
        population += 1;
      } else if (heat[i] > 0) {
        heat[i] = heat[i] > COOLING ? heat[i] - COOLING : 0;
      }
    }

    // An empty board is a flat background, so a run-down population is topped
    // up. Seeding a few small patches rather than uniformly gives the new
    // growth something to spread out from.
    if (population < cells.length * MIN_POPULATION) {
      for (let patch = 0; patch < 5; patch += 1) {
        const cx = Math.floor(Math.random() * cols);
        const cy = Math.floor(Math.random() * rows);
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const x = (cx + dx + cols) % cols;
            const y = (cy + dy + rows) % rows;
            cells[at(x, y)] = Math.random() < 0.5 ? 1 : 0;
            heat[at(x, y)] = 255;
          }
        }
      }
    }
  }

  function draw() {
    const shades = ramp();
    const data = image.data;

    for (let i = 0; i < cells.length; i += 1) {
      const offset = i * 4;
      const value = heat[i];
      if (value === 0) {
        data[offset + 3] = 0;
        continue;
      }
      // Five heat bands, hottest at the deep end. Alpha follows the heat too,
      // so a cold trail fades out instead of ending in a hard edge.
      const band = value > 200 ? 0 : value > 140 ? 1 : value > 80 ? 2 : value > 30 ? 3 : 4;
      const rgb = shades[band];
      data[offset] = rgb[0];
      data[offset + 1] = rgb[1];
      data[offset + 2] = rgb[2];
      data[offset + 3] = value;
    }

    simCtx.putImageData(image, 0, 0);

    view.clearRect(0, 0, canvas.width, canvas.height);
    view.drawImage(sim, 0, 0, cols, rows, 0, 0, canvas.width, canvas.height);
  }

  function settle(steps) {
    seed(SEED_DENSITY);
    for (let i = 0; i < steps; i += 1) step();
    draw();
  }

  let timer = 0;
  let stepped = 0;

  function tick(now) {
    timer = window.requestAnimationFrame(tick);
    if (!stepped) {
      stepped = now;
      return;
    }
    if (now - stepped < STEP_MS) return;
    stepped = now;
    step();
    draw();
  }

  function start() {
    if (timer) return;
    stepped = 0;
    timer = window.requestAnimationFrame(tick);
  }

  function stop() {
    window.cancelAnimationFrame(timer);
    timer = 0;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  window.addEventListener("resize", () => {
    resize();
    draw();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (!reducedMotion.matches) start();
  });

  if (reducedMotion.addEventListener) {
    reducedMotion.addEventListener("change", () => {
      if (reducedMotion.matches) {
        stop();
        settle(SETTLE_STEPS);
      } else {
        start();
      }
    });
  }

  // Repaint on a theme change so the ramp follows the theme even while the
  // simulation is paused.
  if (typeof MutationObserver === "function") {
    new MutationObserver(draw).observe(document.body, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });
  }

  resize();
  if (reducedMotion.matches) {
    settle(SETTLE_STEPS);
  } else {
    settle(OPENING_STEPS);
    start();
  }
}

/* --- chrome --------------------------------------------------------------- */

document.getElementById("refresh-public").addEventListener("click", () => {
  refreshPublicItems().catch((error) => {
    renderEmpty(publicList, error.message || t("loadFailed"));
  });
});

languageToggle.addEventListener("click", async () => {
  state.language = state.language === "zh" ? "en" : "zh";
  persist("temp-cloud-language", state.language);
  applyI18n();
  setProtectedSectionVisible(false);
  renderEmpty(protectedList, t("empty"));
  protectedCaption.textContent = t("protectedCaptionDefault");
  setStatus(formStatus, "");
  setStatus(passwordStatus, "");
  try {
    await loadConfig();
    await refreshPublicItems();
  } catch (error) {
    renderEmpty(publicList, error.message || t("loadFailed"));
  }
});

themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  persist("temp-cloud-theme", state.theme);
  updateTheme();
});

applyI18n();
startColourField();
setProtectedSectionVisible(false);
renderEmpty(protectedList, t("empty"));

loadConfig()
  .then(refreshPublicItems)
  .catch((error) => {
    renderEmpty(publicList, error.message || t("loadFailed"));
    setStatus(formStatus, t("initFailed"), true);
  });

// ---------------------------------------------------------------------------
// Privacy footer and first-launch notice (injected by ugos-app/src/cmd/syncweb).
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
  close.className = "pill";
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
