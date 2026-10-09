import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { coversApi } from "../api";
import EditionPicker from "./EditionPicker";

// Owner-only review, one album at a time. A card shows what the album has now next to Spotify's
// version: a new cover, a corrected title, or both. Swipe right (or press →) to apply exactly what
// the card shows. Swipe left (or ←) to reject it: nothing changes and the album isn't offered again.
// Nothing is written to Notion until a right swipe.

const THRESHOLD = 110; // px of drag that counts as a decision
const FLY_MS = 280;

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function reasonText(item) {
  if (item.reason === "none") return "This album has no cover yet.";
  if (item.reason === "stock") return "This album has one of Notion's stock photos, not album art.";
  if (item.reason === "placeholder") return "This album still has the \"no album yet\" placeholder cover.";
  if (item.reason === "duplicate") return `This cover is the same image as ${item.shared_with.join(", ")}.`;
  if (item.reason === "title") return "Spotify spells this title differently.";
  if (item.reason === "cover") return "Spotify has a different cover for this album.";
  return "Spotify has a different cover and spells the title differently.";
}

const ISSUE_REASONS = ["none", "stock", "placeholder", "duplicate"];

function Art({ src, empty }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <span className="cr-empty">{empty}</span>;
  return <img src={src} alt="" draggable={false} referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

function SwipeCard({ exit, canRight, onDecide, children }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  const move = (e) => dragging && setDx(e.clientX - startX.current);
  const release = (e) => {
    if (!dragging) return;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (dx > THRESHOLD && canRight) onDecide("right");
    else if (dx < -THRESHOLD) onDecide("left");
    else setDx(0);
  };

  const fly = exit ? (exit === "right" ? 1 : -1) * Math.max(window.innerWidth, 600) : dx;
  const style = {
    transform: `translateX(${fly}px) rotate(${fly / 20}deg)`,
    opacity: exit ? 0 : 1,
    transition: dragging || reducedMotion() ? "none" : `transform ${FLY_MS}ms ease-out, opacity ${FLY_MS}ms ease-out`,
  };
  const right = exit === "right" ? 1 : canRight ? Math.min(Math.max(dx, 0) / THRESHOLD, 1) : 0;
  const left = exit === "left" ? 1 : Math.min(Math.max(-dx, 0) / THRESHOLD, 1);

  return (
    <div
      className="cr-card cr-top"
      style={style}
      onPointerDown={(e) => {
        if (exit || e.button > 0) return;
        startX.current = e.clientX;
        setDragging(true);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }}
      onPointerMove={move}
      onPointerUp={release}
      onPointerCancel={release}
    >
      {children}
      <span className="cr-stamp yes" style={{ opacity: right }}>
        Apply
      </span>
      <span className="cr-stamp no" style={{ opacity: left }}>
        Reject
      </span>
    </div>
  );
}

export default function CoverReview({ items, canSuggest, rejected, onReject, onBringBack, onResolved }) {
  const [writing, setWriting] = useState(() => new Set()); // ids being written to Notion
  const [sugg, setSugg] = useState({}); // id -> { state: "loading" | "ready" | "error", match, artist_match, new_title, error }
  const [exit, setExit] = useState(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState({}); // album id -> index of the edition I chose
  const requested = useRef(new Set());

  const queue = useMemo(
    () => items.filter((i) => !rejected.has(i.id) && !writing.has(i.id)),
    [items, rejected, writing],
  );
  const card = queue[0];
  const next = queue[1];
  const proposalOf = (item) => item.proposal || sugg[item.id];

  // Items from a scan already carry Spotify's proposal. For the others, look up the current card and
  // the next two, so the proposal is ready before it is reached.
  const lookAhead = queue.slice(0, 3).filter((i) => !i.proposal);
  const lookKey = lookAhead.map((i) => i.id).join();
  useEffect(() => {
    if (!canSuggest) return;
    lookAhead.forEach((item) => {
      if (requested.current.has(item.id)) return;
      requested.current.add(item.id);
      setSugg((s) => ({ ...s, [item.id]: { state: "loading" } }));
      coversApi
        .suggest(item.name, item.artist, item.current)
        .then((p) => setSugg((s) => ({ ...s, [item.id]: { state: "ready", ...p } })))
        .catch((e) => setSugg((s) => ({ ...s, [item.id]: { state: "error", error: e.message } })));
    });
  }, [lookKey, canSuggest, sugg]); // eslint-disable-line react-hooks/exhaustive-deps

  // Forget a failed lookup; changing `sugg` re-runs the effect above, which asks again.
  const retry = (id) => {
    requested.current.delete(id);
    setSugg((s) => {
      const copy = { ...s };
      delete copy[id];
      return copy;
    });
  };

  // What a right swipe would write, worked out from what the card is showing.
  const proposal = card ? proposalOf(card) : null;
  const match = proposal?.state === "ready" ? proposal.match : null;
  const options = match ? (match.options?.length ? match.options : [match]) : [];
  const choice = card ? picked[card.id] : undefined; // undefined until I pick; the standard edition is first
  const sel = match ? options[choice ?? 0] || match : null; // the edition shown as "New"
  const isIssue = Boolean(card) && ISSUE_REASONS.includes(card.reason);
  // a cover that already is one of the editions needs no change, unless I pick another one on purpose
  const coverChange =
    Boolean(sel) && sel.cover !== card.current && (choice !== undefined || isIssue || !match.cover_ok);
  // only a near-miss title is a rename; choosing the Deluxe edition never renames the album
  const newTitle = !sel ? null : sel.exact === undefined ? proposal.new_title : sel.exact ? null : sel.name;
  const canRight = coverChange || Boolean(newTitle);
  const applyLabel =
    coverChange && newTitle ? "Use new cover and title" : newTitle ? "Use new title" : "Use new cover";

  const decide = useCallback(
    (dir) => {
      if (!card || exit) return;
      if (dir === "right" && !canRight) return;
      const changes = {
        cover: coverChange ? sel.cover : null,
        // the album already has an icon (maybe an emoji): only fill it in when there is none
        icon: coverChange && !card.has_icon ? sel.icon : null,
        title: newTitle || null,
      };
      setError("");
      setExit(dir);
      setTimeout(() => {
        setExit(null);
        if (dir === "left") return onReject(card.id);
        setWriting((w) => new Set(w).add(card.id));
        coversApi
          .apply(card.id, changes)
          .then(() => onResolved(card.id, changes))
          .catch((e) => setError(`Couldn't save "${card.name}": ${e.message}. It's back in the queue.`))
          .finally(() =>
            setWriting((w) => {
              const copy = new Set(w);
              copy.delete(card.id);
              return copy;
            }),
          );
      }, reducedMotion() ? 0 : FLY_MS);
    },
    [card, exit, canRight, coverChange, sel, newTitle, onReject, onResolved],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") decide("right");
      else if (e.key === "ArrowLeft") decide("left");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide]);

  const rejectedCount = items.filter((i) => rejected.has(i.id)).length;

  if (!canSuggest) {
    return (
      <section className="cr">
        <p className="note">
          Spotify isn't set up on this server, so there's nothing to propose. Add SPOTIFY_CLIENT_ID and
          SPOTIFY_CLIENT_SECRET to the settings.
        </p>
      </section>
    );
  }

  return (
    <section className="cr" aria-label="Cover and title review">
      <p className="cr-help">
        {queue.length > 0 ? `${queue.length} left. ` : ""}Swipe right to apply what the card shows, left to reject it.
        Rejected albums are left as they are and aren't offered again. Arrow keys work too.
      </p>
      {error && <p className="error">{error}</p>}

      {!card ? (
        <div className="cr-done">
          <p>
            {rejectedCount > 0
              ? `Nothing left to review. You rejected the correction for ${rejectedCount} album${rejectedCount === 1 ? "" : "s"}.`
              : "Everything is in place. Use Scan library to check the whole collection against Spotify."}
          </p>
          {rejectedCount > 0 && (
            <button className="ghost" onClick={onBringBack}>
              Review the rejected ones again
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="cr-deck">
            {next && <div className="cr-card cr-peek" aria-hidden="true" />}
            <SwipeCard key={card.id} exit={exit} canRight={canRight} onDecide={decide}>
              <h2>{card.name}</h2>
              <p className="cr-artist">{card.artist}</p>
              {newTitle && (
                <p className="cr-title-change">
                  Title: <s>{card.name}</s> → <strong>{newTitle}</strong>
                </p>
              )}
              <div className="cr-pair">
                <figure>
                  <span className="cr-art">
                    <Art src={card.current} empty="No cover" />
                  </span>
                  <figcaption>{coverChange ? "Current" : "Cover stays"}</figcaption>
                </figure>
                {coverChange && (
                  <>
                    <span className="cr-arrow" aria-hidden="true">
                      →
                    </span>
                    <figure>
                      <span className="cr-art">
                        <Art src={sel.cover} empty="No image" />
                      </span>
                      <figcaption>New</figcaption>
                    </figure>
                  </>
                )}
                {!coverChange && !match && (
                  <figure>
                    <span className="cr-art">
                      <span className="cr-empty">{proposal?.state === "error" ? "Failed" : "Looking up…"}</span>
                    </span>
                    <figcaption>New</figcaption>
                  </figure>
                )}
              </div>
              <p className="cr-reason">{reasonText(card)}</p>
              {options.length > 1 && (
                <EditionPicker
                  options={options}
                  albumName={card.name}
                  selected={choice ?? 0}
                  onPick={(i) => setPicked((p) => ({ ...p, [card.id]: i }))}
                />
              )}
              {match && (
                <p className="cr-match">
                  Spotify match: <strong>{sel.name}</strong> by {match.artist}
                  {sel.release_date ? ` (${sel.release_date.slice(0, 4)})` : ""}
                  {!coverChange && !newTitle && " — nothing differs from what the album has now."}
                </p>
              )}
              {coverChange && match.current_release && match.current_release !== match.name && (
                <p className="cr-match">
                  Your current cover is from Spotify's <strong>{match.current_release}</strong>.
                </p>
              )}
              {proposal?.state === "ready" && !match && <p className="cr-match">Spotify has no match for this album.</p>}
              {proposal?.state === "error" && (
                <p className="cr-match">
                  Couldn't ask Spotify ({proposal.error}).{" "}
                  <button className="link" onPointerDown={(e) => e.stopPropagation()} onClick={() => retry(card.id)}>
                    Try again
                  </button>
                </p>
              )}
            </SwipeCard>
          </div>

          <div className="cr-actions">
            <button className="ghost no" onClick={() => decide("left")} disabled={Boolean(exit)}>
              Reject
            </button>
            <button className="yes" onClick={() => decide("right")} disabled={!canRight || Boolean(exit)}>
              {applyLabel}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
