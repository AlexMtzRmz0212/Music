from .. import spotify

META = {
    "id": "spotify_search",
    "order": 60,
    "title": "Spotify search",
    "description": "Looks up albums, artists or tracks in the Spotify catalogue.",
    "needs": ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
    "writes": False,
    "params": [
        {"name": "query", "label": "Search", "type": "text", "default": "Twenty One Pilots"},
        {"name": "kind", "label": "Type", "type": "select", "options": ["album", "artist", "track"], "default": "album"},
    ],
}


def run(params, log):
    kind = params["kind"]
    items = spotify.search(params["query"], kind, limit=10)
    log(f"{len(items)} {kind}(s) for '{params['query']}'")
    rows = []
    for item in items:
        row = {"name": item["name"]}
        if kind != "artist":
            row["artists"] = ", ".join(a["name"] for a in item["artists"])
        else:
            row["genres"] = ", ".join(item.get("genres", []))
            row["followers"] = item.get("followers", {}).get("total")
        row["popularity" if kind != "album" else "released"] = (
            item.get("popularity") if kind != "album" else item.get("release_date")
        )
        row["url"] = item["external_urls"]["spotify"]
        rows.append(row)
    return {"rows": rows}
