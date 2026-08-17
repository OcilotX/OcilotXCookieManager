#!/usr/bin/env sh
# Package only the extension runtime files into a zip for the Web Store / CRX.
# Whitelist — anything not listed (all *.md, *.txt, manifest-new.json, backups,
# screenshots, dotfiles, this script) is left out of the shipped extension.
set -e
cd "$(dirname "$0")"

ver=$(grep -o '"version"[^,]*' manifest.json | head -1 | grep -o '[0-9][0-9.]*')
out="foxycookiemanager-v${ver}.zip"
rm -f "$out"

zip -r "$out" \
  manifest.json background.js \
  popup.html popup-styles.css \
  welcome.html welcome-styles.css \
  src \
  icon -x 'icon/_backup_foxy/*' >/dev/null

echo "built $out ($(unzip -l "$out" | tail -1 | awk '{print $2}') files)"
