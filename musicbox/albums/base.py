from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Optional

from notion_client import Client

from .. import config
from ..runtime import Log, fetch_all_pages


@dataclass
class Album:
    """Shared Album model for managers."""
    name: str
    artist: str
    rating: Optional[object] = None  # int while sorting, zero-padded str once formatted
    status: Optional[str] = None
    page_id: Optional[str] = None
    has_cover: bool = False
    has_icon: bool = False

    @property
    def is_listened(self) -> bool:
        return self.status == "Listened"

    @property
    def is_rated(self) -> bool:
        return self.rating is not None


class BaseNotionManager(ABC):
    """Base class for managers that work on the personal album library in Notion."""

    def __init__(self, log: Log = print, api_key: Optional[str] = None, db_id: Optional[str] = None):
        self.log = log
        self.api_key = api_key or config.get("NOTION_ALBUMS_SECRET")
        self.db_id = db_id or config.get("ALBUMS_LIBRARY_DB_ID")
        if not self.api_key or not self.db_id:
            raise ValueError("NOTION_ALBUMS_SECRET and ALBUMS_LIBRARY_DB_ID must be set")
        self.notion = Client(auth=self.api_key)
        self.albums: List[Album] = []

    @abstractmethod
    def run(self, *args, **kwargs):
        """Main execution method to be implemented by subclasses."""

    def fetch_albums(self) -> List[Album]:
        """Fetch and parse all albums from Notion."""
        albums = []
        for page in fetch_all_pages(self.notion, self.db_id):
            album = self._parse_notion_page(page)
            if album:
                albums.append(album)
        self.albums = albums
        return albums

    def _parse_notion_page(self, page: Dict) -> Optional[Album]:
        properties = page["properties"]

        title_data = properties.get("Album", {}).get("title", [])
        name = title_data[0]["text"]["content"] if title_data else "Untitled"

        artist_data = properties.get("Artist", {}).get("select", {})
        artist = artist_data.get("name", "Unknown") if artist_data else "Unknown"

        rating_data = properties.get("Alex Top", {}).get("select", {})
        rating = None
        if rating_data and rating_data.get("name") and rating_data["name"].isdigit():
            rating = int(rating_data["name"])

        status_data = properties.get("Status", {}).get("status", {})
        status = status_data.get("name", "Unknown") if status_data else "Unknown"

        return Album(
            name=name,
            artist=artist,
            rating=rating,
            status=status,
            page_id=page["id"],
            has_cover=bool(page.get("cover")),
            has_icon=bool(page.get("icon")),
        )
