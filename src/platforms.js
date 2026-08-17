// Single source of platform config. Adding a platform = one entry here.
//
// idCookie: cookie name whose value identifies an account (dedup key).
//   Meta intentionally reads c_user (matches original behavior — Meta pages
//   rarely have it, so Meta ids show "Unknown"; not a regression).
// idField: property name the id is stored under in chrome.storage (kept for
//   backward compat with already-saved data: uid / ds_user_id / meta_id).

export const PLATFORMS = {
  facebook: {
    label: "Facebook",
    cookieNames: ["c_user", "datr", "fr", "sb", "xs", "wd"],
    getAll: { domain: ".facebook.com" },
    domain: ".facebook.com",
    clearDomains: [".facebook.com", ".business.facebook.com"],
    redirect: "https://www.facebook.com/",
    storageKey: "savedFacebookCookies",
    idField: "uid",
    idCookie: "c_user",
    idLabel: "UID",
  },
  instagram: {
    label: "Instagram",
    cookieNames: ["mid", "ig_did", "datr", "ig_nrcb", "csrftoken", "ds_user_id", "sessionid", "rur"],
    getAll: { url: "https://www.instagram.com" },
    domain: ".instagram.com",
    clearDomains: [".instagram.com"],
    redirect: "https://www.instagram.com",
    storageKey: "savedInstagramCookies",
    idField: "ds_user_id",
    idCookie: "ds_user_id",
    idLabel: "ds_user_id",
  },
  meta: {
    label: "Meta",
    cookieNames: ["fs", "datr", "locale", "ps_l", "ps_n"],
    getAll: { domain: ".meta.com" },
    domain: ".meta.com",
    clearDomains: [".meta.com", ".auth.meta.com", ".accountscenter.meta.com"],
    redirect: "https://accountscenter.meta.com/",
    storageKey: "savedMetaCookies",
    idField: "meta_id",
    idCookie: "c_user",
    idLabel: "Meta ID",
  },
};

export const FOUR_LINE_KEYS = ["datr", "fr", "sb", "wd"];
export const THEME_KEY = "fc_theme";
export const MAX_SAVED = 50;
