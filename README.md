# Music Hub

One web UI that runs all my music mini-projects. Visitors get a **demo on sample data**; I sign in with a
password (lock icon) and the same page runs the **real tools** against Notion, Spotify, Setlist.fm and Genius.
Same pattern as `ProjectsTracker`: FastAPI backend, React + Vite frontend, single owner password.

## Run it

```bash
python -m venv .venv && .venv/Scripts/activate && pip install -r requirements-dev.txt
cd frontend && npm install
cp .env.example .env        # fill in what you have
```

Then `DEV.bat` (API on :8002, web on :5175) or by hand: `uvicorn backend.main:app --port 8002` and `npm run dev`.
With `OWNER_PASSWORD` empty the login is off locally (the lock goes straight in). Tests: `pytest`.

## Tools

| Tool | What it does | Needs |
|---|---|---|
| Album library stats | Totals for the Notion album library: listened, rated, missing art | `NOTION_ALBUMS_SECRET`, `ALBUMS_LIBRARY_DB_ID` |
| Album sorter | Unique zero-padded rank for every listened album (`Alex Top`); compact mode; dry run | same |
| Album decorator | Spotify cover + icon onto Notion album pages; dry run, limit | same + Spotify |
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
backend/      FastAPI: /api/auth/*, /api/tools, /api/tools/{id}/run   (auth.py copied from ProjectsTracker)
api/          Vercel entry point
musicbox/     config (env names + legacy aliases), Spotify client, album library classes, tools/
frontend/     Vite + React (tool cards, login, in-memory demo API)
experiments/  earlier prototypes (Notiontify, Spotify test, Genius demo, notebook)
tests/        pytest
```

## Notes

- **History**: this repo absorbed `Notion_Albums` (Streamlit app, now the album tools), `Streams/`, `Spotify/`,
  `Setlist.fm/` and `Genius.py`. The old folders are backed up in `GitHub/Music-old-repos-backup-2026-10-08.tgz`.
- **Two Notion integrations**: the streams tables and the album library use different tokens, hence
  `NOTION_SECRET` and `NOTION_ALBUMS_SECRET`. Old names (`API_KEY`, `ALBUM_DB_ID`, `SPOTIPY_*`...) still work.
- **Deploying to Vercel**: the public site works as a demo. Real runs loop over many Notion pages and can exceed
  Vercel's request time limit, so use the hub locally for now. Long runs later: background job + polling.
- One owner password, no accounts. If someone else wants in, `require_owner` in `backend/auth.py` is the place.
