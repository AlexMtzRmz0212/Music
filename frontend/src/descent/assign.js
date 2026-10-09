import { REALMS } from "./realms";

// Which realm every album belongs to. No React here, so it can be tested on its own.
//
// Realms are cut from the WHOLE ranked list (best first), so an album keeps its realm whatever is filtered:
// filters only decide which albums are shown inside each realm. Each ranked realm takes its `share` of the list,
// at least one album while there are enough to go round (Olympus at least `min`). A tie never straddles a
// boundary: albums sharing a rank all stay in the upper realm. Albums without a rank wait at the Styx.

const byRank = (a, b) => a.rank - b.rank || a.name.localeCompare(b.name);

/** Map of album id -> realm id, for every album in `all`. */
export function realmMap(all) {
  const ranked = all.filter((a) => a.rank != null).sort(byRank);
  const n = ranked.length;
  const tiers = REALMS.filter((r) => !r.unranked);
  const where = new Map();

  let start = 0;
  let share = 0;
  tiers.forEach((realm, i) => {
    share += realm.share;
    const after = tiers.length - i - 1; // realms still to fill
    let end = i === tiers.length - 1 ? n : Math.round(share * n);
    end = Math.max(end, start + (realm.min || 1)); // never empty while there are albums
    if (n - start > after) end = Math.min(end, n - after); // leave one for each realm below
    end = Math.min(end, n);
    while (end > start && end < n && ranked[end].rank === ranked[end - 1].rank) end++; // keep ties together
    for (let k = start; k < end; k++) where.set(ranked[k].id, realm.id);
    start = end;
  });
  for (const a of all) if (a.rank == null) where.set(a.id, REALMS.find((r) => r.unranked).id);
  return where;
}

/**
 * The realms, each with `albums` (the visible ones, in the order given) and `total` (all of its albums).
 * `visible` is `all` after search and filters, already sorted by rank.
 */
export function assignRealms(all, visible) {
  const where = realmMap(all);
  const totals = new Map();
  for (const id of where.values()) totals.set(id, (totals.get(id) || 0) + 1);
  return REALMS.map((realm) => ({
    ...realm,
    albums: visible.filter((a) => where.get(a.id) === realm.id),
    total: totals.get(realm.id) || 0,
  }));
}
