import { useEffect, useState } from "react";
import { coversApi } from "../api";

// The editions Spotify has for one album, side by side: cover, label and track list. Tracks that the
// standard edition (the first column) doesn't have are marked, so a Deluxe's extras stand out.
// Tap a column to choose that edition.

// "Waking Up (Deluxe)" on an album called "Waking Up" is the "Deluxe" edition; the plain one is "Standard".
export function editionLabel(option, albumName) {
  const name = option.name;
  const rest = name.toLowerCase().startsWith(albumName.toLowerCase()) ? name.slice(albumName.length) : name;
  const label = rest.replace(/^[\s:()[\]-]+|[\s:()[\]-]+$/g, "");
  return label || "Standard";
}

function editionMeta(option) {
  const bits = [];
  if (option.release_date) bits.push(option.release_date.slice(0, 4));
  if (option.total_tracks) bits.push(`${option.total_tracks} tracks`);
  return bits.join(", ");
}

// Same song, different edition: "Song - 2026 Remaster" and "Song (Remastered)" are the standard's "Song".
const key = (title) =>
  title
    .toLowerCase()
    .replace(/\s[-–]\s.*$/, "")
    .replace(/[(\[][^)\]]*(remaster|live|version|mix|edit|deluxe|bonus|mono|stereo)[^)\]]*[)\]]/g, "")
    .replace(/[^a-z0-9]+/g, "");

// track lists by Spotify album id, kept for the whole session so flipping back to a card is instant
const cache = new Map();
function useTracks(options, enabled) {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    options.forEach((o) => {
      if (!o.id || cache.has(o.id)) return;
      cache.set(o.id, { state: "loading" });
      coversApi
        .tracks(o.id)
        .then(({ tracks }) => cache.set(o.id, { state: "ready", tracks }))
        .catch((e) => cache.set(o.id, { state: "error", error: e.message }))
        .finally(() => bump((n) => n + 1));
    });
    bump((n) => n + 1);
  }, [options, enabled]);
  return (id) => cache.get(id);
}

function Thumb({ src }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <span className="cr-art">
      {src && !failed ? (
        <img src={src} alt="" draggable={false} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span className="cr-empty">?</span>
      )}
    </span>
  );
}

export default function EditionPicker({ options, albumName, selected, onPick }) {
  const [showTracks, setShowTracks] = useState(true);
  const tracksOf = useTracks(options, showTracks);
  const standard = tracksOf(options[0].id);
  const standardKeys = new Set(standard?.state === "ready" ? standard.tracks.map((t) => key(t.name)) : []);

  return (
    // the card is draggable, so a press in here must not start a swipe
    <div className="cr-editions" role="group" aria-label="Choose the edition" onPointerDown={(e) => e.stopPropagation()}>
      <p className="cr-match">
        Spotify has {options.length} editions. Choose one.{" "}
        <button className="link" onClick={() => setShowTracks((v) => !v)}>
          {showTracks ? "Hide track lists" : "Show track lists"}
        </button>
      </p>
      <div className="cr-opts">
        {options.map((o, i) => {
          const list = showTracks ? tracksOf(o.id) : null;
          return (
            <button
              key={o.id || `${o.name}-${i}`}
              className={`cr-opt ${selected === i ? "on" : ""}`}
              aria-pressed={selected === i}
              onClick={() => onPick(i)}
            >
              <Thumb src={o.cover} />
              <span className="cr-opt-name">{editionLabel(o, albumName)}</span>
              <span className="cr-opt-meta">
                {editionMeta(o)}
                {o.is_current ? " · yours" : ""}
              </span>
              {showTracks && (
                <span className="cr-tracks">
                  {!list || list.state === "loading" ? (
                    <span className="cr-opt-meta">Loading tracks…</span>
                  ) : list.state === "error" ? (
                    <span className="cr-opt-meta">Couldn't load the tracks.</span>
                  ) : (
                    <ol>
                      {list.tracks.map((t, n) => (
                        <li key={`${t.disc}-${t.n}-${n}`} className={i > 0 && standardKeys.size && !standardKeys.has(key(t.name)) ? "extra" : ""}>
                          {t.name}
                        </li>
                      ))}
                    </ol>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
