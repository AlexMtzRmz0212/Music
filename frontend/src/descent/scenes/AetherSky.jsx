import Seed from "../eggs/Seed";
import Thunderbolt from "../eggs/Thunderbolt";

// The sky above Olympus, behind the top of the Hall (title, Album of the Day, filters): sun glow and slow clouds.
// Decoration sits behind the content; the two eggs (Zeus' thunderbolt and a seed) sit in a layer above it,
// placed where no content is.
function Cloud({ x, y, s = 1, drift }) {
  return (
    // the drift animation moves the inner group, so it doesn't replace the placement on the outer one
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className={`cloud drift-${drift}`}>
        <ellipse cx="-40" cy="8" rx="46" ry="22" />
        <ellipse cx="0" cy="-6" rx="50" ry="32" />
        <ellipse cx="44" cy="6" rx="42" ry="22" />
        <rect x="-80" y="6" width="160" height="22" rx="11" />
      </g>
    </g>
  );
}

export default function AetherSky() {
  return (
    <>
      <div className="aether-sky" aria-hidden="true">
        <svg viewBox="0 0 1440 760" preserveAspectRatio="xMidYMin slice" focusable="false">
          <defs>
            <radialGradient id="sun-glow">
              <stop offset="0" stopColor="#FFF6D8" stopOpacity="0.95" />
              <stop offset="0.35" stopColor="#FFF0C4" stopOpacity="0.5" />
              <stop offset="1" stopColor="#FFF0C4" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="1210" cy="150" r="250" fill="url(#sun-glow)" />
          <circle cx="1210" cy="150" r="44" fill="#FFF3CC" />
          <g fill="#FFFFFF" opacity="0.85">
            <Cloud x={170} y={150} s={1.1} drift="a" />
            <Cloud x={620} y={90} s={0.8} drift="b" />
            <Cloud x={980} y={260} s={0.9} drift="a" />
            <Cloud x={300} y={560} s={1.2} drift="b" />
            <Cloud x={1300} y={500} s={1} drift="a" />
          </g>
        </svg>
      </div>
      <div className="aether-eggs">
        <Thunderbolt />
        <Seed id="aether" x={78} y={9} />
      </div>
    </>
  );
}
