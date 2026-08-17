// Thin Promise wrappers over chrome.cookies / chrome.tabs.
import { parseCookieString } from "./cookies.js";

const TEN_YEARS = 10 * 365 * 24 * 60 * 60;

export function getAll(query) {
  return new Promise(resolve => chrome.cookies.getAll(query, resolve));
}

export function queryActiveTab() {
  return new Promise(resolve =>
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs?.[0] || null))
  );
}

function urlForDomain(domain) {
  return "https://" + domain.substring(1); // ".facebook.com" -> "https://facebook.com"
}

export async function clearCookies(domain) {
  const cookies = await getAll({ domain });
  await Promise.all(cookies.map(c =>
    new Promise(resolve =>
      chrome.cookies.remove({ url: urlForDomain(domain), name: c.name }, () => resolve())
    )
  ));
}

// Wipe `domain` then set every pair from `cookiesString`.
export async function clearAndSetCookies(domain, cookiesString, path = "/") {
  await clearCookies(domain);
  const expirationDate = Math.floor(Date.now() / 1000) + TEN_YEARS;
  await Promise.all(
    parseCookieString(cookiesString)
      .filter(({ name }) => name)
      .map(({ name, value }) =>
        new Promise(resolve =>
          chrome.cookies.set({
            url: urlForDomain(domain), name, value, domain, path, expirationDate,
          }, () => resolve())
        )
      )
  );
}

// Set cookies for a platform then navigate the active tab to it.
export async function login(platform, cookiesString) {
  await clearAndSetCookies(platform.domain, cookiesString);
  const tab = await queryActiveTab();
  if (tab) chrome.tabs.update(tab.id, { url: platform.redirect });
}

// Clear all of a platform's domains, then navigate.
export async function clearPlatform(platform) {
  await Promise.all(platform.clearDomains.map(clearCookies));
  const tab = await queryActiveTab();
  if (tab) chrome.tabs.update(tab.id, { url: platform.redirect });
}
