// chrome.storage.local wrappers, unified across platforms via PLATFORMS config.
import { PLATFORMS, MAX_SAVED } from "./platforms.js";
import { getCookieValue } from "./cookies.js";

const COUNTER_RE = /\[(\d+)\]$/;
const stripCounter = id => String(id || "").replace(/\[\d+\]$/, "");

function get(key) {
  return new Promise(resolve => chrome.storage.local.get([key], r => resolve(r[key] || [])));
}
function set(key, value) {
  return new Promise(resolve => chrome.storage.local.set({ [key]: value }, resolve));
}

export function getSaved(platformName) {
  return get(PLATFORMS[platformName].storageKey);
}

// Read the stored id of an item, falling back to parsing it from the cookie.
function itemId(item, p) {
  const stored = item[p.idField];
  if (stored) return stored;
  return getCookieValue(item.cookie || "", p.idCookie) || null;
}

// Highest [n] counter among items sharing the same base id.
function nextCounter(existing, p) {
  let max = 0;
  existing.forEach(c => {
    const m = COUNTER_RE.exec(itemId(c, p) || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return max + 1;
}

// resolveDuplicate(nextCounter) -> Promise<"overwrite"|"new"|"cancel">
// Returns the saved list, or null if the user cancelled.
export async function saveCookie(platformName, cookieString, resolveDuplicate) {
  const p = PLATFORMS[platformName];
  let saved = await get(p.storageKey);
  let id = getCookieValue(cookieString, p.idCookie) || "Unknown";

  const existing = saved.filter(c => stripCounter(itemId(c, p)) === id);
  if (existing.length > 0) {
    const counter = nextCounter(existing, p);
    const choice = await resolveDuplicate(counter);
    if (choice === "cancel") return null;
    if (choice === "overwrite") {
      saved = saved.filter(c => stripCounter(itemId(c, p)) !== id);
    } else if (choice === "new") {
      id = id + "[" + counter + "]";
    }
  }

  saved.unshift({
    id: Date.now().toString(),
    [p.idField]: id,
    cookie: cookieString,
    timestamp: new Date().toLocaleString("vi-VN"),
    savedAt: Date.now(),
  });
  if (saved.length > MAX_SAVED) saved = saved.slice(0, MAX_SAVED);

  await set(p.storageKey, saved);
  return saved;
}

export async function deleteSaved(platformName, id) {
  const p = PLATFORMS[platformName];
  const saved = (await get(p.storageKey)).filter(c => c.id !== id);
  await set(p.storageKey, saved);
}

export async function renameSaved(platformName, id, name) {
  const p = PLATFORMS[platformName];
  const saved = await get(p.storageKey);
  const item = saved.find(c => c.id === id);
  if (!item) return false;
  item.name = String(name).trim();
  await set(p.storageKey, saved);
  return true;
}

export async function findSaved(platformName, id) {
  return (await getSaved(platformName)).find(c => c.id === id) || null;
}

const PLATFORM_NAMES = Object.keys(PLATFORMS);

// { app, version, exportedAt, data: { <storageKey>: [...] } }
export async function exportAll() {
  const data = {};
  for (const name of PLATFORM_NAMES) {
    data[PLATFORMS[name].storageKey] = await getSaved(name);
  }
  return {
    app: "FoxyCookieManager",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

// Merge imported items into existing (dedup by internal id, cap MAX_SAVED).
// Returns { added, skipped }; throws on malformed input.
export async function importAll(parsed) {
  const data = parsed && parsed.data;
  if (!data || typeof data !== "object") throw new Error("File không đúng định dạng");

  let added = 0, skipped = 0;
  for (const name of PLATFORM_NAMES) {
    const p = PLATFORMS[name];
    const incoming = data[p.storageKey];
    if (!Array.isArray(incoming)) continue;

    const saved = await get(p.storageKey);
    const seen = new Set(saved.map(c => c.id));
    for (const item of incoming) {
      if (!item || typeof item.cookie !== "string" || !item.id) { skipped++; continue; }
      if (seen.has(item.id)) { skipped++; continue; }
      seen.add(item.id);
      saved.unshift(item);
      added++;
    }
    await set(p.storageKey, saved.slice(0, MAX_SAVED));
  }
  return { added, skipped };
}
