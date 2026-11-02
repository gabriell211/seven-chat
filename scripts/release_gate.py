#!/usr/bin/env python3
"""Production release gate. Do not modify pending statuses without test evidence."""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
CERT = ROOT / "release-certification.json"
APP = ROOT / "app/src/main/java/com/seven/chat/OnlineActivity.java"

REQUIRED_PAGES = ["feed","explore","compose","chats","notifications","saved","profile","stories","reels","groups","rooms","live","calls","gifts","wallet","vip","settings"]
REQUIRED_INTEGRATIONS = ["android-build","backend-build","postgresql-integration","real-two-account-e2e","login-session-revocation","security-authorization","media-storage","rtc-voice-video","purchase-entitlement","moderation-and-abuse","privacy-and-lgpd"]

def main():
    try:
        data = json.loads(CERT.read_text(encoding="utf-8"))
        app = APP.read_text(encoding="utf-8")
    except (OSError, ValueError) as ex:
        print("RELEASE BLOCKED: cannot load certification or app:", ex)
        return 1

    problems = []
    if data.get("policy") != "fail-closed":
        problems.append("Fail-closed certification policy missing.")
    for section, names in [
        ("required_pages", REQUIRED_PAGES),
        ("required_integrations", REQUIRED_INTEGRATIONS),
    ]:
        rows = data.get(section)
        if not isinstance(rows, dict):
            problems.append(section + " missing or invalid")
            continue
        if set(rows) != set(names):
            problems.append(section + " has missing, extra or renamed capabilities")
        for name in names:
            entry = rows.get(name)
            if not isinstance(entry, dict):
                problems.append(name + ": certification not found")
                continue
            if entry.get("status") != "homologated":
                problems.append(name + ": not homologated")
                continue
            evidence = entry.get("evidence")
            if not isinstance(evidence, list) or not evidence:
                problems.append(name + ": no verification evidence")
                continue
            for filepath in evidence:
                if (not isinstance(filepath, str) or filepath.startswith("/") or
                        ".." in pathlib.PurePosixPath(filepath).parts or
                        not filepath.startswith(("backend/src/test/", "app/src/test/",
                                                 "app/src/androidTest/", "qa/")) or
                        not (ROOT / filepath).is_file()):
                    problems.append(name + ": invalid test evidence reference")
    menu = re.search(r'String\[\]\s+routes\s*=\s*\{([^}]+)\}', app, re.S)
    routes = re.findall(r'"([a-z]+)"', menu.group(1)) if menu else []
    if set(routes) != set(REQUIRED_PAGES) or len(routes) != len(REQUIRED_PAGES):
        problems.append("Android menu and required screen inventory differ")
    # Planned or unsupported functionality remains a production blocker.
    if "default: capabilityScreen(next);" in app or "Recurso indisponível" in app:
        problems.append("Android still contains feature-gated unavailable pages")
    if "false, false, false, false" in (ROOT /
            "backend/src/main/java/com/seven/chat/api/SocialService.java").read_text(encoding="utf-8"):
        problems.append("Backend still explicitly reports capabilities as unavailable")
    if problems:
        print("RELEASE REJECTED: production homologation incomplete")
        for problem in problems:
            print(" - " + problem)
        return 1
    print("Release certification manifest accepted. CI must still compile and pass all tests.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
