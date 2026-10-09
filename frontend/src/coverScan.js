import { coversApi } from "./api";

// Checks every album against Spotify and reports the ones where Spotify disagrees with Notion.
// It only reads: the corrections are written one by one, after a right swipe in the review.
// Which Spotify release counts as "the" album is decided by the server (musicbox/library/covers.py):
// exact artist, matching title, standard edition before deluxe. No match means no card.

// These already have a card in the review queue (or are an option page without an album).
const SKIP_SOURCES = new Set(["none", "stock", "placeholder"]);

/**
 * @param albums   [{ id, name, artist, current, source, has_icon }] from the queue endpoint
 * @param exclude  ids to leave out (already in the review queue, or rejected before)
 * @returns { findings, failed, scanned }
 */
export async function scanLibrary(albums, { exclude, signal, onProgress, concurrency = 3 }) {
  const todo = albums.filter((a) => !exclude.has(a.id) && !SKIP_SOURCES.has(a.source));
  const findings = [];
  let next = 0;
  let done = 0;
  let failed = 0;
  onProgress(0, todo.length);

  const worker = async () => {
    while (next < todo.length && !signal.aborted) {
      const album = todo[next++];
      try {
        const proposal = await coversApi.suggest(album.name, album.artist, album.current);
        const { match, new_title: newTitle } = proposal;
        if (match) {
          const coverDiffers = match.cover !== album.current && !match.cover_ok;
          const reason = newTitle && coverDiffers ? "both" : newTitle ? "title" : coverDiffers ? "cover" : null;
          if (reason) {
            findings.push({
              id: album.id,
              name: album.name,
              artist: album.artist,
              reason,
              proposal: { state: "ready", ...proposal },
            });
          }
        }
      } catch {
        failed++;
      }
      onProgress(++done, todo.length);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { findings, failed, scanned: done };
}
