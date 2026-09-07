// DOM helpers: tabs, toast, clipboard, modals, saved-cookie rendering.
import { PLATFORMS } from "./platforms.js";
import { getSaved } from "./storage.js";
import { getCookieValue } from "./cookies.js";
import { checkStatus, mapLimit } from "./status.js";

// Paint a live/die badge element from a {state, text} result.
export function setStatusBadge(el, result) {
  if (!el) return;
  el.className = "status-badge " + result.state;
  el.textContent = result.text;
}

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : text;
  return div.innerHTML;
}

export function activateTab(target) {
  document.querySelectorAll(".tab-btn").forEach(t =>
    t.classList.toggle("active", t.dataset.tab === target));
  document.querySelectorAll(".panel").forEach(panel =>
    panel.classList.toggle("active", panel.id === `panel-${target}`));
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    // Fallback for older/denied clipboard (execCommand is deprecated but works).
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

// variant: "success" (default) | "danger"
export function showTemporaryMessage(message, variant = "success") {
  const box = document.createElement("div");
  box.className = `toast toast-${variant}`;
  box.innerText = message;
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1000);
}

// Resolve "overwrite" | "new" | "cancel".
export function showDuplicateModal(message, nextCounter) {
  return new Promise(resolve => {
    const modal = document.getElementById("duplicate-modal");
    document.getElementById("modal-message").innerHTML = message;
    const newBtn = document.getElementById("modal-new-btn");
    if (nextCounter) newBtn.textContent = "Tạo mới [" + nextCounter + "]";
    modal.classList.add("active");

    const close = result => { modal.classList.remove("active"); resolve(result); };
    document.getElementById("modal-overwrite-btn").onclick = () => close("overwrite");
    newBtn.onclick = () => close("new");
    document.getElementById("modal-cancel-btn").onclick = () => close("cancel");
    modal.onclick = e => { if (e.target === modal) close("cancel"); };
  });
}

// Resolve the new name string, or null if cancelled.
export function showRenameModal(currentName) {
  return new Promise(resolve => {
    const modal = document.getElementById("rename-modal");
    const input = document.getElementById("rename-input");
    const saveBtn = document.getElementById("rename-save-btn");
    const cancelBtn = document.getElementById("rename-cancel-btn");
    if (!modal || !input || !saveBtn || !cancelBtn) { resolve(null); return; }

    input.value = currentName || "";
    modal.classList.add("active");
    setTimeout(() => { input.focus(); input.select(); }, 0);

    const cleanup = () => { saveBtn.onclick = cancelBtn.onclick = input.onkeydown = modal.onclick = null; };
    const close = result => { modal.classList.remove("active"); cleanup(); resolve(result); };

    saveBtn.onclick = () => close(input.value);
    cancelBtn.onclick = () => close(null);
    input.onkeydown = e => {
      if (e.key === "Enter") { e.preventDefault(); close(input.value); }
      else if (e.key === "Escape") { e.preventDefault(); close(null); }
    };
    modal.onclick = e => { if (e.target === modal) close(null); };
  });
}

// Per-platform render metadata (icon + action buttons). Keeps original layouts.
const RENDER = {
  facebook: {
    icon: "icon/facebook.png", alt: "FB", rename: "rename-fb",
    actions: [
      { action: "login-fb", cls: "btn-primary", label: "→", title: "Login" },
      { action: "login-fb-4d", cls: "btn-primary", label: "4D", title: "Login 4D" },
      { action: "delete-fb", cls: "btn-danger", label: "✕", title: "Delete" },
    ],
  },
  instagram: {
    icon: "icon/instagram.png", alt: "IG", rename: "rename-ig",
    actions: [
      { action: "login-ig", cls: "btn-ig", label: "→", title: "Login" },
      { action: "delete-ig", cls: "btn-danger", label: "✕", title: "Delete" },
    ],
  },
  meta: {
    icon: "icon/meta.png", alt: "META", rename: "rename-meta",
    actions: [
      { action: "login-meta", cls: "btn-primary", label: "→", title: "Login" },
      { action: "delete-meta", cls: "btn-danger", label: "✕", title: "Delete" },
    ],
  },
};

function idDisplay(item, p) {
  let id = item[p.idField] || (item.cookie ? getCookieValue(item.cookie, p.idCookie) : "") || "Unknown";
  const m = /^(.+?)(\[\d+\])?$/.exec(id);
  const base = m ? m[1] : id;
  const counter = m && m[2] ? m[2] : "";
  return counter
    ? escapeHtml(base) + '<span class="uid-counter">' + escapeHtml(counter) + "</span>"
    : escapeHtml(id);
}

function itemHtml(item, platformName) {
  const p = PLATFORMS[platformName];
  const r = RENDER[platformName];
  const name = escapeHtml(item.name || "") || idDisplay(item, p);
  const actions = r.actions.map(a =>
    `<button class="${a.cls}" data-action="${a.action}" data-id="${item.id}" title="${a.title}" aria-label="${a.title}">${a.label}</button>`
  ).join("");
  return `
    <div class="saved-cookie-header">
      <div class="saved-cookie-info">
        <div class="saved-cookie-uid">
          <img src="${r.icon}" alt="${r.alt}" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 6px;">
          <span>${name}</span>
          <button class="btn-ghost" data-action="${r.rename}" data-id="${item.id}" style="padding: 2px 6px; font-size: 12px; border-radius: 8px; margin-left: 6px;">✎</button>
          <span class="status-badge checking" data-status data-platform="${platformName}" data-id="${item.id}" title="Bấm để kiểm tra lại">…</span>
        </div>
        <div class="saved-cookie-time">${escapeHtml(item.timestamp)}</div>
      </div>
      <div class="saved-cookie-actions">${actions}</div>
    </div>`;
}

export async function renderSavedCookies() {
  const container = document.getElementById("saved-cookies-list");
  if (!container) return;
  container.innerHTML = "";

  if (!chrome?.storage?.local) {
    container.innerHTML = '<div class="empty-state">Storage không khả dụng</div>';
    return;
  }

  const [fb, ig, meta] = await Promise.all([
    getSaved("facebook"), getSaved("instagram"), getSaved("meta"),
  ]);
  if (fb.length + ig.length + meta.length === 0) {
    container.innerHTML = '<div class="empty-state">Chưa có cookie nào được lưu</div>';
    return;
  }

  const groups = [["facebook", fb], ["instagram", ig], ["meta", meta]];
  const tasks = [];
  groups.forEach(([platformName, list]) => {
    list.forEach(item => {
      const el = document.createElement("div");
      el.className = "saved-cookie-item";
      el.innerHTML = itemHtml(item, platformName);
      container.appendChild(el);
      const badge = el.querySelector("[data-status]");
      if (badge) tasks.push({ badge, platformName, cookie: item.cookie });
    });
  });

  // Auto-check live/die with bounded concurrency (Graph requests can rate-limit).
  mapLimit(tasks, 4, async ({ badge, platformName, cookie }) => {
    setStatusBadge(badge, await checkStatus(platformName, cookie));
  });
}
