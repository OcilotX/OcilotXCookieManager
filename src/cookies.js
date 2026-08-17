// Pure cookie-string helpers. No chrome / DOM — testable with node.

export function parseCookieString(str) {
  return String(str)
    .split(";")
    .map(s => s.trim())
    .filter(Boolean)
    .map(pair => {
      const i = pair.indexOf("=");
      if (i === -1) return { name: pair, value: "" };
      return { name: pair.slice(0, i).trim(), value: pair.slice(i + 1).trim() };
    });
}

// Value of a single cookie by name (empty string if missing).
export function getCookieValue(str, name) {
  const found = parseCookieString(str).find(c => c.name === name);
  return found ? found.value : "";
}

// Keep only `keys`, in `keys` order. Used for Login 4D (datr, fr, sb, wd).
export function pickCookieKeys(rawString, keys) {
  const map = {};
  parseCookieString(rawString).forEach(({ name, value }) => {
    if (keys.includes(name) && !map[name]) map[name] = value;
  });
  return keys.filter(k => map[k]).map(k => `${k}=${map[k]}`).join("; ");
}

// Build a "a=1; b=2;" string from chrome.cookies objects, ordered by `names`.
export function buildCookieString(cookies, names) {
  const dict = {};
  cookies.filter(c => names.includes(c.name)).forEach(c => { dict[c.name] = c.value; });
  const s = names.filter(n => dict[n]).map(n => `${n}=${dict[n]}`).join("; ");
  return s ? s + ";" : "";
}

// self-check: `node src/cookies.js`
if (typeof process !== "undefined" && process.argv?.[1] && import.meta.url.endsWith("cookies.js")) {
  const ok = (c, m) => { if (!c) throw new Error("FAIL: " + m); };
  ok(getCookieValue("a=1; b=2", "b") === "2", "getCookieValue basic");
  ok(getCookieValue("x=aGVsbG8=; y=2", "x") === "aGVsbG8=", "value keeps trailing =");
  ok(getCookieValue("a=1", "z") === "", "missing name -> empty");
  ok(pickCookieKeys("xs=s; datr=d; fr=f", ["datr", "fr", "sb", "wd"]) === "datr=d; fr=f", "pick 4d, drop xs, keep order");
  ok(parseCookieString("a=1;b=2").length === 2, "parse count");
  ok(buildCookieString([{ name: "datr", value: "d" }, { name: "zz", value: "1" }], ["datr", "fr"]) === "datr=d;", "build filters + trailing");
  ok(buildCookieString([], ["datr"]) === "", "build empty -> empty");
  console.log("cookies.js self-check OK");
}
