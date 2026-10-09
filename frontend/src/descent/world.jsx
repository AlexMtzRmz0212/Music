import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// Shared state of the descent: the one-line messages the world says, the pomegranate seeds found, whether
// Cerberus has been petted, and whether Charon is ferrying you up (so Orpheus doesn't complain). The sky
// (top of the Hall) and the realms below both live inside this provider.

const World = createContext(null);
export const useWorld = () => useContext(World);

export const SEED_IDS = ["aether", "olympus", "hellas", "styx", "asphodel", "hades"];
const SEEDS = "hof-seeds";
const CERBERUS = "hof-cerberus";

function load(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function save(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked: it just isn't remembered
  }
}

export const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function WorldProvider({ active, children }) {
  const [message, setMessage] = useState(null); // { text, n }
  const [seeds, setSeeds] = useState(() => load(localStorage, SEEDS, []));
  const [petted, setPetted] = useState(() => load(sessionStorage, CERBERUS, false));
  const riding = useRef(false);
  const timer = useRef(null);

  const say = useCallback((text, ms = 4500) => {
    clearTimeout(timer.current);
    setMessage((m) => ({ text, n: (m?.n || 0) + 1 }));
    timer.current = setTimeout(() => setMessage(null), ms);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const findSeed = useCallback(
    (id) => {
      if (seeds.includes(id)) return;
      const next = [...seeds, id];
      setSeeds(next);
      save(localStorage, SEEDS, next);
      const all = next.length === SEED_IDS.length;
      say(
        all ? "Persephone is home. Spring comes to the underworld." : `A pomegranate seed. ${next.length} of ${SEED_IDS.length}.`,
        all ? 7000 : 3000,
      );
    },
    [seeds, say],
  );
  const resetSeeds = useCallback(() => {
    setSeeds([]);
    save(localStorage, SEEDS, []);
    say("Winter returns. The seeds are hidden again.");
  }, [say]);

  const pet = useCallback(() => {
    setPetted(true);
    save(sessionStorage, CERBERUS, true);
    say("Good boy. Cerberus lets you pass.");
  }, [say]);

  const value = useMemo(
    () => ({
      active,
      say,
      seeds,
      spring: seeds.length === SEED_IDS.length,
      findSeed,
      resetSeeds,
      petted,
      pet,
      riding,
    }),
    [active, say, seeds, findSeed, resetSeeds, petted, pet],
  );

  return (
    <World.Provider value={value}>
      {children}
      {active && message && (
        <p key={message.n} className="dsc-toast" role="status">
          {message.text}
        </p>
      )}
    </World.Provider>
  );
}
