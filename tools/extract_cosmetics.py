#!/usr/bin/env python3
"""Extract generic cosmetic (element-hiding) rules from filter lists into CSS.

Only `##selector` rules (global, not domain-scoped) that are valid plain CSS
are kept — extended selectors (:-abp-*, :xpath, +js scriptlets, etc.) are
engine-specific and skipped.

Usage: python3 tools/extract_cosmetics.py filter1.txt [filter2.txt ...] -o out.css
"""
import sys

SKIP_MARKERS = (
    ":-abp-", ":xpath", ":matches-path", ":matches-attr", ":min-text-length",
    "+js(", "script:", "$(", ":\\", ":has-text", ":watch-attr", "@media",
)
CHUNK = 4000  # selectors per CSS rule, keeps individual rules manageable

def main() -> None:
    args = sys.argv[1:]
    out = args[args.index("-o") + 1]
    files = args[: args.index("-o")]

    sels = set()
    for f in files:
        for line in open(f, encoding="utf-8", errors="ignore"):
            line = line.strip()
            if not line.startswith("##"):
                continue
            sel = line[2:]
            if not sel or any(m in sel for m in SKIP_MARKERS):
                continue
            if "{" in sel or "}" in sel:
                continue
            sels.add(sel)

    sels = sorted(sels)
    parts = ["/* Generic cosmetic filters extracted from EasyList/EasyPrivacy/AdGuard Base */\n"]
    for i in range(0, len(sels), CHUNK):
        chunk = ",\n".join(sels[i : i + CHUNK])
        parts.append(chunk + "{display:none!important;height:0!important;min-height:0!important;}\n")
    with open(out, "w") as f:
        f.write("\n".join(parts))
    print(f"  {len(sels)} selectors -> {out}")

if __name__ == "__main__":
    main()
