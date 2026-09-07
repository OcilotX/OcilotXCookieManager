// Account live/die detection.
//   Facebook / Meta: hit graph.facebook.com/{id}/picture and inspect the final
//     redirect URL — a default silhouette means the account is dead/checkpoint.
//   Instagram: cookie-only heuristic (has sessionid + ds_user_id -> live).
// Pure logic + fetch; no DOM here. Needs "graph.facebook.com" host permission.
import { getCookieValue } from "./cookies.js";

export const STATUS = { NONE: "none", CHECKING: "checking", LIVE: "live", DEAD: "dead" };

const FB_TIMEOUT = 8000;

// A Graph profile-picture redirect that lands on the default avatar => not live.
function isDefaultAvatar(finalUrl) {
  return (
    finalUrl === "" ||
    /rsrc\.php/i.test(finalUrl) ||
    /static\.[^/]*\.fbcdn\.net\/rsrc/i.test(finalUrl) ||
    /silhouette|no_profile/i.test(finalUrl)
  );
}

// Check a Facebook/Meta account id via its Graph avatar. Resolves, never rejects.
export function checkGraphId(id) {
  if (!id) return Promise.resolve({ state: STATUS.NONE, text: "no ID" });
  const url = "https://graph.facebook.com/" + encodeURIComponent(id) + "/picture?width=80&height=80";
  return new Promise(resolve => {
    let done = false;
    const finish = result => { if (!done) { done = true; clearTimeout(timer); resolve(result); } };
    const timer = setTimeout(() => finish({ state: STATUS.DEAD, text: "● DEAD" }), FB_TIMEOUT);

    fetch(url, { method: "HEAD", redirect: "follow" })
      .then(res => {
        if (!res.ok) { finish({ state: STATUS.DEAD, text: "● DEAD" }); return; }
        const dead = isDefaultAvatar(res.url || "");
        finish(dead ? { state: STATUS.DEAD, text: "● DEAD" } : { state: STATUS.LIVE, text: "● LIVE" });
      })
      .catch(() => finish({ state: STATUS.DEAD, text: "● DEAD" }));
  });
}

// Instagram web app id — lets the private info endpoint answer without login.
const IG_APP_ID = "936619743392459";

// Resolve an Instagram username from a numeric id (public, no auth). "" on failure.
export async function fetchInstagramUsername(id) {
  if (!id) return "";
  try {
    // credentials: "omit" — call it anonymously (a logged-in call returns a
    // challenge/redirect instead of JSON). Matches the working unauth request.
    const res = await fetch(
      "https://i.instagram.com/api/v1/users/" + encodeURIComponent(id) + "/info/",
      { headers: { "x-ig-app-id": IG_APP_ID }, credentials: "omit" }
    );
    if (!res.ok) return "";
    const data = await res.json();
    return data?.user?.username || "";
  } catch (e) {
    return "";
  }
}

// Instagram: no network — session cookie presence decides.
function checkInstagram(cookieString) {
  const hasId = !!getCookieValue(cookieString, "ds_user_id");
  const hasSession = !!getCookieValue(cookieString, "sessionid");
  if (hasSession && hasId) return { state: STATUS.LIVE, text: "● LIVE" };
  if (hasId) return { state: STATUS.DEAD, text: "no session" };
  return { state: STATUS.NONE, text: "no ID" };
}

// Extract the identifying id for a Facebook/Meta cookie string.
function graphId(cookieString) {
  return (
    getCookieValue(cookieString, "c_user") ||
    getCookieValue(cookieString, "i_user") ||
    getCookieValue(cookieString, "b_user")
  );
}

// Unified entry: platform name + cookie string -> Promise<{state, text}>.
export function checkStatus(platformName, cookieString) {
  if (platformName === "instagram") return Promise.resolve(checkInstagram(cookieString));
  return checkGraphId(graphId(cookieString)); // facebook + meta
}

// Run `fn` over items with bounded concurrency (avoids bursting Graph requests).
export async function mapLimit(items, limit, fn) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
