#!/usr/bin/env python3
"""Fail build if compiler, toolchain or dependency warnings are emitted.

Only scan build command stdout/stderr, not application data, source code or
GitHub runner logs. GitHub Actions warnings are handled by using maintained actions.
"""
from pathlib import Path
import re
import sys

RULES = [
    re.compile(r"(?i)\[WARNING\]"),
    re.compile(r"(?i)(?:^|[ :])warning:"),
    re.compile(r"(?i)deprecationwarning"),
    re.compile(r"(?i)\bdeprecated gradle features\b"),
    re.compile(r"(?i)^\s*w:\s+"),
    re.compile(r"(?i)^\s*warn\s*[:\[]"),
    re.compile(r"(?i)^\s*##\[warning\]"),
]

def scan(path: Path) -> list[str]:
    problems: list[str] = []
    for index, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        if any(pattern.search(line) for pattern in RULES):
            problems.append(f"{path}:{index}: {line[:350]}")
    return problems

def main(argv: list[str]) -> int:
    if not argv:
        print("ERROR: supply at least one build log path", file=sys.stderr)
        return 2
    failures = []
    for filename in argv:
        path = Path(filename)
        if not path.is_file():
            failures.append(f"Build log missing: {filename}")
            continue
        failures.extend(scan(path))
    if failures:
        print("FAIL: CI requires zero warnings from all build commands")
        for problem in failures:
            print(" - " + problem)
        return 1
    print("OK: zero build warnings detected")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
