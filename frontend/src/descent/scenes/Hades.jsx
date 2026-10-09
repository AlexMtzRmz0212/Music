import Cerberus from "../eggs/Cerberus";
import Seed from "../eggs/Seed";
import { useWorld } from "../world";
import Scene from "./Scene";
import { spread, teeth } from "./shapes";

// The deepest hall: stalactites, a warm ember glow, the palace gate between two braziers, and Cerberus on guard.
// Petting Cerberus opens the gate; in spring, flowers grow at its foot.
function Brazier({ x }) {
  return (
    <g transform={`translate(${x} 176)`}>
      <path d="M-4 0V-30M4 0V-30" stroke="#5A2E22" strokeWidth="4" />
      <path d="M-18 -30H18L12 -42H-12Z" fill="#5A2E22" />
      <path className="flame" d="M0 -78C10 -64 14 -54 8 -44H-8C-14 -54 -10 -64 0 -78Z" fill="#F06A43" />
      <path className="flame inner" d="M0 -66C5 -58 7 -52 4 -46H-4C-7 -52 -5 -58 0 -66Z" fill="#FFC56B" />
    </g>
  );
}

export default function Hades() {
  const { petted } = useWorld();
  return (
    <Scene
      id="hades"
      extras={
        <>
          <Cerberus />
          <Seed id="hades" x={63} y={46} />
        </>
      }
    >
      <defs>
        <radialGradient id="ember-glow">
          <stop offset="0" stopColor="#F06A43" stopOpacity="0.45" />
          <stop offset="1" stopColor="#F06A43" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="720" cy="160" rx="420" ry="120" fill="url(#ember-glow)" />
      <path d={teeth({ y: 18, depth: 30, step: 46, seed: 83, long: 34 })} fill="#160A0B" />
      <g className="embers" fill="#FFB067">
        {spread(10, 89, 300, 1140).map(({ x, j }) => (
          <circle key={x} cx={x} cy={120 + j * 60} r={1.2 + j * 1.4} opacity={0.4 + j * 0.4} />
        ))}
      </g>
      <g className={`gate${petted ? " open" : ""}`}>
        <rect x="652" y="70" width="136" height="12" fill="#4A2622" />
        <polygon points="644,70 720,40 796,70" fill="#4A2622" />
        <rect x="656" y="82" width="16" height="96" fill="#5A2E22" />
        <rect x="768" y="82" width="16" height="96" fill="#5A2E22" />
        <rect className="door left" x="672" y="86" width="48" height="92" fill="#1B0C0D" />
        <rect className="door right" x="720" y="86" width="48" height="92" fill="#1B0C0D" />
        <rect x="640" y="178" width="160" height="8" fill="#4A2622" />
      </g>
      <Brazier x={600} />
      <Brazier x={840} />
      <g className="spring-only" fill="#F4B6C8">
        {[612, 634, 806, 828, 700, 742].map((x, i) => (
          <circle key={x} cx={x} cy={184 - (i % 2) * 4} r="4" />
        ))}
      </g>
      <rect x="0" y="186" width="1440" height="14" fill="#2A1416" />
    </Scene>
  );
}
