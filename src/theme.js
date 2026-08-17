// Theme: light / dark / system, persisted in chrome.storage (localStorage fallback).
import { THEME_KEY } from "./platforms.js";

const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
const root = document.documentElement;

export function resolveTheme(choice) {
  if (choice === "system") return mediaQuery.matches ? "dark" : "light";
  return choice || "system";
}

export function applyTheme(choice) {
  root.setAttribute("data-theme", resolveTheme(choice));
}

export function saveTheme(choice) {
  if (chrome?.storage?.local) chrome.storage.local.set({ [THEME_KEY]: choice });
  try { localStorage.setItem(THEME_KEY, choice); } catch (e) { /* quota/privacy */ }
}

export function loadTheme() {
  return new Promise(resolve => {
    if (chrome?.storage?.local) {
      chrome.storage.local.get([THEME_KEY], r => {
        resolve(r?.[THEME_KEY] ?? localStorage.getItem(THEME_KEY) ?? "system");
      });
    } else {
      resolve(localStorage.getItem(THEME_KEY) ?? "system");
    }
  });
}

// Wire the <select> + system-change listener. Returns nothing.
export function initTheme(themeSelect) {
  themeSelect.addEventListener("change", () => {
    saveTheme(themeSelect.value);
    applyTheme(themeSelect.value);
  });
  mediaQuery.addEventListener("change", () => {
    if ((themeSelect.value || "system") === "system") applyTheme("system");
  });
  loadTheme().then(choice => {
    const safe = choice || "system";
    themeSelect.value = safe;
    applyTheme(safe);
  });
}
