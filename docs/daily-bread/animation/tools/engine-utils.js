// ============================================================================
// Utilities
const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const easeIn = (x) => Math.pow(clamp01(x), 3);
const easeInOut = (x) => { x = clamp01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const backOut = (x) => { x = clamp01(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const fract = (x) => x - Math.floor(x);
const rad = (d) => d * Math.PI / 180;
function mulberry(seed){ let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const range = (seed, n) => { const r = mulberry(seed); return Array.from({ length: n }, () => r()); };
function noise1(x, seed = 0){ const i = Math.floor(x), f = x - i; const h = (k) => fract(Math.sin((k + seed * 131.7) * 127.1) * 43758.5453); const u = f * f * (3 - 2 * f); return lerp(h(i), h(i + 1), u); }
const quadPts = (a, c, b, n = 10) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; });

// ============================================================================
// Plates. Colours are ink coverages: [cobalt, gold, crimson].
const tone = (b = 0, g = 0, r = 0) => `rgb(${Math.round(clamp01(b) * 255)},${Math.round(clamp01(g) * 255)},${Math.round(clamp01(r) * 255)})`;
class Plates {
  constructor(){
    this.tc = document.createElement('canvas'); this.T = this.tc.getContext('2d');
    this.lc = document.createElement('canvas'); this.L = this.lc.getContext('2d');
  }
  begin(W, H){
    for (const c of [this.tc, this.lc]) { if (c.width !== W) c.width = W; if (c.height !== H) c.height = H; }
    this.W = W; this.H = H; this.A = W / H;
    for (const x of [this.T, this.L]) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.fillStyle = '#000'; x.fillRect(0, 0, W, H); }
    this.L.globalCompositeOperation = 'lighter';
    this.stage(0, .5, 1);
  }
  /** Stage camera: world x centred, y 0..1 down; (cx, cy) is the view centre. */
  stage(cx, cy, z){
    const s = this.H * z;
    this.scale = s;
    for (const x of [this.T, this.L]) x.setTransform(s, 0, 0, s, this.W / 2 - cx * s, this.H / 2 - cy * s);
  }
  save(){ this.T.save(); this.L.save(); }
  restore(){ this.T.restore(); this.L.restore(); this.L.globalCompositeOperation = 'lighter'; }
  clip(path){ this.T.clip(path); this.L.clip(path); }
  /** Opaque tone fill; hides line work beneath. */
  fill(path, b = 0, g = 0, r = 0){
    this.T.globalCompositeOperation = 'source-over'; this.T.fillStyle = typeof b === 'string' || b instanceof CanvasGradient ? b : tone(b, g, r); this.T.fill(path);
    this.L.globalCompositeOperation = 'source-over'; this.L.fillStyle = '#000'; this.L.fill(path); this.L.globalCompositeOperation = 'lighter';
  }
  /** Add ink to one or more tone channels without covering what is there. */
  add(path, b = 0, g = 0, r = 0, alpha = 1){
    this.T.globalCompositeOperation = 'lighter'; this.T.globalAlpha = alpha; this.T.fillStyle = tone(b, g, r); this.T.fill(path);
    this.T.globalAlpha = 1; this.T.globalCompositeOperation = 'source-over';
  }
  /** Solid line work: a ribbon whose width (world units) may vary along it. */
  line(pts, w, b = 1, g = 0, r = 0, closed = false){
    this.L.fillStyle = tone(b, g, r);
    ribbon(this.L, pts, typeof w === 'function' ? w : () => w, closed);
  }
  dot(x, y, rr, b = 1, g = 0, r = 0){ this.L.fillStyle = tone(b, g, r); this.L.beginPath(); this.L.arc(x, y, rr, 0, TAU); this.L.fill(); }
  /** A hairline in px regardless of zoom. */
  px(n){ return n / this.scale; }
}
function ribbon(ctx, pts, wOf, closed = false){
  const n = pts.length; if (n < 2) return;
  const Lp = [], Rp = [];
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = Math.max(0, wOf(i / (n - 1), i)) / 2;
    Lp.push([pts[i][0] - dy * w, pts[i][1] + dx * w]); Rp.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
  }
  ctx.beginPath();
  ctx.moveTo(...Lp[0]); for (let i = 1; i < n; i++) ctx.lineTo(...Lp[i]);
  if (closed) { ctx.closePath(); ctx.moveTo(...Rp[n - 1]); for (let i = n - 2; i >= 0; i--) ctx.lineTo(...Rp[i]); ctx.closePath(); ctx.fill('evenodd'); return; }
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(...Rp[i]);
  ctx.closePath(); ctx.fill();
}
const taper = (w, s = .25, e = .2) => (t) => w * Math.min(1, t / s + .1, (1 - t) / e + .1);
const pathOf = (pts, close = true) => { const p = new Path2D(); p.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) p.lineTo(...pts[i]); if (close) p.closePath(); return p; };
const circle = (x, y, r) => { const p = new Path2D(); p.arc(x, y, r, 0, TAU); return p; };
const ellipse = (x, y, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot, 0, TAU); return p; };
const rect = (x, y, w, h) => { const p = new Path2D(); p.rect(x, y, w, h); return p; };
function vgrad(P, y0, y1, stops){ const g = P.T.createLinearGradient(0, y0, 0, y1); for (const [o, c] of stops) g.addColorStop(o, tone(...c)); return g; }
function rgrad(P, x, y, r0, r1, stops){ const g = P.T.createRadialGradient(x, y, r0, x, y, r1); for (const [o, c] of stops) g.addColorStop(o, tone(...c)); return g; }

