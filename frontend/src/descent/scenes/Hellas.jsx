import Seed from "../eggs/Seed";
import Scene from "./Scene";

// The mortal world: far hills, the wine-dark sea with a trireme on it, olive trees and a fallen temple column.
function Olive({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-3 0V-26M3 0V-22" stroke="#6B5B4B" strokeWidth="5" strokeLinecap="round" />
      <g fill="#5E8F75">
        <ellipse cx="-14" cy="-34" rx="20" ry="13" />
        <ellipse cx="12" cy="-38" rx="22" ry="14" />
        <ellipse cx="0" cy="-50" rx="18" ry="12" />
      </g>
      <g fill="#7FAF92" opacity="0.7">
        <ellipse cx="-8" cy="-44" rx="7" ry="4" />
        <ellipse cx="16" cy="-42" rx="6" ry="3.5" />
      </g>
    </g>
  );
}

export default function Hellas() {
  return (
    <Scene id="hellas" extras={<Seed id="hellas" x={22} y={58} />}>
      <path d="M0 132L220 96L420 126L640 92L860 124L1080 90L1280 118L1440 100V140H0Z" fill="#A9D0C2" />
      <rect x="0" y="128" width="1440" height="40" fill="#4F5D8E" />
      <rect x="0" y="128" width="1440" height="3" fill="#7381AE" />
      <g transform="translate(930 146)">
        <g className="trireme">
          <path d="M-46 0Q0 12 46 0L52 -6H-52Z" fill="#2E3554" />
          <path d="M-2 -6V-40" stroke="#2E3554" strokeWidth="3" />
          <path d="M-1 -38H22L18 -12H-1Z" fill="#E9E2CE" />
          <path d="M-36 2l-6 10M-24 4l-6 10M-12 5l-6 10M0 5l-6 10M12 5l-6 10M24 4l-6 10M36 2l-6 10" stroke="#2E3554" strokeWidth="2" />
        </g>
      </g>
      <path d="M0 200V164Q300 136 620 160T1440 150V200Z" fill="#7BB09F" />
      <Olive x={230} y={176} s={1.1} />
      <Olive x={330} y={172} />
      <Olive x={1210} y={170} s={1.05} />
      <Olive x={1310} y={176} s={0.9} />
      <g fill="#ECE5D1" stroke="#B5AA8E" strokeWidth="1">
        <rect x="540" y="128" width="20" height="46" />
        <rect x="534" y="122" width="32" height="7" />
        <rect x="592" y="166" width="58" height="12" rx="6" transform="rotate(-6 620 172)" />
      </g>
    </Scene>
  );
}
