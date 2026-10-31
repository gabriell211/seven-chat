#!/usr/bin/env python3
"""Asset check, separate from APK build and visual device homologation."""
from pathlib import Path
from xml.etree import ElementTree as ET
import sys

ROOT = Path(__file__).resolve().parents[1]
BRANDING = ROOT / "branding"
RES = ROOT / "app/src/main/res"
ANDROID = "{http://schemas.android.com/apk/res/android}"

svg_files = [
    BRANDING / "seven-chat-light.svg",
    BRANDING / "seven-chat-dark.svg",
    BRANDING / "seven-chat-light-symbol.svg",
    BRANDING / "seven-chat-dark-symbol.svg",
]
android_files = [
    RES / "drawable/ic_launcher.xml",
    RES / "drawable-night/ic_launcher.xml",
    RES / "drawable/seven_launcher_foreground.xml",
    RES / "drawable-night/seven_launcher_foreground.xml",
    RES / "drawable/seven_launcher_monochrome.xml",
    RES / "drawable-anydpi-v26/ic_launcher.xml",
    RES / "values/colors.xml",
    RES / "values-night/colors.xml",
]
errors = []

for path in svg_files + android_files:
    try:
        ET.parse(path)
    except (ET.ParseError, OSError) as exc:
        errors.append(f"{path.relative_to(ROOT)}: invalid XML ({exc})")

for path in svg_files:
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    if text.count("<circle ") != 3 or "viewBox=\"0 0 1024 1024\"" not in text:
        errors.append(f"{path.name}: missing three dots or scalable icon canvas")
    if "<text" in text.lower():
        errors.append(f"{path.name}: icon must be standalone symbol, no lettering")

icon = RES / "drawable-anydpi-v26/ic_launcher.xml"
if icon.exists():
    root = ET.parse(icon).getroot()
    if root.tag != "adaptive-icon":
        errors.append("API 26 launcher is not an adaptive-icon")
    for tag in ["background", "foreground", "monochrome"]:
        if root.find(tag) is None:
            errors.append(f"adaptive launcher missing {tag}")

for mode in ["values", "values-night"]:
    f = RES / mode / "colors.xml"
    if f.exists() and "seven_launcher_background" not in f.read_text(encoding="utf-8"):
        errors.append(f"{mode}: missing launcher background")

manifest = ROOT / "app/src/main/AndroidManifest.xml"
if manifest.exists():
    text = manifest.read_text(encoding="utf-8")
    if '@drawable/ic_launcher' not in text:
        errors.append("Manifest must point to stable launcher resource")
else:
    errors.append("AndroidManifest missing")

if errors:
    print("Seven Chat brand check FAILED:")
    for err in errors:
        print(" -", err)
    sys.exit(1)
print("Seven Chat brand check OK: 4 vector SVG + 8 Android theme/adaptive resources")
