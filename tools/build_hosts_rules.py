#!/usr/bin/env python3
"""v1 pipeline: convert a hosts-format blocklist (Peter Lowe's) to a
declarativeNetRequest static ruleset.

Usage:
    curl -sL "https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext" -o blocklist.txt
    python3 tools/build_hosts_rules.py blocklist.txt extension/rules/rules_1.json
"""
import json
import re
import sys

def main(src: str, dest: str) -> None:
    domains = []
    with open(src) as f:
        for line in f:
            m = re.match(r"^127\.0\.0\.1\s+(\S+)$", line.strip())
            if m:
                d = m.group(1).lower()
                if re.match(r"^[a-z0-9.-]+\.[a-z]{2,}$", d) and d != "localhost":
                    domains.append(d)
    domains = sorted(set(domains))
    rules = [
        {
            "id": i,
            "priority": 1,
            "action": {"type": "block"},
            "condition": {
                "urlFilter": f"||{d}^",
                "resourceTypes": [
                    "script", "image", "xmlhttprequest", "sub_frame",
                    "media", "font", "websocket", "ping", "other",
                ],
            },
        }
        for i, d in enumerate(domains, 1)
    ]
    with open(dest, "w") as f:
        json.dump(rules, f)
    print(f"{len(rules)} rules -> {dest}")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
