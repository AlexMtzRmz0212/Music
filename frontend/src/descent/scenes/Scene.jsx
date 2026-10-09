import { H, W } from "./shapes";

// The band of scenery at the top of a realm: an SVG (decoration only) plus anything clickable laid over it
// (pomegranate seeds, Cerberus...). Swapping a realm's art for an illustration later only means replacing
// the SVG children of its scene.
export default function Scene({ id, children, extras }) {
  return (
    <div className={`scene scene-${id}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
        {children}
      </svg>
      {extras}
    </div>
  );
}
