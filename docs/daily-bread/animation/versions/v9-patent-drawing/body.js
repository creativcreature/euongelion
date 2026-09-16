// ============================================================================
// VERSION 9 — "Patent Drawing"
// The parable of the sower (Matthew 13:3–8) drawn as an exploded patent sheet:
// a machine that takes one seed and returns a hundred. Four test chambers stand
// for the four soils. Fine cobalt line work on paper, gold for grain, crimson
// for heat and rejects. No words, no numerals, no people, no images.
// ============================================================================

const LOOPLEN = 22;

// Beat times (s). Listed in notes.md; the median gap is checked there.
const B = {
  seedIn: 0.30, dimH: 0.65, dimV: 0.95, magIn: 1.25, section: 1.55, callout: 1.85, magOut: 2.10,
  whipMachine: 2.40, partsIn: 2.44, snap: 3.20, crank: 3.50, feed: 3.85, spin: 4.10,
  paths: 4.35, pullOut: 4.55, launch: 4.85,
  whipC1: 5.35, c1Land: 5.60, c1Bounce: 5.85, c1Arm: 5.85, c1Snap: 6.25, c1Lift: 6.55, c1X: 6.85, c1Tick: 7.15,
  whipC2: 7.95, c2Land: 8.55, c2S1: 8.80, c2S2: 8.95, c2S3: 9.10, c2Lamp: 9.40, c2Glow: 9.75, c2Ray: 10.00, c2Wilt: 10.55, c2X: 11.00,
  whipC3: 11.30, c3Land: 11.28, c3Sprout: 11.60, c3Spring: 11.85, c3Adv: 12.15, c3Press: 12.50, c3Crush: 12.85, c3X: 13.15, c3Recoil: 13.50,
  whipC4: 13.95, c4Split: 14.00, c4Root: 14.30, c4Shoot: 15.05, c4Leaf1: 15.35, c4Leaf2: 15.60,
  c4Ear: 15.85, c4Grains: 16.05, c4Gold: 16.85, c4Chute: 17.10, c4Pour: 17.40,
  count1: 17.70, wide: 18.10, count2: 18.45, count3: 18.95, gearsUp: 19.35, dimSweep: 20.00, magSweep: 20.40,
  explode: 20.80, reform: 21.15,
};

// ---------------------------------------------------------------------------
// Drawing helpers, all in stage units
const polar = (cx, cy, r, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
const circlePts = (cx, cy, r, n = 40, a0 = 0, a1 = TAU) => Array.from({ length: n }, (_, i) => polar(cx, cy, r, a0 + (a1 - a0) * i / (n - 1)));
const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const lfill = (P, pts, b = 1, g = 0, r = 0) => { P.L.fillStyle = tone(b, g, r); P.L.fill(pathOf(pts)); };
const INK = [1, 0, 0], RED = [0, 0, 1], GOLDL = [0, 1, 0];

/** dashed polyline, dash/gap in stage units */
function dashed(P, pts, dash, gap, w, col = INK, phase = 0) {
  let carry = phase % (dash + gap), on = carry < dash;
  let acc = on ? carry : carry - dash;
  let run = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let s = 0;
    while (s < seg) {
      const need = (on ? dash : gap) - acc;
      const step = Math.min(need, seg - s);
      const p0 = [lerp(a[0], b[0], s / seg), lerp(a[1], b[1], s / seg)];
      const p1 = [lerp(a[0], b[0], (s + step) / seg), lerp(a[1], b[1], (s + step) / seg)];
      if (on) run.push(p0, p1);
      s += step; acc += step;
      if (acc >= (on ? dash : gap) - 1e-9) {
        if (on && run.length) { P.line(run, w, ...col); run = []; }
        on = !on; acc = 0;
      }
    }
  }
  if (run.length) P.line(run, w, ...col);
}

function arrowHead(P, at, dir, size, col = INK) {
  const a = Math.atan2(dir[1], dir[0]);
  lfill(P, [at, polar(at[0], at[1], size, a + 2.6), polar(at[0], at[1], size * .55, a + Math.PI), polar(at[0], at[1], size, a - 2.6)], ...col);
}

/** dimension line between a and b, offset perpendicular, drawn on by k */
function dimLine(P, a, b, off, k = 1, col = INK) {
  if (k <= 0) return;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy * off, ny = ux * off;
  const A = [a[0] + nx, a[1] + ny], Bp = [b[0] + nx, b[1] + ny];
  const E = [lerp(A[0], Bp[0], k), lerp(A[1], Bp[1], k)];
  P.line([A, E], P.px(.9), ...col);
  P.line([[a[0] + nx * .08, a[1] + ny * .08], [A[0] + nx * .18, A[1] + ny * .18]], P.px(.7), ...col);
  arrowHead(P, A, [ux, uy], P.px(5), col);
  if (k > .97) {
    P.line([[b[0] + nx * .08, b[1] + ny * .08], [Bp[0] + nx * .18, Bp[1] + ny * .18]], P.px(.7), ...col);
    arrowHead(P, Bp, [-ux, -uy], P.px(5), col);
  }
}

/** section hatching inside a path */
function hatch(P, path, bbox, ang, spacing, w, col = INK, phase = 0) {
  const [x0, y0, x1, y1] = bbox;
  const d = [Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]];
  const corners = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
  const pr = (p, v) => p[0] * v[0] + p[1] * v[1];
  const sMin = Math.min(...corners.map((p) => pr(p, n))), sMax = Math.max(...corners.map((p) => pr(p, n)));
  const tMin = Math.min(...corners.map((p) => pr(p, d))), tMax = Math.max(...corners.map((p) => pr(p, d)));
  P.L.save(); P.L.clip(path);
  for (let s = Math.floor(sMin / spacing) * spacing + (phase % spacing); s < sMax; s += spacing) {
    P.line([[d[0] * tMin + n[0] * s, d[1] * tMin + n[1] * s], [d[0] * tMax + n[0] * s, d[1] * tMax + n[1] * s]], w, ...col);
  }
  P.L.restore();
}

/** stipple inside a path (soil, grit) */
function stipple(P, path, bbox, count, seed, r, col = INK) {
  const R = range(seed, count * 2);
  P.L.save(); P.L.clip(path);
  for (let i = 0; i < count; i++) {
    const x = lerp(bbox[0], bbox[2], R[i * 2]), y = lerp(bbox[1], bbox[3], R[i * 2 + 1]);
    P.dot(x, y, r * (.6 + R[i * 2] * .8), ...col);
  }
  P.L.restore();
}

function gear(P, cx, cy, r, teeth, rot, col = INK) {
  const pts = [], rt = r * 1.15, rb = r * .9;
  for (let i = 0; i < teeth; i++) {
    const a0 = rot + i / teeth * TAU, st = TAU / teeth;
    pts.push(polar(cx, cy, rb, a0), polar(cx, cy, rt, a0 + st * .2), polar(cx, cy, rt, a0 + st * .35), polar(cx, cy, rb, a0 + st * .55), polar(cx, cy, rb, a0 + st * .97));
  }
  P.line(pts, P.px(1.3), ...col, true);
  P.line(circlePts(cx, cy, r * .3, 22), P.px(1), ...col, true);
  for (let i = 0; i < 4; i++) { const a = rot + i / 4 * TAU; P.line([polar(cx, cy, r * .3, a), polar(cx, cy, r * .86, a)], P.px(.9), ...col); }
  P.dot(cx, cy, P.px(2), ...col);
}

function coil(P, a, b, coils, amp, w, col = INK) {
  const n = Math.max(12, coils * 7), pts = [];
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = Math.sin(t * TAU * coils) * amp * Math.min(1, t * 6, (1 - t) * 6 + .3);
    pts.push([lerp(a[0], b[0], t) + nx * s, lerp(a[1], b[1], t) + ny * s]);
  }
  P.line(pts, w, ...col);
}

function rivets(P, pts, r, col = INK) { for (const p of pts) { P.dot(p[0], p[1], r, ...col); P.line(circlePts(p[0], p[1], r * 2.1, 12), P.px(.6), ...col, true); } }

function magnifier(P, cx, cy, r, ang, col = INK) {
  P.line(circlePts(cx, cy, r, 48), P.px(2.4), ...col, true);
  P.line(circlePts(cx, cy, r * .93, 48), P.px(.7), ...col, true);
  P.line([polar(cx, cy, r, ang), polar(cx, cy, r * 1.5, ang)], P.px(3.4), ...col);
}

function leader(P, from, to, col = INK) { P.line([from, to], P.px(.8), ...col); P.dot(from[0], from[1], P.px(2), ...col); }

/** a curved leaf blade springing from (x,y) toward side s, with a midrib */
function leafBlade(P, x, y, s, len, droop = 0, k = 1, ink = INK, fillG = .45) {
  if (k <= 0) return;
  const L = len * k, tipX = x + s * L * .92, tipY = y - L * .42 + droop * L * .95;
  const pts = [[x, y]];
  const up = quadPts([x, y], [x + s * L * .38, y - L * .5 + droop * L * .35], [tipX, tipY], 8);
  const dn = quadPts([tipX, tipY], [x + s * L * .42, y - L * .05 + droop * L * .5], [x, y + L * .16], 8);
  pts.push(...up.slice(1), ...dn.slice(1));
  P.fill(pathOf(pts), .32, fillG, droop > .3 ? .45 : 0);
  P.line(pts, P.px(1), ...ink, true);
  P.line(quadPts([x, y + L * .05], [x + s * L * .45, y - L * .22 + droop * L * .45], [tipX, tipY], 8), taper(P.px(.8), .2, .3), ...ink);
}

/** a wheat grain: gold body, cobalt crease */
function grain(P, x, y, s, rot, gold = 1) {
  const c = Math.cos(rot), sn = Math.sin(rot), pts = [];
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; const px = Math.cos(a) * s * 1.4, py = Math.sin(a) * s * .82; pts.push([x + px * c - py * sn, y + px * sn + py * c]); }
  P.fill(pathOf(pts), .05, .92 * gold, .1 * gold);
  P.line(pts, P.px(.9), ...INK, true);
  P.line([[x - c * s * .95, y - sn * s * .95], [x + c * s * .95, y + sn * s * .95]], P.px(.7), ...INK);
}

// ---------------------------------------------------------------------------
// Layout
function layout(A) {
  const sheet = { x0: -1.44, y0: .07, x1: 1.44, y1: .93 };
  const cw = 1.0, ch = .32, colGap = .11, rowGap = .09;
  const gx = .34, gy = .5;
  const cells = [
    { x: gx - (cw + colGap) / 2, y: gy - (ch + rowGap) / 2, w: cw, h: ch, kind: 'path' },
    { x: gx + (cw + colGap) / 2, y: gy - (ch + rowGap) / 2, w: cw, h: ch, kind: 'rock' },
    { x: gx - (cw + colGap) / 2, y: gy + (ch + rowGap) / 2, w: cw, h: ch, kind: 'thorn' },
    { x: gx + (cw + colGap) / 2, y: gy + (ch + rowGap) / 2, w: cw, h: ch, kind: 'good' },
  ];
  const mach = { x: -1.0, y: .5 };
  const zc = Math.min(A / 1.25, 1 / .42);
  const zWide = Math.min(A / 3.0, 1.0);
  return { sheet, cells, mach, zc, zWide, cw, ch };
}

// Camera: hold on a key, then ease to the next over its `in` seconds.
function camera(t, L) {
  const K = [
    { t: 0, c: [0, .5, 1.95], in: 0 },
    { t: 2.10, c: [0, .5, 1.78], in: .7 },
    { t: B.whipMachine, c: [L.mach.x + .05, .47, 2.0], in: .22 },
    { t: 4.30, c: [L.mach.x + .16, .48, 1.9], in: 1.3 },
    { t: B.pullOut, c: [0, .5, L.zWide], in: .3 },
    { t: B.whipC1, c: [L.cells[0].x, L.cells[0].y, L.zc], in: .24 },
    { t: B.whipC2, c: [L.cells[1].x, L.cells[1].y, L.zc], in: .24 },
    { t: B.whipC3, c: [L.cells[2].x, L.cells[2].y, L.zc], in: .24 },
    { t: B.whipC4, c: [L.cells[3].x, L.cells[3].y, L.zc], in: .24 },
    { t: 17.5, c: [L.cells[3].x + .1, L.cells[3].y, L.zc * .92], in: .8 },
    { t: B.wide, c: [0, .5, L.zWide], in: .45 },
    { t: B.explode, c: [0, .5, L.zWide * .97], in: 1.1 },
    { t: B.reform, c: [0, .5, 1.95], in: .42 },
  ];
  let i = 0; while (i < K.length - 1 && t >= K[i + 1].t) i++;
  let c = K[i].c;
  if (i < K.length - 1) {
    const nx = K[i + 1], start = nx.t - nx.in;
    if (t > start && nx.in > 0) {
      const k = easeOutBack(clamp01((t - start) / nx.in));
      c = [lerp(c[0], nx.c[0], k), lerp(c[1], nx.c[1], k), Math.exp(lerp(Math.log(c[2]), Math.log(nx.c[2]), k))];
    }
  }
  // never perfectly still: a slow periodic breath
  const br = Math.sin(TAU * t / LOOPLEN);
  return { cx: c[0] + br * .004, cy: c[1] + Math.sin(TAU * t / LOOPLEN * 2) * .003, z: c[2] * (1 + br * .005) };
}
const easeOutBack = (x) => { x = clamp01(x); const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const since = (t, t0, dur = 1) => clamp01((t - t0) / dur);
const pulse = (t, t0, dur) => { const k = clamp01((t - t0) / dur); return k <= 0 || k >= 1 ? 0 : Math.sin(k * Math.PI); };

// ---------------------------------------------------------------------------
// Sheet furniture: border, corner ticks, edge rulers
function sheetFrame(P, L, t, ex) {
  const s = L.sheet, k = 1;
  const o = ex * .06;
  P.line(rectPts(s.x0 - o, s.y0 - o, (s.x1 - s.x0) + o * 2, (s.y1 - s.y0) + o * 2), P.px(2), ...INK, true);
  P.line(rectPts(s.x0 - o + .018, s.y0 - o + .018, (s.x1 - s.x0) + o * 2 - .036, (s.y1 - s.y0) + o * 2 - .036), P.px(.7), ...INK, true);
  // corner ticks
  for (const [cx, cy, sx, sy] of [[s.x0, s.y0, 1, 1], [s.x1, s.y0, -1, 1], [s.x0, s.y1, 1, -1], [s.x1, s.y1, -1, -1]]) {
    P.line([[cx + sx * .05 - sx * o, cy - sy * o], [cx + sx * .11 - sx * o, cy - sy * o]], P.px(1.6), ...INK);
    P.line([[cx - sx * o, cy + sy * .05 - sy * o], [cx - sx * o, cy + sy * .11 - sy * o]], P.px(1.6), ...INK);
  }
  // ruler ticks along the top and bottom edges
  for (let i = 0; i <= 28; i++) {
    const x = lerp(s.x0, s.x1, i / 28), big = i % 4 === 0;
    P.line([[x, s.y0 + .018], [x, s.y0 + (big ? .04 : .028)]], P.px(big ? 1 : .6), ...INK);
    P.line([[x, s.y1 - .018], [x, s.y1 - (big ? .04 : .028)]], P.px(big ? 1 : .6), ...INK);
  }
  for (let i = 0; i <= 10; i++) {
    const y = lerp(s.y0, s.y1, i / 10), big = i % 5 === 0;
    P.line([[s.x0 + .018, y], [s.x0 + (big ? .04 : .028), y]], P.px(big ? 1 : .6), ...INK);
    P.line([[s.x1 - .018, y], [s.x1 - (big ? .04 : .028), y]], P.px(big ? 1 : .6), ...INK);
  }
}

// ---------------------------------------------------------------------------
// The specimen seed at the centre of the sheet (opening and closing beat)
function specimen(P, t, ex) {
  const reK = t > B.reform ? easeOutBack(since(t, B.reform, .4)) : 0;
  const k = t < 5 ? 1 : reK;                     // present at t=0 so the loop cut is invisible
  if (k <= 0) return;
  const x = 0, y = .5, s = .075 * k;
  // construction circles turning
  P.L.save();
  dashed(P, circlePts(x, y, .17 * k, 64), .028, .02, P.px(.8), INK, t * .06);
  P.L.restore();
  grain(P, x, y, s, -.3, 1);
  if (t < 5) {
    // a sweeping construction arc, then two callout ticks on the crease
    const sw = since(t, .45, .5);
    if (sw > 0) P.line(circlePts(x, y, s * 2.4, 40, -1.2, -1.2 + TAU * sw), P.px(1), ...INK);
    const cal = since(t, .78, .3);
    if (cal > 0) { leader(P, [x + s * .5, y - s * .2], [x + s * 1.9, y - s * 1.5 * cal]); P.line(circlePts(x + s * 1.9, y - s * 1.5, s * .22, 14), P.px(1), ...INK, true); }
    const cal2 = since(t, 1.0, .3);
    if (cal2 > 0) { leader(P, [x - s * .7, y + s * .3], [x - s * 2.0, y + s * 1.4 * cal2]); P.line(circlePts(x - s * 2.0, y + s * 1.4, s * .22, 14), P.px(1), ...INK, true); }
  }
  // dimension lines
  // dimensions: on screen at the loop point, retracting as the magnifier arrives
  const dimK = t < 5 ? 1 - since(t, B.dimH, .35) : since(t, B.reform + .2, .35);
  if (dimK > .02) {
    dimLine(P, [x - s * 1.5, y + s * 1.1], [x + s * 1.5, y + s * 1.1], .06, dimK);
    dimLine(P, [x + s * 1.6, y - s * .95], [x + s * 1.6, y + s * .95], .05, dimK);
  }
  // magnifier punch-in on the cross-section
  const mk = t > B.magIn && t < B.magOut + .25 ? Math.min(easeOutBack(since(t, B.magIn, .28)), 1 - since(t, B.magOut, .25)) : 0;
  if (mk > .01) {
    const mr = .135 * mk, mx = x + .245, my = y - .055;
    const path = circle(mx, my, mr);
    P.L.save(); P.L.clip(path);
    // cross-section: endosperm hatch, embryo, bran coat
    const g = 3.1;
    const body = []; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; body.push([mx + Math.cos(a) * s * 1.35 * g * .34, my + Math.sin(a) * s * .8 * g * .34]); }
    P.fill(pathOf(body), .02, .5, 0);
    hatch(P, pathOf(body), [mx - .2, my - .2, mx + .2, my + .2], rad(45), .012, P.px(.7));
    P.line(body, P.px(1.3), ...INK, true);
    const emb = circlePts(mx - .045, my + .02, .022, 24);
    P.fill(pathOf(emb), .35, .2, 0); P.line(emb, P.px(1.1), ...INK, true);
    if (t > B.section) hatch(P, pathOf(emb), [mx - .08, my - .05, mx, my + .07], rad(-45), .008, P.px(.6));
    if (t > B.callout) { leader(P, [mx - .045, my + .02], [mx + .1, my - .09]); P.line(circlePts(mx + .1, my - .09, .014, 16), P.px(1), ...INK, true); }
    P.L.restore();
    magnifier(P, mx, my, mr, rad(48));
  }
}

// ---------------------------------------------------------------------------
// The sowing machine: hopper, gear train, scatter wheel
function machine(P, L, t, ex) {
  const M = L.mach;
  const assemble = easeOutBack(since(t, B.partsIn, .42));      // parts fly in
  const snapped = since(t, B.snap, .12);
  const shudder = pulse(t, B.snap, .22) * .012;
  const spin = t > B.crank ? (t - B.crank) * (t > B.spin ? 5.2 : 2.1) : 0;
  const off = (dx, dy) => [(1 - assemble) * dx * .3 + ex * dx * 2.1, (1 - assemble) * dy * .3 + ex * dy * 2.1];

  // hopper
  const ho = off(-.42, -.42), hx = M.x + ho[0] - .02, hy = M.y - .15 + ho[1] + shudder;
  const hop = [[hx - .14, hy - .10], [hx + .14, hy - .10], [hx + .045, hy + .09], [hx - .045, hy + .09]];
  P.line(hop, P.px(1.6), ...INK, true);
  hatch(P, pathOf(hop), [hx - .17, hy - .12, hx + .17, hy + .11], rad(45), .018, P.px(.55));
  rivets(P, [[hx - .13, hy - .088], [hx + .13, hy - .088]], P.px(1.4));
  // grain inside the hopper, always trickling
  for (let i = 0; i < 9; i++) {
    const r = range(700 + i, 3);
    const yy = hy - .085 + fract(r[0] + t * .12) * .17, xx = hx + (r[1] - .5) * (.24 - (yy - hy + .1) * .8);
    grain(P, xx, yy, .012, r[2] * TAU, 1);
  }
  // gear train
  const go = off(.5, -.5), gx = M.x + go[0] + .135, gy = M.y - .03 + go[1] + shudder;
  gear(P, gx, gy, .075, 12, spin);
  gear(P, gx + .118, gy + .048, .052, 9, -spin * 1.4 + .2);
  // scatter wheel
  const wo = off(-.2, .62), wx = M.x + wo[0] + .02, wy = M.y + .14 + wo[1];
  P.line(circlePts(wx, wy, .092, 40), P.px(1.5), ...INK, true);
  for (let i = 0; i < 6; i++) { const a = -spin * 1.9 + i / 6 * TAU; P.line([polar(wx, wy, .026, a), polar(wx, wy, .088, a)], P.px(1.7), ...INK); }
  P.dot(wx, wy, P.px(2.4), ...INK);
  // frame legs
  const lo = off(0, .85), fy = M.y + .27 + lo[1];
  P.line([[M.x - .17 + lo[0], fy], [M.x + .24 + lo[0], fy]], P.px(2), ...INK);
  P.line([[M.x - .1 + lo[0], fy], [M.x - .14 + lo[0], fy + .1]], P.px(1.5), ...INK);
  P.line([[M.x + .17 + lo[0], fy], [M.x + .21 + lo[0], fy + .1]], P.px(1.5), ...INK);
  P.line([[M.x - .16 + lo[0], fy + .1], [M.x - .08 + lo[0], fy + .1]], P.px(1.2), ...INK);
  P.line([[M.x + .15 + lo[0], fy + .1], [M.x + .23 + lo[0], fy + .1]], P.px(1.2), ...INK);
  // leader lines while exploded
  if (assemble < .98) {
    const k = 1 - assemble;
    dashed(P, [[hx, hy], [M.x - .02, M.y - .15]], .02, .016, P.px(.7), INK, t);
    dashed(P, [[gx, gy], [M.x + .135, M.y - .03]], .02, .016, P.px(.7), INK, t);
    dashed(P, [[wx, wy], [M.x + .02, M.y + .14]], .02, .016, P.px(.7), INK, t);
  }
  // feed: grains drop from hopper into the wheel
  if (t > B.feed) {
    for (let i = 0; i < 5; i++) {
      const ph = fract((t - B.feed) * 1.5 + i * .2);
      grain(P, lerp(hx, wx, ph * .9), lerp(hy + .09, wy - .09, ph * ph), .014, ph * 7, 1);
    }
  }
  return { wheel: [wx, wy] };
}

// four dotted trajectories from the wheel to the four chambers
function trajectories(P, L, t, wheel, ex) {
  const fade = 1 - since(t, 5.5, .7);            // clear the sheet before the close-ups
  if (fade <= .02) return;
  for (let i = 0; i < 4; i++) {
    const k = since(t, B.paths + i * .09, .3);
    if (k <= 0) continue;
    const C = L.cells[i];
    const a = wheel, b = [C.x - C.w / 2 + .06, C.y - C.h / 2 + .05];
    const mid = [lerp(a[0], b[0], .5), Math.min(a[1], b[1]) - .18 - i * .02];
    const pts = quadPts(a, mid, b, 22).slice(0, Math.max(2, Math.round(22 * k)));
    dashed(P, pts, .026, .016, P.px(1.4), [fade, 0, 0], -t * .35);
    if (k > .97) arrowHead(P, b, [b[0] - mid[0], b[1] - mid[1]], P.px(5.5), [fade, 0, 0]);
    // the seed itself travelling
    if (t > B.launch) {
      const tt = clamp01((t - B.launch - i * .06) / .55);
      if (tt > 0 && tt < 1) { const p = quadPts(a, mid, b, 22)[Math.round(tt * 22)]; grain(P, p[0], p[1], .026, tt * 9, 1); }
    }
  }
}

// ---------------------------------------------------------------------------
// Chambers
function cellFrame(P, C, t, idx, ex) {
  const o = ex * (idx % 2 ? .16 : -.16), oy = ex * (idx < 2 ? -.11 : .11);
  const x = C.x + o, y = C.y + oy, x0 = x - C.w / 2, y0 = y - C.h / 2;
  P.line(rectPts(x0, y0, C.w, C.h), P.px(1.5), ...INK, true);
  P.line(rectPts(x0 + .012, y0 + .012, C.w - .024, C.h - .024), P.px(.6), ...INK, true);
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const cx = sx > 0 ? x0 : x0 + C.w, cy = sy > 0 ? y0 : y0 + C.h;
    P.line([[cx + sx * .02, cy + sy * .006], [cx + sx * .055, cy + sy * .006]], P.px(1.2), ...INK);
  }
  // index ticks (no numerals): one to four marks in the top-left of the cell
  for (let i = 0; i <= idx; i++) P.line([[x0 + .028 + i * .016, y0 + .03], [x0 + .028 + i * .016, y0 + .055]], P.px(1.3), ...INK);
  return { x, y, x0, y0 };
}

function rejectStamp(P, x, y, k, shud) {
  if (k <= 0) return;
  const s = .055 * easeOutBack(k) * (1 + shud);
  P.line([[x - s, y - s], [x + s, y + s]], P.px(3.4), ...RED);
  P.line([[x + s, y - s], [x - s, y + s]], P.px(3.4), ...RED);
  P.line(circlePts(x, y, s * 1.7, 30), P.px(1.2), ...RED, true);
}

// Chamber 1 — the path: hard floor, a mechanical beak takes the seed
function chamberPath(P, C, t, ex) {
  const F = cellFrame(P, C, t, 0, ex);
  const floorY = F.y + C.h * .22;
  const fl = pathOf([[F.x0 + .02, floorY], [F.x0 + C.w - .02, floorY], [F.x0 + C.w - .02, F.y0 + C.h - .02], [F.x0 + .02, F.y0 + C.h - .02]]);
  P.L.save(); P.L.clip(fl);
  hatch(P, fl, [F.x0, floorY, F.x0 + C.w, F.y0 + C.h], rad(45), .022, P.px(.8));
  for (let i = 0; i < 3; i++) { const cx = F.x0 + .2 + i * .3; P.line([[cx, floorY + .012], [cx + .03, floorY + .05], [cx - .01, floorY + .09]], P.px(.9), ...INK); }
  P.L.restore();
  P.line([[F.x0 + .02, floorY], [F.x0 + C.w - .02, floorY]], P.px(2), ...INK);
  // seed: two bounces, then taken
  const land = since(t, B.c1Land, .25);
  const taken = t > B.c1Snap;
  if (land > 0 && !taken) {
    const b1 = clamp01((t - B.c1Land) / .25), b2 = clamp01((t - B.c1Bounce) / .22);
    const x = lerp(F.x0 + .12, F.x0 + C.w * .52, clamp01((t - B.c1Land) / .7));
    const hop = Math.sin(b1 * Math.PI) * .075 + (t > B.c1Bounce ? Math.sin(b2 * Math.PI) * .032 : 0);
    grain(P, x, floorY - .024 - hop, .026, t * 5, 1);
  }
  // mechanical beak: two-link arm on a pivot
  const armK = t > B.c1Arm ? easeOutBack(since(t, B.c1Arm, .3)) : 0;
  if (armK > 0) {
    const lift = t > B.c1Lift ? easeOut(since(t, B.c1Lift, .4)) : 0;
    const close = t > B.c1Snap ? Math.min(1, since(t, B.c1Snap, .1)) : 0;
    const px0 = F.x0 + C.w * .52, py0 = F.y0 + .03;
    const reach = armK * (1 - lift * .8);
    const elb = [px0 + .14, py0 + .085 * reach], tip = [px0 + .008, py0 + .215 * reach];
    P.line([[px0, py0], elb], P.px(4.6), ...INK);
    P.line([elb, tip], P.px(3.8), ...INK);
    rivets(P, [[px0, py0], elb], P.px(2));
    // beak jaws, hinged: an upper and lower blade that shut on the seed
    const jaw = .055 * (1 - close);
    P.line(circlePts(tip[0], tip[1], P.px(3.2), 12), P.px(1.2), ...INK, true);
    lfill(P, [[tip[0] - .012, tip[1]], [tip[0] - .075, tip[1] + .028 - jaw], [tip[0] - .008, tip[1] + .05 - jaw * .4]], ...INK);
    lfill(P, [[tip[0] + .012, tip[1]], [tip[0] + .075, tip[1] + .03 + jaw * .5], [tip[0] + .008, tip[1] + .052 + jaw]], ...INK);
    if (close > .5 && lift < 1) grain(P, tip[0], tip[1] + .05, .022, 0, 1);
  }
  rejectStamp(P, F.x + C.w * .3, F.y - C.h * .12, since(t, B.c1X, .25), pulse(t, B.c1X, .18) * .18);
  if (t > B.c1Tick) for (let i = 0; i < 3; i++) P.line([[F.x0 + C.w - .09 + i * .018, F.y0 + C.h - .06], [F.x0 + C.w - .09 + i * .018, F.y0 + C.h - .035]], P.px(1.4), ...RED);
}

// Chamber 2 — rocky ground: sprout scorched by a heat lamp
function chamberRock(P, C, t, ex) {
  const F = cellFrame(P, C, t, 1, ex);
  const gy = F.y + C.h * .2;
  const ground = pathOf([[F.x0 + .02, gy], [F.x0 + C.w - .02, gy], [F.x0 + C.w - .02, F.y0 + C.h - .02], [F.x0 + .02, F.y0 + C.h - .02]]);
  hatch(P, ground, [F.x0, gy, F.x0 + C.w, F.y0 + C.h], rad(-45), .03, P.px(.55));
  P.line([[F.x0 + .02, gy], [F.x0 + C.w - .02, gy]], P.px(1.4), ...INK);
  // rock blocks
  const R = range(88, 40);
  for (let i = 0; i < 4; i++) {
    const rx = F.x0 + .17 + i * (C.w - .34) / 3.1, ry = gy + .018 + R[i] * .028, w = .085 + R[i + 6] * .055;
    const pts = [[rx - w, ry + .052], [rx - w * .66, ry - .04], [rx + w * .24, ry - .056], [rx + w, ry + .018], [rx + w * .56, ry + .066]];
    P.line(pts, P.px(1.6), ...INK, true);
    const shade = pathOf([[rx + w * .1, ry - .05], [rx + w, ry + .018], [rx + w * .56, ry + .066], [rx + w * .1, ry + .05]]);
    hatch(P, shade, [rx - w, ry - .06, rx + w, ry + .08], rad(45), .014, P.px(.55));
  }
  // seed then a telescoping sprout
  const sx = F.x + .02, base = gy - .004;
  if (t > B.c2Land && t < B.c2S1) grain(P, sx, base - .016, .026, 0, 1);
  const seg = [since(t, B.c2S1, .14), since(t, B.c2S2, .14), since(t, B.c2S3, .16)];
  const wilt = t > B.c2Wilt ? easeInOut(since(t, B.c2Wilt, .5)) : 0;
  if (seg[0] > 0) {
    let p = [sx, base];
    for (let i = 0; i < 3; i++) {
      if (seg[i] <= 0) break;
      const len = .078 * seg[i] * (1 - wilt * .25);
      const ang = -Math.PI / 2 + wilt * (.5 + i * .45) + Math.sin(t * 2 + i) * .02;
      const q = [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len];
      P.line([p, q], P.px(4.4 - i * .5), ...(wilt > .4 ? RED : INK));
      if (i === 1 && seg[1] > .5) for (const s2 of [-1, 1]) leafBlade(P, q[0], q[1] + .004, s2, .062, wilt * .8, 1, wilt > .4 ? RED : INK, wilt > .4 ? .3 : .45);
      if (i === 2 && seg[2] > .6) {
        for (const s of [-1, 1]) leafBlade(P, q[0], q[1] + .004, s, .085, wilt * .9, 1, wilt > .4 ? RED : INK, wilt > .4 ? .3 : .45);
      }
      p = q;
    }
  }
  // heat lamp swinging in
  const lampK = t > B.c2Lamp ? easeOutBack(since(t, B.c2Lamp, .35)) : 0;
  if (lampK > 0) {
    const lx = F.x + .02, ly = F.y0 + .04 + (1 - lampK) * -.12;
    const ref = [[lx - .055, ly - .018], [lx + .055, ly - .018], [lx + .034, ly + .022], [lx - .034, ly + .022]];
    P.line(ref, P.px(1.6), ...INK, true);
    hatch(P, pathOf(ref), [lx - .06, ly - .03, lx + .06, ly + .03], rad(45), .014, P.px(.5));
    coil(P, [lx - .026, ly + .027], [lx + .026, ly + .027], 4, .008, P.px(1.4), t > B.c2Glow ? RED : INK);
    P.line([[lx, ly - .02], [lx, F.y0 + .012]], P.px(1.2), ...INK);
    if (t > B.c2Glow) {
      const glow = .4 + .22 * Math.sin((t - B.c2Glow) * 9);
      P.T.globalCompositeOperation = 'lighter';
      P.T.fillStyle = rgrad(P, lx, ly + .06, .015, .2, [[0, [0, .3 * glow, .55 * glow]], [.45, [0, .1 * glow, .25 * glow]], [1, [0, 0, 0]]]);
      P.T.fill(circle(lx, ly + .06, .2));
      P.T.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (.12 + i * .095), r0 = .045, r1 = .045 + .075 * (.6 + .4 * Math.sin(t * 7 + i));
        P.line([polar(lx, ly + .03, r0, a), polar(lx, ly + .03, r1, a)], taper(P.px(1.6), .2, .5), ...RED);
      }
    }
  }
  rejectStamp(P, F.x + C.w * .3, F.y - C.h * .12, since(t, B.c2X, .25), pulse(t, B.c2X, .18) * .18);
}

// Chamber 3 — thorns: springs close on the sprout
function chamberThorn(P, C, t, ex) {
  const F = cellFrame(P, C, t, 2, ex);
  const gy = F.y + C.h * .22;
  P.line([[F.x0 + .02, gy], [F.x0 + C.w - .02, gy]], P.px(1.4), ...INK);
  const ground = pathOf([[F.x0 + .02, gy], [F.x0 + C.w - .02, gy], [F.x0 + C.w - .02, F.y0 + C.h - .02], [F.x0 + .02, F.y0 + C.h - .02]]);
  stipple(P, ground, [F.x0, gy, F.x0 + C.w, F.y0 + C.h], 70, 31, P.px(.9));
  // sprout
  const sp = since(t, B.c3Sprout, .35);
  const crush = t > B.c3Press ? easeInOut(since(t, B.c3Press, .45)) : 0;
  if (t > B.c3Land && sp <= 0) grain(P, F.x, gy - .018, .026, 0, 1);
  if (sp > 0) {
    const h = .135 * sp * (1 - crush * .62);
    P.line([[F.x, gy], [F.x, gy - h]], P.px(3.4 + crush * 2.2), ...INK);
    for (const s of [-1, 1]) leafBlade(P, F.x, gy - h + .004, s, .095 * (1 - crush * .35), crush * .55, 1, INK, .4);
  }
  // springs advancing from both sides
  const adv = t > B.c3Spring ? easeOut(since(t, B.c3Spring, .3)) : 0;
  const push = t > B.c3Adv ? easeOutBack(since(t, B.c3Adv, .35)) : 0;
  const press = crush;
  if (adv > 0) {
    for (const s of [-1, 1]) {
      const anchor = [F.x + s * (C.w / 2 - .03), gy - .085];
      const tipX = F.x + s * lerp(C.w / 2 - .09, .075, Math.max(push * .75, press));
      P.line([[anchor[0], gy - .085], [tipX, gy - .085]], P.px(.8), ...INK);        // guide rail
      const coilStart = [lerp(tipX, anchor[0], .45), gy - .085];
      coil(P, anchor, coilStart, 5, .042 * (1 - press * .45), P.px(2.4));
      P.line([coilStart, [tipX, gy - .085]], P.px(2.6), ...INK);
      P.line([[tipX, gy - .165], [tipX, gy - .006]], P.px(4.2), ...INK);
      // thorn barbs on the jaw
      for (let i = 0; i < 5; i++) {
        const yy = gy - .15 + i * .034;
        lfill(P, [[tipX, yy - .006], [tipX - s * .05, yy - .022], [tipX, yy + .008]], ...INK);
      }
      rivets(P, [anchor], P.px(1.6));
      P.line([[F.x + s * (C.w / 2 - .02), gy - .075], [F.x + s * (C.w / 2 - .02), gy - .02]], P.px(1.2), ...INK);
    }
  }
  if (press > .55) { const k = pulse(t, B.c3Crush, .3); for (let i = 0; i < 6; i++) { const a = -Math.PI * (.15 + i * .14); P.line([polar(F.x, gy - .03, .03, a), polar(F.x, gy - .03, .03 + .04 * k, a)], P.px(1.6), ...RED); } }
  rejectStamp(P, F.x + C.w * .3, F.y - C.h * .12, since(t, B.c3X, .25), pulse(t, B.c3X, .18) * .18);
}

// Chamber 4 — good soil: roots, shoot, ear, and the counter filling
function chamberGood(P, C, t, ex) {
  const F = cellFrame(P, C, t, 3, ex);
  const gy = F.y - C.h * .04;
  const soil = pathOf([[F.x0 + .02, gy], [F.x0 + C.w - .02, gy], [F.x0 + C.w - .02, F.y0 + C.h - .02], [F.x0 + .02, F.y0 + C.h - .02]]);
  hatch(P, soil, [F.x0, gy, F.x0 + C.w, F.y0 + C.h], rad(45), .026, P.px(.5));
  stipple(P, soil, [F.x0, gy, F.x0 + C.w, F.y0 + C.h], 90, 77, P.px(.8));
  P.line([[F.x0 + .02, gy], [F.x0 + C.w - .02, gy]], P.px(1.6), ...INK);
  const sx = F.x0 + C.w * .34;

  // seed splitting
  const split = t > B.c4Split ? easeOut(since(t, B.c4Split, .3)) : 0;
  if (t > B.c4Split - .2 && split < 1) grain(P, sx, gy + .02, .018, 0, 1);
  else if (split >= 1 && t < B.c4Shoot + .4) { grain(P, sx - .012 * split, gy + .02, .014, -.4 * split, 1); grain(P, sx + .012 * split, gy + .02, .014, .4 * split, 1); }

  // roots: a fixed branching tree drawn on over time
  const rootSegs = (() => {
    const segs = [], R = mulberry(9001);
    const grow = (x, y, ang, len, depth, t0) => {
      const q = [x + Math.cos(ang) * len, y + Math.sin(ang) * len];
      segs.push({ a: [x, y], b: q, w: 4 - depth * .8, t0 });
      if (depth >= 3) return;
      const n = depth === 0 ? 3 : 2;
      for (let i = 0; i < n; i++) grow(q[0], q[1], ang + (R() - .5) * 1.5 + (i - (n - 1) / 2) * .5, len * (.62 + R() * .2), depth + 1, t0 + .16 + depth * .06);
    };
    grow(0, 0, Math.PI / 2, .085, 0, 0);
    return segs;
  })();
  for (const s of rootSegs) {
    const k = clamp01((t - (B.c4Root + s.t0)) / .18);
    if (k <= 0) continue;
    const a = [sx + s.a[0], gy + .02 + s.a[1]], b = [sx + s.b[0], gy + .02 + s.b[1]];
    P.line([a, [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]], P.px(s.w), ...INK);
  }
  // shoot and leaves
  const shoot = t > B.c4Shoot ? easeOut(since(t, B.c4Shoot, .45)) : 0;
  const stemTop = gy - .155 * shoot;
  if (shoot > 0) P.line([[sx, gy + .02], [sx, stemTop]], P.px(3.4), ...INK);
  for (const [bt, s, yy] of [[B.c4Leaf1, -1, .35], [B.c4Leaf2, 1, .55]]) {
    const k = t > bt ? easeOutBack(since(t, bt, .3)) : 0;
    if (k <= 0) continue;
    const ly = lerp(gy, stemTop, yy);
    leafBlade(P, sx, ly, s, .115, 0, k, INK, .45);
  }
  // the ear: grains popping in along the head
  const earK = t > B.c4Ear ? easeOut(since(t, B.c4Ear, .3)) : 0;
  if (earK > 0) {
    const earBase = stemTop, earTop = stemTop - .145 * earK;
    P.line([[sx, earBase], [sx, earTop]], P.px(2.2), ...INK);
    for (let i = 0; i < 7; i++) {
      const k = t > B.c4Grains + i * .06 ? easeOutBack(since(t, B.c4Grains + i * .06, .18)) : 0;
      if (k <= 0) continue;
      const s = i % 2 ? 1 : -1, yy = lerp(earBase - .008, earTop, i / 6);
      grain(P, sx + s * .019 * k, yy, .016 * k, s * .5, t > B.c4Gold ? 1 : .55);
      P.line([[sx + s * .019, yy], [sx + s * .06, yy - .042]], P.px(.8), ...INK);   // awn
    }
  }
  // chute and pour into the counter
  const chute = t > B.c4Chute ? easeOut(since(t, B.c4Chute, .3)) : 0;
  const cx0 = F.x0 + C.w * .62, cy0 = F.y0 + C.h - .05;
  if (chute > 0) {
    P.line([[sx + .03, stemTop - .02], [lerp(sx + .03, cx0 - .04, chute), lerp(stemTop - .02, cy0 - .12, chute)]], P.px(1.6), ...INK);
    P.line([[sx + .03, stemTop - .05], [lerp(sx + .03, cx0 + .02, chute), lerp(stemTop - .05, cy0 - .14, chute)]], P.px(1.6), ...INK);
  }
  // counter: a column with three tick clusters filling
  const colX = cx0 + .10, colY0 = F.y0 + .085, colY1 = cy0;
  P.line([[colX - .05, colY1 + .012], [colX + .05, colY1 + .012]], P.px(2.4), ...INK);
  P.line([[colX - .036, colY1], [colX + .036, colY1]], P.px(2), ...INK);
  P.line([[colX - .036, colY1], [colX - .05, colY1 + .012]], P.px(1.2), ...INK);
  P.line([[colX + .036, colY1], [colX + .05, colY1 + .012]], P.px(1.2), ...INK);
  P.line([[colX - .036, colY0], [colX - .036, colY1]], P.px(1.3), ...INK);
  P.line([[colX + .036, colY0], [colX + .036, colY1]], P.px(1.3), ...INK);
  const stages = [since(t, B.count1, .35), since(t, B.count2, .35), since(t, B.count3, .4)];
  const fill = (stages[0] + stages[1] + stages[2]) / 3;
  if (fill > 0) {
    const top = lerp(colY1, colY0 + .01, fill);
    const box = pathOf([[colX - .033, top], [colX + .033, top], [colX + .033, colY1], [colX - .033, colY1]]);
    P.fill(box, .06, .9, .08);
    hatch(P, box, [colX - .04, top, colX + .04, colY1], rad(45), .014, P.px(.5));
    P.line([[colX - .033, top], [colX + .033, top]], P.px(1.3), ...INK);
  }
  // tick clusters beside the column: three, six, ten marks
  [[3, 0], [6, 1], [10, 2]].forEach(([n, si]) => {
    const k = stages[si]; if (k <= 0) return;
    for (let i = 0; i < n; i++) {
      if (i / n > k) break;
      const yy = colY1 - .012 - si * .055 - (i % 5) * .009;
      const xx = colX + .048 + Math.floor(i / 5) * .015;
      P.line([[xx, yy], [xx, yy - .007]], P.px(1.3), ...INK);
    }
  });
  // grains pouring down the chute
  if (t > B.c4Pour) {
    for (let i = 0; i < 7; i++) {
      const ph = fract((t - B.c4Pour) * 1.1 + i * .143);
      const a = [sx + .03, stemTop - .03], b = [colX, colY1 - .02 - fill * .1];
      const p = quadPts(a, [lerp(a[0], b[0], .5), a[1] - .02], b, 16)[Math.round(ph * 16)];
      grain(P, p[0], p[1], .011, ph * 8, 1);
    }
  }
}

// ---------------------------------------------------------------------------
// The shot
const SHOTS = [];
SHOTS.push({ name: 'patent', dur: LOOPLEN, draw: (P, t) => {
  const { A } = P;
  const L = layout(A);
  const cam = camera(t, L);
  P.stage(cam.cx, cam.cy, cam.z);
  const ex = t > B.explode ? easeInOut(since(t, B.explode, .5)) * (1 - since(t, B.reform, .35)) : 0;

  sheetFrame(P, L, t, ex);
  if (ex > .05) {                                  // exploded-view axes back to each cell's home
    for (let i = 0; i < 4; i++) {
      const C = L.cells[i], ox = ex * (i % 2 ? .16 : -.16), oy = ex * (i < 2 ? -.11 : .11);
      dashed(P, [[C.x, C.y], [C.x + ox, C.y + oy]], .022, .018, P.px(.8), INK, -t * .5);
    }
  }
  const m = machine(P, L, t, ex);
  trajectories(P, L, t, m.wheel, ex);
  chamberPath(P, L.cells[0], t, ex);
  chamberRock(P, L.cells[1], t, ex);
  chamberThorn(P, L.cells[2], t, ex);
  chamberGood(P, L.cells[3], t, ex);
  specimen(P, t, ex);

  // the harvest returns to the hopper: a dashed return path with grain riding it
  if (t > B.gearsUp && t < B.explode + .2) {
    const k = since(t, B.gearsUp, .5), C3 = L.cells[3];
    const a = [C3.x + C3.w * .34, C3.y + C3.h * .3], b = [L.mach.x - .02, L.mach.y - .24];
    const mid = [lerp(a[0], b[0], .45), L.sheet.y1 - .02];
    const pts = quadPts(a, mid, b, 26).slice(0, Math.max(2, Math.round(26 * k)));
    dashed(P, pts, .026, .018, P.px(1.1), INK, t * .6);
    if (k > .96) { arrowHead(P, b, [b[0] - mid[0], b[1] - mid[1]], P.px(5)); for (let i = 0; i < 5; i++) { const ph = fract(t * .5 + i * .2); const q = quadPts(a, mid, b, 26)[Math.round(ph * 26)]; grain(P, q[0], q[1], .016, ph * 7, 1); } }
  }
  // sheet-wide dimension sweep near the end
  if (t > B.dimSweep && t < B.explode + .4) {
    const k = since(t, B.dimSweep, .5);
    dimLine(P, [L.sheet.x0 + .08, L.sheet.y1 - .05], [L.sheet.x1 - .08, L.sheet.y1 - .05], -.02, k);
    dimLine(P, [L.sheet.x1 - .05, L.sheet.y0 + .08], [L.sheet.x1 - .05, L.sheet.y1 - .08], -.02, since(t, B.dimSweep + .2, .5));
  }
  // magnifier sweeping across the sheet
  if (t > B.magSweep && t < B.explode + .2) {
    const k = clamp01((t - B.magSweep) / .45);
    const mx = lerp(L.sheet.x0 + .5, L.sheet.x1 - .5, easeInOut(k)), my = .5;
    magnifier(P, mx, my, .13 * Math.min(1, k * 3), rad(140));
  }
} });

const LOOP = LOOPLEN;
function frameAt(t) { const tt = ((t % LOOP) + LOOP) % LOOP; return { shot: SHOTS[0], local: tt }; }

// ---------------------------------------------------------------------------
// Runtime (same contract as the other tests)
function createScene(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, 'a_position'); gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const u = (n) => gl.getUniformLocation(prog, n);
  const tex = (unit) => { const tx = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return tx; };
  const toneTex = tex(0), lineTex = tex(1);
  gl.uniform1i(u('u_tone'), 0); gl.uniform1i(u('u_line'), 1);
  const plates = new Plates();
  return {
    render(t, W, H) {
      plates.begin(W, H);
      const { shot, local } = frameAt(t);
      shot.draw(plates, local);
      for (const [tx, src, unit] of [[toneTex, plates.tc, 0], [lineTex, plates.lc, 1]]) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); }
      gl.viewport(0, 0, W, H);
      gl.uniform1f(u('u_time'), t); gl.uniform2f(u('u_resolution'), W, H); gl.uniform1f(u('u_dot'), Math.max(3.6, W / 340));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

const params = new URLSearchParams(location.search);
if (params.has('capture')) {
  document.body.classList.add('capture');
  const page = document.getElementById('page'); page.innerHTML = '';
  const w = Number(params.get('w') || 1500), aspect = Number(params.get('aspect') || 3);
  const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w / aspect);
  c.style.cssText = `width:${c.width}px;height:${c.height}px;display:block`; page.appendChild(c);
  const scene = createScene(c);
  window.__render = (t) => scene.render(t, c.width, c.height);
  window.__loop = LOOP;
  window.__ready = true;
} else {
  const bands = [...document.querySelectorAll('.band')].map((el) => { el.style.aspectRatio = `${el.dataset.aspect} / 1`; const canvas = document.createElement('canvas'); el.appendChild(canvas); return { el, canvas, scene: createScene(canvas), time: 0 }; });
  let last = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const frame = (now) => {
    requestAnimationFrame(frame);
    if (now - last < 1000 / 30 - 1) return;
    const dt = last ? Math.min(100, now - last) / 1000 : 0; last = now;
    for (const b of bands) {
      const dpr = Math.min(1.5, devicePixelRatio || 1);
      const w = Math.round(b.el.clientWidth * dpr), h = Math.round(b.el.clientHeight * dpr);
      if (b.canvas.width !== w) b.canvas.width = w; if (b.canvas.height !== h) b.canvas.height = h;
      b.time = reduced.matches ? 16.9 : b.time + dt;
      b.scene.render(b.time, w, h);
    }
  };
  requestAnimationFrame(frame);
}
