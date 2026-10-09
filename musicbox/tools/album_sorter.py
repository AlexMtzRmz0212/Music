from ..library.sink import Change, apply_changes
from ..library.source import fetch_albums, notion_client
from ..library.transform import rank_listened

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
    notion = notion_client()
    albums = fetch_albums(notion)
    log(f"Found {len(albums)} total albums")

    ranked = rank_listened(albums, compact=params["compact"])
    # only pages whose rank would actually change need a write
    changes = [Change.of(a, rank=rank) for a, rank in ranked if rank != a.rank_text]
    log(f"{len(ranked)} listened albums ranked, {len(changes)} need an update")

    written, _ = apply_changes(notion, changes, log, dry_run=params["dry_run"])
    if params["dry_run"]:
        log("Dry run: nothing changed in Notion")
    return {
        "written": written,
        "rows": [{"rank": rank, "album": a.name, "artist": a.artist} for a, rank in ranked[:50]],
    }
