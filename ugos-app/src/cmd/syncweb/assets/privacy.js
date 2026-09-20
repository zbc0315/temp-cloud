
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
