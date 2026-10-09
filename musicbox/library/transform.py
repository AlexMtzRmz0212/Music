"""Modify: pure functions over Album lists. No I/O in here."""

from typing import Optional

from .models import Album


def rank_listened(
    albums: list[Album], compact: bool = False, tiebreak: Optional[list[str]] = None
) -> list[tuple[Album, str]]:
    """Unique, zero-padded "Alex Top" ranks for every listened album that already has one.

    Albums sharing a rank are ordered by their position in `tiebreak` (page ids, the playoff result), then by
    Notion order; the rest of the list is bumped down to make room. Unranked albums are left out.
    With `compact` the ranks are renumbered 1..N without gaps.
    """
    position = {page_id: i for i, page_id in enumerate(tiebreak or [])}
    rated = sorted(
        (a for a in albums if a.is_listened and a.rank is not None),
        key=lambda a: (a.rank, position.get(a.page_id, len(position))),
    )

    ordered: list[tuple[Album, int]] = []
    last = 0
    for album in rated:
        last = album.rank if album.rank > last else last + 1
        ordered.append((album, last))

    if compact:
        ordered = [(album, i) for i, (album, _) in enumerate(ordered, 1)]
    width = 3 if ordered and (ordered[-1][1] > 99 or len(ordered) > 99) else 2
    return [(album, f"{rank:0{width}d}") for album, rank in ordered]


def pick_images(spotify_album: dict) -> tuple[Optional[str], Optional[str]]:
    """(cover, icon) from a Spotify album: the largest image and the smallest one."""
    images = spotify_album.get("images") or []
    return (images[0]["url"], images[-1]["url"]) if images else (None, None)
