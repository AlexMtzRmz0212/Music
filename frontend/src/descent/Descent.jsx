import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowsInLineVerticalIcon, ArrowsOutLineVerticalIcon, CaretDownIcon, CaretUpIcon, CoinIcon } from "@phosphor-icons/react";
import { assignRealms } from "./assign";
import { AETHER, DEPTHS, SPRING, STOPS } from "./realms";
import Realm from "./Realm";
import Depths from "./scenes/Depths";
import { SEED_IDS, reducedMotion, useWorld } from "./world";
import "./descent.css";

// The Hall, ranked: a descent from Mount Olympus down to the House of Hades (see realms.js for the world and
// assign.js for who goes where). It also runs the altitude rail, the Space key, the page colours that follow
// the realm in view, and two of the easter eggs: Orpheus (look back after reaching Hades) and Charon's ferry.

const CLOSED = "hof-realms";
const LINE = 0.4; // the realm "in view" is the one crossing this height of the viewport
const IDS = STOPS.map((s) => s.id);
const at = (id) => IDS.indexOf(id);
const BOTTOM = -3000; // altitude at the very bottom of the far shore
const number = new Intl.NumberFormat();
const metres = (m) => `${m >= 0 ? "+" : "−"}${number.format(Math.abs(Math.round(m / 10) * 10))} m`;

function loadClosed() {
  try {
    return JSON.parse(localStorage.getItem(CLOSED) || "{}");
  } catch {
    return {};
  }
}

export default function Descent({ albums, all, onOpen, hidden, filtering, ref }) {
  const world = useWorld();
  const { say, riding, spring, seeds, resetSeeds } = world;
  const realms = useMemo(() => assignRealms(all, albums), [all, albums]);
  const [closed, setClosed] = useState(loadClosed);
  const [current, setCurrent] = useState(AETHER.id);
  const [sailing, setSailing] = useState(false);
  const els = useRef({}); // stop id -> section element
  const root = useRef(null);
  const chain = useRef(null);
  const readouts = useRef([]);

  // colours of every stop, top to bottom (spring warms the underworld)
  const colors = STOPS.map((s) => (spring && SPRING[s.id]) || s.color);
  const tonesAt = (i) => ({ prev: colors[i - 1] || colors[i], color: colors[i], next: colors[i + 1] || colors[i] });

  const toggle = (id) =>
    setClosed((c) => {
      const next = { ...c, [id]: !c[id] };
      if (!next[id]) delete next[id];
      try {
        localStorage.setItem(CLOSED, JSON.stringify(next));
      } catch {
        // storage blocked: the realms just open again next visit
      }
      return next;
    });
  const anyOpen = realms.some((r) => !closed[r.id]);
  const setAll = (shut) => {
    const next = shut ? Object.fromEntries(realms.map((r) => [r.id, true])) : {};
    setClosed(next);
    try {
      localStorage.setItem(CLOSED, JSON.stringify(next));
    } catch {
      // storage blocked
    }
  };

  const behavior = () => (reducedMotion() ? "auto" : "smooth");
  const goTo = useCallback((id) => {
    if (id === AETHER.id) return window.scrollTo({ top: 0, behavior: behavior() });
    els.current[id]?.scrollIntoView({ block: "start", behavior: behavior() });
  }, []);

  // "Find it in the descent": open its realm if needed, bring the album into view and ring it for a moment
  useImperativeHandle(ref, () => ({
    find(albumId) {
      const realm = realms.find((r) => r.albums.some((a) => a.id === albumId));
      if (!realm) return;
      const wasClosed = Boolean(closed[realm.id]);
      if (wasClosed) toggle(realm.id);
      setTimeout(
        () => {
          const el = document.getElementById(`album-${albumId}`);
          if (!el) return;
          el.scrollIntoView({ block: "center", behavior: behavior() });
          el.classList.add("found");
          setTimeout(() => el.classList.remove("found"), 2600);
          el.querySelector("button")?.focus({ preventScroll: true });
        },
        wasClosed && !reducedMotion() ? 420 : 0,
      );
    },
  }));

  // which realm is in view: it colours the header and lights up the rail
  useEffect(() => {
    if (hidden) return;
    const inView = new Set();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inView.add(e.target.dataset.stop);
          else inView.delete(e.target.dataset.stop);
        }
        setCurrent(IDS.find((id) => inView.has(id)) || AETHER.id);
      },
      { rootMargin: `-${LINE * 100}% 0px -${100 - LINE * 100 - 1}% 0px` },
    );
    Object.entries(els.current).forEach(([id, el]) => {
      if (!el) return;
      el.dataset.stop = id;
      io.observe(el);
    });
    return () => io.disconnect();
  }, [hidden, realms.length]);

  // the page takes the colours of the realm in view (the header reads these)
  useEffect(() => {
    const html = document.documentElement;
    if (hidden) return;
    const stop = STOPS[at(current)];
    html.dataset.descent = "on";
    html.dataset.realm = stop.id;
    html.dataset.realmTone = stop.tone;
    html.style.setProperty("--realm-bg", colors[at(current)]);
    return () => {
      delete html.dataset.descent;
      delete html.dataset.realm;
      delete html.dataset.realmTone;
      html.style.removeProperty("--realm-bg");
    };
  }, [hidden, current, spring]); // eslint-disable-line react-hooks/exhaustive-deps

  // Orpheus: having reached Hades, climbing back above the Styx means you looked back. Charon's ride doesn't count.
  const reached = useRef(false);
  useEffect(() => {
    if (hidden) return;
    const i = at(current);
    if (i >= at("hades")) reached.current = true;
    const lookedBack = reached.current && i <= at("styx") && !riding.current;
    if (i <= at("styx")) reached.current = false;
    if (current === AETHER.id) riding.current = false; // the ride is over once you're back in the sky
    if (!lookedBack) return;
    try {
      if (sessionStorage.getItem("hof-orpheus")) return;
      sessionStorage.setItem("hof-orpheus", "1");
    } catch {
      // storage blocked: Orpheus may speak again
    }
    say("You looked back. Eurydice stays below.", 6000);
  }, [current, hidden, say, riding]);

  // the altitude readout follows the scroll; it writes straight to the DOM, so scrolling doesn't re-render
  useEffect(() => {
    if (hidden) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * LINE;
      const order = IDS.slice(1).filter((id) => els.current[id]);
      let text = metres(AETHER.altitude);
      const first = els.current[order[0]]?.getBoundingClientRect();
      if (first && first.top > line) {
        text = metres(Math.min(AETHER.altitude, STOPS[1].altitude + (first.top - line) * 0.6));
      } else {
        for (let k = 0; k < order.length; k++) {
          const box = els.current[order[k]].getBoundingClientRect();
          if (box.bottom <= line && k < order.length - 1) continue;
          const stop = STOPS[at(order[k])];
          const below = k < order.length - 1 ? STOPS[at(order[k + 1])].altitude : BOTTOM;
          const frac = Math.min(1, Math.max(0, (line - box.top) / box.height));
          text = stop.id === DEPTHS.id && frac > 0.55 ? "9 days down" : metres(stop.altitude + (below - stop.altitude) * frac);
          break;
        }
      }
      readouts.current.forEach((el) => el && (el.textContent = text));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [hidden, closed, realms]);

  // Space descends one realm, Shift+Space climbs one (Home and End already go to the summit and the bottom)
  useEffect(() => {
    if (hidden) return;
    const onKey = (e) => {
      if (e.code !== "Space" || e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
      if (e.target.closest?.("input, select, textarea, button, a, [contenteditable]") || document.querySelector("dialog[open]")) return;
      e.preventDefault();
      const i = at(current);
      const target = IDS[Math.min(IDS.length - 1, Math.max(0, i + (e.shiftKey ? -1 : 1)))];
      goTo(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hidden, current, goTo]);

  // the golden chain hangs from the summit down to the mooring ring on the far shore
  useLayoutEffect(() => {
    const box = root.current;
    if (!box || !chain.current) return;
    const fit = () => {
      const ring = box.querySelector(".mooring");
      const summit = els.current.olympus;
      if (!ring || !summit) return;
      const origin = box.getBoundingClientRect().top;
      const top = summit.getBoundingClientRect().top - origin;
      const end = ring.getBoundingClientRect().top - origin;
      chain.current.style.top = `${top}px`;
      chain.current.style.height = `${Math.max(0, end - top)}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  const ride = () => {
    riding.current = true;
    setSailing(true);
    say("Charon takes you home.");
    setTimeout(() => window.scrollTo({ top: 0, behavior: behavior() }), reducedMotion() ? 0 : 650);
    setTimeout(() => setSailing(false), 3200);
  };

  const here = STOPS[at(current)];
  const seedNote = seeds.length > 0 && (
    <p className="rail-seeds">
      {spring ? (
        <button className="link" onClick={resetSeeds}>
          Let winter return
        </button>
      ) : (
        `${seeds.length} of ${SEED_IDS.length} seeds`
      )}
    </p>
  );

  return (
    <div className="descent" ref={root} data-spring={spring || undefined}>
      <div className="dsc-bar">
        <button className="ghost" onClick={() => setAll(anyOpen)}>
          {anyOpen ? <ArrowsInLineVerticalIcon aria-hidden="true" /> : <ArrowsOutLineVerticalIcon aria-hidden="true" />}
          {anyOpen ? "Collapse all" : "Expand all"}
        </button>
        <p className="dsc-hint">
          Press <kbd>Space</kbd> to descend
        </p>
      </div>

      {realms.map((realm) => (
        <Realm
          key={realm.id}
          realm={realm}
          open={!closed[realm.id]}
          onToggle={() => toggle(realm.id)}
          onOpen={onOpen}
          filtering={filtering}
          tones={tonesAt(at(realm.id))}
          sectionRef={(el) => (els.current[realm.id] = el)}
        />
      ))}

      <section
        ref={(el) => (els.current[DEPTHS.id] = el)}
        className="realm realm-depths tone-dark"
        style={{ "--prev": tonesAt(at(DEPTHS.id)).prev, "--color": colors[at(DEPTHS.id)], "--next": colors[at(DEPTHS.id)] }}
        aria-labelledby="realm-depths-name"
      >
        <Depths sailing={sailing} />
        <div className="depths-body">
          <span className="mooring" aria-hidden="true" />
          <h2 className="realm-name" id="realm-depths-name">
            {DEPTHS.name}
          </h2>
          <p className="realm-line">Everyone ends up here. Charon rows back up to Olympus for one obol.</p>
          <button className="obol" onClick={ride}>
            <CoinIcon aria-hidden="true" weight="fill" />
            Pay Charon an obol
          </button>
        </div>
      </section>

      <div className="dsc-chain" ref={chain} aria-hidden="true" />

      {!hidden && (
        <>
          <nav className="rail" aria-label="Descent">
            <p className="rail-alt" ref={(el) => (readouts.current[0] = el)} />
            <ol>
              {STOPS.map((s) => (
                <li key={s.id}>
                  <button
                    className="rail-dot"
                    aria-label={s.name}
                    aria-current={s.id === current ? "location" : undefined}
                    onClick={() => goTo(s.id)}
                  >
                    <span className="rail-name">{s.name}</span>
                  </button>
                </li>
              ))}
            </ol>
            {seedNote}
          </nav>
          <div className="rail-pill" role="group" aria-label="Descent">
            <span className="pill-where">
              <strong>{here.name}</strong>
              <span ref={(el) => (readouts.current[1] = el)} />
            </span>
            <button className="icon-btn" aria-label="Climb one realm" onClick={() => goTo(IDS[Math.max(0, at(current) - 1)])}>
              <CaretUpIcon aria-hidden="true" />
            </button>
            <button
              className="icon-btn"
              aria-label="Descend one realm"
              onClick={() => goTo(IDS[Math.min(IDS.length - 1, at(current) + 1)])}
            >
              <CaretDownIcon aria-hidden="true" />
            </button>
            {seedNote}
          </div>
        </>
      )}
    </div>
  );
}
