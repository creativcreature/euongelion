// ============================================================================
// VERSION 3 — THE EXPLAINER
// A Vox-style data story of Matthew 13:3–8. A field plan draws itself like a map; an
// Isotype sower walks the route and throws four seeds; the camera whips to each one
// and an inset card explains its fate; a ledger tallies the outcomes; the good seed's
// yield is counted in dot grids of thirty, sixty and a hundred. No words or numerals.

const LOOP = 24.5;
const easeInOutExpo = (x) => { x = clamp01(x); if (x === 0 || x === 1) return x; return x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; };
const pop = (t, t0, d = .45) => backOut((t - t0) / d);                     // 0 → overshoot → 1
const win = (t, t0, t1) => clamp01((t - t0) / (t1 - t0));
const bounceOut = (x) => { x = clamp01(x); const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + .75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + .9375; return n * (x -= 2.625 / d) * x + .984375; };
/** A seed dropping into a card from above, with a bounce and a dust ring. */
function dropSeed(P, x, y, lt, s = .02){
  const k = bounceOut(win(lt, .04, .34));
  if (lt < .04) return false;
  seedDot(P, x, lerp(y - .32, y, k), s, 1);
  const land = win(lt, .2, .5);
  if (land > 0 && land < 1) ring(P, x, y + s * .3, s * (1.2 + 2.6 * easeOut(land)), LW(P, 2.2 * (1 - land)), 1, .2, 0);
  return true;
}

// ---- geometry helpers -------------------------------------------------------
function cum(pts){ const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return d; }
function partial(pts, p){
  p = clamp01(p); if (p <= 0 || pts.length < 2) return [];
  const d = cum(pts), L = d[d.length - 1] * p, out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (d[i] >= L) { const k = (L - d[i - 1]) / ((d[i] - d[i - 1]) || 1); out.push([lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]); return out; }
    out.push(pts[i]);
  }
  return out;
}
function dashes(pts, dash, gap, p = 1){
  const d = cum(pts), total = d[d.length - 1] * clamp01(p), segs = [];
  for (let s = 0; s < total; s += dash + gap) {
    const e = Math.min(total, s + dash), seg = [];
    const at = (L) => { for (let i = 1; i < pts.length; i++) if (d[i] >= L) { const k = (L - d[i - 1]) / ((d[i] - d[i - 1]) || 1); return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; } return pts[pts.length - 1]; };
    for (let k = 0; k <= 3; k++) seg.push(at(lerp(s, e, k / 3)));
    segs.push(seg);
  }
  return segs;
}
const cubicPts = (a, c1, c2, b, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0], u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1]]; });
function roundRectPath(x, y, w, h, r){ const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; }
function roundRectPts(x, y, w, h, r, n = 6){
  const pts = [], arc = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
  pts.push(pts[0]);
  return pts;
}
function arrowHead(P, pts, size, b = 1, g = 0, r = 0){
  if (pts.length < 2) return;
  const a = pts[pts.length - 1], z = pts[Math.max(0, pts.length - 3)];
  let dx = a[0] - z[0], dy = a[1] - z[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  P.L.fillStyle = tone(b, g, r); P.L.beginPath();
  P.L.moveTo(a[0] + dx * size * .4, a[1] + dy * size * .4);
  P.L.lineTo(a[0] - dx * size + -dy * size * .55, a[1] - dy * size + dx * size * .55);
  P.L.lineTo(a[0] - dx * size * .55, a[1] - dy * size * .55);
  P.L.lineTo(a[0] - dx * size - -dy * size * .55, a[1] - dy * size - dx * size * .55);
  P.L.closePath(); P.L.fill();
}
const LW = (P, n) => P.px(n * P.W / 1500);                                 // resolution-independent hairline

// ---- icons (all geometric, drawn from primitives) ----------------------------
function seedDot(P, x, y, s, k = 1){
  if (k <= 0) return;
  P.fill(ellipse(x, y, s * 1.25 * k, s * .8 * k, -.5), 0, .95, .1);
  P.line(pathPts(ellipse2pts(x, y, s * 1.25 * k, s * .8 * k, -.5)), LW(P, 1.6), 1, 0, 0, true);
}
function ellipse2pts(x, y, rx, ry, rot, n = 20){ const c = Math.cos(rot), s = Math.sin(rot); return Array.from({ length: n }, (_, i) => { const a = i / n * TAU; const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry; return [x + ex * c - ey * s, y + ex * s + ey * c]; }); }
const pathPts = (p) => p;
function ring(P, x, y, r, w, b = 1, g = 0, rr = 0, n = 40){ P.line(ellipse2pts(x, y, r, r, 0, n), w, b, g, rr, true); }
function sunIcon(P, x, y, r, k = 1, t = 0){
  if (k <= 0) return;
  P.fill(circle(x, y, r * k), 0, .95, .25);
  ring(P, x, y, r * k, LW(P, 2), 1, 0, 0);
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * .4; const r0 = r * k * 1.3, r1 = r * k * (1.75 + .15 * Math.sin(t * 6 + i)); P.line([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], LW(P, 2.4), 0, .9, .25); }
}
function birdSide(P, x, y, s, dir, flap, carry = false){
  // body, head, beak, tail, wing: a pictogram crow
  const B = (bx, by) => [x + bx * s * dir, y + by * s];
  P.fill(pathOf([B(-.55, -.02), B(-.1, -.28), B(.3, -.22), B(.52, -.05), B(.3, .16), B(-.2, .18)]), .95, 0, 0);
  P.fill(circle(...B(.42, -.28), s * .2), .95, 0, 0);
  P.fill(pathOf([B(.58, -.34), B(.92, -.24), B(.58, -.18)]), 0, .95, .2);
  P.fill(circle(...B(.46, -.31), s * .045), 0, 0, 0);
  P.fill(pathOf([B(-.5, -.05), B(-.95, -.22), B(-.9, .12)]), .95, 0, 0);
  const w = Math.sin(flap);
  P.fill(pathOf([B(.12, -.18), B(-.1, -.2 - .75 * w), B(-.55, -.25 - .95 * w), B(-.28, -.05)]), .72, 0, 0);
  P.line([B(.12, -.18), B(-.1, -.2 - .75 * w), B(-.55, -.25 - .95 * w)], LW(P, 1.6), 1, 0, 0);
  if (carry) seedDot(P, ...B(.95, -.24), s * .09);
}
function thornStem(P, pts, p, spikeEvery, spikeLen, w){
  const part = partial(pts, p);
  if (part.length < 2) return;
  P.line(part, w, .55, 0, .9);
  const d = cum(part);
  for (let L = spikeEvery * .6, k = 0; L < d[d.length - 1]; L += spikeEvery, k++) {
    let i = 1; while (i < part.length - 1 && d[i] < L) i++;
    const a = part[i - 1], b = part[i]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const sd = k % 2 ? 1 : -1, base = [lerp(a[0], b[0], .5), lerp(a[1], b[1], .5)];
    P.L.fillStyle = tone(.6, 0, 1); P.L.beginPath();
    P.L.moveTo(base[0] + dx * w * 1.6, base[1] + dy * w * 1.6);
    P.L.lineTo(base[0] - dy * spikeLen * sd + dx * spikeLen * .35, base[1] + dx * spikeLen * sd + dy * spikeLen * .35);
    P.L.lineTo(base[0] - dx * w * 1.6, base[1] - dy * w * 1.6);
    P.L.closePath(); P.L.fill();
  }
}
function sprout(P, x, groundY, h, lean, leafK, color = [.55, .8, 0], w = .012){
  if (h <= 0) return null;
  const top = [x + lean * h * .6, groundY - h];
  const pts = quadPts([x, groundY], [x + lean * h * .1, groundY - h * .55], top, 12);
  P.line(pts, w, ...color);
  if (leafK > 0) {
    const mid = pts[7];
    for (const sd of [-1, 1]) {
      const ang = -Math.PI / 2 + sd * (1.0 - .7 * lean * sd) + lean;
      const len = .06 * leafK * (h / .3 + .3);
      const cx = mid[0] + Math.cos(ang) * len * .55, cy = mid[1] + Math.sin(ang) * len * .55;
      P.fill(ellipse(cx, cy, len * .55, len * .2, ang), color[0] * .6, color[1], color[2]);
      P.line(ellipse2pts(cx, cy, len * .55, len * .2, ang, 18), LW(P, 1.4), 1, 0, 0, true);
    }
  }
  return top;
}
function badge(P, x, y, r, k, icon){
  if (k <= 0) return;
  const rr = r * k;
  P.fill(circle(x + rr * .12, y + rr * .12, rr), .3, 0, 0);
  P.fill(circle(x, y, rr), 0, 0, 0);
  ring(P, x, y, rr, LW(P, 2.6), 1, 0, 0);
  if (k > .35) icon(x, y, rr * .62);
}
const ICON = {
  bird: (P) => (x, y, s) => birdSide(P, x - s * .1, y + s * .25, s * 1.1, 1, 1.1),
  sun: (P) => (x, y, s) => sunIcon(P, x, y, s * .48, 1, 0),
  thorn: (P) => (x, y, s) => thornStem(P, quadPts([x - s, y + s * .5], [x, y - s * .9], [x + s, y + s * .3], 10), 1, s * .45, s * .35, s * .12),
  sprout: (P) => (x, y, s) => { sprout(P, x, y + s * .75, s * 1.3, 0, 1, [.55, .8, 0], s * .14); },
  wheat: (P) => (x, y, s) => wheatEar(P, x, y + s * .8, s * 1.6, 1, s * .1),
};
function wheatEar(P, x, groundY, h, k, w){
  const top = [x, groundY - h];
  P.line([[x, groundY], top], w, .5, .85, 0);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const kk = clamp01(k * n - i);
    if (kk <= 0) continue;
    const yy = top[1] + h * .05 + i * h * .07;
    for (const sd of [-1, 1]) {
      const cx = x + sd * w * 1.6, cy = yy + (sd > 0 ? h * .03 : 0);
      P.fill(ellipse(cx, cy, w * 1.5 * kk, w * 2.6 * kk, sd * .45), 0, .95, .08);
      P.line(ellipse2pts(cx, cy, w * 1.5 * kk, w * 2.6 * kk, sd * .45, 14), LW(P, 1.2), 1, 0, 0, true);
    }
  }
  P.line([[x, top[1] + h * .05], [x, top[1] - h * .18 * k]], LW(P, 1.2), 0, .9, 0);
}
function sowerFigure(P, x, y, s, walk, throwK){
  // Isotype pictogram, side view, walking right: feet at (x, y), height s
  const F = (fx, fy) => [x + fx * s, y - fy * s];
  const legA = Math.sin(walk) * .5, legB = -legA;
  const leg = (a, tone_) => { const hip = F(0, .44); const foot = [hip[0] + Math.sin(a) * s * .42, hip[1] + Math.cos(a) * s * .42]; P.line([hip, foot], s * .15, ...tone_); P.fill(ellipse(foot[0] + s * .05, foot[1] + s * .01, s * .095, s * .045), tone_[0], tone_[1], tone_[2]); };
  leg(legB, [.6, 0, 0]);
  // bag on the far hip
  P.fill(circle(...F(-.14, .48), s * .13), .6, .6, 0);
  P.fill(pathOf([F(-.17, .86), F(.17, .86), F(.12, .4), F(-.12, .4)]), .95, 0, 0);               // chunky torso
  leg(legA, [.95, 0, 0]);
  P.fill(circle(...F(.03, 1.02), s * .13), .95, 0, 0);                                            // big head
  // throwing arm: back and down → sweep forward and up
  const a = lerp(-.7, 2.1, throwK) + .15 * Math.sin(walk);
  const sh = F(.04, .8);
  const hx = sh[0] + Math.sin(a) * s * .42, hy = sh[1] + Math.cos(a) * s * .42;
  P.line([sh, [hx, hy]], s * .12, .95, 0, 0);
  P.fill(circle(hx, hy, s * .075), .95, 0, 0);
  return [hx, hy];
}

// ---- the world: a field plan in world units (x centred, y 0..1) ------------
const FIELD = { x0: -1.46, x1: 1.46, y0: .42, y1: .93 };
const REG = [0, 1, 2, 3].map((i) => ({ x0: -1.46 + i * .73, x1: -1.46 + (i + 1) * .73, cx: -1.095 + i * .73 }));
const LAND = [[-1.09, .66], [-.35, .69], [.36, .66], [1.1, .68]];
const THROW_T = REG.map((r) => 2.3 + (r.cx - .07 + 1.62) / .78);
const ROUTE_Y = .355;
const SOWER_H = .27;
const STONES = (() => { const R = range(311, 400); const out = []; for (let i = 0; i < 16; i++) { const cx = lerp(-.7, -.03, R[i * 5]), cy = lerp(.46, .89, R[i * 5 + 1]); if (Math.hypot(cx - LAND[1][0], cy - LAND[1][1]) < .07) continue; const rr = .02 + R[i * 5 + 2] * .045; const pts = []; for (let k = 0; k < 9; k++) { const a = k / 9 * TAU; pts.push([cx + Math.cos(a) * rr * (.7 + R[(i * 9 + k) % 400] * .5), cy + Math.sin(a) * rr * (.6 + R[(i * 7 + k + 3) % 400] * .45)]); } out.push({ pts, cx, cy, rr }); } return out; })();
const BRAMBLES = (() => { const R = range(719, 300); const out = []; for (let i = 0; i < 9; i++) { const cx = lerp(.06, .67, R[i * 4]), cy = lerp(.47, .89, R[i * 4 + 1]); if (Math.hypot(cx - LAND[2][0], cy - LAND[2][1]) < .08) continue; out.push({ cx, cy, r: .035 + R[i * 4 + 2] * .03, a: R[i * 4 + 3] * TAU }); } return out; })();

function drawField(P, t){
  const u = (a, b) => win(t, a, b);
  // faint map grid, always drifting so no frame is ever still
  const g = u(0, .45), dx = (t * .006) % .1, dy = (Math.sin(t * .35) * .004);
  for (let i = -17; i <= 17; i++) { const x = i * .1 + dx; P.line(partial([[x, -.2], [x, 1.2]], g), LW(P, 1), .18, 0, 0); }
  for (let j = -2; j <= 12; j++) { const y = j * .1 + dy; P.line(partial([[-1.7, y], [1.7, y]], g), LW(P, 1), .18, 0, 0); }
  // region fills wipe in, left to right, staggered
  const fills = [[.1, .1, 0], [.14, .06, 0], [.1, 0, .12], [.34, .05, 0]];
  REG.forEach((r, i) => {
    const k = easeOut(u(.35 + i * .15, .62 + i * .15));
    if (k <= 0) return;
    P.fill(rect(r.x0, FIELD.y0, (r.x1 - r.x0) * k, FIELD.y1 - FIELD.y0), ...fills[i]);
  });
  // 1 path: a trodden band with footprints
  const pk = u(.85, 1.25);
  if (pk > 0) {
    const band = cubicPts([-1.46, .56], [-1.2, .5], [-1.0, .86], [-.73, .78], 20);
    P.line(partial(band, pk), .09, .32, 0, 0);
    for (let i = 0; i < 9; i++) { const p = band[Math.min(20, 2 + i * 2)]; if (i / 9 > pk) break; P.fill(ellipse(p[0] + (i % 2 ? .012 : -.012), p[1] + (i % 2 ? .008 : -.008), .008, .005, .6), .7, 0, 0); }
  }
  // 2 rocks pop
  STONES.forEach((s, i) => {
    const k = pop(t, 1.0 + i * .05, .3);
    if (k <= 0) return;
    const pts = s.pts.map(([x, y]) => [s.cx + (x - s.cx) * k, s.cy + (y - s.cy) * k]);
    P.fill(pathOf(pts), .45, .1, 0);
    P.line(pts.concat([pts[0]]), LW(P, 1.6), 1, 0, 0);
    P.line([[s.cx - s.rr * .4 * k, s.cy - s.rr * .1 * k], [s.cx + s.rr * .2 * k, s.cy + s.rr * .3 * k]], LW(P, 1.2), .8, 0, 0);
  });
  // 3 brambles grow
  BRAMBLES.forEach((b, i) => {
    const k = u(1.3 + i * .06, 1.75 + i * .06);
    for (let j = 0; j < 3; j++) { const a = b.a + j * 2.1; const pts = quadPts([b.cx, b.cy], [b.cx + Math.cos(a) * b.r * 1.4, b.cy + Math.sin(a) * b.r * 1.4], [b.cx + Math.cos(a + 1) * b.r * 1.7, b.cy + Math.sin(a + 1) * b.r * 1.7], 8); thornStem(P, pts, k, .016, .008, LW(P, 1.8)); }
  });
  // 4 furrows draw on
  for (let i = 0; i < 9; i++) {
    const y = FIELD.y0 + .04 + i * .052;
    const pts = Array.from({ length: 12 }, (_, k) => [lerp(.75, 1.44, k / 11), y + .006 * Math.sin(k * 1.3 + i)]);
    P.line(partial(pts, u(1.5 + i * .05, 1.85 + i * .05)), LW(P, 2.2), .9, 0, 0);
    P.line(partial(pts.map(([x, yy]) => [x, yy + .012]), u(1.58 + i * .05, 1.95 + i * .05)), LW(P, 1.4), 0, .8, 0);
  }
  // field border and dividers draw on
  const border = roundRectPts(FIELD.x0, FIELD.y0, FIELD.x1 - FIELD.x0, FIELD.y1 - FIELD.y0, .02);
  P.line(partial(border, easeInOut(u(.1, .6))), LW(P, 3.2), 1, 0, 0);
  for (let i = 1; i < 4; i++) for (const seg of dashes([[REG[i].x0, FIELD.y0], [REG[i].x0, FIELD.y1]], .02, .014, easeOut(u(.7 + i * .08, 1.0 + i * .08)))) P.line(seg, LW(P, 1.8), 1, 0, 0);
  // the route above the field
  for (const seg of dashes([[-1.62, ROUTE_Y], [1.62, ROUTE_Y]], .03, .02, easeOut(u(1.85, 2.2)))) P.line(seg, LW(P, 2), 1, 0, 0);
}

// ---- camera ------------------------------------------------------------------
function cameraAt(P, t){
  const A = P.A, zb = Math.min(1, A / 3.15), zi = zb * (A >= 2.6 ? 2.35 : 2.0);
  const mX = A >= 2.6 ? A * .14 : A * .12, mY = .56;
  const aim = (i) => ({ cx: LAND[i][0] - mX / zi, cy: LAND[i][1] - (mY - .5) / zi, z: zi });
  const wide = { cx: 0, cy: .56, z: zb };
  const keys = [
    [0, wide], [6.65, wide], [6.9, aim(0)], [9.4, aim(0)], [9.6, aim(1)], [12.0, aim(1)], [12.25, aim(2)], [14.45, aim(2)], [14.75, aim(3)], [19.65, aim(3)], [19.9, wide], [LOOP, wide],
  ];
  let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const [t0, a] = keys[i], [t1, b] = keys[i + 1];
  const k = easeInOutExpo((t - t0) / ((t1 - t0) || 1));
  const za = Math.log(a.z), zbb = Math.log(b.z);
  const cam = { cx: lerp(a.cx, b.cx, k) + Math.sin(t * .8) * .006, cy: lerp(a.cy, b.cy, k) + Math.cos(t * 1.1) * .004, z: Math.exp(lerp(za, zbb, k)) * (1 + .012 * Math.sin(t * .6)) };
  const speed = (a.cx !== b.cx || a.z !== b.z) && t1 - t0 < 1.2 ? Math.sin(Math.PI * clamp01((t - t0) / (t1 - t0))) : 0;
  return { cam, speed, dir: Math.sign(b.cx - a.cx), mX, mY };
}

// ---- inset cards --------------------------------------------------------------
function cardFrame(P, k, mX, mY){
  const A = P.A, wide = A >= 2.6;
  const cw = wide ? 1.05 : .8, ch = wide ? .72 : .64;
  const cx = wide ? -A * .19 : -A * .2, cy = .5;
  return { x: cx - cw / 2, y: cy - ch / 2, w: cw, h: ch, cx, cy, k, mX, mY };
}
function withCard(P, C, draw){
  if (C.k <= 0) return;
  const r = Math.hypot(C.w, C.h) * easeInOutExpo(C.k) * 1.2;
  // connector from the marker to the card
  const from = [C.mX, C.mY], to = [C.x + C.w, C.cy];
  const conn = quadPts(from, [lerp(from[0], to[0], .5), C.y - .02], to, 16);
  P.line(partial(conn, easeOut(C.k * 2)), LW(P, 2.2), 1, 0, 0);
  P.save();
  P.clip(circle(to[0], to[1], r));
  P.fill(roundRectPath(C.x + .025, C.y + .03, C.w, C.h, .035), .35, 0, 0);
  P.fill(roundRectPath(C.x, C.y, C.w, C.h, .035), 0, 0, 0);
  P.save(); P.clip(roundRectPath(C.x, C.y, C.w, C.h, .035));
  draw((u, v) => [C.x + u * C.w, C.y + v * C.h]);
  P.restore();
  P.line(roundRectPts(C.x, C.y, C.w, C.h, .035), LW(P, 3), 1, 0, 0);
  P.restore();
}
function soilSection(P, M, groundV, top, texture){
  const [gx0, gy] = M(0, groundV), [gx1] = M(1, groundV), [, by] = M(0, 1);
  P.fill(rect(gx0, gy, gx1 - gx0, by - gy), ...top);
  P.line([[gx0, gy], [gx1, gy]], LW(P, 2.6), 1, 0, 0);
  if (texture) texture(gx0, gy, gx1, by);
}

// ---- the ledger ----------------------------------------------------------------
function ledger(P, t, show){
  if (show <= 0) return;
  const A = P.A, wide = A >= 2.6;
  const w = wide ? .5 : .42, x = A / 2 - w - (wide ? .07 : .05), y = .16, h = .68;
  const k = easeInOutExpo(show);
  P.save();
  P.clip(rect(x + w * (1 - k), y - .05, w * 1.2, h + .1));
  P.fill(roundRectPath(x + .02, y + .025, w, h, .03), .3, 0, 0);
  P.fill(roundRectPath(x, y, w, h, .03), 0, 0, 0);
  P.line(roundRectPts(x, y, w, h, .03), LW(P, 2.6), 1, 0, 0);
  const icons = [ICON.bird(P), ICON.sun(P), ICON.thorn(P), ICON.wheat(P)];
  const resolve = [8.7, 11.3, 13.9, 17.4];
  for (let i = 0; i < 4; i++) {
    const ry = y + h * (i + .5) / 4;
    if (i) for (const seg of dashes([[x + .03, y + h * i / 4], [x + w - .03, y + h * i / 4]], .012, .01)) P.line(seg, LW(P, 1.2), .5, 0, 0);
    badge(P, x + .07, ry, .045, pop(t, 6.75 + i * .06, .28), icons[i]);
    const sx = x + .16;
    const seedK = pop(t, 6.9 + i * .06, .25);
    const r = win(t, resolve[i], resolve[i] + .28);
    if (i < 3) {
      seedDot(P, sx, ry, .014, seedK * (i === 0 ? 1 - easeIn(r) * .9 : 1));
      if (i === 1 && r > 0) P.fill(ellipse(sx, ry, .0175, .0112, -.5), .2, .4, .9 * r);
      if (r > 0) { const L = .028 * backOut(r); P.line([[sx - L, ry - L], [sx + L, ry + L]], LW(P, 3), 0, 0, 1); P.line([[sx - L, ry + L], [sx + L, ry - L]], LW(P, 3), 0, 0, 1); }
      // an empty bar that stays empty
      P.line([[sx + .05, ry], [x + w - .04, ry]], LW(P, 1.2), .35, 0, 0);
    } else {
      seedDot(P, sx, ry, .014, seedK);
      // thirty, sixty, a hundred: a bar of dots with ticks at each harvest
      const bx0 = sx + .05, bx1 = x + w - .04;
      P.line([[bx0, ry], [bx1, ry]], LW(P, 1.2), .35, 0, 0);
      for (const f of [.3, .6, 1]) { const hit = win(t, 17.4 + f * 1.9, 17.4 + f * 1.9 + .18); P.line([[lerp(bx0, bx1, f), ry - .02 - .012 * Math.sin(hit * Math.PI)], [lerp(bx0, bx1, f), ry + .02 + .012 * Math.sin(hit * Math.PI)]], LW(P, 1.6 + 2.2 * Math.sin(hit * Math.PI)), 1, 0, 0); }
      const fill = easeOut(win(t, 17.4, 19.3));
      const n = Math.floor(100 * fill);
      for (let d = 0; d < n; d++) { const cx = lerp(bx0, bx1, (d + .5) / 100), cy = ry + ((d % 2) ? .007 : -.007); P.fill(circle(cx, cy, .0042), 0, .95, .1); }
    }
  }
  P.restore();
}

/** Chips for the three lost seeds; they hold under the good-soil card, then hand off to the map badges. */
function fateChips(P, t){
  const show = Math.min(win(t, 14.2, 14.55), 1 - win(t, 19.55, 19.8));
  if (show <= 0) return;
  const A = P.A, wide = A >= 2.6;
  const w = wide ? .3 : .24, h = wide ? .17 : .15, gap = wide ? .05 : .035;
  const x0 = -A / 2 + (wide ? .1 : .05), y = .5 + (wide ? .2 : .17);
  const icons = [ICON.bird(P), ICON.sun(P), ICON.thorn(P)];
  for (let i = 0; i < 3; i++) {
    const k = Math.min(pop(t, 14.2 + i * .12, .3), show * 1.4);
    if (k <= 0) continue;
    const cx = x0 + i * (w + gap), cy = y + (1 - k) * .12;
    P.fill(roundRectPath(cx + .012, cy + .014, w, h, .025), .3, 0, 0);
    P.fill(roundRectPath(cx, cy, w, h, .025), 0, 0, 0);
    P.line(roundRectPts(cx, cy, w, h, .025), LW(P, 2.4), 1, 0, 0);
    icons[i](cx + w * .3, cy + h * .5, h * .34);
    const L = h * .2 * pop(t, 14.4 + i * .12, .25);
    const mx = cx + w * .72, my = cy + h * .5;
    P.line([[mx - L, my - L], [mx + L, my + L]], LW(P, 3.4), 0, 0, 1);
    P.line([[mx - L, my + L], [mx + L, my - L]], LW(P, 3.4), 0, 0, 1);
  }
}

// ---- the shots, all in one frame function -----------------------------------------
function drawFrame(P, t){
  const A = P.A;
  const { cam, speed, dir, mX, mY } = cameraAt(P, t);
  P.stage(cam.cx, cam.cy, cam.z);
  drawField(P, t);

  // the sower walks the route and throws; seeds arc down with arrowheads
  const walkT = win(t, 2.3, 6.55);
  if (walkT > 0 && walkT < 1) {
    const x = lerp(-1.66, 1.66, walkT * .9 + .05 * 0) - .0;
    const fx = lerp(-1.62, 1.62, walkT);
    let throwK = 0;
    for (const tt of THROW_T) throwK = Math.max(throwK, Math.exp(-((t - tt) ** 2) / .03) * (t > tt ? 1 : .6));
    const hand = sowerFigure(P, fx, ROUTE_Y, SOWER_H, t * 9, throwK);
    void x; void hand;
  }
  THROW_T.forEach((tt, i) => {
    const age = t - tt; if (age < 0) return;
    const fx = lerp(-1.62, 1.62, win(tt, 2.3, 6.55));
    const start = [fx + SOWER_H * .35, ROUTE_Y - SOWER_H * 1.03];            // the hand at release
    const end = LAND[i];
    const arc = quadPts(start, [lerp(start[0], end[0], .45) + .1, start[1] + .02], end, 24);
    const fly = easeInOut(age / .38);
    // the trail draws on behind the seed, then erases from its tail once the seed lands
    const tailK = easeInOut(win(age, .42, .85));
    const trail = partial(arc, fly), full = tailK > 0 ? partial(arc.slice().reverse(), 1 - tailK).reverse() : trail;
    if (tailK < 1) for (const seg of dashes(fly < 1 ? trail : full, .02, .012)) P.line(seg, LW(P, 2), 1, 0, 0);
    if (fly < 1) { arrowHead(P, trail, .022); seedDot(P, ...trail[trail.length - 1], .011); }
    else {
      const land = age - .38;
      // a ring cracks out where it lands, a marker stays, a tick and a baseline snap in
      if (land < .45) ring(P, end[0], end[1], .01 + .06 * easeOut(land / .45), LW(P, 3.4 * (1 - land / .45)), 1, .3, 0);
      const fate = [8.35, 10.6, 12.95, 99][i];                                  // the path's seed is taken; the rest stay marked
      const gone = win(t, fate, fate + .2);
      seedDot(P, end[0], end[1], .013, pop(t, tt + .38, .22) * (1 - gone));
      ring(P, end[0], end[1], .026, LW(P, 1.8), 1, 0, 0);
      const tick = pop(t, tt + .5, .2);
      if (tick > 0) { P.line([[end[0], end[1] - .05 * tick], [end[0], end[1] - .09 * tick]], LW(P, 2.4), 1, 0, 0); P.line(partial([[REG[i].x0 + .04, FIELD.y1 - .02], [REG[i].x1 - .04, FIELD.y1 - .02]], easeOut(win(t, tt + .55, tt + .8))), LW(P, 2.2), 0, .9, 0); }
    }
  });

  // marker pulse on the seed the camera is looking at
  const focus = t > 7.5 && t < 22 ? (t < 10.6 ? 0 : t < 13.6 ? 1 : t < 16.6 ? 2 : 3) : -1;
  if (focus >= 0 && speed < .5) { const pulse = fract(t * 1.2); ring(P, LAND[focus][0], LAND[focus][1], .03 + .03 * pulse, LW(P, 2.4 * (1 - pulse)), 0, .9, .3); }

  // ---- summary on the map after the pull-back
  const S = win(t, 19.95, 20.1);
  if (S > 0) {
    const icons = [ICON.bird(P), ICON.sun(P), ICON.thorn(P), ICON.wheat(P)];
    LAND.forEach(([lx, ly], i) => {
      const bx = REG[i].cx, by = .2;
      const k = pop(t, 20.0 + i * .1, .3);
      P.line(partial([[lx, ly - .03], [bx, by + .06]], easeOut(win(t, 19.95 + i * .1, 20.2 + i * .1))), LW(P, 2), 1, 0, 0);
      badge(P, bx, by, .06, k, icons[i]);
    });
    // the hundred rises above the good soil
    for (let d = 0; d < 100; d++) {
      const col = d % 10, row = Math.floor(d / 10);
      const k = pop(t, 20.5 + d * .006, .22);
      if (k <= 0) continue;
      P.fill(circle(REG[3].cx + .08 + col * .025, .5 + row * .04, .0085 * k), 0, .95, .1);
    }
  }

  // ---- screen space: speed lines, inset cards, ledger
  P.stage(0, .5, 1);
  if (speed > .35) {
    const R = range(Math.floor(t * 6) + 5, 60), k = (speed - .35) / .65;
    for (let i = 0; i < 9; i++) { const y = .08 + R[i * 2] * .84, L = .12 + R[i * 2 + 1] * .3; const x = (R[(i * 3 + 7) % 60] - .5) * A; P.line([[x, y], [x - dir * L * k, y]], taper(LW(P, 2.4 * k), .1, .8), .45 * k, 0, 0); }
  }

  // card timing for each fate
  const cards = [[6.9, 9.35], [9.6, 11.95], [12.25, 14.4], [14.75, 19.6]];
  cards.forEach(([c0, c1], i) => {
    const k = Math.min(win(t, c0, c0 + .22), 1 - win(t, c1 - .2, c1));
    if (k <= 0) return;
    const C = cardFrame(P, k, mX, mY);
    const lt = t - c0;
    withCard(P, C, (M) => [pathCard, rockCard, thornCard, goodCard][i](P, M, lt, C));
  });
  ledger(P, t, Math.min(win(t, 6.6, 6.85), 1 - win(t, 19.6, 19.85)));
  fateChips(P, t);

  // ---- the wipe back to an empty field (seamless with t = 0)
  const w = win(t, 22.4, 23.6);
  if (w > 0) {
    const x = lerp(A / 2 + .3, -A / 2 - .5, easeInOutExpo(w));
    P.fill(pathOf([[x, -.1], [A, -.1], [A, 1.1], [x - .25, 1.1]]), 0, 0, 0);
    P.line([[x, -.1], [x - .25, 1.1]], LW(P, 6), 1, 0, 0);
    P.line([[x + .035, -.1], [x - .215, 1.1]], LW(P, 3), 0, .9, 0);
  }
}

// ---- the four cards (side-view cross sections; M maps card u,v to stage) ----
function pathCard(P, M, lt, C){
  const gv = .7;
  soilSection(P, M, gv, [.42, 0, 0], (x0, gy, x1, by) => {
    const R = range(41, 200);
    for (let i = 0; i < 60; i++) P.fill(circle(lerp(x0, x1, R[i * 2]), lerp(gy + .02, by, R[i * 2 + 1]), .005), .85, 0, 0);
    for (let i = 0; i < 4; i++) { const cx = lerp(x0, x1, .15 + i * .22); P.line([[cx, gy + .01], [cx + .03, gy + .06], [cx + .01, gy + .1]], LW(P, 1.6), .95, 0, 0); }
  });
  const seedAt = M(.5, gv - .045);
  const grab = .95;
  if (lt < grab) dropSeed(P, seedAt[0], seedAt[1], lt);
  // the bird: in along a dotted arc, peck, away with the seed
  const inArc = cubicPts(M(1.05, .05), M(.9, .1), M(.72, .5), M(.58, gv - .12), 24);
  const outArc = cubicPts(M(.58, gv - .12), M(.45, .45), M(.2, .1), M(-.1, .02), 24);
  const s = .17;
  if (lt < grab) {
    const k = easeInOut(win(lt, .3, .9));
    const tr = partial(inArc, k);
    for (const seg of dashes(tr, .02, .014)) P.line(seg, LW(P, 1.8), .6, 0, 0);
    const p = tr.length ? tr[tr.length - 1] : inArc[0];
    const peck = win(lt, .78, .95);
    birdSide(P, p[0], p[1] + Math.sin(peck * Math.PI) * .03, s, -1, lt * 14 * (1 - peck) + 1.2);
  } else {
    const k = easeIn(win(lt, .98, 1.5));
    const tr = partial(outArc, k);
    for (const seg of dashes(tr, .02, .014)) P.line(seg, LW(P, 1.8), .6, 0, 0);
    const p = tr.length ? tr[tr.length - 1] : outArc[0];
    if (k < 1) birdSide(P, p[0], p[1], s, -1, lt * 16, true);
    // where the seed was: an empty ring and a cross
    const e = pop(lt, 1.15, .28);
    ring(P, seedAt[0], seedAt[1], .03 * e, LW(P, 2.4), 0, 0, 1);
    P.line([[seedAt[0] - .02 * e, seedAt[1] - .02 * e], [seedAt[0] + .02 * e, seedAt[1] + .02 * e]], LW(P, 3), 0, 0, 1);
  }
  badge(P, ...M(.14, .2), .06, pop(lt, 1.35, .3), ICON.bird(P));
}
function rockCard(P, M, lt){
  const gv = .6;
  soilSection(P, M, gv, [.25, .12, 0], (x0, gy, x1, by) => {
    const slabY = gy + .06;
    const R = range(9, 100);
    const slab = [[x0, slabY]]; for (let i = 0; i <= 10; i++) slab.push([lerp(x0, x1, i / 10), slabY + (R[i] - .5) * .025]); slab.push([x1, by], [x0, by]);
    P.fill(pathOf(slab), .62, 0, 0);
    P.line(slab.slice(0, 12), LW(P, 2.4), 1, 0, 0);
    for (let i = 0; i < 14; i++) { const hx = lerp(x0, x1, i / 14); P.line([[hx, slabY + .04], [hx + .05, slabY + .14]], LW(P, 1.2), 1, 0, 0); }
  });
  const base = M(.48, gv + .03);
  const grow = easeOut(win(lt, .35, .8));
  const wilt = easeInOut(win(lt, 1.15, 1.75));
  const col = [lerp(.55, .1, wilt), lerp(.8, .85, wilt), lerp(0, .8, wilt)];
  dropSeed(P, base[0], base[1] + .005, lt, .016);
  // short roots that hit the rock and turn sideways
  if (grow > 0) { P.line(partial([[base[0], base[1]], [base[0], base[1] + .03], [base[0] + .05, base[1] + .035]], grow), LW(P, 2), .9, 0, 0); P.line(partial([[base[0], base[1] + .02], [base[0] - .04, base[1] + .03]], grow), LW(P, 2), .9, 0, 0); }
  const h = .26 * grow * (1 - .45 * wilt);
  sprout(P, base[0], base[1], h, lerp(0, 1.6, wilt), backOut(win(lt, .55, .85)) * (1 - .3 * wilt), col, .014);
  // the sun climbs and blazes; heat rises
  const sunK = pop(lt, .62, .3);
  const sp = M(.8, .2);
  sunIcon(P, sp[0], sp[1], .065 * (1 + .25 * easeIn(win(lt, .8, 1.6))), sunK, lt * 1.8);
  const heat = win(lt, .8, 1.5);
  for (let i = 0; i < 4; i++) { const hx = lerp(.25, .75, i / 3); const pts = Array.from({ length: 14 }, (_, k) => { const [x, y] = M(hx + .015 * Math.sin(k * .9 + lt * 8 + i), lerp(.5, .22, k / 13)); return [x, y]; }); P.line(partial(pts, heat), LW(P, 2), 0, .4, .9); }
  badge(P, ...M(.14, .2), .06, pop(lt, 1.45, .3), ICON.sun(P));
}
function thornCard(P, M, lt){
  const gv = .72;
  soilSection(P, M, gv, [.3, .05, .1], (x0, gy, x1, by) => { const R = range(77, 90); for (let i = 0; i < 30; i++) P.fill(circle(lerp(x0, x1, R[i * 2]), lerp(gy + .02, by, R[i * 2 + 1]), .004), .8, 0, .4); });
  const base = M(.5, gv);
  if (lt < .4) dropSeed(P, base[0], base[1], lt, .016);
  const grow = easeOut(win(lt, .32, .8));
  const choke = easeInOut(win(lt, .95, 1.6));
  sprout(P, base[0], base[1], .3 * grow * (1 - .55 * choke), .2 * choke, backOut(win(lt, .55, .85)) * (1 - .6 * choke), [lerp(.55, .85, choke), lerp(.8, .2, choke), 0], .014);
  // thorns rise faster, arc over, close in
  const specs = [[.18, .92, .3, .12, .47, .3], [.82, .92, .7, .12, .53, .3], [.28, .95, .36, .3, .49, .42], [.72, .95, .64, .3, .51, .42], [.08, .9, .12, .4, .44, .5], [.92, .9, .88, .4, .56, .5]];
  specs.forEach(([ax, ay, cx, cy, ex, ey], i) => {
    const k = easeOut(win(lt, .35 + i * .085, .95 + i * .085));
    const pts = cubicPts(M(ax, ay), M(ax, cy + .2), M(cx, cy), M(ex, ey + .1 * (1 - choke)), 28);
    thornStem(P, pts, k, .026, .02, LW(P, 3.8));
  });
  badge(P, ...M(.14, .2), .06, pop(lt, 1.5, .3), ICON.thorn(P));
}
function goodCard(P, M, lt, C){
  const room = .74 * C.h;                                      // stage height from the ground to the card top
  const gv = .74;
  soilSection(P, M, gv, [.5, .08, 0], (x0, gy, x1, by) => { const R = range(13, 200); for (let i = 0; i < 50; i++) P.fill(circle(lerp(x0, x1, R[i * 2]), lerp(gy + .015, by, R[i * 2 + 1]), .004 + R[i] * .004), 0, .8, 0); });
  const base = M(.24, gv);
  // roots branch down
  const rootK = easeOut(win(lt, .26, .9));
  const roots = [[[0, 0], [-.02, .08], [-.06, .16]], [[0, 0], [.01, .09], [.05, .17]], [[0, .04], [-.05, .09], [-.1, .12]], [[0, .06], [.05, .1], [.09, .14]]];
  roots.forEach((r, ri) => P.line(partial(r.map(([dx, dy]) => [base[0] + dx, base[1] + dy]), easeOut(win(lt, .3 + ri * .09, .95 + ri * .09))), LW(P, 2), .9, 0, 0));
  if (lt < .38) dropSeed(P, base[0], base[1] + .01, lt, .014); else seedDot(P, base[0], base[1] + .01, .016, 1 - win(lt, .38, .6));
  // the stalk rises, the ear fills
  const h = room * .56 * easeOut(win(lt, .4, 1.3));
  if (h > 0) {
    P.line([[base[0], base[1]], [base[0], base[1] - h]], .012, .5, .85, 0);
    for (const [f, sd] of [[.35, 1], [.55, -1], [.72, 1]]) { const k = backOut(win(lt, .75 + f * .5, 1.0 + f * .5)); if (k <= 0) continue; const y = base[1] - h * f; P.fill(ellipse(base[0] + sd * .045 * k, y - .02 * k, .05 * k, .012 * k, sd * -.5), .3, .8, 0); }
    wheatEar(P, base[0], base[1] - h + .02, room * .3, easeOut(win(lt, 1.3, 1.9)), room * .022);
  }
  // thirty, sixty, a hundred: dot grids on one baseline, each a step further, arrows between
  const cw = C_W(M), cell = cw * .021, gap = cw * .05;
  const baseY = M(0, .64)[1];
  let gx = M(.43, 0)[0];
  const earTop = [base[0], base[1] - h - .02];
  [[3, 10], [6, 10], [10, 10]].forEach(([cols, rows], gi) => {
    const t0 = 1.95 + gi * .7;
    const gy0 = baseY - rows * cell;
    if (gi === 0) P.line(partial(quadPts([earTop[0] + .03, earTop[1]], [lerp(earTop[0], gx, .6), earTop[1] - .04], [gx - .012, gy0 + .01], 14), easeOut(win(lt, t0 - .35, t0 + .1))), LW(P, 2), 1, 0, 0);
    else { const ax = gx - gap * .78, ay = gy0 + rows * cell * .5; const pts = partial([[ax, ay], [ax + gap * .55, ay]], easeOut(win(lt, t0 - .2, t0 + .05))); P.line(pts, LW(P, 2.2), 1, 0, 0); if (pts.length > 1) arrowHead(P, pts, cell * .7); }
    // a ring snaps when each grid completes
    const done = win(lt, t0 + .55, t0 + .8);
    if (done > 0 && done < 1) ring(P, gx + cols * cell * .5, gy0 + rows * cell * .5, cols * cell * (.6 + .5 * done), LW(P, 3 * (1 - done)), 0, .9, .2);
    for (let d = 0; d < cols * rows; d++) {
      const c = d % cols, r = rows - 1 - Math.floor(d / cols);
      const k = pop(lt, t0 + d * (.42 / (cols * rows)), .2);
      if (k <= 0) continue;
      P.fill(circle(gx + (c + .5) * cell, gy0 + (r + .5) * cell, cell * .38 * k), 0, .95, .1);
    }
    P.line(partial([[gx - cell * .3, baseY + cell * .35], [gx + cols * cell + cell * .3, baseY + cell * .35]], easeOut(win(lt, t0 - .15, t0 + .15))), LW(P, 2), 1, 0, 0);
    gx += cols * cell + gap;
  });
  badge(P, ...M(.9, .86), .055, pop(lt, 4.1, .3), ICON.wheat(P));
}
const C_W = (M) => M(1, 0)[0] - M(0, 0)[0];
