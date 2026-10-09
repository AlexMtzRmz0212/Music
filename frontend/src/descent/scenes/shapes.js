// Small helpers for the scenery. Every scene is drawn on a 1440 x 200 canvas (see Scene.jsx) and anchored to the
// bottom, so on a narrow screen the sides are cropped and the middle stays.

export const W = 1440;
export const H = 200;

// a steady pseudo-random number in [0, 1) for position i, so the scenery is the same on every visit
export const rnd = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** A bumpy edge across the canvas: cloud bottoms (hanging from the top) or hill tops (rising from the bottom). */
export function bumps({ y, amp, step, from = "top", seed = 1 }) {
  let d = from === "top" ? `M0 0 H${W} V${y}` : `M0 ${H} H${W} V${y}`;
  for (let x = W, i = 0; x > 0; x -= step, i++) {
    const nx = Math.max(0, x - step);
    const lift = amp * (0.55 + 0.45 * rnd(seed + i));
    const cy = from === "top" ? y + lift : y - lift;
    d += ` Q${(x + nx) / 2} ${cy} ${nx} ${y}`;
  }
  return `${d} Z`;
}

/** Jagged rock edge hanging from the top: a cave ceiling, or stalactites when `long` is set. */
export function teeth({ y, depth, step, seed = 1, long = 0 }) {
  let d = `M0 0 H${W} V${y}`;
  for (let x = W, i = 0; x > 0; x -= step, i++) {
    const nx = Math.max(0, x - step);
    const tip = y + depth * (0.35 + 0.65 * rnd(seed + i)) + (long && rnd(seed + i * 3) > 0.7 ? long : 0);
    d += ` L${x - step / 2} ${tip} L${nx} ${y}`;
  }
  return `${d} Z`;
}

/** n points spread across the canvas with a little jitter: [{ x, j }], j in [0, 1). */
export function spread(n, seed = 1, from = 0, to = W) {
  return Array.from({ length: n }, (_, i) => ({
    x: from + ((i + 0.5) / n) * (to - from) + (rnd(seed + i) - 0.5) * ((to - from) / n) * 0.6,
    j: rnd(seed + i * 7),
  }));
}
