import time
from typing import Dict, Optional

from .. import spotify
from .base import Album, BaseNotionManager


class AlbumDecorator(BaseNotionManager):
    """Adds album cover and icon from Spotify to pages in the Notion album library."""

    def run(self, update_existing: bool = False, dry_run: bool = True, limit: int = 0) -> int:
        self.log("Starting album decoration...")
        albums = self.fetch_albums()
        self.log(f"Found {len(albums)} total albums")

        to_process = [a for a in albums if update_existing or not (a.has_cover and a.has_icon)]
        if not to_process:
            self.log("All albums already decorated. Tick 'update existing' to force it.")
            return 0
        if limit and limit > 0:
            to_process = to_process[:limit]
        self.log(f"Processing {len(to_process)} albums" + (" (dry run)" if dry_run else ""))

        successful = 0
        for album in to_process:
            if self.decorate_album(album, update_existing, dry_run):
                successful += 1
            if not dry_run:
                time.sleep(0.5)  # be gentle with both APIs
        self.log(f"{'Found art for' if dry_run else 'Decorated'} {successful}/{len(to_process)} albums")
        return successful

    def decorate_album(self, album: Album, update_existing: bool, dry_run: bool) -> bool:
        self.log(f"'{album.name}' by {album.artist}")
        data = self.search_spotify_album(album.name, album.artist)
        if not data:
            self.log("  no match on Spotify")
            return False

        cover_url = data["cover_url"] if update_existing or not album.has_cover else None
        icon_url = data["icon_url"] if update_existing or not album.has_icon else None
        if dry_run:
            self.log(f"  would set {'cover ' if cover_url else ''}{'icon' if icon_url else ''}".rstrip())
            return bool(cover_url or icon_url)
        return self.update_page_decorations(album.page_id, cover_url, icon_url)

    def search_spotify_album(self, album_name: str, artist_name: str) -> Optional[Dict]:
        try:
            items = spotify.search(f"album:{album_name} artist:{artist_name}", "album", limit=1)
        except Exception as e:
            self.log(f"  Spotify error: {e}")
            return None
        if not items:
            return None
        images = items[0].get("images") or []
        return {
            "cover_url": images[0]["url"] if images else None,
            "icon_url": images[-1]["url"] if images else None,
        }

    def update_page_decorations(self, page_id: str, cover_url: str = None, icon_url: str = None) -> bool:
        payload = {}
        if cover_url:
            payload["cover"] = {"type": "external", "external": {"url": cover_url}}
        if icon_url:
            payload["icon"] = {"type": "external", "external": {"url": icon_url}}
        if not payload:
            return False
        try:
            self.notion.pages.update(page_id, **payload)
            self.log(f"  updated {', '.join(k for k in ('cover', 'icon') if k in payload)}")
            return True
        except Exception as e:
            self.log(f"  failed to update page: {e}")
            return False
