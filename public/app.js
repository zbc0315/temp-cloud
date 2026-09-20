const messages = {
  zh: {
    appName: "临时云",
    brandStatus: "到期自动清理",
    themeToDark: "深色",
    themeToLight: "浅色",

    composerTitle: "粘贴、拖入，或点按添加内容",
    composerHint: "文本 · 图片 · 文件，可以一次多个",
    composerPlaceholder: "也可以直接在这里输入或粘贴文字…",
    composerLabel: "要中转的内容",
    toolFile: "选择文件",
    toolScreenshot: "截图",

    fieldTitle: "标题",
    fieldPassword: "临时密码",
    fieldExpire: "保存时间",
    placeholderTitle: "可选，例如：设计稿、验证码",
    placeholderPassword: "留空即为无密码模式",
    save: "保存",
    saving: "正在保存…",
    saveSuccess: "已保存，可在下方列表中取用",
    saveSuccessProtected: "已保存，输入临时密码即可查看",
    saveFailed: "保存失败",
    emptyComposer: "请先输入文字，或添加一个文件、一张图片",
    saveSuccessCount: "已保存 {count} 项内容",
    hourUnit: "{count} 小时",
    minuteUnit: "{count} 分钟",
    remaining: "剩余 {time}",
    expired: "已过期",
    lessThanMinute: "不到 1 分钟",

    attachFile: "文件",
    attachRemoveNamed: "移除 {name}",
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
    copyImage: "复制",
    downloadFile: "下载",
    downloadImage: "下载",
    copiedText: "已复制到剪贴板",
    copiedImage: "已复制图片到剪贴板",
    unsupportedCopy: "当前浏览器不支持自动复制，请手动复制",
    unsupportedImageCopy: "当前浏览器不支持直接复制图片，请改用下载"
  },
  en: {
    appName: "Temp Cloud",
    brandStatus: "Expires automatically",
    themeToDark: "Dark",
    themeToLight: "Light",

    composerTitle: "Paste, drop, or tap to add",
    composerHint: "Text, images and files - as many as you like",
    composerPlaceholder: "Or just type and paste text right here…",
    composerLabel: "Content to transfer",
    toolFile: "Choose file",
    toolScreenshot: "Screenshot",

    fieldTitle: "Title",
    fieldPassword: "Temporary password",
    fieldExpire: "Retention",
    placeholderTitle: "Optional, e.g. design draft",
    placeholderPassword: "Leave empty for public mode",
    save: "Save",
    saving: "Saving…",
    saveSuccess: "Saved — pick it up from the list below",
    saveSuccessProtected: "Saved — enter the temporary password to view it",
    saveFailed: "Save failed",
    emptyComposer: "Type something, or add a file or an image first",
    saveSuccessCount: "Saved {count} item(s)",
    hourUnit: "{count} hour(s)",
    minuteUnit: "{count} min",
    remaining: "{time} left",
    expired: "Expired",
    lessThanMinute: "under a minute",

    attachFile: "File",
    attachRemoveNamed: "Remove {name}",
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
    copyImage: "Copy",
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

const state = {
  language: stored("temp-cloud-language", "zh"),
  theme: stored("temp-cloud-theme", "") || defaultTheme(),
  attachments: [],
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
  // The interface no longer shows the product name anywhere, so the tab and
  // window title is the one place it appears. It follows the language.
  document.title = t("appName");
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
  renderAttachments();
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
  const url = new URL(`/api/files/${item.id}`, window.location.origin);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

async function loadConfig() {
  const res = await fetch("/api/config");
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

/* --- the composer's attachments ------------------------------------------
   A submission can hold one text and any number of files, so what the box
   collects is a list rather than a single slot. Nothing here caps the count:
   the backend caps the whole body at 100 MB and the gateway below that, and a
   limit invented here would only be a second place to get it wrong.

   Kind is still inferred from the file itself - no tabs, no type picker. The
   list is what makes "several files and a note, all behind one password" one
   action instead of five. */

function attachmentKind(file) {
  return (file.type || "").startsWith("image/") ? "image" : "file";
}

function addAttachments(files) {
  let added = 0;
  for (const file of Array.from(files || [])) {
    if (!file) continue;
    const isImage = attachmentKind(file) === "image";
    state.attachments.push({
      file,
      isImage,
      name: file.name || t("clipboardImageName"),
      size: file.size || 0,
      url: isImage ? URL.createObjectURL(file) : ""
    });
    added += 1;
  }
  if (added) renderAttachments();
  return added;
}

function removeAttachmentAt(index) {
  const [dropped] = state.attachments.splice(index, 1);
  if (dropped && dropped.url) URL.revokeObjectURL(dropped.url);
  renderAttachments();
}

function clearAttachments() {
  for (const item of state.attachments) {
    if (item.url) URL.revokeObjectURL(item.url);
  }
  state.attachments = [];
  renderAttachments();
}

// Built with createElement rather than innerHTML: file names come from the user
// and must never be parsed as markup.
function renderAttachments() {
  attachmentList.innerHTML = "";
  state.attachments.forEach((item, index) => {
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
    meta.textContent = formatSize(item.size);

    main.append(name, meta);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "attached-x";
    remove.setAttribute(
      "aria-label",
      t("attachRemoveNamed", { name: item.name })
    );
    remove.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    remove.addEventListener("click", () => {
      removeAttachmentAt(index);
      composerInput.focus();
    });

    row.append(main, remove);
    attachmentList.appendChild(row);
  });
}

/* --- getting content in: paste, drop, picker, screenshot ------------------ */

// Paste works anywhere on the page, not only while the textarea has focus, so
// "copy on one device, paste here" needs no aiming. Several pastes in a row
// build up a list, which is how a phone's worth of screenshots gets across.
window.addEventListener("paste", (event) => {
  const files = Array.from(event.clipboardData?.items || [])
    .filter((entry) => entry.kind === "file")
    .map((entry) => entry.getAsFile())
    .filter(Boolean);

  if (files.length) {
    event.preventDefault();
    addAttachments(files);
    setStatus(formStatus, "");
    return;
  }

  if (event.target === composerInput) return;
  const text = event.clipboardData?.getData("text/plain");
  if (!text) return;
  event.preventDefault();
  composerInput.value = composerInput.value ? `${composerInput.value}\n${text}` : text;
  composerInput.focus();
});

function filesFrom(list) {
  return Array.from(list || []).filter((file) => file && file.size >= 0);
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
// Every file in the drop, not just the first: a folder's worth of documents
// should be one gesture.
composer.addEventListener("drop", (event) => {
  event.preventDefault();
  composer.classList.remove("is-over");
  if (addAttachments(filesFrom(event.dataTransfer?.files))) {
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
  const chosen = filesFrom(fileInput.files);
  fileInput.value = "";
  if (addAttachments(chosen)) setStatus(formStatus, "");
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
    // Added rather than replaced: taking a second screenshot should give you
    // two, not overwrite the first.
    addAttachments([await captureScreen()]);
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

/* --- saving ---------------------------------------------------------------
   One submission can become several items, so the form carries a repeated
   `file` part and an optional `text`, and the reply lists what was created.
   The kind is not sent: the backend infers it from each file's own type, which
   is the same rule the composer already uses to decide what to show. */

async function saveComposer() {
  if (state.saving) return;

  const text = composerInput.value;
  const hasText = text.trim() !== "";
  const attachments = state.attachments;

  if (!hasText && !attachments.length) {
    setStatus(formStatus, t("emptyComposer"), true);
    composerInput.focus();
    return;
  }

  const formData = new FormData();
  formData.set("title", titleInput.value);
  formData.set("password", passwordInput.value);
  formData.set("expiresHours", expiresHoursSelect.value || "1");
  if (hasText) formData.set("text", text);
  for (const item of attachments) {
    // append, not set: set would leave only the last file in the body.
    formData.append("file", item.file, item.name);
  }

  const hadPassword = passwordInput.value.trim() !== "";
  const expected = (hasText ? 1 : 0) + attachments.length;

  state.saving = true;
  saveButton.disabled = true;
  setStatus(formStatus, t("saving"));

  try {
    const res = await fetch("/api/items", {
      method: "POST",
      body: formData
    });
    const data = (await readJSON(res)) || {};
    if (!res.ok) {
      setStatus(formStatus, data.error || t("saveFailed"), true);
      return;
    }

    const created = Array.isArray(data.items) ? data.items.length : expected;
    composerInput.value = "";
    titleInput.value = "";
    passwordInput.value = "";
    clearAttachments();
    setStatus(
      formStatus,
      hadPassword ? t("saveSuccessProtected") : t("saveSuccessCount", { count: created }),
      "ok"
    );
    // The items are already stored, so a failure to reload the list must not be
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
  button.className = "card-action";
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
  const res = await fetch(`/api/items/${item.id}/content${token ? `?token=${encodeURIComponent(token)}` : ""}`);
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

/* --- remaining time -------------------------------------------------------
   Every item knows when it was created and when it expires, so how much of its
   life is left is just arithmetic. Two things come out of it: a fraction, which
   drives the bar under the picture, and a short phrase for the line beneath it.
   The bar carries the answer at a glance and the phrase carries the number, so
   neither has to do the other's job. */
function lifeFraction(expiresAt, createdAt) {
  const created = new Date(createdAt).getTime();
  const expires = new Date(expiresAt).getTime();
  const span = expires - created;
  if (!(span > 0)) return 0;
  return Math.min(1, Math.max(0, (expires - Date.now()) / span));
}

// Deliberately coarse: this sits on one line in a small card, so "2 小时"
// beats "1 小时 47 分". The exact expiry is one hover away.
function formatRemaining(expiresAt) {
  const left = new Date(expiresAt).getTime() - Date.now();
  if (!isFinite(left)) return "";
  if (left <= 0) return t("expired");
  const minutes = Math.floor(left / 60000);
  if (minutes < 1) return t("lessThanMinute");
  if (minutes < 60) return t("minuteUnit", { count: minutes });
  return t("hourUnit", { count: Math.floor(minutes / 60) });
}

// The two elements are rebuilt from their own data attributes so a single
// interval can keep every card on the page counting down without re-rendering
// or re-fetching anything.
function applyLife(fill, remaining) {
  const fraction = lifeFraction(fill.dataset.expires, fill.dataset.created);
  const low = fraction <= 0.2;
  fill.style.width = (fraction * 100).toFixed(2) + "%";
  fill.classList.toggle("is-low", low);
  if (remaining) {
    remaining.textContent = t("remaining", { time: formatRemaining(fill.dataset.expires) });
    remaining.classList.toggle("is-low", low);
  }
}

function refreshCountdowns() {
  document.querySelectorAll(".card-life-fill").forEach((fill) => {
    applyLife(fill, fill.closest(".card")?.querySelector(".card-remaining"));
  });
}

/* --- file type ------------------------------------------------------------
   Type is told apart by glyph shape rather than by colour. One accent for
   every icon keeps the palette down to a single hue, and shape is what a
   Finder window actually relies on. The extension decides; the MIME type is
   the fallback for files that arrive with a name that says nothing. */
const ICONS = {
  archive:
    '<path d="M4 3.5h16v3H4z"/><path d="M5 6.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V6.5"/>' +
    '<path d="M10 10.5h4v3h-4z"/>',
  audio:
    '<path d="M9 18V5.5l10-2V16"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>',
  video:
    '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/>' +
    '<path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none"/>',
  sheet:
    '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/>' +
    '<path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10M15 9.5v10"/>',
  slide:
    '<rect x="3.5" y="4" width="17" height="11.5" rx="1.5"/>' +
    '<path d="M12 15.5V19"/><path d="M8.5 20.5h7"/>',
  pdf:
    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>' +
    '<path d="M14 3v5h5"/>' +
    '<path d="M8.5 15h7v2.5h-7z" fill="currentColor" stroke="none"/>',
  code:
    '<path d="M9 8.5 4.5 12 9 15.5"/><path d="M15 8.5 19.5 12 15 15.5"/>' +
    '<path d="M13.2 6l-2.4 12"/>',
  document:
    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>' +
    '<path d="M14 3v5h5"/><path d="M8.5 13h7M8.5 16.5h4.5"/>',
  generic:
    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>' +
    '<path d="M14 3v5h5"/>'
};

const EXTENSION_KINDS = [
  ["archive", "zip rar 7z tar gz bz2 xz tgz zst"],
  ["audio", "mp3 wav flac m4a aac ogg opus aiff wma"],
  ["video", "mp4 mov mkv avi webm m4v wmv flv mpg mpeg"],
  ["pdf", "pdf"],
  ["sheet", "xls xlsx csv ods numbers tsv"],
  ["slide", "ppt pptx odp key"],
  ["code", "js mjs ts tsx jsx go py rb rs java c h cpp hpp cs php sh bash zsh " +
    "ps1 lua swift kt json yml yaml toml xml html css scss sql ini conf"],
  ["document", "doc docx odt rtf txt md markdown pages tex"]
];

function fileKind(item) {
  const name = String(item.originalName || item.title || "");
  const dot = name.lastIndexOf(".");
  if (dot > 0) {
    const extension = name.slice(dot + 1).toLowerCase();
    for (const [kind, list] of EXTENSION_KINDS) {
      if (list.split(" ").indexOf(extension) !== -1) return kind;
    }
  }

  const mime = String(item.mimeType || "");
  if (mime.indexOf("zip") !== -1 || mime.indexOf("compressed") !== -1 ||
      mime.indexOf("tar") !== -1 || mime.indexOf("rar") !== -1) return "archive";
  if (mime.indexOf("audio/") === 0) return "audio";
  if (mime.indexOf("video/") === 0) return "video";
  if (mime.indexOf("image/") === 0) return "image";
  if (mime.indexOf("pdf") !== -1) return "pdf";
  if (mime.indexOf("sheet") !== -1 || mime.indexOf("excel") !== -1 ||
      mime.indexOf("csv") !== -1) return "sheet";
  if (mime.indexOf("presentation") !== -1 || mime.indexOf("powerpoint") !== -1) return "slide";
  if (mime.indexOf("text/") === 0 || mime.indexOf("word") !== -1) return "document";
  return "generic";
}

// Built from a fixed table, never from the item, so innerHTML is safe here.
// Every user-supplied string in a card goes through textContent instead.
function iconMarkup(kind) {
  const body = ICONS[kind] || ICONS.generic;
  return '<svg class="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    body + "</svg>";
}

const TEXT_PREVIEW_LIMIT = 400;

// What goes in the well at the top of a card. The three kinds carry very
// different things: an image wants to show itself, a text snippet wants to show
// its words, and a file has nothing to show but its type.
function cardMedia(item, token) {
  const media = document.createElement("div");
  media.className = "card-media";

  if (item.kind === "image") {
    // The image lives behind the content endpoint, so the card fills in when
    // that resolves rather than holding up the rest of the grid.
    fetchContent(item, token)
      .then((content) => {
        const img = document.createElement("img");
        img.alt = itemTitle(item);
        img.src = content.dataUrl;
        media.innerHTML = "";
        media.appendChild(img);
      })
      .catch(() => {
        media.innerHTML = "";
        const failed = document.createElement("p");
        failed.className = "card-media-error";
        failed.textContent = t("imagePreviewFailed");
        media.appendChild(failed);
      });
    return media;
  }

  if (item.kind === "text") {
    const text = document.createElement("p");
    text.className = "card-text";
    const body = String(item.text || "");
    // Capped so a very long paste does not put a whole document in the DOM.
    // How much is actually visible is the CSS clamp's decision, which adapts
    // to the card width.
    text.textContent =
      body.length > TEXT_PREVIEW_LIMIT ? body.slice(0, TEXT_PREVIEW_LIMIT) : body;
    media.appendChild(text);
    return media;
  }

  media.innerHTML = iconMarkup(fileKind(item));
  return media;
}

function downloadLink(item, token, label) {
  const link = document.createElement("a");
  link.className = "card-action";
  link.href = fileDownloadUrl(item, token);
  link.textContent = label;
  link.download = item.originalName || "file";
  return link;
}

function buildCard(item, token) {
  const node = itemTemplate.content.firstElementChild.cloneNode(true);

  node.querySelector(".card-media").replaceWith(cardMedia(item, token));
  node.querySelector(".card-title").textContent = itemTitle(item);

  const fill = node.querySelector(".card-life-fill");
  fill.dataset.expires = item.expiresAt;
  fill.dataset.created = item.createdAt;
  applyLife(fill, node.querySelector(".card-remaining"));

  const size = node.querySelector(".card-size");
  size.textContent = item.size ? " · " + formatSize(item.size) : "";

  // Everything that did not fit on a small card, on the card's own tooltip.
  node.title = [
    itemTitle(item),
    kindLabel(item.kind),
    item.size ? formatSize(item.size) : "",
    t("itemExpire", { time: formatTime(item.expiresAt) })
  ]
    .filter(Boolean)
    .join(" · ");

  const actions = node.querySelector(".card-actions");

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
    actions.appendChild(downloadLink(item, token, t("downloadImage")));
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
    actions.appendChild(downloadLink(item, token, t("downloadFile")));
  }

  return node;
}

function renderItems(container, items, token = "") {
  if (!items.length) {
    renderEmpty(container, t("empty"));
    return;
  }

  container.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "cards";
  for (const item of items) grid.appendChild(buildCard(item, token));
  container.appendChild(grid);
}

async function refreshPublicItems() {
  const res = await fetch("/api/items/public");
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
  const res = await fetch("/api/access", {
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
setProtectedSectionVisible(false);
renderEmpty(protectedList, t("empty"));

// Every card states how much of its life is left, so the page keeps those
// numbers and bars honest for as long as it stays open.
window.setInterval(refreshCountdowns, 30000);

loadConfig()
  .then(refreshPublicItems)
  .catch((error) => {
    renderEmpty(publicList, error.message || t("loadFailed"));
    setStatus(formStatus, t("initFailed"), true);
  });
