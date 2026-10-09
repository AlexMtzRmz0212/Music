from typing import List

from .base import Album, BaseNotionManager


class AlbumSorter(BaseNotionManager):
    """Gives every listened album a unique, zero-padded rank in the "Alex Top" property."""

    def run(self, compact_mode: bool = False, dry_run: bool = True) -> List[Album]:
        self.log("Starting album sorting...")
        albums = self.fetch_albums()
        self.log(f"Found {len(albums)} total albums")

        processed = self.process_albums()
        if compact_mode:
            processed = self._compact_ratings(processed)

        if dry_run:
            self.log(f"Dry run: {len(processed)} listened albums would be written, nothing changed in Notion")
        else:
            self.update_notion_ratings(processed)
        return processed

    def process_albums(self) -> List[Album]:
        """Listened albums only: keep ratings unique, rank unrated ones last, zero-pad."""
        listened = [a for a in self.albums if a.is_listened]
        rated = [a for a in listened if a.is_rated]
        unrated = [a for a in listened if not a.is_rated]

        rated = self._ensure_unique_ratings(rated)
        highest = max((a.rating for a in rated), default=0)
        unrated = self._assign_default_ratings(unrated, highest + 1)

        final = rated + unrated
        final.sort(key=lambda x: x.rating)

        if final:
            fmt_length = 3 if final[-1].rating > 99 or len(final) > 99 else 2
            final = self._format_ratings(final, fmt_length)
        return final

    def _ensure_unique_ratings(self, albums: List[Album]) -> List[Album]:
        if not albums:
            return albums
        sorted_albums = sorted(albums, key=lambda x: x.rating)
        last_rating = sorted_albums[0].rating
        for i in range(1, len(sorted_albums)):
            if sorted_albums[i].rating <= last_rating:
                last_rating += 1
                sorted_albums[i].rating = last_rating
            else:
                last_rating = sorted_albums[i].rating
        return sorted_albums

    def _assign_default_ratings(self, albums: List[Album], start: int) -> List[Album]:
        for i, album in enumerate(albums):
            album.rating = start + i
        return albums

    def _format_ratings(self, albums: List[Album], length: int) -> List[Album]:
        for album in albums:
            album.rating = f"{album.rating:0{length}d}"
        return albums

    def _compact_ratings(self, albums: List[Album]) -> List[Album]:
        if not albums:
            return albums
        fmt_length = 3 if len(albums) > 99 else 2
        for i, album in enumerate(albums, 1):
            album.rating = f"{i:0{fmt_length}d}"
        return albums

    def update_notion_ratings(self, albums: List[Album]) -> None:
        self.log(f"Updating {len(albums)} albums in Notion...")
        failed = 0
        for album in albums:
            try:
                self.notion.pages.update(
                    album.page_id,
                    properties={"Alex Top": {"select": {"name": str(album.rating)}}},
                )
            except Exception as e:
                failed += 1
                self.log(f"Failed to update '{album.name}': {e}")
        self.log(f"Ratings updated ({len(albums) - failed} ok, {failed} failed)")
