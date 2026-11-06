/**
 * Dalgona shapes — closed polylines in a 100×100 local space (centre 50,50).
 * 100 units == 80 mm cookie. Source of truth: dalgona/shared (copied per project).
 *
 * Coordinates are screen-style: x to the right, y downward.
 */
export type ShapeId = 'circle' | 'triangle' | 'star' | 'umbrella' | 'hexagon' | 'fish' | 'bitcoin' | 'ton' | 'phoenix' | 'dragon' | 'taegeuk' | 'key' | 'butterfly' | 'snowflake';
export type Point = [number, number];

export const SHAPE_IDS: ShapeId[] = ['circle', 'triangle', 'star', 'umbrella', 'hexagon', 'fish', 'bitcoin', 'ton', 'phoenix', 'dragon', 'taegeuk', 'key', 'butterfly', 'snowflake'];

/** Local units per millimetre (100 units = 80 mm). */
export const UNITS_PER_MM = 100 / 80;
/** Coverage bin length in millimetres. */
export const BIN_MM = 1; // 1 mm coverage bins (was 2): finer progress and stricter 'fully traced'
/** Coverage bin length in local units (≈ 2.5). */
export const BIN_UNITS = BIN_MM * UNITS_PER_MM;

/** One traceable line of a stamp: the outer silhouette (closed) or an interior detail (open or closed). */
export interface ShapePath {
  points: Point[];
  closed: boolean;
}

export interface ShapeDef {
  id: ShapeId;
  /** Outer silhouette: closed polyline, resampled to ~BIN_UNITS spacing. Last point is NOT a repeat of the first. */
  points: Point[];
  /** Outer perimeter length in local units. */
  perimeter: number;
  /** Everything the needle must trace: paths[0] is the outer silhouette, the rest are interior details. */
  paths: ShapePath[];
  /** Sum of all path lengths — what progress is measured against. */
  traceLength: number;
}

export interface RawPath {
  points: Point[];
  closed: boolean;
}

export interface ShapeParams {
  /** Time allowed from the first sample. */
  time_limit_ms: number;
  /** Distance (units) from the outline that still counts as "on the line". */
  tol_in: number;
  /** Distance (units) up to which deviation is a warning; beyond it is a hard penalty. */
  tol_warn: number;
  /** Max needle speed in units per millisecond. */
  v_max: number;
  /** Stress per unit of deviation beyond tol_in, per 16 ms of movement. */
  k1: number;
  /** Stress per 16 ms while beyond tol_warn. */
  k2: number;
  /** Stress per unit of excess speed (units/ms over v_max), per 16 ms. */
  k3: number;
  /** Stress recovered per millisecond while not penalised. */
  decay: number;
  /** Base KCG granted on CLEAR (before the speed bonus, see `rewardFor`). */
  reward: number;
}

/**
 * Speed bonus (2026-10-26): clearing within `fast_frac` of the time limit pays `max`× the base reward;
 * the multiplier falls linearly to 1× at the limit. Faster scratching means more stress, so the bonus
 * rewards skill rather than grinding.
 */
export const SPEED_BONUS = { max: 1.5, fast_frac: 0.5 } as const;

export function speedBonus(elapsed_ms: number, time_limit_ms: number): number {
  if (!(time_limit_ms > 0)) return 1;
  const fast = time_limit_ms * SPEED_BONUS.fast_frac;
  if (elapsed_ms <= fast) return SPEED_BONUS.max;
  if (elapsed_ms >= time_limit_ms) return 1;
  const k = (elapsed_ms - fast) / (time_limit_ms - fast); // 0 at `fast`, 1 at the limit
  return SPEED_BONUS.max - (SPEED_BONUS.max - 1) * k;
}

/** KCG actually paid for a CLEAR: base reward × speed bonus, rounded to a whole KCG. */
export function rewardFor(params: Pick<ShapeParams, 'reward' | 'time_limit_ms'>, elapsed_ms: number): number {
  return Math.max(0, Math.round(params.reward * speedBonus(elapsed_ms, params.time_limit_ms)));
}

/* ───────────────────────── geometry helpers ───────────────────────── */

export function dist(a: Point, b: Point): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/** Closed perimeter of a polyline (last → first edge included). */
export function perimeterOf(points: Point[]): number {
  let L = 0;
  for (let i = 0; i < points.length; i++) {
    L += dist(points[i], points[(i + 1) % points.length]);
  }
  return L;
}

/**
 * Resample a closed polyline to (approximately) even spacing.
 * Keeps the start point; the number of output points is round(perimeter / spacing).
 */
export function resampleClosed(points: Point[], spacing: number = BIN_UNITS): Point[] {
  const L = perimeterOf(points);
  const n = Math.max(8, Math.round(L / spacing));
  const step = L / n;
  const out: Point[] = [];
  let segIdx = 0;
  let segStart = points[0];
  let segEnd = points[1 % points.length];
  let segLen = dist(segStart, segEnd);
  let segPos = 0; // distance already consumed on the current segment
  for (let i = 0; i < n; i++) {
    const target = i * step;
    // advance segments until target falls inside the current one
    let consumed = segPos; // absolute distance at segStart
    // recompute absolute start of current segment
    // (we track `base` = absolute arc length at segStart)
    void consumed;
    while (true) {
      const base = cumulative(points, segIdx);
      if (target <= base + segLen + 1e-9 || segIdx >= points.length - 1) {
        const tt = segLen === 0 ? 0 : Math.min(1, Math.max(0, (target - base) / segLen));
        out.push([segStart[0] + (segEnd[0] - segStart[0]) * tt, segStart[1] + (segEnd[1] - segStart[1]) * tt]);
        break;
      }
      segIdx++;
      segStart = points[segIdx];
      segEnd = points[(segIdx + 1) % points.length];
      segLen = dist(segStart, segEnd);
    }
  }
  return out;
}

/** Length of an open polyline. */
export function lengthOf(points: Point[]): number {
  let L = 0;
  for (let i = 0; i + 1 < points.length; i++) L += dist(points[i], points[i + 1]);
  return L;
}

/** Resample an OPEN polyline to even spacing, keeping both end points. */
export function resampleOpen(points: Point[], spacing: number = BIN_UNITS): Point[] {
  const L = lengthOf(points);
  const n = Math.max(2, Math.round(L / spacing));
  const out: Point[] = [];
  let seg = 0, segBase = 0;
  for (let i = 0; i <= n; i++) {
    const target = (L * i) / n;
    while (seg + 1 < points.length - 1 && segBase + dist(points[seg], points[seg + 1]) < target - 1e-9) {
      segBase += dist(points[seg], points[seg + 1]);
      seg++;
    }
    const a = points[seg], b = points[seg + 1];
    const sl = dist(a, b);
    const tt = sl === 0 ? 0 : Math.min(1, Math.max(0, (target - segBase) / sl));
    out.push([a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt]);
  }
  return out;
}

/** Absolute arc length at the start of segment i of a closed polyline. */
function cumulative(points: Point[], i: number): number {
  let L = 0;
  for (let k = 0; k < i; k++) L += dist(points[k], points[(k + 1) % points.length]);
  return L;
}

/* ───────────────────────── raw outlines ───────────────────────── */

const CX = 50;
const CY = 50;

function circleRaw(segments = 64, r = 32): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const a = -Math.PI / 2 + (i / segments) * Math.PI * 2;
    pts.push([CX + r * Math.cos(a), CY + r * Math.sin(a)]);
  }
  return pts;
}

function triangleRaw(side = 60): Point[] {
  const R = side / Math.sqrt(3); // circumradius
  const pts: Point[] = [];
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
    pts.push([CX + R * Math.cos(a), CY + R * Math.sin(a)]);
  }
  return pts;
}

function starRaw(outer = 34, inner = 14): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    pts.push([CX + r * Math.cos(a), CY + r * Math.sin(a)]);
  }
  return pts;
}

/**
 * Umbrella: semicircular canopy + straight handle with a hook.
 * Canopy: radius 30 centred (50,42). Handle: x 48..52, down to y 76. Hook: outer r6 / inner r2 centred (46,76).
 */
function umbrellaRaw(): Point[] {
  const pts: Point[] = [];
  const push = (x: number, y: number) => pts.push([x, y]);
  // canopy arc, left (20,42) over the top to right (80,42)
  const domeN = 40;
  for (let i = 0; i <= domeN; i++) {
    const a = Math.PI + (i / domeN) * Math.PI;
    push(50 + 30 * Math.cos(a), 42 + 30 * Math.sin(a));
  }
  // canopy bottom edge, right part, to the handle's right edge
  push(52, 42);
  // handle right edge down
  push(52, 76);
  // outer hook (clockwise through the bottom) from (52,76) to (40,76)
  const hookN = 16;
  for (let i = 1; i <= hookN; i++) {
    const a = (i / hookN) * Math.PI; // 0 → π
    push(46 + 6 * Math.cos(a), 76 + 6 * Math.sin(a));
  }
  // hook tip cap
  push(44, 76);
  // inner hook back from (44,76) to (48,76)
  const innerN = 8;
  for (let i = 1; i <= innerN; i++) {
    const a = Math.PI - (i / innerN) * Math.PI; // π → 0
    push(46 + 2 * Math.cos(a), 76 + 2 * Math.sin(a));
  }
  // handle left edge up to the canopy
  push(48, 42);
  // canopy bottom edge, left part, back to the start
  push(20, 42);
  return pts;
}

/* ───────────────────────── 2026-10-30 additions ───────────────────────── */

/** Scale a polyline about the cookie centre. */
function scaleAbout(pts: Point[], k: number): Point[] {
  return pts.map(([x, y]) => [CX + (x - CX) * k, CY + (y - CY) * k]);
}

function hexagonRaw(R = 34): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * Math.PI * 2; // pointy top
    pts.push([CX + R * Math.cos(a), CY + R * Math.sin(a)]);
  }
  return pts;
}

/** Points along an ellipse arc, centre (cx,cy), radii rx/ry, angles a0→a1 (radians, screen-style). */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number, skipFirst = false): Point[] {
  const out: Point[] = [];
  for (let i = skipFirst ? 1 : 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return out;
}

/**
 * Fish (붕어): oval body facing left, dorsal fin on top, small belly fin, forked tail on the right.
 * Clockwise from the mouth.
 */
function fishRaw(): Point[] {
  const pts: Point[] = [];
  const push = (...p: Point[]) => pts.push(...p);
  const bx = 44, by = 50, rx = 26, ry = 15;
  push([bx - rx, by]);                                                   // mouth
  push(...arc(bx, by, rx, ry, Math.PI, Math.PI * 1.32, 8, true));        // upper body to the dorsal fin
  push([42, 36], [48, 26], [57, 33]);                                    // dorsal fin
  push(...arc(bx, by, rx, ry, Math.PI * 1.6, Math.PI * 1.8, 5, true));   // down to the tail joint
  push([70, 42], [88, 32], [84, 50], [88, 68], [70, 58]);                // forked tail
  push(...arc(bx, by, rx, ry, Math.PI * 0.2, Math.PI * 0.42, 5, true));  // lower body
  push([54, 64], [50, 72], [44, 64]);                                    // belly fin
  push(...arc(bx, by, rx, ry, Math.PI * 0.62, Math.PI, 8, true).slice(0, -1)); // back towards the mouth
  return pts;
}

/**
 * Bitcoin ₿: a bold "B" (stem on the left, two lobes on the right) with the two short bars that
 * stick out of the top and bottom. Outer silhouette only. Clockwise from the top-left corner.
 */
function bitcoinRaw(): Point[] {
  const pts: Point[] = [];
  const push = (...p: Point[]) => pts.push(...p);
  push([36, 24], [42.5, 24], [42.5, 15], [46, 15], [46, 24], [50.5, 24], [50.5, 15], [54, 15], [54, 24], [56, 24]); // top edge + two 3.5-unit bars
  push(...arc(56, 35, 12, 11, -Math.PI / 2, Math.PI / 2, 12, true)); // upper lobe → (56,46)
  push(...arc(56, 62, 15, 16, -Math.PI / 2, Math.PI / 2, 14, true)); // lower lobe → (56,78)
  push([54, 78], [54, 87], [50.5, 87], [50.5, 78], [46, 78], [46, 87], [42.5, 87], [42.5, 78], [36, 78]); // bottom edge + bars
  return pts;
}

/**
 * TON (Toncoin) gem: a rounded, downward-pointing shield with the logo's vertical slit cut in from the
 * top edge. The slit is only 3.4 units wide — two near-parallel lines the needle must keep apart.
 * Clockwise from the top-left corner.
 */
function tonRaw(): Point[] {
  const pts: Point[] = [];
  const push = (...p: Point[]) => pts.push(...p);
  push(...arc(27, 35, 7, 7, Math.PI, Math.PI * 1.5, 6));          // top-left round corner → (27,28)
  push([48.3, 28], [48.3, 58], [50, 61.5], [51.7, 58], [51.7, 28]); // slit down and back
  push(...arc(73, 35, 7, 7, Math.PI * 1.5, Math.PI * 2, 6));      // top-right round corner → (80,35)
  push([80, 40], [52, 86], [50, 88], [48, 86], [20, 40]);          // sides to the bottom tip
  return pts;
}

/** Phoenix: front view, crest up, wings spread, three tail plumes. Clockwise from the crest. */
function phoenixRaw(): Point[] {
  return [
    [50, 8], [54, 13], [57, 18],
    [58, 28], [66, 24], [78, 20], [90, 22], [92, 30],
    [82, 34], [90, 41], [78, 44], [84, 52], [68, 50],
    [60, 55],
    [66, 68], [72, 82], [61, 77], [56, 90], [50, 80],
    [44, 90], [39, 77], [28, 82], [34, 68],
    [40, 55],
    [32, 50], [16, 52], [22, 44], [10, 41], [18, 34],
    [8, 30], [10, 22], [22, 20], [34, 24], [42, 28],
    [43, 18], [46, 13],
  ];
}

/** Catmull-Rom spline through control points, `per` samples per segment. */
function spline(ctrl: Point[], per = 10): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}

/**
 * Dragon (2026-10-31, "real illustration" tier): a serpentine body built by offsetting an S-shaped
 * centreline, dorsal spikes, four clawed legs, an explicit head with horns and jaw, a tail fin — plus
 * INTERIOR detail paths the needle must also trace: a scale row across the body every 3 samples,
 * a belly line, the eye, the mouth and two whiskers. Outer silhouette is clockwise.
 */
function dragonParts(): { outer: Point[]; details: RawPath[] } {
  const centre = spline([[24, 26], [46, 16], [72, 26], [72, 46], [48, 56], [26, 66], [32, 84], [60, 86], [80, 78]], 8);
  const n = centre.length;
  const halfWidth = (i: number) => 7.0 - 5.2 * Math.pow(i / (n - 1), 1.3); // 7 at the head → 1.8 at the tail
  const tangent = (i: number): [number, number] => {
    const a = centre[Math.max(0, i - 1)], b = centre[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  };
  const left: Point[] = [], right: Point[] = [];
  const legAt = new Map<number, 'left' | 'right'>([[Math.round(n * 0.30), 'right'], [Math.round(n * 0.72), 'left']]);
  for (let i = 0; i < n; i++) {
    const [tx, ty] = tangent(i);
    const nx = -ty, ny = tx, w = halfWidth(i);
    const L: Point = [centre[i][0] + nx * w, centre[i][1] + ny * w];
    const R: Point = [centre[i][0] - nx * w, centre[i][1] - ny * w];
    left.push(L); right.push(R);
    const leg = legAt.get(i);
    if (leg) {
      // a leg: thigh out, foot forward, three claws, back to the body — 9 points on the chosen side
      const sgn = leg === 'left' ? 1 : -1;            // outward direction along the normal
      const ox = nx * sgn, oy = ny * sgn;               // outward
      const fx = -tx, fy = -ty;                          // toward the head
      const base = leg === 'left' ? L : R;
      const P = (du: number, dv: number): Point => [base[0] + ox * dv + fx * du, base[1] + oy * dv + fy * du];
      // thigh out, ankle, foot forward, three claws fanning forward/outward, then back to the body
      // outline order runs head→tail along this side: up the head-side edge of the thigh, three claws
      // fanning forward (each a spike at increasing height), then down the tail-side edge to the body
      const legPts: Point[] = [P(0, 0), P(0.3, 6), P(1, 6.5), P(5, 7), P(1.5, 7.8), P(4.5, 9.5), P(0.5, 8.8), P(2.5, 11.5), P(-1, 8.8), P(-2, 7), P(-1.8, 0.4)];
      (leg === 'left' ? left : right).push(...legPts.slice(1));
      continue;
    }
    // dorsal spikes every 7th sample on the OUTER side of the local bend (never into the body)
    if (i % 7 === 3 && i > 6 && i < n - 8) {
      const a = centre[Math.max(0, i - 1)], b = centre[Math.min(n - 1, i + 1)];
      const cross = (centre[i][0] - a[0]) * (b[1] - centre[i][1]) - (centre[i][1] - a[1]) * (b[0] - centre[i][0]);
      const h = w + 4.5;
      const tipX = centre[i][0] + (cross > 0 ? -nx : nx) * h, tipY = centre[i][1] + (cross > 0 ? -ny : ny) * h;
      if (cross > 0) right.push([tipX, tipY]); else left.push([tipX, tipY]);
    }
  }
  // head in head-local coordinates (u forward, v sideways)
  const head = centre[0];
  const dirx = centre[0][0] - centre[1][0], diry = centre[0][1] - centre[1][1], dl = Math.hypot(dirx, diry) || 1;
  const fx = dirx / dl, fy = diry / dl;
  const sx = -fy, sy = fx;
  const H = (u: number, v: number): Point => [head[0] + fx * u + sx * v, head[1] + fy * u + sy * v];
  const w0 = halfWidth(0);
  const headPts: Point[] = [
    [0, -w0], [1.5, -8], [5, -16.5], [6.5, -8.5], [11.5, -14.5], [10.5, -6.5],
    [13.5, -3.5], [9.5, 0], [13.5, 3.5], [7.5, 7], [0, w0],
  ].map(([u, v]) => H(u, v));
  // tail: a two-pronged fin instead of a plain spike
  const tail = centre[n - 1];
  const [ttx, tty] = tangent(n - 1);
  const tnx = -tty, tny = ttx;
  const tailFin: Point[] = [ // from the right side (−n) over the tip to the left side (+n)
    [tail[0] + ttx * 3 - tnx * 5, tail[1] + tty * 3 - tny * 5],
    [tail[0] + ttx * 9, tail[1] + tty * 9],
    [tail[0] + ttx * 3 + tnx * 5, tail[1] + tty * 3 + tny * 5],
  ];
  const outer = [...right, ...tailFin, ...left.slice().reverse(), ...headPts];

  // ── interior details ──
  const details: RawPath[] = [];
  // scale rows: an arc across the body every 3 samples, bulging toward the tail
  for (let i = 9; i < n - 6; i += 3) {
    const [tx, ty] = tangent(i);
    const nx = -ty, ny = tx, w = halfWidth(i) * 0.82;
    const row: Point[] = [];
    for (let k = 0; k <= 4; k++) {
      const v = -w + (2 * w * k) / 4;
      const bulge = Math.sin((k / 4) * Math.PI) * Math.min(2.2, w * 0.45); // toward the tail
      row.push([centre[i][0] + nx * v + tx * bulge, centre[i][1] + ny * v + ty * bulge]);
    }
    details.push({ points: row, closed: false });
  }
  // belly line along the right side, inset from the edge
  const belly: Point[] = [];
  for (let i = 6; i < n - 8; i += 2) {
    const [tx, ty] = tangent(i);
    const nx = -ty, ny = tx, w = halfWidth(i) * 0.55;
    belly.push([centre[i][0] - nx * w, centre[i][1] - ny * w]);
  }
  details.push({ points: belly, closed: false });
  // eye: a small closed ring on the upper (left) side of the head
  const eye: Point[] = [];
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; const e = H(6 + 1.4 * Math.cos(a), -3.2 + 1.4 * Math.sin(a)); eye.push(e); }
  details.push({ points: eye, closed: true });
  // mouth: from the notch inward
  details.push({ points: [H(9.3, 0.2), H(6, 1.2), H(3, 1.0)], closed: false });
  // whiskers: two curls off the snout
  details.push({ points: spline([H(12.5, -2.5), H(16.5, -5.5), H(19.5, -4.5), H(21, -6.5)], 6), closed: false });
  details.push({ points: spline([H(12.5, 3.2), H(16.5, 6.2), H(19.5, 5.2), H(21, 7.2)], 6), closed: false });
  return { outer, details };
}

/* ───────────────────────── 2026-10-31 hard tier II ───────────────────────── */

/**
 * Taegeuk (the upper half of the KCG symbol): the outer circle from the left over the top to the right,
 * then the S-curve back through the centre — two half-circles of half the radius. Every segment is a
 * curve, so there is no straight stretch to rest on.
 */
function taegeukRaw(R = 32): Point[] {
  const pts: Point[] = [];
  const push = (...p: Point[]) => pts.push(...p);
  push(...arc(CX, CY, R, R, Math.PI, Math.PI * 2, 48));                       // outer arc, left → top → right
  push(...arc(CX + R / 2, CY, R / 2, R / 2, 0, Math.PI, 24, true));           // S: right half-circle, below the axis
  push(...arc(CX - R / 2, CY, R / 2, R / 2, 0, -Math.PI, 24, true).slice(0, -1)); // S: left half-circle, above the axis
  return pts;
}

/** Skeleton key: round bow on top, 5-unit shaft, three teeth on the right. Clockwise from the bow top. */
function keyRaw(): Point[] {
  const pts: Point[] = [];
  const push = (...p: Point[]) => pts.push(...p);
  const bx = 50, by = 28, br = 12, hw = 2.5;
  const junction = Math.atan2(Math.sqrt(br * br - hw * hw), hw);   // angle of the shaft/bow junction (right side)
  // bow: from the LEFT junction clockwise over the top to the RIGHT junction (screen coords, y down)
  push(...arc(bx, by, br, br, Math.PI - junction, Math.PI * 2 + junction, 40));
  // shaft right edge down with three teeth, bottom, then the left edge runs back up to the bow (closing edge)
  push([52.5, 56], [62, 56], [62, 60], [55.5, 60], [55.5, 64], [62, 64], [62, 68], [55.5, 68], [55.5, 72], [64, 72], [64, 78], [52.5, 78]);
  push([52.5, 84], [47.5, 84]); // shaft bottom
  return pts;
}

/** Butterfly: thin body, two-lobed wings with scalloped edges, two antennae (2 units thick). Clockwise from the head. */
function butterflyRaw(): Point[] {
  const right: Point[] = [
    [53, 30], [57, 20], [61, 14], [61.8, 15.5], [57, 23.5], [55.2, 32],          // right antenna (≈2 units thick)
    [55, 36], [66, 26], [78, 24], [86, 30], [88, 42], [84, 48], [87, 52], [83, 58], // upper wing, scalloped edge
    [86, 66], [80, 76], [68, 80], [58, 74], [54, 64],                               // lower wing
    [52, 70], [50, 78],                                                             // body bottom → centre
  ];
  const left: Point[] = right.slice(0, -1).reverse().map(([x, y]) => [100 - x, y] as Point); // mirror (skip the centre point)
  return [[50, 26], ...right, ...left];
}

/** Snowflake: six 5-unit-wide arms, each with a pair of side branches near the tip. Clockwise. */
function snowflakeRaw(): Point[] {
  const arm: Point[] = [ // arm-local: u along the arm (outward), v across
    [9, -2.5], [19, -2.5], [25, -9.5], [26.5, -8], [22, -2.0], [27, -2.0], [34, 0],
    [27, 2.0], [22, 2.0], [26.5, 8], [25, 9.5], [19, 2.5], [9, 2.5],
  ];
  const pts: Point[] = [];
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k / 6) * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (const [u, v] of arm) pts.push([CX + u * ca - v * sa, CY + u * sa + v * ca]);
    const mid = a + Math.PI / 6; // inner vertex between arms
    pts.push([CX + 7 * Math.cos(mid), CY + 7 * Math.sin(mid)]);
  }
  return pts;
}

function build(id: ShapeId, raw: Point[], details: RawPath[] = []): ShapeDef {
  const points = resampleClosed(raw, BIN_UNITS);
  const paths: ShapePath[] = [{ points, closed: true }];
  for (const d of details) {
    const pts = d.closed ? resampleClosed(d.points, BIN_UNITS) : resampleOpen(d.points, BIN_UNITS);
    paths.push({ points: pts, closed: d.closed });
  }
  const traceLength = paths.reduce((acc, pth) => acc + (pth.closed ? perimeterOf(pth.points) : lengthOf(pth.points)), 0);
  return { id, points, perimeter: perimeterOf(points), paths, traceLength };
}

export const SHAPES: Record<ShapeId, ShapeDef> = {
  circle: build('circle', circleRaw()),
  triangle: build('triangle', triangleRaw()),
  star: build('star', starRaw()),
  umbrella: build('umbrella', umbrellaRaw()),
  hexagon: build('hexagon', hexagonRaw()),
  fish: build('fish', scaleAbout(fishRaw(), 0.92)),
  bitcoin: build('bitcoin', bitcoinRaw()),
  ton: build('ton', tonRaw()),
  phoenix: build('phoenix', scaleAbout(phoenixRaw(), 0.84)),
  dragon: (() => { const d = dragonParts(), k = 0.83; return build('dragon', scaleAbout(d.outer, k), d.details.map(x => ({ ...x, points: scaleAbout(x.points, k) }))); })(),
  taegeuk: build('taegeuk', taegeukRaw()),
  key: build('key', keyRaw()),
  butterfly: build('butterfly', butterflyRaw()),
  snowflake: build('snowflake', snowflakeRaw()),
};

/**
 * Per-shape parameters — GENERATED from the difficulty metric (scratchpad/difficulty.mjs, 2026-10-31):
 * score = trace length/60 mm + corners×0.10 + sharp corners×0.05 + thin features×0.06 + detail paths×0.25,
 * anchored so circle/triangle/star/umbrella are ★1/★2/★3/★4 (their time limits and rewards are kept as
 * launched). Each star tier fixes tolerance / speed cap / penalties; reward = length_mm/10 × tier multiplier
 * (0.2 / 0.3 / 0.5 / 0.75 / 1.2 / 2.0), time = length / tier speed budget (3.6 … 2.0 mm/s), rounded to 5 s.
 * tol_* in local units (100 = 80 mm cookie → 1 unit = 0.8 mm); reward in KCG (the token column IS KCG).
 */
export const SHAPE_PARAMS: Record<ShapeId, ShapeParams> = {
  circle: { time_limit_ms: 45_000, tol_in: 1.4, tol_warn: 2.8, v_max: 0.25, k1: 0.0045, k2: 0.03, k3: 0.08, decay: 0.0002, reward: 3 },  // ★1
  triangle: { time_limit_ms: 55_000, tol_in: 1.4, tol_warn: 2.8, v_max: 0.22, k1: 0.005, k2: 0.035, k3: 0.09, decay: 0.0002, reward: 5 },  // ★2
  star: { time_limit_ms: 70_000, tol_in: 1.2, tol_warn: 2.4, v_max: 0.20, k1: 0.006, k2: 0.04, k3: 0.1, decay: 0.00018, reward: 8 },  // ★3
  umbrella: { time_limit_ms: 90_000, tol_in: 1.1, tol_warn: 2.2, v_max: 0.18, k1: 0.007, k2: 0.045, k3: 0.11, decay: 0.00016, reward: 15 },  // ★4
  hexagon: { time_limit_ms: 50_000, tol_in: 1.4, tol_warn: 2.8, v_max: 0.25, k1: 0.0045, k2: 0.03, k3: 0.08, decay: 0.0002, reward: 3 },  // ★1
  fish: { time_limit_ms: 55_000, tol_in: 1.2, tol_warn: 2.4, v_max: 0.20, k1: 0.006, k2: 0.04, k3: 0.1, decay: 0.00018, reward: 8 },  // ★3
  bitcoin: { time_limit_ms: 80_000, tol_in: 1.1, tol_warn: 2.2, v_max: 0.18, k1: 0.007, k2: 0.045, k3: 0.11, decay: 0.00016, reward: 15 },  // ★4
  ton: { time_limit_ms: 70_000, tol_in: 1.2, tol_warn: 2.4, v_max: 0.20, k1: 0.006, k2: 0.04, k3: 0.1, decay: 0.00018, reward: 10 },  // ★3
  phoenix: { time_limit_ms: 120_000, tol_in: 1, tol_warn: 2, v_max: 0.16, k1: 0.009, k2: 0.06, k3: 0.13, decay: 0.00013, reward: 32 },  // ★5
  dragon: { time_limit_ms: 310_000, tol_in: 0.95, tol_warn: 1.9, v_max: 0.14, k1: 0.012, k2: 0.08, k3: 0.16, decay: 0.0001, reward: 122 },  // ★6
  taegeuk: { time_limit_ms: 50_000, tol_in: 1.4, tol_warn: 2.8, v_max: 0.22, k1: 0.005, k2: 0.035, k3: 0.09, decay: 0.0002, reward: 5 },  // ★2
  key: { time_limit_ms: 60_000, tol_in: 1.2, tol_warn: 2.4, v_max: 0.20, k1: 0.006, k2: 0.04, k3: 0.1, decay: 0.00018, reward: 8 },  // ★3
  butterfly: { time_limit_ms: 135_000, tol_in: 1, tol_warn: 2, v_max: 0.16, k1: 0.009, k2: 0.06, k3: 0.13, decay: 0.00013, reward: 35 },  // ★5
  snowflake: { time_limit_ms: 210_000, tol_in: 0.95, tol_warn: 1.9, v_max: 0.14, k1: 0.012, k2: 0.08, k3: 0.16, decay: 0.0001, reward: 82 },  // ★6
};

export function isShapeId(v: unknown): v is ShapeId {
  return typeof v === 'string' && (SHAPE_IDS as string[]).includes(v);
}
