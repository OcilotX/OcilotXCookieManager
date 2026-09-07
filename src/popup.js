// Entry point: load cookies into textareas, wire all UI events.
import { PLATFORMS, FOUR_LINE_KEYS } from "./platforms.js";
import { getAll, queryActiveTab, login, clearPlatform } from "./browser.js";
import { buildCookieString, pickCookieKeys, getCookieValue } from "./cookies.js";
import { saveCookie, deleteSaved, renameSaved, findSaved, exportAll, importAll } from "./storage.js";
import { initTheme } from "./theme.js";
import { checkStatus, STATUS, fetchInstagramUsername } from "./status.js";
import {
  activateTab, copyToClipboard, showTemporaryMessage,
  showDuplicateModal, showRenameModal, renderSavedCookies, setStatusBadge,
} from "./ui.js";

const $ = id => document.getElementById(id);
const textareaId = name => `${name}-cookies`;
const statusId = name => `${name}-status`;

// Check a platform's textarea cookie and paint its header badge.
async function refreshStatus(platformName) {
  const badge = $(statusId(platformName));
  if (!badge) return;
  const cookie = $(textareaId(platformName))?.value || "";
  if (!cookie.trim()) { setStatusBadge(badge, { state: STATUS.NONE, text: "—" }); return; }
  setStatusBadge(badge, { state: STATUS.CHECKING, text: "checking…" });
  setStatusBadge(badge, await checkStatus(platformName, cookie));
}

// --- Load cookies into each platform's textarea on open ---
async function loadCookies() {
  for (const name of Object.keys(PLATFORMS)) {
    const p = PLATFORMS[name];
    // Cookies come from the store, not the page, so every platform reads
    // regardless of the active tab (Meta no longer needs a meta.com page).
    const cookies = await getAll(p.getAll);
    const el = $(textareaId(name));
    if (el) el.value = buildCookieString(cookies, p.cookieNames);
    if (name === "facebook") updateFacebookUID(el ? el.value : "");
    if (name === "instagram") updateInstagramUID(el ? el.value : "");
    refreshStatus(name);
  }
}

function updateFacebookUID(cookieString) {
  const display = $("facebook-uid-display");
  const value = $("facebook-uid-value");
  if (!display || !value) return;
  const uid = getCookieValue(cookieString, "c_user");
  if (uid) { value.textContent = uid; display.style.display = "flex"; }
  else { display.style.display = "none"; }
}

// Show Instagram ds_user_id + resolved username (via the private info endpoint).
let igNameToken = 0;
function updateInstagramUID(cookieString) {
  const display = $("instagram-uid-display");
  const value = $("instagram-uid-value");
  const uname = $("instagram-username");
  if (!display || !value || !uname) return;
  const id = getCookieValue(cookieString, "ds_user_id");
  if (!id) { display.style.display = "none"; uname.textContent = ""; return; }
  value.textContent = id;
  uname.textContent = "…"; // loading
  display.style.display = "flex";
  const token = ++igNameToken; // ignore results from a stale cookie
  fetchInstagramUsername(id).then(username => {
    if (token !== igNameToken) return;
    uname.textContent = username ? "@" + username : "—";
  });
}

// --- Save flow (shared across platforms) ---
async function handleSave(platformName) {
  if (!chrome?.storage?.local) { showTemporaryMessage("Storage không khả dụng!", "danger"); return; }
  const cookieString = $(textareaId(platformName)).value.trim();
  if (!cookieString) { showTemporaryMessage("Không có cookie để lưu!"); return; }

  const p = PLATFORMS[platformName];
  const result = await saveCookie(platformName, cookieString, counter =>
    showDuplicateModal(`${p.idLabel} này đã tồn tại!<br>Bạn muốn làm gì?`, counter));
  if (result === null) return; // cancelled
  showTemporaryMessage(`${p.label} Cookie đã được lưu!`);
  renderSavedCookies();
}

// --- Saved-item actions ---
async function loginSaved(platformName, id, fourLine) {
  const item = await findSaved(platformName, id);
  if (!item) return;
  const cookie = fourLine ? pickCookieKeys(item.cookie, FOUR_LINE_KEYS) : item.cookie;
  login(PLATFORMS[platformName], cookie);
}

async function handleRename(platformName, id) {
  if (!chrome?.storage?.local) { showTemporaryMessage("Storage không khả dụng!", "danger"); return; }
  const item = await findSaved(platformName, id);
  if (!item) return;
  const next = await showRenameModal(typeof item.name === "string" ? item.name : "");
  if (next === null) return;
  await renameSaved(platformName, id, next);
  showTemporaryMessage("Đã cập nhật tên!");
  renderSavedCookies();
}

async function handleDelete(platformName, id) {
  if (!chrome?.storage?.local) { showTemporaryMessage("Storage không khả dụng!", "danger"); return; }
  await deleteSaved(platformName, id);
  showTemporaryMessage("Cookie đã được xóa!", "danger");
  renderSavedCookies();
}

async function handleExport() {
  const payload = await exportAll();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `foxycookiemanager-cookies-${payload.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showTemporaryMessage("Đã export cookie!");
}

async function handleImport(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const { added, skipped } = await importAll(parsed);
    showTemporaryMessage(`Import: +${added} mới, bỏ qua ${skipped}`);
    renderSavedCookies();
  } catch (e) {
    showTemporaryMessage("File không hợp lệ!", "danger");
  }
}

// data-action -> handler. Keeps the delegation table in one place.
const ACTIONS = {
  "login-fb": id => loginSaved("facebook", id, false),
  "login-fb-4d": id => loginSaved("facebook", id, true),
  "login-ig": id => loginSaved("instagram", id, false),
  "login-meta": id => loginSaved("meta", id, false),
  "rename-fb": id => handleRename("facebook", id),
  "rename-ig": id => handleRename("instagram", id),
  "rename-meta": id => handleRename("meta", id),
  "delete-fb": id => handleDelete("facebook", id),
  "delete-ig": id => handleDelete("instagram", id),
  "delete-meta": id => handleDelete("meta", id),
};

document.addEventListener("DOMContentLoaded", () => {
  // Tabs
  document.querySelectorAll(".tab-btn").forEach(tab =>
    tab.addEventListener("click", () => activateTab(tab.dataset.tab)));

  // Theme
  initTheme($("theme-select"));

  // Auto-select tab by active site
  queryActiveTab().then(tab => {
    const url = tab?.url || "";
    if (url.includes("instagram.com")) activateTab("instagram");
    else if (url.includes("meta.com")) activateTab("meta");
    else activateTab("facebook");
  });

  // Copy buttons
  const copyMap = {
    "copy-facebook": ["facebook-cookies", "Facebook Cookie copied to clipboard!"],
    "copy-instagram": ["instagram-cookies", "Instagram Cookie copied to clipboard!"],
    "copy-meta": ["meta-cookies", "Meta Cookie copied to clipboard!"],
  };
  Object.entries(copyMap).forEach(([btnId, [src, msg]]) =>
    $(btnId)?.addEventListener("click", () => { copyToClipboard($(src).value); showTemporaryMessage(msg); }));

  // Copy helper: clean the placeholder states and copy the rest.
  const copyValue = (text, stripAt, msg) => {
    let val = (text || "").trim();
    if (stripAt) val = val.replace(/^@/, "");
    if (val && val !== "…" && val !== "—") { copyToClipboard(val); showTemporaryMessage(msg); }
  };

  // Small copy icons next to id / username (data-copy = target element id).
  document.querySelectorAll("[data-copy]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = $(btn.getAttribute("data-copy"));
      if (!target) return;
      const isUser = btn.hasAttribute("data-strip-at");
      copyValue(target.textContent, isUser, isUser ? "Username copied to clipboard!" : "ID copied to clipboard!");
    });
  });

  // Click the id / username text itself to copy it too.
  const wireClickCopy = (elId, msg, stripAt = false) => {
    const el = $(elId);
    el?.addEventListener("click", () => copyValue(el.textContent, stripAt, msg));
  };
  wireClickCopy("facebook-uid-value", "ID copied to clipboard!");
  wireClickCopy("instagram-uid-value", "ID copied to clipboard!");
  wireClickCopy("instagram-username", "Username copied to clipboard!", true);

  // Login buttons (from textarea)
  $("login-facebook")?.addEventListener("click", () => login(PLATFORMS.facebook, $("facebook-cookies").value));
  $("login-facebook-4")?.addEventListener("click", () =>
    login(PLATFORMS.facebook, pickCookieKeys($("facebook-cookies").value, FOUR_LINE_KEYS)));
  $("login-instagram")?.addEventListener("click", () => login(PLATFORMS.instagram, $("instagram-cookies").value));
  $("login-meta")?.addEventListener("click", () => login(PLATFORMS.meta, $("meta-cookies").value));

  // Clear buttons
  const resetBadge = name => setStatusBadge($(statusId(name)), { state: STATUS.NONE, text: "—" });

  $("clear-facebook")?.addEventListener("click", async () => {
    await clearPlatform(PLATFORMS.facebook);
    $("facebook-cookies").value = ""; updateFacebookUID(""); resetBadge("facebook"); showTemporaryMessage("Facebook Cookies cleared!", "danger");
  });
  $("clear-instagram")?.addEventListener("click", async () => {
    await clearPlatform(PLATFORMS.instagram);
    $("instagram-cookies").value = ""; updateInstagramUID(""); resetBadge("instagram"); showTemporaryMessage("Instagram Cookies cleared!", "danger");
  });
  $("clear-meta")?.addEventListener("click", async () => {
    await clearPlatform(PLATFORMS.meta);
    $("meta-cookies").value = ""; resetBadge("meta"); showTemporaryMessage("Meta Cookies cleared!", "danger");
  });

  // FB / IG UID live update
  $("facebook-cookies")?.addEventListener("input", function () { updateFacebookUID(this.value); });
  $("instagram-cookies")?.addEventListener("input", function () { updateInstagramUID(this.value); });

  // Status badges: reset to stale on manual edit, re-check on click.
  ["facebook", "instagram", "meta"].forEach(name => {
    $(textareaId(name))?.addEventListener("input", () => resetBadge(name));
    $(statusId(name))?.addEventListener("click", () => refreshStatus(name));
  });

  // Save buttons
  $("save-facebook")?.addEventListener("click", () => handleSave("facebook"));
  $("save-instagram")?.addEventListener("click", () => handleSave("instagram"));
  $("save-meta")?.addEventListener("click", () => handleSave("meta"));

  // Export / Import
  $("export-cookies")?.addEventListener("click", handleExport);
  $("import-cookies")?.addEventListener("click", () => $("import-file").click());
  $("import-file")?.addEventListener("change", function () {
    handleImport(this.files[0]);
    this.value = ""; // allow re-importing same file
  });

  // Saved-cookie action delegation
  $("saved-cookies-list")?.addEventListener("click", async e => {
    const badge = e.target.closest("[data-status]");
    if (badge) {
      const platformName = badge.getAttribute("data-platform");
      const item = await findSaved(platformName, badge.getAttribute("data-id"));
      if (!item) return;
      setStatusBadge(badge, { state: STATUS.CHECKING, text: "…" });
      setStatusBadge(badge, await checkStatus(platformName, item.cookie));
      return;
    }
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const fn = ACTIONS[btn.getAttribute("data-action")];
    if (fn) fn(btn.getAttribute("data-id"));
  });

  // Manager tab re-render + initial render
  document.querySelector('[data-tab="manager"]')?.addEventListener("click", () => setTimeout(renderSavedCookies, 100));
  renderSavedCookies();

  // Load cookies into textareas
  loadCookies();
});
