/**
 * node --test suite for the judge. Run: npm test (compiles with tsc first).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHAPES, SHAPE_PARAMS, SHAPE_IDS, speedBonus, rewardFor, type Point, type ShapeId } from './shapes';
import { createJudge, sanity, type Sample } from './judge';

/** Walk a closed polyline at `speed` units/ms, emitting a sample every `dtMs`. */
function traceAlong(points: Point[], speed: number, dtMs: number, opts: { laps?: number; offset?: (p: Point, i: number) => Point; fraction?: number; t0?: number; closed?: boolean } = {}): Sample[] {
  const laps = opts.laps ?? 1;
  const fraction = opts.fraction ?? 1;
  const step = speed * dtMs; // units per sample
  const out: Sample[] = [];
  let t = opts.t0 ?? 0;
  // total length
  let L = 0;
  const segLen: number[] = [];
  const nSeg = opts.closed === false ? points.length - 1 : points.length; // open paths do not close back
  for (let i = 0; i < nSeg; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segLen.push(l); L += l;
  }
  const total = L * laps * fraction;
  let i = 0;
  for (let s = 0; s <= total; s += step) {
    // locate arc position s mod L
    let u = s % L;
    let k = 0;
    while (u > segLen[k] && k < segLen.length - 1) { u -= segLen[k]; k++; }
    const a = points[k], b = points[(k + 1) % points.length];
    const tt = segLen[k] === 0 ? 0 : u / segLen[k];
    let p: Point = [a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt];
    if (opts.offset) p = opts.offset(p, i);
    out.push({ x: p[0], y: p[1], t });
    t += dtMs;
    i++;
  }
  return out;
}

for (const id of SHAPE_IDS) {
  test(`perfect human trace clears: ${id}`, () => {
    const shape = SHAPES[id as ShapeId];
    const params = SHAPE_PARAMS[id as ShapeId];
    const judge = createJudge(shape, params);
    // trace every path (outer silhouette, then each interior detail) at 48 mm/s, lifting between paths
    let t0 = 0;
    const samples: Sample[] = [];
    for (const pth of shape.paths) {
      const part = traceAlong(pth.points, 0.06, 16, { t0, closed: pth.closed });
      samples.push(...part);
      t0 = (part[part.length - 1]?.t ?? t0) + 400;
    }
    const st = judge.feed(samples);
    assert.equal(st.result, 'clear', `${id}: ${JSON.stringify(st)}`);
    assert.ok(st.progress >= 0.97, `${id} progress ${st.progress}`);
    assert.ok(st.stress < 0.2, `${id} stress ${st.stress}`);
    assert.ok(st.elapsed_ms < params.time_limit_ms);
  });
}

test('wandering 6 units off the line for a stretch breaks the cookie', () => {
  const shape = SHAPES.circle;
  const judge = createJudge(shape, SHAPE_PARAMS.circle);
  // first 40% on the line, then drift radially outward by 6 units for the rest
  const samples = traceAlong(shape.points, 0.06, 16, {
    offset: (p, i) => {
      if (i < 55) return p;
      const dx = p[0] - 50, dy = p[1] - 50;
      const r = Math.hypot(dx, dy) || 1;
      return [50 + dx * ((r + 6) / r), 50 + dy * ((r + 6) / r)];
    },
  });
  const st = judge.feed(samples);
  assert.equal(st.result, 'broken', JSON.stringify(st));
  assert.ok(st.progress < 0.97);
});

test('tracing at 3× v_max breaks the cookie', () => {
  const shape = SHAPES.circle;
  const params = SHAPE_PARAMS.circle;
  const judge = createJudge(shape, params);
  const samples = traceAlong(shape.points, params.v_max * 3, 16, { laps: 3 });
  const st = judge.feed(samples);
  assert.equal(st.result, 'broken', JSON.stringify(st));
});

test('slow partial trace past the time limit times out', () => {
  const shape = SHAPES.circle;
  const params = SHAPE_PARAMS.circle;
  const judge = createJudge(shape, params);
  // 30% of the perimeter, but spread over time_limit + 5 s
  const partial = traceAlong(shape.points, 0.06, 16, { fraction: 0.3 });
  const span = params.time_limit_ms + 5000;
  const slow = partial.map((s, i) => ({ ...s, t: Math.round((i / (partial.length - 1)) * span) }));
  const st = judge.feed(slow);
  assert.equal(st.result, 'timeout', JSON.stringify(st));
  assert.ok(st.progress < 0.97);
});

test('results are sticky and batches accumulate', () => {
  const shape = SHAPES.triangle;
  const judge = createJudge(shape, SHAPE_PARAMS.triangle);
  const samples = traceAlong(shape.points, 0.06, 16);
  const half = Math.floor(samples.length / 2);
  const a = judge.feed(samples.slice(0, half));
  assert.equal(a.result, 'playing');
  const b = judge.feed(samples.slice(half));
  assert.equal(b.result, 'clear');
  const c = judge.feed([{ x: 0, y: 0, t: samples[samples.length - 1].t + 16 }]); // far off, after clear
  assert.equal(c.result, 'clear');
});

test('sanity rejects teleports, non-monotonic time and >120 Hz sampling', () => {
  assert.equal(sanity([{ x: 10, y: 10, t: 0 }, { x: 60, y: 10, t: 16 }]), 'teleport');
  // lifting the needle and touching down across the cookie is NOT a teleport (100 units in 150 ms)
  assert.equal(sanity([{ x: 0, y: 50, t: 0 }, { x: 100, y: 50, t: 150 }]), null);
  assert.equal(sanity([{ x: 10, y: 10, t: 16 }, { x: 11, y: 10, t: 16 }]), 'non_monotonic');
  const fast: Sample[] = [];
  for (let i = 0; i < 30; i++) fast.push({ x: 10 + i * 0.1, y: 10, t: i * 2 }); // 500 Hz
  assert.equal(sanity(fast), 'too_fast_sampling');
  const ok: Sample[] = [];
  for (let i = 0; i < 30; i++) ok.push({ x: 10 + i * 0.5, y: 10, t: i * 16 });
  assert.equal(sanity(ok), null);
  // cross-batch check against the previous sample
  assert.equal(sanity([{ x: 90, y: 10, t: 100 }], { x: 10, y: 10, t: 84 }), 'teleport');
  assert.equal(sanity([{ x: 90, y: 10, t: 400 }], { x: 10, y: 10, t: 84 }), null); // same hop after a lift
  assert.equal(sanity([{ x: 12, y: 10, t: 50 }], { x: 10, y: 10, t: 84 }), 'non_monotonic');
  assert.equal(sanity([{ x: NaN, y: 10, t: 1 }]), 'invalid');
});

test('shapes are evenly resampled and sized sanely', () => {
  for (const id of SHAPE_IDS) {
    const s = SHAPES[id as ShapeId];
    assert.ok(s.points.length >= 60, `${id} has ${s.points.length} points`);
    assert.ok(s.perimeter > 100 && s.perimeter < 700, `${id} perimeter ${s.perimeter}`); // dragon outer ≈ 540 with spikes, legs and fin
    for (const [x, y] of s.points) {
      assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `${id} point out of space: ${x},${y}`);
    }
  }
  assert.ok(SHAPES.umbrella.points.length >= 80);
});

test('speed bonus: 1.5× within half the limit, linear to 1× at the limit, never below 1×', () => {
  assert.equal(speedBonus(0, 60_000), 1.5);
  assert.equal(speedBonus(30_000, 60_000), 1.5);
  assert.ok(Math.abs(speedBonus(45_000, 60_000) - 1.25) < 1e-9);
  assert.equal(speedBonus(60_000, 60_000), 1);
  assert.equal(speedBonus(90_000, 60_000), 1);
  assert.equal(speedBonus(10, 0), 1);
});

test('rewards are whole KCG on the glass scale: 3/5/8/15 base, 4/10 mid tier, 30/35/45/60 hard tier, umbrella fast clear pays 23', () => {
  assert.deepEqual(SHAPE_IDS.map(id => SHAPE_PARAMS[id].reward), [3, 5, 8, 15, 3, 8, 15, 10, 32, 122, 5, 8, 35, 82]);
  const u = SHAPE_PARAMS.umbrella;
  assert.equal(rewardFor(u, 30_000), 23);           // 15 × 1.5 = 22.5 → 23
  assert.equal(rewardFor(u, u.time_limit_ms), 15);  // at the limit: base only
  assert.equal(rewardFor(SHAPE_PARAMS.circle, 40_000), 3);
  assert.equal(rewardFor(SHAPE_PARAMS.circle, 1_000), 5);  // 3 × 1.5 = 4.5 → 5
});

test('tightened band: a lap 1.7 units outside the circle fills no bins (it used to count as on-line)', () => {
  const shape = SHAPES.circle;
  const pts = shape.points;
  const out = (p: Point): Point => { const rx = p[0] - 50, ry = p[1] - 50, r = Math.hypot(rx, ry) || 1; return [p[0] + (rx / r) * 1.7, p[1] + (ry / r) * 1.7]; };
  const j = createJudge(shape, SHAPE_PARAMS.circle, 0);
  const st = j.feed(traceAlong(pts, 0.05, 16, { offset: out }));
  assert.equal(st.bins_filled, 0);
  assert.notEqual(st.result, 'clear');
  const inside = (p: Point): Point => { const rx = p[0] - 50, ry = p[1] - 50, r = Math.hypot(rx, ry) || 1; return [p[0] + (rx / r) * 1.2, p[1] + (ry / r) * 1.2]; };
  const j2 = createJudge(shape, SHAPE_PARAMS.circle, 0);
  assert.equal(j2.feed(traceAlong(pts, 0.05, 16, { offset: inside })).result, 'clear');
});

