from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlparse

LISTENED = "Listened"
# Notion gives new pages a random photo from its built-in gallery. That is not album art.
STOCK_COVER_HOSTS = {"images.unsplash.com"}


@dataclass
class Album:
    """One page of the Notion album library, reduced to the fields the hub uses."""

    page_id: str
    name: str
    artist: str = "Unknown"
    genres: list[str] = field(default_factory=list)
    release_date: Optional[str] = None  # ISO date
    decade: Optional[str] = None
    rank: Optional[int] = None  # "Alex Top", numeric part
    rank_text: Optional[str] = None  # "Alex Top" exactly as stored, e.g. "07"
    status: str = "Unknown"
    album_of_day: Optional[str] = None  # "Album of the Day": the date I listened to it
    cover: Optional[str] = None
    has_icon: bool = False  # any icon, emoji included, so we never overwrite one by hand

    @property
    def is_listened(self) -> bool:
        return self.status == LISTENED

    @property
    def is_untitled(self) -> bool:
        return self.name == "Untitled"  # what source.py calls a page with an empty Album title

    @property
    def has_art(self) -> bool:
        """A cover that is actual album art (set, and not one of Notion's stock photos)."""
        return bool(self.cover) and urlparse(self.cover).hostname not in STOCK_COVER_HOSTS

    def to_public(self) -> dict:
        """The one place that decides what the public showcase may see.

        Friends' rankings, "Picked by", formulas and icons are deliberately left out.
        """
        return {
            "id": self.page_id,
            "name": self.name,
            "artist": self.artist,
            "genres": self.genres,
            "release_date": self.release_date,
            "decade": self.decade,
            "rank": self.rank,
            "status": self.status,
            "album_of_day": self.album_of_day,
            "cover": self.cover if self.has_art else None,
        }
