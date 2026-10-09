from ..albums import AlbumSorter

META = {
    "id": "album_sorter",
    "category": "Album library",
    "order": 20,
    "title": "Album sorter",
    "description": "Gives every listened album a unique zero-padded rank in 'Alex Top'. "
    "Dry run shows the new ranking without touching Notion.",
    "needs": ["NOTION_ALBUMS_SECRET", "ALBUMS_LIBRARY_DB_ID"],
    "writes": True,
    "params": [
        {"name": "compact", "label": "Compact ranks (1..N, no gaps)", "type": "bool", "default": False},
        {"name": "dry_run", "label": "Dry run (don't write to Notion)", "type": "bool", "default": True},
    ],
}


def run(params, log):
    albums = AlbumSorter(log).run(compact_mode=params["compact"], dry_run=params["dry_run"])
    return {
        "written": 0 if params["dry_run"] else len(albums),
        "rows": [{"rank": a.rating, "album": a.name, "artist": a.artist} for a in albums[:50]],
    }
