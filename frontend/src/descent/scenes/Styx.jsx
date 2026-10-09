import Seed from "../eggs/Seed";
import Scene from "./Scene";
import { spread } from "./shapes";

// Where the mortal world ends: the last of the land, then the Styx, with Charon poling his boat by lantern light
// and pale shades waiting on the bank. Albums nobody has listened to yet wait here too.
export function Boat({ x = 720, y = 150, glow = "lantern-styx" }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {glow && <circle cx="26" cy="-34" r="34" fill={`url(#${glow})`} />}
      <path d="M-84 -8Q0 16 84 -8L94 -16H-94Z" fill="#121E25" stroke="#4E6874" strokeWidth="1.5" />
      <path d="M-14 -16L-2 -60L10 -16Z" fill="#0C151A" stroke="#4E6874" strokeWidth="1.2" />
      <circle cx="-2" cy="-58" r="6" fill="#0C151A" />
      <path d="M18 -66L44 20" stroke="#4A3826" strokeWidth="3" strokeLinecap="round" />
      {glow && (
        <g>
          <path d="M26 -46V-40" stroke="#4A3826" strokeWidth="2" />
          <rect x="21" y="-40" width="10" height="12" rx="2" fill="#FFC56B" />
        </g>
      )}
    </g>
  );
}

export function LanternGlow({ id = "lantern-styx" }) {
  return (
    <defs>
      <radialGradient id={id}>
        <stop offset="0" stopColor="#FFC56B" stopOpacity="0.55" />
        <stop offset="1" stopColor="#FFC56B" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

export default function Styx() {
  return (
    <Scene id="styx" extras={<Seed id="styx" x={13} y={24} />}>
      <LanternGlow />
      <path d="M0 0H1440V44Q1080 74 720 56T0 64Z" fill="#7AA89E" />
      <path d="M0 64Q360 80 720 58T1440 46V96H0Z" fill="#4F7C7E" />
      <rect x="0" y="92" width="1440" height="78" fill="#1F3541" />
      <g className="shimmer" stroke="#6FA3B3" strokeWidth="2" strokeLinecap="round" opacity="0.45">
        {spread(14, 41).map(({ x, j }) => (
          <path key={x} d={`M${x} ${104 + j * 56}h${26 + j * 30}`} />
        ))}
      </g>
      <Boat x={720} y={150} />
      <g className="shades" fill="#D6ECF2" opacity="0.35">
        {spread(6, 53, 120, 1320).map(({ x, j }) => (
          <path key={x} d={`M${x} ${186 - j * 10}c-6 -10 -6 -22 0 -30c6 8 6 20 0 30z`} />
        ))}
      </g>
      <rect x="0" y="170" width="1440" height="30" fill="#2F4A57" />
    </Scene>
  );
}
