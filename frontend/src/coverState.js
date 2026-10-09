// Browser-side memory for the cover review: albums whose correction was rejected, and what the
// last scan found. Both only live in this browser (localStorage); the Notion data is the truth.

const REJECTED = "mh-cover-skipped";
const FINDINGS = "mh-cover-findings";

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked: it just won't be remembered next visit
  }
}

export const loadRejected = () => new Set(read(REJECTED));
export const saveRejected = (set) => write(REJECTED, [...set]);
export const loadFindings = () => read(FINDINGS);
export const saveFindings = (list) => write(FINDINGS, list);

/**
 * Turn saved scan findings into review items using the albums as they are in Notion right now.
 * A finding is dropped when the album changed since (renamed, removed) or is already fixed.
 */
export function hydrate(findings, albums) {
  const byId = new Map(albums.map((a) => [a.id, a]));
  const items = [];
  for (const f of findings) {
    const album = byId.get(f.id);
    if (!album || album.name !== f.name || album.artist !== f.artist) continue;
    const { match, new_title: newTitle } = f.proposal;
    const titleOpen = Boolean(newTitle);
    const coverOpen = match.cover !== album.current && !match.cover_ok;
    if (!titleOpen && !coverOpen) continue;
    items.push({
      id: f.id,
      name: album.name,
      artist: album.artist,
      reason: f.reason,
      shared_with: [],
      current: album.current,
      has_icon: album.has_icon,
      proposal: f.proposal,
    });
  }
  return items;
}
