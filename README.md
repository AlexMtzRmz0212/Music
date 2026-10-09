# Hell o’ Fame

(The code still calls it Music Hub.) The tabs are The Hall (the showcase), Purgatory (the album sorter), Cover art and Tools. Purgatory only shows
while some ranks are shared by several albums, and Cover art while some album needs a cover or title fix; Scan library
checks both again.

One web UI for my music projects. Visitors get the **Showcase** (a read-only wall of my Notion album library) and a
**demo of the tools on sample data**; I sign in with a password (lock icon) and the same page runs the **real tools**
against Notion, Spotify, Setlist.fm and Genius.
Same pattern as `ProjectsTracker`: FastAPI backend, React + Vite frontend, single owner password.

## Run it

```bash
python -m venv .venv && .venv/Scripts/activate && pip install -r requirements-dev.txt
cd frontend && npm install
cp .env.example .env        # fill in what you have
```

Then `DEV.bat` (API on :8002, web on :5175) or by hand: `uvicorn backend.main:app --port 8002` and `npm run dev`.
With `OWNER_PASSWORD` empty the login is off locally (the lock goes straight in). Tests: `pytest`.

## Showcase (public)

The first tab. Cover wall of the Notion album library, ranked by `Alex Top`, with Album of the Day on top, search,
genre / decade / status filters and a detail view. It is **view-only**: nothing on it can write to Notion.

- Data: `GET /api/showcase/albums` (no login). The Notion token never leaves the server; the response only has the
  fields in `Album.to_public()` (`musicbox/library/models.py`): cover, name, artist, genres, release date, decade,
  rank, status, Album of the Day (the date I listened to it). Friends' tops and "Picked by" are never read or sent.
- Freshness: cached 20 min on the server, 15 min on Vercel's CDN, 5 min in the browser. Covers uploaded to Notion are
  signed links that expire after an hour, which is why the windows are short. If Notion is down the last good copy is
  served; if the library isn't configured the tab shows sample albums.

## Cover and title review (owner only)

A tab that only exists while some album needs a correction, and only after signing in. Each card shows what the
album has now next to Spotify's version: a new cover, a corrected title, or both. Swipe right (or press the right
arrow) to apply exactly what the card shows; swipe left to **reject** it. A rejected album is left untouched and is
not offered again (the finished screen has a button to bring them back). Nothing is written until a right swipe.

- What lands in the queue by itself (`musicbox/library/covers.py`): no cover, one of Notion's stock photos (the
  Unsplash ones new pages get), the **"no album yet" placeholder** (the cover your empty-title option pages share;
  it's detected from the data, not hard-coded) on an album that has a title, or the very same image as another album.
  Pages with an empty Album title are options to listen to and are never touched.
- **Scan library** (owner button in the header) checks every album against Spotify and adds a card wherever the
  Spotify cover or title differs. It only reads.
- **How a Spotify album is chosen** (the same rules for every album, nothing special-cased): the artist must be
  exactly yours (so "Harry Styles - Piano Covers" is not Harry Styles); the title must be yours, or a near miss of it
  (`Fuzzbrain` -> `Fuzzybrain`, proposed as a rename); a different release is a different album, so remixes, live
  sets and "(Taylor's Version)" never stand in for the original. Only edition labels (Deluxe, Expanded, Anniversary,
  Remastered, Legacy...) are ignored when comparing titles. Among the matches the **standard release wins over
  Deluxe/Expanded editions** (unless your own title says so), then a plain album over a compilation or single, then
  the earliest release. If Spotify doesn't have the album, nothing is proposed.
- **Choosing an edition:** when Spotify has several editions of an album (standard, Deluxe, Expanded,
  remastered...), the card lists them side by side with cover, year and track count, and **each edition's track
  list** (tracks the standard doesn't have are highlighted, so a Deluxe's extras stand out). Tap one to choose; the
  standard is preselected, and the one your cover already belongs to is marked "yours". A right swipe writes the
  edition you chose. Choosing the Deluxe never renames the album. An album whose cover already is one of its
  editions is not flagged by the scan (that's your choice), but any card you do get lets you switch.
- Cards say which Spotify release your current cover belongs to ("Your current cover is from ... (Piano Covers)").
  The same release listed twice by Spotify, or one edition swapped for another when no standard release exists,
  is not offered as a correction.
- Rejected albums and scan results are remembered in this browser only (`mh-cover-skipped`, `mh-cover-findings`).
- Routes (all owner-only): `GET /api/covers/queue`, `POST /api/covers/suggest`, `GET /api/covers/tracks/{spotify album id}`, `POST /api/covers/apply` (cover,
  icon and/or title). Cover URLs must be Spotify's CDN; apply refreshes the public showcase.

## Album sorter (owner, with a demo for visitors)

A tab that gives every listened album its own "Alex Top" rank. Albums that share a rank play off in pairs: pick the
better one (click, or the arrow keys) and the next pair is chosen by binary insertion, so nothing that already follows
from earlier answers is asked (5 tied albums take at most 8 matches instead of all 10 pairs). Undo with Backspace. One
shared rank after another, until every rank has one album. Answers are kept in this browser (`mh-sorter-answers`)
until they are written.

- **Movements** shows what the new ranks do: a before/after slope chart on one rank scale (a tie fans out, everything
  below slides down) and a Replay that deals each tie out like a pile of cards. "Close gaps" renumbers 1..N.
- **Rule** (`rank_listened` in `transform.py`, mirrored in `frontend/src/sorter.js` for the preview): only listened
  albums that already have a rank; ties in playoff order (undecided ones in Notion order); the albums below are bumped
  down to make room. Unranked albums are left out.
- Writing re-reads Notion and recomputes the ranks on the server, then writes only pages whose rank changes (one
  Notion call each, so run it locally). Routes (owner only): `GET /api/sorter/albums`, `POST /api/sorter/apply`
  (`tiebreak`: page ids from the playoffs, `compact`). The public demo plays on sample albums and never writes.

## Album pipeline

`musicbox/library/` is one stage per file, shared by the showcase and the owner tools: `source.py` pulls Notion pages
into `Album` objects, `transform.py` holds the pure logic (ranking, picking cover art), `covers.py` finds albums that need art and asks
Spotify for a cover, `sink.py` writes
changes back (dry run by default, retries on rate limits). New album features should go through these.

## Tools

| Tool | What it does | Needs |
|---|---|---|
| Most streamed songs | Wikipedia list -> Notion table | `NOTION_SECRET`, `STREAMED_SONGS_DB_ID` |
| Most streamed albums | kworb list -> Notion table | `NOTION_SECRET`, `STREAMED_ALBUMS_DB_ID` |
| Spotify search | Albums / artists / tracks | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` |
| Setlist.fm search | Setlists for an artist | `SETLISTFM_API_KEY` |
| Genius lyrics | Song page + lyrics | `GENIUS_TOKEN` |

Every tool that can write defaults to **dry run**; turning it off asks for confirmation in the UI. A tool whose
settings are missing is greyed out and says which ones.

## Add a tool

Drop one file in `musicbox/tools/` with a `META` dict and a `run(params, log)` function (see the docstring in
`musicbox/tools/__init__.py`). It appears in the UI by itself. For the public demo, add a canned entry in
`frontend/src/demo/demoApi.js`. Anything not ready yet goes in `experiments/`.

## Layout

```
backend/      FastAPI: /api/showcase/albums (public), /api/covers/*, /api/sorter/* and /api/tools/* (owner), /api/auth/*   (auth.py copied from ProjectsTracker)
api/          Vercel entry point
musicbox/     config (env names + legacy aliases), Spotify client, library/ (album pipeline), tools/
frontend/     Vite + React (showcase, album sorter, cover review, tool cards, login, in-memory demo API)
experiments/  earlier prototypes (Notiontify, Spotify test, Genius demo, notebook)
tests/        pytest
```

## Notes

- **History**: this repo absorbed `Notion_Albums` (Streamlit app, now the album tools), `Streams/`, `Spotify/`,
  `Setlist.fm/` and `Genius.py`. The old folders are backed up in `GitHub/Music-old-repos-backup-2026-10-08.tgz`.
- **Two Notion integrations**: the streams tables and the album library use different tokens, hence
  `NOTION_SECRET` and `NOTION_ALBUMS_SECRET`. Old names (`API_KEY`, `ALBUM_DB_ID`, `SPOTIPY_*`...) still work.
- **Deploying to Vercel**: the Showcase reads Notion live (one ~2 s request per 15 min), and the tools work as a demo. Real runs loop over many Notion pages and can exceed
  Vercel's request time limit, so use the hub locally for now. Long runs later: background job + polling.
- One owner password, no accounts. If someone else wants in, `require_owner` in `backend/auth.py` is the place.
