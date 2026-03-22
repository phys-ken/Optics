/**
 * optics.js — Geometric Optics Simulation Core Library
 * 幾何光学シミュレーション共通ライブラリ
 */

'use strict';

/* ============================================================
   1. Physics / Math Utilities
============================================================ */

const Optics = {
  /**
   * 薄レンズ公式 (1/f = 1/a + 1/b)
   * a: 物体距離, f: 焦点距離 → b: 像距離
   */
  lensEquation(a, f) {
    if (Math.abs(a - f) < 0.001) return Infinity;
    return (f * a) / (a - f);
  },

  /**
   * 倍率 m = -b/a
   */
  magnification(a, b) {
    if (Math.abs(a) < 0.001) return 0;
    return -b / a;
  },

  /**
   * 鏡の公式（凹面鏡）: 1/f = 1/a + 1/b  (反射)
   */
  mirrorEquation(a, f) {
    return this.lensEquation(a, f); // 同じ形式
  },

  /**
   * 像の種類の判定
   * isReal: 実像かどうか
   * isUpright: 正立かどうか
   */
  imageType(m) {
    return {
      isReal: m < 0,
      isUpright: m > 0,
      label: m < 0 ? '実像' : '虚像',
      orientation: m > 0 ? '正立' : '倒立',
    };
  },

  /**
   * レンズを通過した後の光線座標を計算
   * src: {x, y} 光源座標
   * lensX: レンズのX位置
   * hitY: レンズ面との交点Y
   * imgX, imgY: 像の位置
   * Returns endpoint {x, y}
   */
  refractedRayEndpoint(lensX, hitY, imgX, imgY, canvasW) {
    if (imgX === Infinity || imgX === -Infinity) {
      // 焦点上にある場合 → 平行光線
      const dy = hitY - imgY;
      const dx = 1;
      const t = (canvasW - lensX) / dx;
      return { x: lensX + t, y: hitY - dy * t }; // parallel
    }
    const dx = imgX - lensX;
    const dy = imgY - hitY;
    if (Math.abs(dx) < 0.001) return { x: lensX, y: hitY };
    const t = (canvasW * 2 - lensX) / dx;
    return { x: lensX + dx * t, y: hitY + dy * t };
  },
};


/* ============================================================
   2. Canvas 2D Drawing Utilities
============================================================ */

class OpticsCanvas {
  constructor(canvasEl) {
    this.cvs = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this._resize();
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(canvasEl.parentElement || canvasEl);
  }

  _resize() {
    const parent = this.cvs.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight || Math.round(w * 9 / 16);
    if (this.cvs.width !== w || this.cvs.height !== h) {
      this.cvs.width = w;
      this.cvs.height = h;
      this.w = w;
      this.h = h;
      if (this.onResize) this.onResize(w, h);
    }
    this.w = this.cvs.width;
    this.h = this.cvs.height;
  }

  get width() { return this.cvs.width; }
  get height() { return this.cvs.height; }

  clear() {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  // 背景（ダーク）
  drawBackground(color = '#1a1a2e') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  // グリッドライン
  drawGrid(spacing = 40, color = 'rgba(255,255,255,0.04)') {
    const { ctx, w, h } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x += spacing) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let y = 0; y < h; y += spacing) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();
  }

  // 光軸
  drawAxis(color = 'rgba(255,255,255,0.2)') {
    const { ctx, w, h } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 点光源
  drawPointSource(x, y, r = 10, color = '#ffd700') {
    const { ctx } = this;
    // グロー効果
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    grd.addColorStop(0, color);
    grd.addColorStop(0.4, color + 'aa');
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
    // コア
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // 矢印つき物体（光源として）
  drawObjectArrow(x, tipY, baseY, color = '#ffd700', r = 6) {
    const { ctx } = this;
    const midY = (tipY + baseY) / 2;
    // 矢印の軸
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, tipY);
    ctx.stroke();
    // 矢尻
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, tipY);
    ctx.lineTo(x - r, tipY + r * 2);
    ctx.lineTo(x + r, tipY + r * 2);
    ctx.closePath();
    ctx.fill();
    // グロー
    const grd = ctx.createRadialGradient(x, midY, 0, x, midY, r * 5);
    grd.addColorStop(0, color + '33');
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(x, midY, r * 5, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  }

  // 凸レンズ
  drawConvexLens(x, h, color = '#60a5fa', lensH = null) {
    const { ctx } = this;
    const lh = lensH || h * 0.5;
    const top = (h - lh) / 2;
    const bot = (h + lh) / 2;
    const bulge = lh / 3;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.quadraticCurveTo(x + bulge, h / 2, x, bot);
    ctx.quadraticCurveTo(x - bulge, h / 2, x, top);
    ctx.closePath();
    const grd = ctx.createLinearGradient(x - bulge, 0, x + bulge, 0);
    grd.addColorStop(0, color + '22');
    grd.addColorStop(0.5, color + '55');
    grd.addColorStop(1, color + '22');
    ctx.fillStyle = grd;
    ctx.fill();
    ctx.stroke();

    // 矢印
    const arrowLen = lh / 5;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x - 5, top + 12);
    ctx.moveTo(x, top);
    ctx.lineTo(x + 5, top + 12);
    ctx.moveTo(x, bot);
    ctx.lineTo(x - 5, bot - 12);
    ctx.moveTo(x, bot);
    ctx.lineTo(x + 5, bot - 12);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 平面鏡
  drawPlainMirror(x, h, color = '#94a3b8') {
    const { ctx } = this;
    const padding = h * 0.1;
    // 反射面
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, h - padding);
    ctx.stroke();
    // ハッチング
    ctx.strokeStyle = color + '66';
    ctx.lineWidth = 1.5;
    for (let y = padding; y < h - padding; y += 12) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 10, y + 10);
      ctx.stroke();
    }
  }

  // 凹面鏡（放物線）
  drawConcaveMirror(x, h, f, color = '#94a3b8') {
    const { ctx } = this;
    const R = f * 2; // 曲率半径
    const mirrorH = h * 0.6;
    const top = (h - mirrorH) / 2;
    const bot = (h + mirrorH) / 2;
    // 凹面：放物線近似
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    // y-center = h/2, x = x - (y-h/2)^2 / (2R)
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const y = top + (mirrorH * i / steps);
      const dy = y - h / 2;
      const ox = dy * dy / (2 * R);
      const px = x - ox;
      if (i === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
    // ハッチング
    ctx.strokeStyle = color + '55';
    ctx.lineWidth = 1.5;
    const hatchSteps = Math.floor(mirrorH / 10);
    for (let i = 0; i < hatchSteps; i++) {
      const y = top + (mirrorH * i / hatchSteps);
      const dy = y - h / 2;
      const ox = dy * dy / (2 * R);
      const px = x - ox;
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px + 10, y + 10);
      ctx.stroke();
    }
  }

  // スリット
  drawSlit(x, h, holeTop, holeBot, color = '#64748b') {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.fillRect(x - 4, 0, 8, holeTop);
    ctx.fillRect(x - 4, holeBot, 8, h - holeBot);
  }

  // スクリーン
  drawScreen(x, h, color = '#334155') {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.fillRect(x, 0, 8, h);
    ctx.fillStyle = color + 'aa';
    ctx.fillRect(x + 8, 0, 4, h);
  }

  // 焦点マーカー
  drawFocusPoint(x, y, color = '#fbbf24', label = 'F') {
    const { ctx } = this;
    const r = 5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    // ラベル
    ctx.fillStyle = color;
    ctx.font = `bold 12px var(--font-mono, monospace)`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - r - 4);
  }

  // 寸法線（距離ラベル）
  drawDimensionLine(x1, x2, y, label, color = 'rgba(255,255,255,0.4)') {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, (x1 + x2) / 2, y - 5);
  }

  // 光線（単純な線）
  drawRay(x1, y1, x2, y2, color = '#ffd700', width = 1.5, alpha = 1) {
    const { ctx } = this;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 仮想延長線（点線）
  drawVirtualRay(x1, y1, x2, y2, color = 'rgba(255,100,100,0.5)', width = 1.5) {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 像（半透明の矢印）
  drawImageArrow(x, tipY, baseY, color = 'rgba(100,200,255,0.7)', r = 5) {
    this.drawObjectArrow(x, tipY, baseY, color, r);
  }

  // テキストラベル
  drawLabel(x, y, text, color = 'rgba(255,255,255,0.6)', fontSize = 12, align = 'center') {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
  }
}


/* ============================================================
   3. Simulation Base Class
============================================================ */

class SimulationBase {
  constructor(canvasEl, options = {}) {
    this.oc = new OpticsCanvas(canvasEl);
    this.options = options;
    this._animId = null;
    this._running = false;
    this.paused = false;
    this.mode = 'student'; // 'student' | 'teacher' | 'sheet'
    this.showConstruction = false;
    this._infoCallback = null;

    this.oc.onResize = (w, h) => {
      this._onResize(w, h);
      this._initPositions();
    };
  }

  _onResize(w, h) {}
  _initPositions() {}

  start() {
    if (this._running) return;
    this._running = true;
    const loop = () => {
      if (!this.paused) this._draw();
      this._animId = requestAnimationFrame(loop);
    };
    this._animId = requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
    if (this._animId) cancelAnimationFrame(this._animId);
  }

  _draw() {}

  setMode(mode) {
    this.mode = mode;
    document.body.classList.remove('teacher-mode', 'sheet-mode', 'student-mode');
    if (mode === 'teacher') document.body.classList.add('teacher-mode');
    if (mode === 'sheet') document.body.classList.add('sheet-mode');
  }

  onInfoUpdate(cb) {
    this._infoCallback = cb;
  }

  _reportInfo(data) {
    if (this._infoCallback) this._infoCallback(data);
  }

  // キャンバス座標から物理スケール座標への変換
  toPhysical(px, canvasRef = 100) {
    return (px / this.oc.width) * canvasRef;
  }

  toCanvas(physical, canvasRef = 100) {
    return (physical / canvasRef) * this.oc.width;
  }

  // 光線の放射（スクリーンまで延長する）
  _extendLine(x1, y1, x2, y2, maxX) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (Math.abs(dx) < 0.001) return { x: x2, y: y2 + (dy > 0 ? maxX : -maxX) };
    const t = (maxX - x1) / dx;
    return { x: maxX, y: y1 + dy * t };
  }
}


/* ============================================================
   4. UI Helpers
============================================================ */

const UI = {
  /**
   * スライダーと表示値を連動
   */
  bindRange(sliderId, outputId, callback) {
    const slider = document.getElementById(sliderId);
    const output = document.getElementById(outputId);
    if (!slider) return;
    const update = () => {
      if (output) output.textContent = slider.value;
      if (callback) callback(parseFloat(slider.value));
    };
    slider.addEventListener('input', update);
    update();
    return slider;
  },

  /**
   * モード切替ボタンを初期化
   */
  initModeButtons(containerSel, sim) {
    const container = document.querySelector(containerSel);
    if (!container) return;
    container.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sim.setMode(btn.dataset.mode);
      });
    });
  },

  /**
   * info-panel の値を更新
   */
  updateInfo(data) {
    Object.entries(data).forEach(([key, value]) => {
      const el = document.getElementById(`info-${key}`);
      if (!el) return;
      if (value === Infinity || value === -Infinity || isNaN(value)) {
        el.textContent = '∞';
        el.className = 'info-row__value infinity';
      } else {
        const num = parseFloat(value.toFixed(1));
        el.textContent = `${num > 0 ? '+' : ''}${num}`;
        el.className = `info-row__value ${num > 0 ? 'positive' : num < 0 ? 'negative' : ''}`;
      }
    });
  },

  /**
   * チェックボックスのバインド
   */
  bindCheckbox(id, callback) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => callback(el.checked));
    return el;
  },

  /**
   * fullscreen toggle
   */
  toggleFullscreen(el) {
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  },
};


/* ============================================================
   5. Export
============================================================ */

window.Optics = Optics;
window.OpticsCanvas = OpticsCanvas;
window.SimulationBase = SimulationBase;
window.UI = UI;
