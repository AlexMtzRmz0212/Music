import Seed from "../eggs/Seed";
import Scene from "./Scene";
import { spread, teeth } from "./shapes";

// Under the earth now: a rock ceiling, and a pale field of asphodel where most shades wander. In spring (all six
// seeds found) the flowers take colour and the field turns green; descent.css does the recolouring.
export default function Asphodel() {
  return (
    <Scene id="asphodel" extras={<Seed id="asphodel" x={68} y={74} />}>
      <path d={teeth({ y: 26, depth: 26, step: 60, seed: 61 })} fill="#252231" />
      <path className="field" d="M0 200V158Q360 140 720 156T1440 150V200Z" fill="#34304A" />
      <g className="shades" fill="#E4DFEF" opacity="0.18">
        {spread(5, 67, 160, 1300).map(({ x, j }) => (
          <path key={x} d={`M${x} ${120 - j * 30}c-8 -14 -8 -30 0 -42c8 12 8 28 0 42z`} />
        ))}
      </g>
      {spread(26, 71).map(({ x, j }) => {
        const top = 150 - j * 34;
        return (
          <g key={x}>
            <path className="stalk" d={`M${x} 196V${top}`} stroke="#8C86A3" strokeWidth="2" />
            <g className="flower" fill="#E4DFEF">
              <circle cx={x} cy={top} r="4" />
              <circle cx={x - 5} cy={top + 7} r="3.2" />
              <circle cx={x + 5} cy={top + 6} r="3.2" />
              <circle cx={x} cy={top + 13} r="2.8" />
            </g>
          </g>
        );
      })}
    </Scene>
  );
}
