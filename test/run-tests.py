#!/usr/bin/env python3
"""Optics Lab - Automated Test Runner
Usage: python test/run-tests.py
"""

import os, sys, re, pathlib

ROOT = pathlib.Path(__file__).parent.parent.resolve()
SIMS = ROOT / "sims"

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

results = []
def ok(msg):
    results.append(("PASS", msg))
    print(f"  {GREEN}[PASS]{RESET} {msg}")
def warn(msg):
    results.append(("WARN", msg))
    print(f"  {YELLOW}[WARN]{RESET} {msg}")
def fail(msg):
    results.append(("FAIL", msg))
    print(f"  {RED}[FAIL]{RESET} {msg}")
def section(title):
    print(f"\n{CYAN}{BOLD}=== {title} ==={RESET}")

def read(path):
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        fail(f"Could not read {path.name}: {e}")
        return ""

# ─────────────────────────────────────────────────────────────
# 1. Required files
# ─────────────────────────────────────────────────────────────
section("1. Required files")
required = [
    "css/main.css", "js/optics.js", "index.html",
    "sims/lens.html", "sims/lens-object.html", "sims/lens-wide.html",
    "sims/mirror.html", "sims/concave.html", "sims/slits.html",
    "sims/eye.html", "sims/3d.html", "sims/practice.html",
    "README.md",
]
for f in required:
    p = ROOT / f
    if p.exists():
        ok(f"Exists: {f}")
    else:
        fail(f"Missing: {f}")

# ─────────────────────────────────────────────────────────────
# 2. _archived folder
# ─────────────────────────────────────────────────────────────
section("2. Archived folder")
arch = ROOT / "_archived"
if arch.exists():
    count = len(list(arch.glob("*.html")))
    ok(f"_archived/ found with {count} HTML files")
else:
    warn("_archived/ not found")

# ─────────────────────────────────────────────────────────────
# 3. Local asset references
# ─────────────────────────────────────────────────────────────
section("3. Local asset references")
pages = list(SIMS.glob("*.html")) + [ROOT / "index.html"]
REF_RE = re.compile(r'(?:href|src)="(\.\.?/[^"#?]+)"')
for pg in pages:
    content = read(pg)
    broken = []
    for m in REF_RE.finditer(content):
        ref = m.group(1)
        abs_path = (pg.parent / ref).resolve()
        # External CDN refs are already filtered by the leading "./"/"../" pattern
        if not abs_path.exists():
            broken.append(ref)
    if broken:
        for b in broken:
            fail(f"{pg.name}: broken ref -> {b}")
    else:
        ok(f"{pg.name}: all local refs OK")

# ─────────────────────────────────────────────────────────────
# 4. HTML structure
# ─────────────────────────────────────────────────────────────
section("4. HTML structure per sim")
for pg in sorted(SIMS.glob("*.html")):
    n = pg.name
    c = read(pg)
    ok(f"{n} DOCTYPE") if "DOCTYPE html" in c else fail(f"{n} missing DOCTYPE")
    ok(f"{n} viewport") if "viewport" in c else warn(f"{n} no viewport meta")
    ok(f"{n} canvas") if "<canvas" in c else fail(f"{n} no <canvas>")
    if n != "practice.html":
        ok(f"{n} mode-switcher") if "mode-switcher" in c else warn(f"{n} no mode-switcher")
    ok(f"{n} optics.js ref") if "optics.js" in c else warn(f"{n} no optics.js ref")
    ok(f'{n} lang="ja"') if 'lang="ja"' in c else warn(f'{n} missing lang="ja"')

# ─────────────────────────────────────────────────────────────
# 5. index.html navigation links
# ─────────────────────────────────────────────────────────────
section("5. index.html nav links")
idx = read(ROOT / "index.html")
for lnk in ["sims/lens.html","sims/mirror.html","sims/concave.html",
            "sims/eye.html","sims/slits.html","sims/3d.html","sims/practice.html"]:
    ok(f"index.html -> {lnk}") if lnk in idx else fail(f"index.html missing: {lnk}")

# ─────────────────────────────────────────────────────────────
# 6. optics.js public API
# ─────────────────────────────────────────────────────────────
section("6. optics.js public API")
js = read(ROOT / "js/optics.js")
apis = [
    "lensEquation","magnification","imageType",
    "drawBackground","drawAxis","drawConvexLens","drawObjectArrow",
    "drawImageArrow","drawFocusPoint","drawRay","drawVirtualRay",
    "bindRange","bindCheckbox","initModeButtons","toggleFullscreen",
    "SimulationBase","OpticsCanvas",
]
for a in apis:
    ok(f"optics.js: {a}") if a in js else fail(f"optics.js missing: {a}")

# ─────────────────────────────────────────────────────────────
# 7. CSS variables & modes
# ─────────────────────────────────────────────────────────────
section("7. CSS variables & modes")
css = read(ROOT / "css/main.css")
for v in ["--color-accent","--color-bg","--color-surface","--font-body",
          "--space-4","--radius","teacher-mode","sheet-mode","@media print"]:
    ok(f"main.css: {v}") if v in css else warn(f"main.css missing: {v}")

# ─────────────────────────────────────────────────────────────
# 8. 3D simulation
# ─────────────────────────────────────────────────────────────
section("8. sims/3d.html (Three.js)")
td = read(SIMS / "3d.html")
ok("Three.js CDN") if "three@" in td else fail("Three.js CDN missing")
ok("OrbitControls") if "OrbitControls" in td else fail("OrbitControls missing")
ok("loadPreset()") if "loadPreset" in td else fail("loadPreset() missing")
ok("preset shadow1") if "shadow1" in td else fail("preset shadow1 missing")
ok("scene.add(") if "scene.add(" in td else fail("Three.js scene.add() not found")

# ─────────────────────────────────────────────────────────────
# 9. Practice problem generator
# ─────────────────────────────────────────────────────────────
section("9. sims/practice.html")
pr = read(SIMS / "practice.html")
ok("generateProblems()") if "generateProblems" in pr else fail("generateProblems() missing")
ok("window.print") if "window.print" in pr else warn("window.print not found")
ok(".problem-card") if "problem-card" in pr else fail(".problem-card missing")
ok("toggleAnswer()") if "toggleAnswer" in pr else fail("toggleAnswer() missing")
ok("lensEquation call") if "Optics.lensEquation" in pr else warn("Optics.lensEquation not in practice.html")

# ─────────────────────────────────────────────────────────────
# 10. Physics formula consistency
# ─────────────────────────────────────────────────────────────
section("10. Physics formula consistency")
# All lens sims should reference the thin lens equation
for pg_name in ["lens.html","lens-object.html","lens-wide.html","concave.html","practice.html"]:
    pg_path = SIMS / pg_name
    if pg_path.exists():
        c = read(pg_path)
        # Should use lensEquation from library OR contain 1/f pattern
        if "lensEquation" in c or "Optics.lensEquation" in c:
            ok(f"{pg_name}: uses lensEquation()")
        elif "1/f" in c or "1/a" in c:
            ok(f"{pg_name}: contains lens formula notation")
        else:
            warn(f"{pg_name}: lens formula reference unclear")

# ─────────────────────────────────────────────────────────────
# 11. File size sanity
# ─────────────────────────────────────────────────────────────
section("11. File sizes")
size_checks = [
    ("css/main.css", 5_000),
    ("js/optics.js", 10_000),
    ("sims/3d.html", 8_000),
    ("sims/practice.html", 8_000),
    ("sims/lens.html", 5_000),
]
for f, min_bytes in size_checks:
    p = ROOT / f
    if p.exists():
        sz = p.stat().st_size
        ok(f"{f}: {sz//1024}KB") if sz >= min_bytes else warn(f"{f}: {sz}B < expected {min_bytes//1024}KB")

# ─────────────────────────────────────────────────────────────
# 12. Old files removed from root
# ─────────────────────────────────────────────────────────────
section("12. Old files not in root")
old_names = [
    "Lens.html","LensWide.html","mirror.html","concave-mirror.html",
    "eye.html","tutorial2_1slit.html","tutorial2_2lights.html","README.html"
]
for f in old_names:
    p = ROOT / f
    if p.exists():
        fail(f"Old file still in root: {f}")
    else:
        ok(f"Cleaned: {f}")

# ─────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────
passed = sum(1 for r in results if r[0] == "PASS")
warned = sum(1 for r in results if r[0] == "WARN")
failed = sum(1 for r in results if r[0] == "FAIL")

print("\n" + "─"*50)
print(f"  {GREEN}PASS: {passed}{RESET}   {YELLOW}WARN: {warned}{RESET}   {RED}FAIL: {failed}{RESET}")
print("─"*50)
if failed == 0:
    print(f"  {GREEN}{BOLD}All tests passed! Ready for manual browser testing.{RESET}")
else:
    print(f"  {RED}{BOLD}{failed} test(s) FAILED.{RESET}")

# Save report
report_path = ROOT / "test" / "last-report.txt"
with open(report_path, "w", encoding="utf-8") as f:
    for status, msg in results:
        f.write(f"{status:<5} {msg}\n")
    f.write(f"\nPASS={passed} WARN={warned} FAIL={failed}\n")
print(f"\n  Report saved: test/last-report.txt\n")

sys.exit(1 if failed > 0 else 0)
