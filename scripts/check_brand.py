#!/usr/bin/env python3
"""Guard the single SVG master against diverging Android app icon artwork."""
from pathlib import Path
from xml.etree import ElementTree as ET
import sys

ROOT = Path(__file__).resolve().parents[1]
ANDROID = "{http://schemas.android.com/apk/res/android}"
SVG = "{http://www.w3.org/2000/svg}"
errors = []

def parse(relative):
    try:
        return ET.parse(ROOT / relative).getroot()
    except (OSError, ET.ParseError) as ex:
        errors.append(f"{relative}: {ex}")
        return None

def ribbons(root, name, attr):
    if root is None:
        return []
    return [node.get(attr) for node in root.iter(name)
            if (node.get(attr) or "").startswith(("M 36 78 ", "M 72.9 29.7 "))]

master = None
for theme in ["light", "dark"]:
    svg = parse(f"branding/seven-chat-icon-{theme}.svg")
    paths = ribbons(svg, SVG + "path", "d")
    if len(paths) != 2:
        errors.append(f"{theme} SVG must contain exactly two master ribbons")
    if master is None:
        master = paths
    elif master != paths:
        errors.append(f"SVG ribbon geometry differs between {theme} themes")

for relative in (
    "app/src/main/res/drawable/ic_launcher.xml",
    "app/src/main/res/drawable-night/ic_launcher.xml",
    "app/src/main/res/drawable/ic_launcher_foreground.xml",
    "app/src/main/res/drawable-night/ic_launcher_foreground.xml",
    "app/src/main/res/drawable/ic_launcher_monochrome.xml",
    "app/src/main/res/mipmap-anydpi/ic_launcher.xml",
    "app/src/main/res/mipmap-night-anydpi/ic_launcher.xml",
):
    xml = parse(relative)
    if xml is None:
        continue
    if xml.tag != "vector":
        errors.append(f"{relative}: not a vector drawable")
    if ribbons(xml, "path", ANDROID + "pathData") != master:
        errors.append(f"{relative}: artwork does not match master SVG")

adaptive = parse("app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml")
if adaptive is not None:
    expected = {"background": "@color/seven_launcher_background",
                "foreground": "@drawable/ic_launcher_foreground",
                "monochrome": "@drawable/ic_launcher_monochrome"}
    actual = {tag.tag: tag.get(ANDROID + "drawable") for tag in adaptive}
    if adaptive.tag != "adaptive-icon" or actual != expected:
        errors.append("Adaptive icon is missing background, foreground or monochrome")

for folder in ["values", "values-night"]:
    xml = parse(f"app/src/main/res/{folder}/colors.xml")
    if xml is not None and not any(node.get("name") == "seven_launcher_background"
                                   for node in xml.iter("color")):
        errors.append(f"{folder}: missing adaptive background color")

manifest = parse("app/src/main/AndroidManifest.xml")
if manifest is not None:
    app = manifest.find("application")
    if app is None or app.get(ANDROID + "icon") != "@mipmap/ic_launcher":
        errors.append("Manifest does not reference the adaptive launcher")

if errors:
    print("Seven Chat logo check FAILED:")
    for issue in errors:
        print(" -", issue)
    sys.exit(1)
print("OK: two SVG masters and 7 native Android vectors share exact artwork.")
