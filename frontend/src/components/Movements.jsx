import { useEffect, useState } from "react";
import { ArrowCounterClockwiseIcon, ArrowDownIcon, ArrowUpIcon, PlayIcon } from "@phosphor-icons/react";
import { Cover } from "./Showcase";

// What the new ranks do to the list. Both views share one vertical scale, a row per rank number used before or
// after, so a tie fanning out and everything below it sliding down are visible as such.
// "Before → after" is a slope chart: a tie is one row on the left, its line fans out to the ranks its albums get.
// "Replay" stacks each tie like a pile of cards and deals every album out to its new rank.

const ROW = 48; // px per rank row
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Row position for every rank number in use, and the albums sharing each old rank (in their new order). */
function layout(rows) {
  const values = [...new Set(rows.flatMap((r) => [r.rank, r.afterNum]))].sort((a, b) => a - b);
  const slot = new Map(values.map((v, i) => [v, i * ROW]));
  const ties = new Map();
  for (const r of rows) ties.set(r.rank, [...(ties.get(r.rank) || []), r]);
  return { y: (v) => slot.get(v), ties, height: values.length * ROW };
}

function Delta({ value }) {
  if (!value) return <span className="as-delta same">=</span>;
  return (
    <span className={`as-delta ${value > 0 ? "up" : "down"}`} aria-label={value > 0 ? `up ${value}` : `down ${-value}`}>
      {value > 0 ? <ArrowUpIcon aria-hidden="true" weight="bold" /> : <ArrowDownIcon aria-hidden="true" weight="bold" />}
      {Math.abs(value)}
    </span>
  );
}

function Thumb({ album }) {
  return (
    <span className="sc-cover as-thumb">
      <Cover album={album} />
    </span>
  );
}

function Row({ ids, top, hl, onHover, rank, children }) {
  return (
    <li
      className={`as-row${hl ? " hl" : ""}`}
      style={{ top }}
      tabIndex={0}
      onMouseEnter={() => onHover(ids)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(ids)}
      onBlur={() => onHover(null)}
    >
      <span className="as-rank">{rank}</span>
      {children}
    </li>
  );
}

function Slope({ rows }) {
  const [hover, setHover] = useState(null); // ids to highlight
  const { y, ties, height } = layout(rows);
  const lit = (ids) => Boolean(hover) && ids.some((id) => hover.includes(id));

  return (
    <div className={`as-slope${hover ? " hovering" : ""}`}>
      <h2>Now</h2>
      <span />
      <h2>After</h2>
      <ol className="as-col as-abs" style={{ height }}>
        {[...ties].map(([rank, members]) => {
          const ids = members.map((m) => m.id);
          const tied = members.length > 1;
          return (
            <Row key={rank} ids={ids} top={y(rank)} hl={lit(ids)} onHover={setHover} rank={members[0].rank_text}>
              {tied ? (
                <span className="as-stack" aria-hidden="true">
                  {members.slice(0, 3).map((m) => (
                    <Thumb key={m.id} album={m} />
                  ))}
                </span>
              ) : (
                <Thumb album={members[0]} />
              )}
              <span className="as-text">
                <span className="as-name">{tied ? `Tie, ${members.length} albums` : members[0].name}</span>
                <span className="as-by">{tied ? members.map((m) => m.name).join(", ") : members[0].artist}</span>
              </span>
            </Row>
          );
        })}
      </ol>
      <svg className="as-lines" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ height }} aria-hidden="true">
        {rows.map((r) => {
          const a = y(r.rank) + ROW / 2;
          const b = y(r.afterNum) + ROW / 2;
          const kind = r.delta > 0 ? "up" : r.delta < 0 ? "down" : "same";
          return (
            <path
              key={r.id}
              className={`${kind}${lit([r.id]) ? " hl" : ""}`}
              d={`M0 ${a} C50 ${a} 50 ${b} 100 ${b}`}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <ol className="as-col as-abs" style={{ height }}>
        {rows.map((r) => (
          <Row key={r.id} ids={[r.id]} top={y(r.afterNum)} hl={lit([r.id])} onHover={setHover} rank={r.after}>
            <Thumb album={r} />
            <span className="as-text">
              <span className="as-name">{r.name}</span>
              <span className="as-by">{r.artist}</span>
            </span>
            <Delta value={r.delta} />
          </Row>
        ))}
      </ol>
    </div>
  );
}

function Replay({ rows }) {
  const [after, setAfter] = useState(false);
  const { y, ties, height } = layout(rows);
  const still = reducedMotion();

  useEffect(() => {
    const t = setTimeout(() => setAfter(true), 600); // deals itself once when opened
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="as-replay">
      <div className="as-replay-bar">
        <button onClick={() => setAfter(!after)}>
          {after ? <ArrowCounterClockwiseIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" weight="fill" />}
          {after ? "Back to now" : "Play"}
        </button>
        <span className="as-dim">{after ? "New ranks" : "Ranks as they are in Notion now (ties stacked)"}</span>
      </div>
      <ol className="as-col as-abs" style={{ height: height + 16 }}>
        {rows.map((r, n) => {
          const members = ties.get(r.rank);
          const i = members.indexOf(r);
          const x = after ? 0 : i * 14;
          const top = after ? y(r.afterNum) : y(r.rank) + i * 4;
          return (
            <li
              key={r.id}
              className={`as-row as-card${after && r.delta ? (r.delta > 0 ? " moved-up" : " moved-down") : ""}`}
              style={{
                transform: `translate(${x}px, ${top}px)`,
                zIndex: after ? 1 : members.length - i,
                transition: still ? "none" : undefined,
                transitionDelay: still ? undefined : `${Math.min(n * 30, 900)}ms`,
              }}
            >
              <span className="as-rank">{after ? r.after : r.rank_text}</span>
              <Thumb album={r} />
              <span className="as-text">
                <span className="as-name">{r.name}</span>
                <span className="as-by">{r.artist}</span>
              </span>
              {after ? <Delta value={r.delta} /> : members.length > 1 && i === 0 && <span className="as-count">×{members.length}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function Movements({ rows }) {
  const [onlyMoving, setOnlyMoving] = useState(true);
  const [view, setView] = useState("slope");

  const up = rows.filter((r) => r.delta > 0);
  const down = rows.filter((r) => r.delta < 0);
  const climb = up.reduce((best, r) => (!best || r.delta > best.delta ? r : best), null);
  const drop = down.reduce((best, r) => (!best || r.delta < best.delta ? r : best), null);
  const shared = new Map();
  for (const r of rows) shared.set(r.rank, (shared.get(r.rank) || 0) + 1);
  // ties are the point, so their albums stay in view even when one of them keeps its rank
  const shown = onlyMoving ? rows.filter((r) => r.delta || shared.get(r.rank) > 1) : rows;

  return (
    <div className="as-moves">
      <ul className="as-summary">
        <li className="up">
          <strong>{up.length}</strong> rise
        </li>
        <li className="down">
          <strong>{down.length}</strong> fall
        </li>
        <li>
          <strong>{rows.length - up.length - down.length}</strong> stay
        </li>
        {climb && (
          <li className="as-wide">
            Biggest climb: <strong>{climb.name}</strong>, from {climb.rank_text} to {climb.after}
          </li>
        )}
        {drop && (
          <li className="as-wide">
            Biggest drop: <strong>{drop.name}</strong>, from {drop.rank_text} to {drop.after}
          </li>
        )}
      </ul>

      <div className="as-toolbar">
        <span className="seg" role="group" aria-label="View">
          <button aria-pressed={view === "slope"} onClick={() => setView("slope")}>
            Before and after
          </button>
          <button aria-pressed={view === "replay"} onClick={() => setView("replay")}>
            Replay
          </button>
        </span>
        <label className="check">
          <input type="checkbox" checked={onlyMoving} onChange={(e) => setOnlyMoving(e.target.checked)} />
          Only ties and albums that move
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="note">No album changes place.</p>
      ) : view === "slope" ? (
        <Slope rows={shown} />
      ) : (
        <Replay key={`${onlyMoving}`} rows={shown} />
      )}
    </div>
  );
}
