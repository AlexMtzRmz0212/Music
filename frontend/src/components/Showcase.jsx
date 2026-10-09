import { useEffect, useMemo, useRef, useState } from "react";
import { showcaseApi } from "../api";
import { demoApi } from "../demo/demoApi";

// Read-only view of the Notion album library. Nothing here writes anywhere;
// the filters only change what this page shows.

const FEATURED = 6; // in the default ranked view the top albums get double-size tiles

const byText = (get) => (a, b) => get(a).localeCompare(get(b));
// albums missing the value always sink to the bottom, whatever the direction
const byNumber = (get, dir = 1) => (a, b) => {
  const x = get(a);
  const y = get(b);
  if (x == null && y == null) return 0;
  if (x == null) return 1;
  if (y == null) return -1;
  return (x - y) * dir;
};
const time = (iso) => (iso ? Date.parse(iso) : null);

const SORTS = {
  rank: { label: "My ranking", cmp: byNumber((a) => a.rank) },
  recent: { label: "Latest Album of the Day", cmp: byNumber((a) => time(a.album_of_day), -1) },
  released: { label: "Newest release", cmp: byNumber((a) => time(a.release_date), -1) },
  oldest: { label: "Oldest release", cmp: byNumber((a) => time(a.release_date)) },
  artist: { label: "Artist A–Z", cmp: byText((a) => a.artist) },
  name: { label: "Album A–Z", cmp: byText((a) => a.name) },
};

const year = (a) => (a.release_date ? Number(a.release_date.slice(0, 4)) : null);
const decadeOf = (a) => (year(a) ? Math.floor(year(a) / 10) * 10 : null);

function formatDate(iso) {
  if (!iso) return null;
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function hue(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

/** Cover art, or a coloured tile with the album's initials when there is none (or its link expired). */
function Cover({ album, eager = false }) {
  const [failed, setFailed] = useState(false);
  if (album.cover && !failed) {
    return (
      <img
        src={album.cover}
        alt={`${album.name} cover`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  const initials = album.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("");
  return (
    <span className="sc-blank" style={{ "--h": hue(album.name + album.artist) }} role="img" aria-label={`${album.name} (no cover)`}>
      {initials}
    </span>
  );
}

function Detail({ album, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  const rows = [
    ["Released", formatDate(album.release_date)],
    ["Decade", album.decade],
    ["My ranking", album.rank != null ? `#${album.rank}` : null],
    ["Status", album.status],
    ["Album of the Day", formatDate(album.album_of_day)],
  ].filter(([, value]) => value);

  return (
    <dialog
      ref={dialog}
      className="sc-detail"
      aria-label={`${album.name} by ${album.artist}`}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current.close()}
    >
      <div className="sc-detail-body">
        <div className="sc-cover">
          <Cover album={album} eager />
        </div>
        <div className="sc-detail-info">
          <h2>{album.name}</h2>
          <p className="sc-artist">{album.artist}</p>
          {album.genres.length > 0 && (
            <p className="sc-genres">
              {album.genres.map((g) => (
                <span key={g}>{g}</span>
              ))}
            </p>
          )}
          <dl>
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <button className="ghost" onClick={() => dialog.current.close()}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default function Showcase({ hidden }) {
  const [data, setData] = useState(null); // { albums, sample }
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("rank");
  const [genre, setGenre] = useState("");
  const [decade, setDecade] = useState(null);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let live = true;
    showcaseApi
      .albums()
      .then(({ albums }) => live && setData({ albums, sample: false }))
      .catch(async (e) => {
        // Not configured, offline, or Notion is down: show sample albums rather than an empty tab.
        const { albums } = await demoApi.showcase();
        if (!live) return;
        setError(e.status === 503 ? "" : e.message);
        setData({ albums, sample: true });
      });
    return () => {
      live = false;
    };
  }, []);

  const albums = data?.albums;

  const facets = useMemo(() => {
    if (!albums) return null;
    const count = (values) => {
      const tally = new Map();
      values.forEach((v) => tally.set(v, (tally.get(v) || 0) + 1));
      return tally;
    };
    const genres = [...count(albums.flatMap((a) => a.genres))].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const decades = [...new Set(albums.map(decadeOf).filter(Boolean))].sort((a, b) => b - a);
    const statuses = [...new Set(albums.map((a) => a.status))].sort();
    const today = new Date().toISOString().slice(0, 10);
    const ofTheDay = albums
      .filter((a) => a.album_of_day && a.album_of_day.slice(0, 10) <= today)
      .sort((a, b) => b.album_of_day.localeCompare(a.album_of_day))[0];
    return {
      genres,
      decades,
      statuses,
      ofTheDay,
      listened: albums.filter((a) => a.status === "Listened").length,
      artists: new Set(albums.map((a) => a.artist)).size,
      noCover: albums.filter((a) => !a.cover).length,
    };
  }, [albums]);

  const filtered = useMemo(() => {
    if (!albums) return [];
    const q = query.trim().toLowerCase();
    return albums
      .filter((a) => !q || `${a.name} ${a.artist}`.toLowerCase().includes(q))
      .filter((a) => !genre || a.genres.includes(genre))
      .filter((a) => !decade || decadeOf(a) === decade)
      .filter((a) => !status || a.status === status)
      .sort(SORTS[sort].cmp);
  }, [albums, query, sort, genre, decade, status]);

  const filtering = Boolean(query || genre || decade || status);
  const ranked = sort === "rank" && !filtering; // the default view: top albums get big tiles

  const reset = () => {
    setQuery("");
    setGenre("");
    setDecade(null);
    setStatus("");
  };

  return (
    <section className="sc" hidden={hidden} aria-label="Album showcase">
      {!data && <p className="note">Loading albums…</p>}
      {data?.sample && (
        <p className="note">
          {error ? `Couldn't load the album library (${error}). ` : "The album library isn't connected here. "}
          These are sample albums.
        </p>
      )}

      {data && (
        <>
          {facets.ofTheDay && (
            <button className="sc-today" onClick={() => setSelected(facets.ofTheDay)}>
              <span className="sc-cover">
                <Cover album={facets.ofTheDay} eager />
              </span>
              <span className="sc-today-text">
                <span className="sc-kicker">Album of the Day · {formatDate(facets.ofTheDay.album_of_day)}</span>
                <strong>{facets.ofTheDay.name}</strong>
                <span>{facets.ofTheDay.artist}</span>
                {facets.ofTheDay.genres.length > 0 && <span className="sc-dim">{facets.ofTheDay.genres.join(", ")}</span>}
              </span>
            </button>
          )}

          <p className="sc-stats">
            {albums.length} albums by {facets.artists} artists, {facets.listened} listened to
            {!data.sample && facets.noCover > 0 ? `, ${facets.noCover} without cover art` : ""}.
          </p>

          <div className="sc-controls">
            <input
              type="search"
              className="sc-search"
              placeholder="Search album or artist"
              aria-label="Search album or artist"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <select aria-label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">All genres</option>
              {facets.genres.map(([name, n]) => (
                <option key={name} value={name}>
                  {name} ({n})
                </option>
              ))}
            </select>
            <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any status</option>
              {facets.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {facets.decades.length > 0 && (
            <div className="sc-decades" role="group" aria-label="Decade">
              {facets.decades.map((d) => (
                <button
                  key={d}
                  className={`chip ${decade === d ? "active" : ""}`}
                  aria-pressed={decade === d}
                  onClick={() => setDecade(decade === d ? null : d)}
                >
                  {d}s
                </button>
              ))}
            </div>
          )}

          {filtering && (
            <p className="sc-stats">
              {filtered.length} of {albums.length} albums.{" "}
              <button className="link" onClick={reset}>
                Clear filters
              </button>
            </p>
          )}

          {filtered.length === 0 ? (
            <p className="note">No albums match. Try a different search or clear the filters.</p>
          ) : (
            <ul className="sc-grid">
              {filtered.map((album, i) => (
                <li key={album.id} className={ranked && i < FEATURED ? "big" : ""}>
                  <button className="tile" onClick={() => setSelected(album)}>
                    <span className="sc-cover">
                      <Cover album={album} eager={i < 12} />
                      {album.rank != null && <span className="sc-rank">{album.rank}</span>}
                    </span>
                    <span className="sc-name">{album.name}</span>
                    <span className="sc-by">{album.artist}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {selected && <Detail key={selected.id} album={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
