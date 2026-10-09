from ..albums import AlbumDecorator

META = {
    "id": "album_decorator",
    "category": "Album library",
    "order": 30,
    "title": "Album decorator",
    "description": "Finds cover art on Spotify and sets it as the cover and icon of album pages in Notion.",
    "needs": ["NOTION_ALBUMS_SECRET", "ALBUMS_LIBRARY_DB_ID", "SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
    "writes": True,
    "params": [
        {"name": "limit", "label": "Max albums this run (0 = all)", "type": "number", "default": 10},
        {"name": "update_existing", "label": "Also replace existing covers", "type": "bool", "default": False},
        {"name": "dry_run", "label": "Dry run (don't write to Notion)", "type": "bool", "default": True},
    ],
}


def run(params, log):
    done = AlbumDecorator(log).run(
        update_existing=params["update_existing"], dry_run=params["dry_run"], limit=params["limit"]
    )
    return {"matched" if params["dry_run"] else "decorated": done}
