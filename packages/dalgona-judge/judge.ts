/**
 * Dalgona scratch judge — pure, deterministic, no DOM / Node APIs.
 * Source of truth: dalgona/shared (copied verbatim into dalgona/server and dalgona/front).
 *
 * Implements docs/DALGONA_PLAN.md §3:
 *   d  = distance(sample, outline); u = arc length of the nearest outline point
 *   on the line (d ≤ tol_in)         → coverage bin filled
 *   warning band (tol_in < d ≤ tol_warn) → stress += k1·(d − tol_in)
 *   far off (d > tol_warn)           → stress += k2
 *   too fast (v > v_max)             → stress += k3·(v − v_max)
 *   stress decays by `decay` per ms; BROKEN at stress ≥ 1, CLEAR at progress ≥ 0.97,
 *   TIMEOUT when elapsed > time_limit. Results are sticky.
 *
 * Penalties are scaled by dt/16 so the outcome does not depend on the sampling rate.
 */
import { BIN_UNITS, dist, type Point, type ShapeDef, type ShapeParams, type ShapePath } from './shapes';

export interface Sample {
  x: number;
  y: number;
  /** milliseconds (any monotonic clock; only differences matter) */
  t: number;
}

export type JudgeResult = 'playing' | 'clear' | 'broken' | 'timeout';

export interface JudgeState {
  progress: number; // 0..1 filled bins / total bins
  stress: number; // 0..1
  result: JudgeResult;
  elapsed_ms: number;
  bins_total: number;
  bins_filled: number;
  samples: number;
}

export interface Judge {
  /** Feed samples in time order (may be called repeatedly with new batches). */
  feed(samples: Sample[]): JudgeState;
  state(): JudgeState;
  /** Coverage bitmap (read-only view for rendering). */
  bins(): Uint8Array;
}

export const CLEAR_PROGRESS = 0.97;
const FRAME_MS = 16;
/** Distance a comfortable human trace covers per 16 ms frame (~0.06 units/ms). */
const STEP_UNITS = 1;
/** Cap on the per-sample movement scale (the sanity guard rejects real teleports anyway). */
const MAX_MOVE_SCALE = 4;
/** Longest gap that still counts as continuous movement for speed/decay math. */
const MAX_DT_MS = 100;
/** Max arc distance between two consecutive on-line samples that we fill continuously. */
const FILL_MAX_ARC = BIN_UNITS * 4;

interface Segment {
  a: Point;
  b: Point;
  len: number;
  base: number;  // arc length at `a` on the combined trace (all paths laid end to end)
  path: number;  // index into `paths`
}

export interface Nearest {
  d: number;
  u: number;     // position on the combined trace
  path: number;
}

/**
 * Precomputed trace for fast nearest-point queries. Accepts the shape's `paths` (outer silhouette +
 * interior details, each open or closed) — or a bare closed point list for backwards compatibility.
 * `perimeter` is the total length of everything that has to be traced.
 */
export class Outline {
  readonly segments: Segment[] = [];
  readonly perimeter: number;
  readonly pathBase: number[] = [];
  readonly pathLen: number[] = [];
  readonly pathClosed: boolean[] = [];
  constructor(input: ShapePath[] | Point[]) {
    const paths: ShapePath[] = input.length > 0 && Array.isArray((input as Point[])[0]) && typeof (input as Point[])[0][0] === 'number'
      ? [{ points: input as Point[], closed: true }]
      : (input as ShapePath[]);
    let base = 0;
    paths.forEach((pth, pi) => {
      const pts = pth.points;
      const nSeg = pth.closed ? pts.length : pts.length - 1;
      const start = base;
      for (let i = 0; i < nSeg; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const len = dist(a, b);
        this.segments.push({ a, b, len, base, path: pi });
        base += len;
      }
      this.pathBase.push(start);
      this.pathLen.push(base - start);
      this.pathClosed.push(pth.closed);
    });
    this.perimeter = base;
  }

  /** Nearest point on any path: distance, position on the combined trace, path index. */
  nearest(x: number, y: number): Nearest {
    let bestD = Infinity;
    let bestU = 0;
    let bestP = 0;
    for (const s of this.segments) {
      const vx = s.b[0] - s.a[0];
      const vy = s.b[1] - s.a[1];
      const wx = x - s.a[0];
      const wy = y - s.a[1];
      const l2 = s.len * s.len;
      let tt = l2 === 0 ? 0 : (wx * vx + wy * vy) / l2;
      if (tt < 0) tt = 0;
      else if (tt > 1) tt = 1;
      const px = s.a[0] + vx * tt;
      const py = s.a[1] + vy * tt;
      const dx = x - px;
      const dy = y - py;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) {
        bestD = d;
        bestU = s.base + s.len * tt;
        bestP = s.path;
      }
    }
    return { d: bestD, u: bestU, path: bestP };
  }
}

export function createJudge(shape: ShapeDef, params: ShapeParams, startAt?: number): Judge {
  const outline = new Outline(shape.paths ?? shape.points);
  const binsTotal = Math.max(8, Math.round(outline.perimeter / BIN_UNITS));
  const bins = new Uint8Array(binsTotal);
  let filled = 0;
  let stress = 0;
  let result: JudgeResult = 'playing';
  let count = 0;
  let t0: number | null = startAt ?? null;
  let lastT = t0;
  let prev: Sample | null = null;
  let prevOnLineU: number | null = null;
  let prevOnLinePath = -1;

  const binOf = (u: number): number => {
    let i = Math.floor((u / outline.perimeter) * binsTotal);
    if (i >= binsTotal) i = binsTotal - 1;
    if (i < 0) i = 0;
    return i;
  };
  const fillBin = (i: number) => {
    if (bins[i] === 0) {
      bins[i] = 1;
      filled++;
    }
  };
  /** Fill every bin between two consecutive on-line positions on the SAME path (wrapping only on closed paths). */
  const fillArc = (u1: number, u2: number, path: number) => {
    const L = outline.pathLen[path];
    const b0 = outline.pathBase[path];
    let delta = u2 - u1;
    if (outline.pathClosed[path]) {
      if (delta > L / 2) delta -= L;
      if (delta < -L / 2) delta += L;
    }
    if (Math.abs(delta) > FILL_MAX_ARC) return;
    const steps = Math.ceil(Math.abs(delta) / (BIN_UNITS / 2));
    for (let s = 1; s < steps; s++) {
      let u = u1 + (delta * s) / steps;
      if (outline.pathClosed[path]) u = b0 + ((((u - b0) % L) + L) % L);
      else u = Math.min(b0 + L, Math.max(b0, u));
      fillBin(binOf(u));
    }
  };

  const snapshot = (): JudgeState => ({
    progress: filled / binsTotal,
    stress: Math.min(1, Math.max(0, stress)),
    result,
    elapsed_ms: t0 === null || lastT === null ? 0 : Math.max(0, lastT - t0),
    bins_total: binsTotal,
    bins_filled: filled,
    samples: count,
  });

  const feedOne = (p: Sample) => {
    if (result !== 'playing') return;
    if (t0 === null) t0 = p.t;
    const dt = prev ? Math.max(0, p.t - prev.t) : 0;
    lastT = p.t;
    count++;

    // time limit first: a sample after the deadline never counts
    if (p.t - t0 > params.time_limit_ms) {
      result = 'timeout';
      prev = p;
      return;
    }

    const { d, u, path } = outline.nearest(p.x, p.y);
    // Deviation penalties scale with how far the needle MOVED, not with elapsed time: resting the
    // needle off the line (or a lag spike / app pause) must not snap the candy. One "step" is the
    // distance a human trace covers in 16 ms (~1 unit), so the k1/k2 constants keep their meaning.
    const moved = prev ? dist([p.x, p.y], [prev.x, prev.y]) : 0;
    const moveScale = Math.min(moved / STEP_UNITS, MAX_MOVE_SCALE);
    const timeScale = Math.min(dt, MAX_DT_MS) / FRAME_MS;
    let penalised = false;

    if (d <= params.tol_in) {
      fillBin(binOf(u));
      if (prevOnLineU !== null && prevOnLinePath === path && dt > 0) fillArc(prevOnLineU, u, path);
      prevOnLineU = u;
      prevOnLinePath = path;
    } else {
      prevOnLineU = null;
      prevOnLinePath = -1;
      if (d <= params.tol_warn) {
        stress += params.k1 * (d - params.tol_in) * moveScale;
      } else {
        stress += params.k2 * moveScale;
      }
      penalised = true;
    }

    if (prev && dt > 0) {
      const v = moved / dt;
      if (v > params.v_max) {
        stress += params.k3 * (v - params.v_max) * timeScale;
        penalised = true;
      }
    }

    if (!penalised && dt > 0) {
      stress = Math.max(0, stress - params.decay * Math.min(dt, MAX_DT_MS * 10));
    }

    if (stress >= 1) {
      stress = 1;
      result = 'broken';
    } else if (filled / binsTotal >= CLEAR_PROGRESS) {
      result = 'clear';
    }
    prev = p;
  };

  return {
    feed(samples: Sample[]) {
      for (const s of samples) feedOne(s);
      return snapshot();
    },
    state: snapshot,
    bins: () => bins,
  };
}

/* ───────────────────────── sanity guard ───────────────────────── */

export const SANITY_MAX_HZ = 120;
export const SANITY_MAX_JUMP = 40; // units between consecutive samples …
/**
 * … but only a teleport when it is also impossibly fast. Lifting the needle and touching down on the
 * far side of the cookie is a normal move (≈100 units in 150+ ms); a 40-unit hop inside one frame is not.
 * 1.5 units/ms = 1.2 m/s on an 80 mm cookie — beyond any finger.
 */
export const SANITY_MAX_SPEED = 1.5; // units per ms
export const SANITY_MIN_FOR_RATE = 10; // need this many samples to judge the rate

export type SanityReason = 'invalid' | 'non_monotonic' | 'teleport' | 'too_fast_sampling' | 'out_of_bounds';

/**
 * Reject inhuman input. `previous` is the last accepted sample of the session (if any)
 * so the first sample of a new batch is checked against it too.
 */
export function sanity(samples: Sample[], previous?: Sample | null): SanityReason | null {
  if (!Array.isArray(samples)) return 'invalid';
  let last: Sample | null = previous ?? null;
  for (const s of samples) {
    if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.y) || !Number.isFinite(s.t)) return 'invalid';
    if (s.x < -50 || s.x > 150 || s.y < -50 || s.y > 150) return 'out_of_bounds';
    if (last) {
      if (s.t <= last.t) return 'non_monotonic';
      const d = dist([s.x, s.y], [last.x, last.y]);
      if (d > SANITY_MAX_JUMP && d / (s.t - last.t) > SANITY_MAX_SPEED) return 'teleport';
    }
    last = s;
  }
  if (samples.length >= SANITY_MIN_FOR_RATE) {
    const span = samples[samples.length - 1].t - samples[0].t;
    if (span > 0 && (samples.length - 1) / (span / 1000) > SANITY_MAX_HZ) return 'too_fast_sampling';
  }
  return null;
}
