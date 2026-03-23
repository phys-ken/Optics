/**
 * 幾何光学シミュレーション 共通ユーティリティ
 * brush_app ブランチ
 *
 * 主な機能:
 *   - 色テーマ管理 (通常の暗背景 / 印刷用の白背景ハイコントラスト)
 *   - drawSource      光源の描画（グロー＋放射スパイク）
 *   - drawGridDotted  作図用点線グリッド（シートページ用）
 *   - linemaker / endyget  描画ユーティリティ（全ファイル共通）
 *   - 印刷用ボタンの自動注入
 */

// ----- 色テーマ -----
var C = {
    ray:          'yellow',
    source:       'yellow',
    refracted:    'red',
    rayA:         'red',
    rayB:         'green',
    construction: 'blue',
    dark:         'black'
};

var _hcMode = false;
var _defaultBg = '';

/**
 * 印刷用（白背景・ハイコントラスト）モードの切り替え。
 */
function toggleHC() {
    _hcMode = !_hcMode;
    var cvs = document.getElementById('cv');

    if (_hcMode) {
        C.ray    = '#C27A00';
        C.source = '#C27A00';
        cvs.style.backgroundColor = '#FFFFFF';
    } else {
        C.ray    = 'yellow';
        C.source = 'yellow';
        cvs.style.backgroundColor = _defaultBg;
    }

    var btn = document.getElementById('hc-btn');
    if (btn) {
        btn.textContent = _hcMode ? '通常表示に戻す' : '印刷用（白背景）';
        btn.className   = _hcMode ? 'hc-btn hc-active' : 'hc-btn';
    }
}

// ----- ページ読み込み後: ボタンをキャンバスの直前に注入 -----
document.addEventListener('DOMContentLoaded', function () {
    var cvs = document.getElementById('cv');
    if (!cvs) return;

    _defaultBg = cvs.style.backgroundColor || 'rgb(163,166,167)';

    var btn = document.createElement('button');
    btn.id        = 'hc-btn';
    btn.className = 'hc-btn';
    btn.textContent = '印刷用（白背景）';
    btn.onclick   = toggleHC;
    cvs.parentNode.insertBefore(btn, cvs);
});

// ----- 光源の描画 -----
/**
 * 光源を描画する（グロー＋放射スパイク＋ラジアルグラデーション）
 * @param {number} x   中心X
 * @param {number} y   中心Y
 * @param {number} r   半径
 * @param {string} col 塗りつぶし色（省略時は C.source）
 */
function drawSource(x, y, r, col) {
    col = col || C.source;
    var numSpikes = 8;
    var spikeLen  = r * 1.25;
    var lw        = Math.max(1.5, r / 9);

    ctx.save();
    ctx.lineCap = 'round';

    // ── 放射スパイク ──
    ctx.strokeStyle = col;
    ctx.lineWidth   = lw;
    if (!_hcMode) {
        ctx.shadowColor = col;
        ctx.shadowBlur  = r * 2;
    }
    for (var k = 0; k < numSpikes; k++) {
        var angle = (Math.PI * 2 * k) / numSpikes;
        var x1 = x + Math.cos(angle) * (r * 1.1);
        var y1 = y + Math.sin(angle) * (r * 1.1);
        var x2 = x + Math.cos(angle) * (r + spikeLen);
        var y2 = y + Math.sin(angle) * (r + spikeLen);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // ── 円本体（ラジアルグラデーション）──
    var grad = ctx.createRadialGradient(
        x - r * 0.3, y - r * 0.3, r * 0.05,
        x, y, r
    );
    var edgeCol = (col === 'yellow')    ? '#FF9500' :
                  (col === '#C27A00')   ? '#7A4A00' :
                  (col === 'red')       ? '#AA0000' :
                  col;
    grad.addColorStop(0,    'white');
    grad.addColorStop(0.3,  col);
    grad.addColorStop(1,    edgeCol);

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    if (!_hcMode) {
        ctx.shadowColor = col;
        ctx.shadowBlur  = r * 1.5;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // ── 縁取り ──
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth   = Math.max(1.5, r / 10);
    ctx.lineCap     = 'butt';
    ctx.stroke();

    ctx.restore();
}

// ----- 点線グリッドの描画（シートページ用）-----
/**
 * 方眼紙グリッドを点線で描画する
 * @param {number} nx 列数（デフォルト16）
 * @param {number} ny 行数（デフォルト8）
 */
function drawGridDotted(nx, ny) {
    nx = nx || 16;
    ny = ny || 8;
    ctx.save();
    ctx.setLineDash([2, 7]);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth   = 0.8;
    ctx.lineCap     = 'butt';
    var i;
    for (i = 1; i < nx; i++) {
        var gx = (w / nx) * i;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
    }
    for (i = 1; i < ny; i++) {
        var gy = (h / ny) * i;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
    }
    ctx.restore();
}

// ----- 焦点マーカーの描画（教科書スタイル：十字＋中心ドット）-----
/**
 * 焦点位置に十字マーカーを描画する
 * @param {number} x  中心X
 * @param {number} y  中心Y
 * @param {number} sz マーカーの半径（省略時 8）
 */
function drawFocusMarker(x, y, sz) {
    sz = sz || 8;
    ctx.save();
    ctx.strokeStyle = 'black';
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = 'round';
    ctx.beginPath(); ctx.moveTo(x - sz, y); ctx.lineTo(x + sz, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - sz); ctx.lineTo(x, y + sz); ctx.stroke();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, sz * 0.28), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ----- 光軸（両端矢印付き）の描画 -----
/**
 * 光軸を両端矢印付きで描画する（教科書スタイル）
 * グローバル変数 w, h を使用
 * @param {number} [lw=1.5]    光軸の線幅
 */
function drawAxisWithArrows(lw) {
    lw = lw || 1.5;
    var ay = h / 2;
    var aw = Math.max(8, h / 38);
    ctx.save();
    ctx.strokeStyle = 'black';
    ctx.fillStyle   = 'black';
    ctx.lineWidth   = lw;
    ctx.beginPath();
    ctx.moveTo(aw * 1.6, ay);
    ctx.lineTo(w - aw * 1.6, ay);
    ctx.stroke();
    // 左向き矢印
    ctx.beginPath();
    ctx.moveTo(0, ay);
    ctx.lineTo(aw * 1.5, ay - aw * 0.5);
    ctx.lineTo(aw * 1.5, ay + aw * 0.5);
    ctx.closePath();
    ctx.fill();
    // 右向き矢印
    ctx.beginPath();
    ctx.moveTo(w, ay);
    ctx.lineTo(w - aw * 1.5, ay - aw * 0.5);
    ctx.lineTo(w - aw * 1.5, ay + aw * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// ----- 凸レンズ端の矢印（教科書スタイル）-----
/**
 * 凸レンズの上端・下端に矢印を描画する（教科書の表記規則）
 * @param {number} x      レンズのX座標
 * @param {number} top    上端のY座標
 * @param {number} bottom 下端のY座標
 */
function drawLensEndArrows(x, top, bottom) {
    var aw = Math.max(8, h / 38);
    ctx.save();
    ctx.fillStyle = 'black';
    // 上向き矢印
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x - aw * 0.5, top + aw * 1.5);
    ctx.lineTo(x + aw * 0.5, top + aw * 1.5);
    ctx.closePath();
    ctx.fill();
    // 下向き矢印
    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x - aw * 0.5, bottom - aw * 1.5);
    ctx.lineTo(x + aw * 0.5, bottom - aw * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// ----- 共通描画ユーティリティ -----
/**
 * 始点 (x1,y1) と途中点 (x2,y2) を通る直線を x=end まで描画する。
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} end 終点のX座標
 * @param {string} col 線の色
 * @param {number} [lw=2] 線の太さ
 */
function linemaker(x1, y1, x2, y2, end, col, lw) {
    var y3 = ((y2 - y1) * (end - x1) / (x2 - x1)) + y1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(end, y3);
    ctx.strokeStyle = col;
    ctx.lineWidth   = (lw !== undefined) ? lw : 2;
    ctx.stroke();
}

/**
 * 始点 (x1,y1) と途中点 (x2,y2) を通る直線の、x=end におけるY座標を返す。
 */
function endyget(x1, y1, x2, y2, end) {
    return ((y2 - y1) * (end - x1) / (x2 - x1)) + y1;
}
