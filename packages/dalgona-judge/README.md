# @koreaculturegame/dalgona-judge

The deterministic judge behind **Dalgona**, the KCG candy-carving game. The exact same module runs in the browser (instant feedback: progress ring, stress bar, cracks) and on the game server (the final verdict and the reward). Publishing it lets anyone verify how a trace is scored.

## What it does

- `shapes.ts` — 14 stamp outlines in a 100×100 local space (1 unit = 0.8 mm on an 80 mm cookie): circle, triangle, star, umbrella, hexagon, fish, bitcoin, TON, phoenix, dragon, taegeuk, key, butterfly, snowflake. A shape is a list of **paths** (outer silhouette + optional interior details such as the dragon's scales); every path is resampled to 1 mm bins.
- `judge.ts` — `createJudge(shape, params)` consumes needle samples `{x, y, t}` and returns `{ progress, stress, result }`:
  - a sample within `tol_in` of a path fills the nearest 1 mm bin (and the bins between two consecutive on-line samples on the same path);
  - beyond `tol_in` stress grows with the deviation (`k1`), beyond `tol_warn` it grows per step (`k2`), above the speed cap `v_max` it grows with the excess speed (`k3`); stress decays while on the line;
  - `result` becomes `clear` at 97 % coverage, `broken` when stress reaches 1, `timeout` past `time_limit_ms`. Results are sticky.
  - `sanity()` rejects impossible input (non-monotonic time, >120 Hz sampling, >1.5 units/ms teleports).
- `speedBonus()` / `rewardFor()` — reward = base × up to 1.5 when cleared within half the time limit.

Difficulty tiers (★1–★6) are derived from a geometric score (trace length, corners, sharp corners, thin features, detail paths) and fix tolerance, speed cap and penalties per tier.

## Use

```ts
import { SHAPES, SHAPE_PARAMS, createJudge, sanity, rewardFor } from '@koreaculturegame/dalgona-judge';

const judge = createJudge(SHAPES.star, SHAPE_PARAMS.star);
const state = judge.feed([{ x: 50, y: 18, t: 0 }, { x: 51.2, y: 18.1, t: 16 } /* … */]);
// state.progress 0..1, state.stress 0..1, state.result 'playing' | 'clear' | 'broken' | 'timeout'
if (state.result === 'clear') console.log('reward', rewardFor(SHAPE_PARAMS.star, state.elapsed_ms));
```

## Test

```bash
npm install
npm test     # tsc + node --test: perfect traces clear every shape, deviations break, sanity guard, tiers
```

## License

MIT © Korea Culture Game. The rest of the game (3D client, servers) is closed source.
