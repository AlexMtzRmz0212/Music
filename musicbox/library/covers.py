"""Cover-art review: find albums that need art and propose a cover from Spotify.

Nothing in here writes to Notion. The owner confirms each proposal in the UI and
`sink.py` does the write.
"""

import re
import unicodedata
from collections import Counter, defaultdict
from difflib import SequenceMatcher
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlparse

from .. import spotify
from .models import STOCK_COVER_HOSTS, Album
from .transform import pick_images


@dataclass
class Issue:
    album: Album
    reason: str  # "none" | "stock" Notion's stock photo | "placeholder" no-album-yet banner | "duplicate"
    shared_with: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        a = self.album
        return {
            "id": a.page_id,
            "name": a.name,
            "artist": a.artist,
            "reason": self.reason,
            "shared_with": self.shared_with,
            "current": a.cover,
            "has_icon": a.has_icon,
        }


def _path(url: Optional[str]) -> Optional[str]:
    """A cover's identity without the signed query string (Notion's file links change on every read)."""
    if not url:
        return None
    parsed = urlparse(url)
    return parsed.netloc + parsed.path


def placeholder_path(albums: list[Album]) -> Optional[str]:
    """The cover that marks "an artist I might listen to, no album yet".

    Not hard-coded: it is whatever cover the empty-title option pages share (three or more of them).
    """
    counts = Counter(_path(a.cover) for a in albums if a.is_untitled and a.cover)
    path, n = counts.most_common(1)[0] if counts else (None, 0)
    return path if n >= 3 else None


def find_issues(albums: list[Album]) -> list[Issue]:
    """Albums whose cover is missing, a stock photo, the "no album yet" placeholder, or shared with another album.

    Pages without a title are options to listen to (there is no album to search for), so they're skipped.
    """
    placeholder = placeholder_path(albums)
    titled = [a for a in albums if not a.is_untitled]
    by_cover: dict[str, list[Album]] = defaultdict(list)
    for a in titled:
        if a.has_art and _path(a.cover) != placeholder:
            by_cover[_path(a.cover)].append(a)

    issues = []
    for a in titled:
        if not a.cover:
            issues.append(Issue(a, "none"))
        elif not a.has_art:
            issues.append(Issue(a, "stock"))
        elif _path(a.cover) == placeholder:
            issues.append(Issue(a, "placeholder"))
        elif len(by_cover[_path(a.cover)]) > 1:
            others = [f"{o.name} ({o.artist})" for o in by_cover[_path(a.cover)] if o.page_id != a.page_id]
            issues.append(Issue(a, "duplicate", others))
    return issues


def is_spotify_image(url: Optional[str]) -> bool:
    """Only Spotify's CDN is accepted when writing a cover, whatever the client sends."""
    host = urlparse(url or "").hostname or ""
    return host == "scdn.co" or host.endswith(".scdn.co")


def cover_source(url: Optional[str], placeholder: Optional[str] = None) -> str:
    """Where a cover came from: none | stock | placeholder | spotify | upload (a file in Notion) | other."""
    if not url:
        return "none"
    if placeholder and _path(url) == placeholder:
        return "placeholder"
    host = urlparse(url).hostname or ""
    if host in STOCK_COVER_HOSTS:
        return "stock"
    if is_spotify_image(url):
        return "spotify"
    return "upload" if host.endswith("amazonaws.com") else "other"


# Labels for another edition of the same album. Anything else in a title ("Taylor's Version", "Remix",
# "Live", "Piano Covers") makes it a different release, so it is never treated as noise.
_EDITION = re.compile(r"deluxe|expanded|anniversary|remaster|edition|bonus|special|collector|legacy|reissue|explicit")


def _norm(text: str) -> str:
    """Comparable form of a title/artist: no accents, case, punctuation or edition labels."""
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    # "(Deluxe Edition)" is dropped; any other parenthetical keeps its words
    text = re.sub(r"[(\[]([^)\]]*)[)\]]", lambda m: " " if _EDITION.search(m.group(1)) else f" {m.group(1)} ", text)
    head, *tail = re.split(r"\s[-:]\s|:\s", text, maxsplit=1)
    if tail and _EDITION.search(tail[0]):
        text = head  # "Trouble Man: 40th Anniversary Expanded Edition" -> "Trouble Man"
    return re.sub(r"[^a-z0-9]+", "", text)


def _plain(text: str) -> str:
    return text.replace("\u2019", "'").replace("\u2018", "'").strip().lower()


def library_view(albums: list[Album]) -> list[dict]:
    """Every titled album, lightly, for the review UI (scan, and refreshing saved findings)."""
    placeholder = placeholder_path(albums)
    return [
        {"id": a.page_id, "name": a.name, "artist": a.artist, "current": a.cover,
         "source": cover_source(a.cover, placeholder), "has_icon": a.has_icon}
        for a in albums
        if not a.is_untitled
    ]


NEAR_MISS = 0.85  # how alike two titles must be for Spotify's to count as a corrected spelling of ours
_SEARCH_POOL = 10  # results per query (Spotify's maximum for search)


def _rank(name: str, artist: str, item: dict) -> Optional[tuple]:
    """Sort key (lower is better) for a Spotify album as a match for ours, or None if it can't be the same album.

    Rules, none specific to any album: the artist must be exactly ours (so "Harry Styles - Piano Covers" is
    not Harry Styles); the title must be ours, or a near miss of it. Among those, the standard release beats
    deluxe/expanded/remastered ones (unless our own title says so), then a plain album beats a compilation or
    single, then the earliest release wins (the original, not the reissue).
    """
    ours, theirs = _norm(name), _norm(item.get("name", ""))
    artists = {_norm(a["name"]) for a in item.get("artists", [])}
    if not ours or not theirs or _norm(artist) not in artists:
        return None
    if ours == theirs:
        tier = 0
    elif SequenceMatcher(None, ours, theirs).ratio() >= NEAR_MISS:
        tier = 1
    else:
        return None
    raw = _plain(item["name"])
    wants_edition = bool(_EDITION.search(name.lower()))
    return (
        tier,
        0 if raw == _plain(name) else 1,
        0 if wants_edition or not _EDITION.search(raw) else 1,
        0 if item.get("album_type") == "album" else 1,
        item.get("release_date") or "9999",
    )


def _image_id(url: str) -> str:
    return url.rsplit("/", 1)[-1]


_MAX_OPTIONS = 6


def suggest(name: str, artist: str, current: Optional[str] = None) -> Optional[dict]:
    """Spotify's version of an album, or None when Spotify doesn't have it.

    The result is the preferred release (the standard one) plus `options`: every edition of the album
    found (standard, deluxe, expanded...), so the review can let you choose. `exact` is False when only a
    near-miss title was found (a rename proposal). `cover_ok` says the album's current cover already
    belongs to one of those editions, so there is nothing to correct. `current_release` names the Spotify
    release the current cover belongs to, even when it is a different album altogether (a covers album).
    """
    pool: dict[str, dict] = {}
    for query in (f"album:{name} artist:{artist}", f"{name} {artist}"):
        for item in spotify.search(query, "album", limit=_SEARCH_POOL):
            pool.setdefault(item["id"], item)
    ranked = sorted(
        ((r, i) for i in pool.values() if (r := _rank(name, artist, i)) is not None), key=lambda x: x[0]
    )
    wanted = _image_id(current) if current else None

    def owns_current(item: dict) -> bool:
        return bool(wanted) and any(_image_id(img["url"]) == wanted for img in item.get("images", []))

    options: dict[tuple, dict] = {}
    best_tier = ranked[0][0][0] if ranked else None
    for rank, item in ranked:
        cover, icon = pick_images(item)
        if rank[0] != best_tier or not cover:
            continue
        # Spotify sometimes lists one release twice (different image files): show it once
        key = (_plain(item.get("name", "")), item.get("total_tracks"), item.get("release_date"))
        if key in options:
            options[key]["is_current"] = options[key]["is_current"] or owns_current(item)
            continue
        if len(options) < _MAX_OPTIONS:
            options[key] = {
                "id": item.get("id"),
                "cover": cover,
                "icon": icon,
                "name": item.get("name", ""),
                "release_date": item.get("release_date"),
                "total_tracks": item.get("total_tracks"),
                "album_type": item.get("album_type"),
                "url": (item.get("external_urls") or {}).get("spotify"),
                "exact": rank[0] == 0,
                "is_current": owns_current(item),
            }
    if not options:
        return None
    choices = list(options.values())
    first = next(i for _, i in ranked if _plain(i.get("name", "")) == _plain(choices[0]["name"]))
    current_release = next((c["name"] for c in pool.values() if owns_current(c)), None)
    return {
        **choices[0],
        "artist": ", ".join(a["name"] for a in first.get("artists", [])),
        "options": choices,
        "current_release": current_release,
        "cover_ok": any(c["is_current"] for c in choices),
    }


def compare(match: Optional[dict]) -> dict:
    """What the review UI needs besides the match: a rename is only proposed for a near-miss title."""
    if not match:
        return {"artist_match": False, "new_title": None}
    return {"artist_match": True, "new_title": None if match["exact"] else match["name"]}
