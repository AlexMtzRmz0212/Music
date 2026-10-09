from ..albums.base import BaseNotionManager

META = {
    "id": "album_stats",
    "category": "Album library",
    "order": 10,
    "title": "Album library stats",
    "description": "Counts the albums in your Notion library: listened, rated, and missing cover art.",
    "needs": ["NOTION_ALBUMS_SECRET", "ALBUMS_LIBRARY_DB_ID"],
    "writes": False,
    "params": [],
}


class _Reader(BaseNotionManager):
    def run(self):
        return self.fetch_albums()


def run(params, log):
    albums = _Reader(log).run()
    listened = [a for a in albums if a.is_listened]
    rated = [a for a in listened if a.is_rated]
    log(f"Read {len(albums)} albums from Notion")
    return {
        "stats": {
            "total": len(albums),
            "listened": len(listened),
            "listened_and_rated": len(rated),
            "listened_unrated": len(listened) - len(rated),
            "missing_cover": sum(not a.has_cover for a in albums),
            "missing_icon": sum(not a.has_icon for a in albums),
        },
        "rows": [
            {"rank": a.rating, "album": a.name, "artist": a.artist}
            for a in sorted(rated, key=lambda a: a.rating)[:10]
        ],
    }
