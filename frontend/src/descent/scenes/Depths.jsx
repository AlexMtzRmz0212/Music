import Scene from "./Scene";
import { spread } from "./shapes";
import { Boat, LanternGlow } from "./Styx";

// The far shore at the very bottom: black water, the far bank, and Charon's boat moored where the golden chain ends.
export default function Depths({ sailing }) {
  return (
    <Scene id="depths">
      <LanternGlow id="lantern-depths" />
      <rect x="0" y="96" width="1440" height="74" fill="#0B1418" />
      <g className="shimmer" stroke="#3E6D7A" strokeWidth="2" strokeLinecap="round" opacity="0.4">
        {spread(10, 97).map(({ x, j }) => (
          <path key={x} d={`M${x} ${108 + j * 50}h${20 + j * 26}`} />
        ))}
      </g>
      <g className={`ferry${sailing ? " sailing" : ""}`}>
        <Boat x={1236} y={152} glow="lantern-depths" />
      </g>
      <path d="M0 200V172Q360 160 720 170T1440 166V200Z" fill="#1A1012" />
    </Scene>
  );
}
