import Scene from "./Scene";
import { spread } from "./shapes";

// Just below the summit: the sea of clouds overhead, blue ridges, cypresses, two birds riding the wind.
export default function Heights() {
  return (
    <Scene id="heights">
      <g fill="#F4F0E2" opacity="0.9">
        {spread(11, 11, -60, 1500).map(({ x, j }) => (
          <ellipse key={x} cx={x} cy={44 + j * 14} rx={90 + j * 40} ry={20 + j * 8} />
        ))}
      </g>
      <g fill="#FBF6E8">
        {spread(14, 17, -40, 1480).map(({ x, j }) => (
          <ellipse key={x} cx={x} cy={30 + j * 10} rx={60 + j * 34} ry={16 + j * 8} />
        ))}
      </g>
      <path d="M0 200V132L190 96L380 140L560 104L760 150L940 98L1150 138L1300 100L1440 126V200Z" fill="#86B3CF" />
      <path d="M0 200V168L240 136L470 172L700 140L960 178L1200 146L1440 170V200Z" fill="#6E9DBF" />
      <g fill="#3F6E7C">
        {spread(9, 21, 60, 1380).map(({ x, j }) => (
          <ellipse key={x} cx={x} cy={170 - j * 14} rx={6 + j * 2} ry={20 + j * 10} />
        ))}
      </g>
      <g className="birds" fill="none" stroke="#2F5466" strokeWidth="2" strokeLinecap="round">
        <path d="M1040 70q8 -8 16 0q8 -8 16 0" />
        <path d="M1090 88q6 -6 12 0q6 -6 12 0" />
      </g>
    </Scene>
  );
}
