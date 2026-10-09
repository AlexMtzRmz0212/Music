import requests

from .. import config

META = {
    "id": "setlistfm",
    "category": "Lookup",
    "order": 70,
    "title": "Setlist.fm search",
    "description": "Recent concert setlists for an artist.",
    "needs": ["SETLISTFM_API_KEY"],
    "writes": False,
    "params": [
        {"name": "artist", "label": "Artist", "type": "text", "default": "Radiohead"},
    ],
}


def run(params, log):
    response = requests.get(
        "https://api.setlist.fm/rest/1.0/search/setlists",
        headers={"Accept": "application/json", "x-api-key": config.get("SETLISTFM_API_KEY")},
        params={"artistName": params["artist"], "p": 1},
        timeout=20,
    )
    if response.status_code == 404:
        log("No setlists found")
        return {"rows": []}
    response.raise_for_status()
    setlists = response.json().get("setlist", [])
    log(f"{len(setlists)} setlists for '{params['artist']}'")
    rows = []
    for s in setlists:
        songs = [song["name"] for sets in s.get("sets", {}).get("set", []) for song in sets.get("song", [])]
        rows.append({
            "date": s.get("eventDate"),
            "venue": s.get("venue", {}).get("name"),
            "city": s.get("venue", {}).get("city", {}).get("name"),
            "songs": len(songs),
            "opener": songs[0] if songs else "",
        })
    return {"rows": rows}
