import Seed from "../eggs/Seed";
import Scene from "./Scene";
import { bumps } from "./shapes";

// The summit: gold light fanning out behind a snowy peak, a small marble temple on top, clouds at its foot.
export default function Olympus() {
  return (
    <Scene id="olympus" extras={<Seed id="olympus" x={50} y={21} />}>
      <g className="rays" fill="#FFF8E6">
        <polygon points="720,50 300,200 430,200" opacity="0.35" />
        <polygon points="720,50 560,200 640,200" opacity="0.3" />
        <polygon points="720,50 800,200 880,200" opacity="0.3" />
        <polygon points="720,50 1010,200 1140,200" opacity="0.35" />
      </g>
      <path d="M0 200V150L160 108L300 150L430 118L560 166L640 200Z" fill="#E2CC92" />
      <path d="M1440 200V140L1290 104L1150 150L1010 116L880 170L800 200Z" fill="#E2CC92" />
      <path d="M470 200L720 56L970 200Z" fill="#C8B381" />
      <path d="M720 56L970 200H810Z" fill="#B49E6C" />
      <path d="M720 56L763 81L748 87L734 79L720 91L705 80L690 88L677 81Z" fill="#FFFDF5" />
      <g fill="#FFFDF5" stroke="#9C8659" strokeWidth="0.8">
        <polygon points="686,36 720,22 754,36" />
        <rect x="688" y="36" width="64" height="4" />
        {[692, 704, 716, 728, 740].map((x) => (
          <rect key={x} x={x} y="40" width="5" height="13" />
        ))}
        <rect x="684" y="53" width="72" height="5" />
      </g>
      <path d={bumps({ y: 182, amp: 22, step: 90, from: "bottom", seed: 3 })} fill="#FBF4E2" />
    </Scene>
  );
}
