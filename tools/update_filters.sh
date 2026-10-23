#!/usr/bin/env bash
# Rebuild the DNR rulesets and cosmetic CSS from the latest filter lists.
#
# Prerequisites: node + npm (uses @adguard/dnr-converter, installed on first run)
#
# Usage: tools/update_filters.sh
set -euo pipefail
cd "$(dirname "$0")/.."

BUILD=build/filters
mkdir -p "$BUILD" resources

echo ">> downloading filter lists"
curl -sL "https://easylist.to/easylist/easylist.txt"                    -o "$BUILD/filter_101.txt"
curl -sL "https://easylist.to/easylist/easyprivacy.txt"                 -o "$BUILD/filter_102.txt"
curl -sL "https://filters.adtidy.org/extension/chromium/filters/2.txt"  -o "$BUILD/filter_103.txt"
cat > "$BUILD/filters.json" <<'JSON'
[
  {"filterId": 101, "name": "EasyList"},
  {"filterId": 102, "name": "EasyPrivacy"},
  {"filterId": 103, "name": "AdGuard Base"}
]
JSON

if [ ! -d node_modules/@adguard/dnr-converter ]; then
  echo ">> installing @adguard/dnr-converter"
  npm init -y >/dev/null 2>&1 || true
  npm install @adguard/dnr-converter --no-fund --no-audit
fi

echo ">> converting to DNR rulesets"
rm -rf "$BUILD/rulesets"
node node_modules/@adguard/dnr-converter/dist/cli.cjs convert "$BUILD" resources "$BUILD/rulesets" --prettify-json false

echo ">> cleaning rulesets"
python3 tools/clean_rulesets.py "$BUILD/rulesets" extension/rules

echo ">> extracting generic cosmetic rules"
python3 tools/extract_cosmetics.py "$BUILD/filter_101.txt" "$BUILD/filter_102.txt" "$BUILD/filter_103.txt" \
  -o extension/src/generic-cosmetic.css

echo ">> done. Repack with: cd extension && zip -r ../dist/ippo-adblocker.zip ."
