#!/usr/bin/env python3
"""Clean @adguard/dnr-converter output into loadable MV3 static rulesets.

- strips the per-rule `metadata` source-map key (Chrome rejects unknown keys)
- drops the converter's dummy first rule
- rewrites `redirect` actions to `block` (we don't ship redirect resources)
- reassigns sequential rule ids per file

Usage: python3 tools/clean_rulesets.py <rulesets_dir> <out_dir>
"""
import json
import os
import sys

SOURCES = ["ruleset_101", "ruleset_102", "ruleset_103"]  # EasyList, EasyPrivacy, AdGuard Base

def main(src_dir: str, out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    total = 0
    for i, name in enumerate(SOURCES, 1):
        rules = json.load(open(os.path.join(src_dir, name, f"{name}.json")))
        clean = []
        for r in rules:
            if r.get("condition", {}).get("urlFilter") == "dummy.rule.adguard.com":
                continue
            r.pop("metadata", None)
            if r["action"]["type"] == "redirect":
                r["action"] = {"type": "block"}
            clean.append(r)
        for j, r in enumerate(clean, 1):
            r["id"] = j
        dest = os.path.join(out_dir, f"rules_{i}.json")
        json.dump(clean, open(dest, "w"))
        total += len(clean)
        print(f"  {dest}: {len(clean)} rules")
    print(f"  total: {total}")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
