/**
 * 幾何光学シミュレーション 共通ユーティリティ
 * brush_app ブランチ
 *
 * 主な機能:
 *   - 色テーマ管理 (通常の暗背景 / 印刷用の白背景ハイコントラスト)
 *   - linemaker / endyget  描画ユーティリティ（全ファイル共通）
 *   - 印刷用ボタンの自動注入
 *
 * 各HTMLファイルが読み込む ctx / w / h などの変数は
 * そのファイルのグローバルスコープで定義されているため、
 * ここではアクセス可能。
 */

// ----- 色テーマ -----
// 通常モード（暗めのグレー背景）
var C = {
    ray:          'yellow',  // 入射光線（黄色光源由来）
    source:       'yellow',  // 光源の円の塗りつぶし
    refracted:    'red',     // 屈折・反射後の光線（通常は赤のまま）
    rayA:         'red',     // 光源A（赤）
    rayB:         'green',   // 光源B（緑）
    construction: 'blue',    // 作図用補助線
    dark:         'black'    // 光学素子・軸・スクリーン
};

var _hcMode = false;
var _defaultBg = '';

/**
 * 印刷用（白背景・ハイコントラスト）モードの切り替え。
 * yellow を琥珀色に変換し、キャンバス背景を白に。
 * 赤・緑・青・黒はもともと白背景で視認性が高いため変更しない。
 */
function toggleHC() {
    _hcMode = !_hcMode;
    var cvs = document.getElementById('cv');

    if (_hcMode) {
        // 印刷用モード: 白背景、黄色を琥珀色に
        C.ray          = '#C27A00';  // 琥珀色（白背景で視認できる濃い黄）
        C.source       = '#C27A00';
        cvs.style.backgroundColor = '#FFFFFF';
    } else {
        // 通常モード: 元の色に戻す
        C.ray          = 'yellow';
        C.source       = 'yellow';
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

    // デフォルト背景色を記憶
    _defaultBg = cvs.style.backgroundColor || 'rgb(163,166,167)';

    var btn = document.createElement('button');
    btn.id        = 'hc-btn';
    btn.className = 'hc-btn';
    btn.textContent = '印刷用（白背景）';
    btn.onclick   = toggleHC;
    cvs.parentNode.insertBefore(btn, cvs);
});

// ----- 共通描画ユーティリティ -----
/**
 * 始点 (x1,y1) と途中点 (x2,y2) を通る直線を、x=end まで描画する。
 * lineWidth は呼び出し元で設定するのではなく、ここで 2 に統一。
 * @param {number} x1 始点X
 * @param {number} y1 始点Y
 * @param {number} x2 途中点X
 * @param {number} y2 途中点Y
 * @param {number} end 終点のX座標
 * @param {string} col 線の色
 */
function linemaker(x1, y1, x2, y2, end, col) {
    var y3 = ((y2 - y1) * (end - x1) / (x2 - x1)) + y1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(end, y3);
    ctx.strokeStyle = col;
    ctx.lineWidth   = 2;
    ctx.stroke();
}

/**
 * 始点 (x1,y1) と途中点 (x2,y2) を通る直線の、x=end におけるY座標を返す。
 */
function endyget(x1, y1, x2, y2, end) {
    return ((y2 - y1) * (end - x1) / (x2 - x1)) + y1;
}
