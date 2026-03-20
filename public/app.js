const messages = {
  zh: {
    heroEyebrow: "Local Temporary Transfer",
    heroLead: "在局域网内临时中转文件、文字和图片。默认保存 1 小时，最长 24 小时。",
    heroNotePublic: "无密码内容可直接查看",
    heroNoteProtected: "有密码内容输入密码后显示",
    heroNoteExpire: "到期自动清理",
    themeLight: "暗色",
    themeDark: "亮色",
    tabUpload: "上传与粘贴",
    tabDownload: "下载与复制",
    uploadTitle: "上传与粘贴",
    uploadDesc: "支持文件、文本和图片剪贴板",
    downloadTitle: "下载与复制",
    downloadDesc: "无密码内容默认显示，有密码内容需要输入密码",
    kindFile: "文件",
    kindText: "文本",
    kindImage: "图片",
    fieldTitle: "标题（可选）",
    fieldText: "文本内容",
    fieldPassword: "临时密码（可留空）",
    fieldExpire: "保存时间",
    placeholderTitle: "例如：设计稿、验证码、截图",
    placeholderText: "在这里粘贴文字内容",
    placeholderPassword: "留空即为无密码模式",
    placeholderLookupPassword: "输入密码查看对应内容",
    filePrompt: "选择文件或拖拽到这里",
    imagePrompt: "粘贴图片、拖拽图片或点击选择",
    save: "保存",
    view: "查看",
    refresh: "刷新",
    protectedSectionTitle: "密码内容",
    publicSectionTitle: "无密码内容",
    protectedCaptionDefault: "输入密码后显示",
    empty: "暂无内容",
    copyText: "复制文本",
    copyImage: "复制图片",
    downloadFile: "下载文件",
    downloadImage: "下载图片",
    copiedText: "已复制到剪贴板",
    copiedImage: "已复制图片到剪贴板",
    unsupportedCopy: "当前浏览器不支持自动复制，请手动复制",
    unsupportedImageCopy: "当前浏览器不支持直接复制图片，请使用下载图片",
    loadFailed: "加载失败",
    imagePreviewFailed: "图片预览加载失败",
    readFailed: "读取内容失败",
    selectImageFirst: "请先选择或粘贴图片",
    selectFileFirst: "请先选择文件",
    saving: "正在保存...",
    saveSuccess: "保存成功",
    saveFailed: "保存失败",
    enterPassword: "请输入密码",
    lookingUp: "正在查询...",
    lookupFailed: "查询失败",
    noMatch: "没有匹配内容",
    lookupSuccess: "查询成功",
    protectedCaptionCount: "当前显示该密码下的 {count} 项内容",
    itemKindText: "文本",
    itemKindImage: "图片",
    itemKindFile: "文件",
    itemUntitled: "未命名内容",
    itemExpire: "到期 {time}",
    itemCreated: "创建 {time}",
    hourUnit: "{count} 小时",
    initFailed: "初始化失败",
    clipboardImageName: "剪贴板图片"
  },
  en: {
    heroEyebrow: "Local Temporary Transfer",
    heroLead: "Temporary transfer for files, text, and images across your LAN. Default retention is 1 hour, up to 24 hours.",
    heroNotePublic: "Public items are visible immediately",
    heroNoteProtected: "Protected items appear after password lookup",
    heroNoteExpire: "Expired content is removed automatically",
    themeLight: "Dark",
    themeDark: "Light",
    tabUpload: "Upload & Paste",
    tabDownload: "Download & Copy",
    uploadTitle: "Upload & Paste",
    uploadDesc: "Supports files, text snippets, and image clipboard",
    downloadTitle: "Download & Copy",
    downloadDesc: "Public content is shown by default. Protected content requires a password.",
    kindFile: "File",
    kindText: "Text",
    kindImage: "Image",
    fieldTitle: "Title (optional)",
    fieldText: "Text content",
    fieldPassword: "Temporary password (optional)",
    fieldExpire: "Retention",
    placeholderTitle: "For example: design draft, code, screenshot",
    placeholderText: "Paste text here",
    placeholderPassword: "Leave empty for public mode",
    placeholderLookupPassword: "Enter password to view matched content",
    filePrompt: "Choose a file or drag it here",
    imagePrompt: "Paste, drag, or choose an image",
    save: "Save",
    view: "View",
    refresh: "Refresh",
    protectedSectionTitle: "Protected Content",
    publicSectionTitle: "Public Content",
    protectedCaptionDefault: "Shown after password lookup",
    empty: "No content yet",
    copyText: "Copy Text",
    copyImage: "Copy Image",
    downloadFile: "Download File",
    downloadImage: "Download Image",
    copiedText: "Copied to clipboard",
    copiedImage: "Image copied to clipboard",
    unsupportedCopy: "Automatic copy is not supported in this browser. Please copy manually.",
    unsupportedImageCopy: "Direct image copy is not supported in this browser. Please download the image.",
    loadFailed: "Load failed",
    imagePreviewFailed: "Failed to load image preview",
    readFailed: "Failed to read content",
    selectImageFirst: "Select or paste an image first",
    selectFileFirst: "Select a file first",
    saving: "Saving...",
    saveSuccess: "Saved successfully",
    saveFailed: "Save failed",
    enterPassword: "Please enter a password",
    lookingUp: "Looking up...",
    lookupFailed: "Lookup failed",
    noMatch: "No matched content",
    lookupSuccess: "Lookup succeeded",
    protectedCaptionCount: "{count} protected item(s) matched this password",
    itemKindText: "Text",
    itemKindImage: "Image",
    itemKindFile: "File",
    itemUntitled: "Untitled",
    itemExpire: "Expires {time}",
    itemCreated: "Created {time}",
    hourUnit: "{count} hour(s)",
    initFailed: "Initialization failed",
    clipboardImageName: "Clipboard image"
  }
};

const state = {
  currentKind: "file",
  currentSection: "upload",
  imageFile: null,
  language: localStorage.getItem("temp-cloud-language") || "zh",
  theme: localStorage.getItem("temp-cloud-theme") || "light"
};

const uploadForm = document.getElementById("upload-form");
const passwordForm = document.getElementById("password-form");
const publicList = document.getElementById("public-list");
const protectedList = document.getElementById("protected-list");
const protectedSection = document.getElementById("protected-section");
const formStatus = document.getElementById("form-status");
const passwordStatus = document.getElementById("password-status");
const protectedCaption = document.getElementById("protected-caption");
const expiresHoursSelect = document.getElementById("expires-hours");
const itemTemplate = document.getElementById("item-template");
const fileInput = document.getElementById("file-input");
const imageInput = document.getElementById("image-input");
const fileName = document.getElementById("file-name");
const imageName = document.getElementById("image-name");
const imagePreview = document.getElementById("image-preview");
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

function setStatus(el, message, isError = false) {
  el.textContent = message || "";
  el.style.color = isError ? "#c14d4d" : "";
}

function updateTheme() {
  document.body.dataset.theme = state.theme;
  themeToggle.textContent = state.theme === "light" ? t("themeLight") : t("themeDark");
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
  updateTheme();
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

function fileDownloadUrl(item, token) {
  const url = new URL(`/api/files/${item.id}`, window.location.origin);
  if (token) url.searchParams.set("token", token);
  return url.toString();
}

async function loadConfig() {
  const res = await fetch("/api/config");
  const data = await res.json();
  expiresHoursSelect.innerHTML = "";
  for (let i = 1; i <= data.maxExpireHours; i += 1) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = t("hourUnit", { count: i });
    if (i === data.defaultExpireHours) option.selected = true;
    expiresHoursSelect.appendChild(option);
  }
}

function switchKind(kind) {
  state.currentKind = kind;
  document.querySelectorAll("#kind-tabs .tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.kind === kind);
  });
  document.querySelectorAll(".kind-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${kind}-panel`);
  });
}

function switchSection(section) {
  state.currentSection = section;
  document.querySelectorAll("#section-tabs .tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.section === section);
  });
  document.querySelectorAll(".section-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${section}-section`);
  });
}

function renderEmpty(container, text) {
  container.className = "item-list empty";
  container.textContent = text;
}

function setProtectedSectionVisible(visible) {
  protectedSection.classList.toggle("hidden", !visible);
}

function createActionButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
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
  if (!success) {
    throw new Error(t("unsupportedCopy"));
  }
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
  await navigator.clipboard.write([
    new ClipboardItem({
      [blob.type]: blob
    })
  ]);
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

function renderItems(container, items, token = "") {
  if (!items.length) {
    renderEmpty(container, t("empty"));
    return;
  }

  container.className = "item-list";
  container.innerHTML = "";

  items.forEach((item) => {
    const node = itemTemplate.content.firstElementChild.cloneNode(true);
    node.classList.add(`kind-${item.kind}`);
    node.querySelector(".item-kind").textContent = kindLabel(item.kind);
    node.querySelector(".item-title").textContent = item.title || item.originalName || t("itemUntitled");
    node.querySelector(".item-expire").textContent = t("itemExpire", { time: formatTime(item.expiresAt) });
    node.querySelector(".item-meta").textContent = [
      item.originalName || "",
      item.size ? formatSize(item.size) : "",
      t("itemCreated", { time: formatTime(item.createdAt) })
    ]
      .filter(Boolean)
      .join(" · ");

    const preview = node.querySelector(".item-preview");
    const actions = node.querySelector(".item-actions");

    if (item.kind === "text" && item.text) {
      const pre = document.createElement("pre");
      pre.textContent = item.text.length > 220 ? `${item.text.slice(0, 220)}...` : item.text;
      preview.appendChild(pre);

      actions.appendChild(
        createActionButton(t("copyText"), async () => {
          try {
            const content = await fetchContent(item, token);
            await copyText(content.text);
            alert(t("copiedText"));
          } catch (error) {
            alert(error.message);
          }
        })
      );
    }

    if (item.kind === "image") {
      const img = document.createElement("img");
      img.alt = item.title || item.originalName || "image";
      preview.appendChild(img);

      fetchContent(item, token)
        .then((content) => {
          img.src = content.dataUrl;
        })
        .catch(() => {
          preview.textContent = t("imagePreviewFailed");
        });

      const download = document.createElement("a");
      download.href = fileDownloadUrl(item, token);
      download.textContent = t("downloadImage");
      download.download = item.originalName || "image";
      actions.appendChild(download);
      actions.appendChild(
        createActionButton(t("copyImage"), async () => {
          try {
            const content = await fetchContent(item, token);
            await copyImage(content.dataUrl);
            alert(t("copiedImage"));
          } catch (error) {
            alert(error.message);
          }
        })
      );
    }

    if (item.kind === "file") {
      const download = document.createElement("a");
      download.href = fileDownloadUrl(item, token);
      download.textContent = t("downloadFile");
      download.download = item.originalName || "file";
      actions.appendChild(download);
    }

    container.appendChild(node);
  });
}

async function refreshPublicItems() {
  const res = await fetch("/api/items/public");
  const data = await res.json();
  renderItems(publicList, data.items);
}

function bindDropzone(dropzone, handler) {
  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });
  dropzone.addEventListener("drop", (event) => {
    handler(event.dataTransfer.files);
  });
}

function setImageFile(file) {
  state.imageFile = file || null;
  if (!file) {
    imageName.textContent = t("imagePrompt");
    imagePreview.innerHTML = "";
    imagePreview.classList.add("hidden");
    return;
  }

  imageName.textContent = file.name || t("clipboardImageName");
  const url = URL.createObjectURL(file);
  imagePreview.innerHTML = `<img src="${url}" alt="preview" />`;
  imagePreview.classList.remove("hidden");
}

function resetTransientLabels() {
  if (!fileInput.files[0]) {
    fileName.textContent = t("filePrompt");
  }
  if (!state.imageFile) {
    imageName.textContent = t("imagePrompt");
  }
}

document.getElementById("kind-tabs").addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (!tab) return;
  switchKind(tab.dataset.kind);
});

document.getElementById("section-tabs").addEventListener("click", (event) => {
  const tab = event.target.closest(".tab");
  if (!tab) return;
  switchSection(tab.dataset.section);
});

languageToggle.addEventListener("click", async () => {
  state.language = state.language === "zh" ? "en" : "zh";
  localStorage.setItem("temp-cloud-language", state.language);
  applyI18n();
  await loadConfig();
  await refreshPublicItems();
  setProtectedSectionVisible(false);
  renderEmpty(protectedList, t("empty"));
  protectedCaption.textContent = t("protectedCaptionDefault");
  setStatus(formStatus, "");
  setStatus(passwordStatus, "");
  resetTransientLabels();
});

themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  localStorage.setItem("temp-cloud-theme", state.theme);
  updateTheme();
});

fileInput.addEventListener("change", () => {
  fileName.textContent = fileInput.files[0]?.name || t("filePrompt");
});

imageInput.addEventListener("change", () => {
  setImageFile(imageInput.files[0] || null);
});

bindDropzone(document.querySelector("#file-panel .dropzone"), (files) => {
  const [file] = files;
  if (!file) return;
  const dt = new DataTransfer();
  dt.items.add(file);
  fileInput.files = dt.files;
  fileName.textContent = file.name;
});

bindDropzone(document.querySelector("#image-panel .dropzone"), (files) => {
  const [file] = Array.from(files).filter((item) => item.type.startsWith("image/"));
  if (!file) return;
  setImageFile(file);
});

window.addEventListener("paste", (event) => {
  const image = Array.from(event.clipboardData?.items || []).find((item) =>
    item.type.startsWith("image/")
  );
  if (!image) return;
  event.preventDefault();
  switchKind("image");
  setImageFile(image.getAsFile());
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData();
  const raw = new FormData(uploadForm);
  formData.set("kind", state.currentKind);
  formData.set("title", raw.get("title") || "");
  formData.set("password", raw.get("password") || "");
  formData.set("expiresHours", raw.get("expiresHours") || "1");

  if (state.currentKind === "text") {
    formData.set("text", raw.get("text") || "");
  } else if (state.currentKind === "image") {
    if (!state.imageFile) {
      setStatus(formStatus, t("selectImageFirst"), true);
      return;
    }
    formData.set("file", state.imageFile, state.imageFile.name || "clipboard-image.png");
  } else {
    const file = fileInput.files[0];
    if (!file) {
      setStatus(formStatus, t("selectFileFirst"), true);
      return;
    }
    formData.set("file", file, file.name);
  }

  setStatus(formStatus, t("saving"));
  const res = await fetch("/api/items", {
    method: "POST",
    body: formData
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setStatus(formStatus, data.error || t("saveFailed"), true);
    return;
  }

  uploadForm.reset();
  fileName.textContent = t("filePrompt");
  setImageFile(null);
  setStatus(formStatus, t("saveSuccess"));
  await refreshPublicItems();
  switchSection("download");
});

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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setProtectedSectionVisible(false);
    renderEmpty(protectedList, t("empty"));
    protectedCaption.textContent = t("protectedCaptionDefault");
    setStatus(passwordStatus, data.error || t("lookupFailed"), true);
    return;
  }

  if (!data.items.length) {
    setProtectedSectionVisible(false);
    renderEmpty(protectedList, t("empty"));
    protectedCaption.textContent = t("protectedCaptionDefault");
    setStatus(passwordStatus, t("noMatch"), true);
    return;
  }

  setProtectedSectionVisible(true);
  protectedCaption.textContent = t("protectedCaptionCount", { count: data.items.length });
  renderItems(protectedList, data.items, data.token);
  setStatus(passwordStatus, t("lookupSuccess"));
});

document.getElementById("refresh-public").addEventListener("click", () => {
  refreshPublicItems().catch((error) => {
    renderEmpty(publicList, error.message || t("loadFailed"));
  });
});

applyI18n();
setProtectedSectionVisible(false);
switchSection(state.currentSection);

loadConfig()
  .then(refreshPublicItems)
  .catch((error) => {
    setProtectedSectionVisible(false);
    renderEmpty(publicList, error.message || t("loadFailed"));
    setStatus(formStatus, t("initFailed"), true);
  });
