# Optics Lab - Auto Test Script
# Usage: cd test; powershell -ExecutionPolicy Bypass -File run-tests.ps1

$root = Split-Path $PSScriptRoot -Parent
$pass = 0; $fail = 0; $warns = 0
$report = @()

function Pass($msg) {
    $script:pass++
    $script:results += [PSCustomObject]@{ Status = "PASS"; Message = $msg }
    Write-Host "[PASS] $msg" -ForegroundColor Green
}
function Fail($msg) {
    $script:fail++
    $script:results += [PSCustomObject]@{ Status = "FAIL"; Message = $msg }
    Write-Host "[FAIL] $msg" -ForegroundColor Red
}
function Warn($msg) {
    $script:warns++
    $script:results += [PSCustomObject]@{ Status = "WARN"; Message = $msg }
    Write-Host "[WARN] $msg" -ForegroundColor Yellow
}
function Section($title) {
    Write-Host "`n═══ $title ═══" -ForegroundColor Cyan
}

# ── 1. ファイル存在チェック ────────────────────────────────
Section "1. ファイル存在チェック"

$required = @(
    "css\main.css",
    "js\optics.js",
    "index.html",
    "sims\lens.html",
    "sims\lens-object.html",
    "sims\lens-wide.html",
    "sims\mirror.html",
    "sims\concave.html",
    "sims\slits.html",
    "sims\eye.html",
    "sims\3d.html",
    "sims\practice.html",
    "README.md"
)
foreach ($f in $required) {
    $path = Join-Path $root $f
    if (Test-Path $path) { Pass "存在: $f" }
    else                 { Fail "見つからない: $f" }
}

# ── 2. _archived フォルダ確認 ──────────────────────────────
Section "2. アーカイブ確認"
$archived = Join-Path $root "_archived"
if (Test-Path $archived) {
    $count = (Get-ChildItem $archived -Filter "*.html").Count
    Pass "_archived/ あり ($count ファイル)"
} else {
    Warn "_archived/ が存在しない"
}

# ── 3. CSS/JS 参照チェック ─────────────────────────────────
Section "3. CSS/JS 参照チェック"
$pages = Get-ChildItem (Join-Path $root "sims") -Filter "*.html"
$pages += Get-Item (Join-Path $root "index.html")

foreach ($page in $pages) {
    $content = Get-Content $page.FullName -Raw
    $dir = $page.DirectoryName

    # href/src の相対パスを抽出
    $refs = [regex]::Matches($content, '(?:href|src)="([^"#?]+)"') | ForEach-Object { $_.Groups[1].Value }
    foreach ($ref in $refs) {
        if ($ref -match '^https?://') { continue }  # 外部URLはスキップ
        if ($ref -match '^\.\./') {
            $absPath = [System.IO.Path]::GetFullPath((Join-Path $dir $ref))
        } elseif ($ref -match '^/') {
            continue  # 絶対パスはスキップ
        } else {
            $absPath = [System.IO.Path]::GetFullPath((Join-Path $dir $ref))
        }
        if (-not (Test-Path $absPath)) {
            Fail "$($page.Name): 参照先が見つからない → $ref"
        }
    }
}
Pass "全ページのローカル参照チェック完了"

# ── 4. HTML 構造チェック ───────────────────────────────────
Section "4. HTML 構造チェック"
$simPages = Get-ChildItem (Join-Path $root "sims") -Filter "*.html"

foreach ($page in $simPages) {
    $name = $page.Name
    $c = Get-Content $page.FullName -Raw

    # DOCTYPE
    if ($c -match '<!DOCTYPE html>') { Pass "$name: DOCTYPE あり" }
    else { Warn "$name: DOCTYPE が見当たらない" }

    # viewport meta
    if ($c -match 'name="viewport"') { Pass "$name: viewport meta あり" }
    else { Warn "$name: viewport meta なし" }

    # canvas 要素（3D以外は<canvas id="mainCanvas">、3D は <canvas id="canvas3d">）
    if ($c -match '<canvas') { Pass "$name: <canvas> 要素あり" }
    else { Fail "$name: <canvas> 要素が見つからない" }

    # mode-switcher（practiceは不要）
    if ($name -ne "practice.html") {
        if ($c -match 'mode-switcher') { Pass "$name: mode-switcher あり" }
        else { Warn "$name: mode-switcher が見当たらない" }
    }

    # optics.js 読み込み確認
    if ($c -match 'optics\.js') { Pass "$name: optics.js 参照あり" }
    else { Warn "$name: optics.js 参照なし" }

    # lang="ja"
    if ($c -match 'lang="ja"') { Pass "$name: lang=ja あり" }
    else { Warn "$name: lang=ja なし" }
}

# index.html 追加チェック
$idx = Get-Content (Join-Path $root "index.html") -Raw
if ($idx -match 'sims/lens\.html')    { Pass "index.html: lens.html へのリンクあり" }
else { Fail "index.html: lens.html リンクなし" }
if ($idx -match 'sims/3d\.html')      { Pass "index.html: 3d.html へのリンクあり" }
else { Fail "index.html: 3d.html リンクなし" }
if ($idx -match 'sims/practice\.html') { Pass "index.html: practice.html へのリンクあり" }
else { Fail "index.html: practice.html リンクなし" }

# ── 5. optics.js API チェック ──────────────────────────────
Section "5. optics.js API チェック"
$opticsJs = Get-Content (Join-Path $root "js\optics.js") -Raw

$apiChecks = @(
    "lensEquation",
    "magnification",
    "imageType",
    "drawBackground",
    "drawAxis",
    "drawConvexLens",
    "drawObjectArrow",
    "drawImageArrow",
    "drawFocusPoint",
    "drawRay",
    "drawVirtualRay",
    "bindRange",
    "bindCheckbox",
    "initModeButtons",
    "toggleFullscreen",
    "SimulationBase"
)
foreach ($api in $apiChecks) {
    if ($opticsJs -match $api) { Pass "optics.js: $api() 定義あり" }
    else { Fail "optics.js: $api が見つからない" }
}

# ── 6. CSS 変数チェック ────────────────────────────────────
Section "6. CSS 変数チェック"
$css = Get-Content (Join-Path $root "css\main.css") -Raw
$cssVars = @("--color-accent","--color-bg","--color-surface","--color-border",
             "--font-body","--space-4","--radius","--shadow-md")
foreach ($v in $cssVars) {
    if ($css -match [regex]::Escape($v)) { Pass "main.css: $v 定義あり" }
    else { Warn "main.css: $v が見当たらない" }
}

# モードクラス確認
if ($css -match "teacher-mode") { Pass "main.css: .teacher-mode スタイルあり" }
else { Warn "main.css: .teacher-mode なし" }
if ($css -match "sheet-mode")   { Pass "main.css: .sheet-mode スタイルあり" }
else { Warn "main.css: .sheet-mode なし" }
if ($css -match "@media print") { Pass "main.css: @media print あり" }
else { Warn "main.css: @media print なし" }

# ── 7. Three.js 参照 (3d.html) ───────────────────────────
Section "7. Three.js 参照チェック (sims/3d.html)"
$td = Get-Content (Join-Path $root "sims\3d.html") -Raw
if ($td -match "three@0\.") { Pass "3d.html: Three.js CDN 参照あり" }
else { Fail "3d.html: Three.js 参照なし" }
if ($td -match "OrbitControls") { Pass "3d.html: OrbitControls 参照あり" }
else { Fail "3d.html: OrbitControls なし" }
if ($td -match "loadPreset") { Pass "3d.html: loadPreset() 定義あり" }
else { Fail "3d.html: loadPreset() なし" }

# ── 8. 練習問題ジェネレーター (practice.html) ────────────
Section "8. practice.html チェック"
$pr = Get-Content (Join-Path $root "sims\practice.html") -Raw
if ($pr -match "generateProblems") { Pass "practice.html: generateProblems() あり" }
else { Fail "practice.html: generateProblems() なし" }
if ($pr -match "window\.print") { Pass "practice.html: 印刷機能あり" }
else { Warn "practice.html: window.print() 参照なし" }
if ($pr -match "problem-card") { Pass "practice.html: .problem-card クラスあり" }
else { Fail "practice.html: .problem-card なし" }
if ($pr -match "toggleAnswer") { Pass "practice.html: 解答表示切替あり" }
else { Fail "practice.html: toggleAnswer なし" }

# ── 9. ファイルサイズチェック ─────────────────────────────
Section "9. ファイルサイズ確認"
$sizeChecks = @(
    @{ Path = "css\main.css";      MinKB = 5 },
    @{ Path = "js\optics.js";      MinKB = 10 },
    @{ Path = "sims\3d.html";      MinKB = 8 },
    @{ Path = "sims\practice.html";MinKB = 8 }
)
foreach ($sc in $sizeChecks) {
    $p = Join-Path $root $sc.Path
    if (Test-Path $p) {
        $kb = [Math]::Round((Get-Item $p).Length / 1KB, 1)
        if ($kb -ge $sc.MinKB) { Pass "$($sc.Path): ${kb}KB (>= $($sc.MinKB)KB)" }
        else { Warn "$($sc.Path): ${kb}KB — 期待より小さい (>= $($sc.MinKB)KB 想定)" }
    }
}

# ── 集計 ──────────────────────────────────────────────────
Write-Host "`n" + ("─" * 50) -ForegroundColor DarkGray
Write-Host "テスト結果サマリー" -ForegroundColor White
Write-Host "  PASS : $pass" -ForegroundColor Green
Write-Host "  WARN : $warns" -ForegroundColor Yellow
Write-Host "  FAIL : $fail" -ForegroundColor Red
Write-Host ("─" * 50) -ForegroundColor DarkGray

if ($fail -eq 0) {
    Write-Host "`n✅ 全テスト合格！手動テストの準備ができています。" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  $fail 件の失敗があります。内容を確認してください。" -ForegroundColor Red
}

# レポートをファイルに保存
$reportPath = Join-Path $root "test\last-report.txt"
$results | ForEach-Object { "$($_.Status)  $($_.Message)" } | Out-File $reportPath -Encoding UTF8
Write-Host "`nレポート保存先: test\last-report.txt" -ForegroundColor Cyan
