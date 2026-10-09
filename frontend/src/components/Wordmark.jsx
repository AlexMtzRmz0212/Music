import { useCallback, useEffect, useRef, useState } from "react";

// "Hell o' Fame" plays through every reading of itself once on load (and again on hover): Hall of Fame, Hell or
// Fame, Hell of Fame, Hello Fame, and rests on the name. Only the letters that change move; they arrive in gold
// on the Fame readings and in ember on the Hell one. Screen readers get the plain name; reduced motion skips it.
const READINGS = [
  { vowel: "a", gap: true, mid: "of", tone: "fame" }, // Hall of Fame
  { vowel: "e", gap: true, mid: "or", tone: "hell" }, // Hell or Fame
  { vowel: "e", gap: true, mid: "of", tone: "fame" }, // Hell of Fame
  { vowel: "e", gap: false, mid: "o", tone: "plain" }, // Hello Fame
  { vowel: "e", gap: true, mid: "o’", tone: "plain" }, // Hell o' Fame
];
const LAST = READINGS.length - 1;
const HOLD = 950; // ms on each reading
const WIDEST = ["Hall of Fame", "Hell or Fame", "Hell of Fame", "Hello Fame", "Hell o’ Fame"];

const still = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// a letter group; it is keyed by its text, so it remounts (and slides in) only when the text changes
function Part({ text, tone }) {
  return <span className={`wm-part tone-${tone}`}>{text}</span>;
}

export default function Wordmark() {
  const [step, setStep] = useState(() => (still() ? LAST : 0));
  const timer = useRef(null);

  const play = useCallback((from) => {
    clearTimeout(timer.current);
    if (still()) return setStep(LAST);
    setStep(from);
    const next = (n) => {
      timer.current = setTimeout(() => {
        setStep(n);
        if (n < LAST) next(n + 1);
      }, HOLD);
    };
    next(from + 1);
  }, []);

  useEffect(() => {
    timer.current = setTimeout(() => play(0), 400);
    return () => clearTimeout(timer.current);
  }, [play]);

  const r = READINGS[step];
  return (
    <span
      className="wm"
      role="img"
      aria-label="Hell o' Fame"
      onMouseEnter={() => step === LAST && play(0)}
    >
      {/* every reading stacked invisibly, so the mark keeps one width and the nav never shifts */}
      <span className="wm-sizer" aria-hidden="true">
        {WIDEST.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </span>
      <span className="wm-live" aria-hidden="true">
        H<Part key={`v-${r.vowel}`} text={r.vowel} tone={r.tone} />
        ll
        <span className={`wm-gap${r.gap ? "" : " shut"}`} />
        <Part key={`m-${r.mid}`} text={r.mid} tone={r.tone} /> Fame
      </span>
    </span>
  );
}
