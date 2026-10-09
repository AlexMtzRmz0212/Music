from .. import config

META = {
    "id": "genius_lyrics",
    "category": "Lookup",
    "order": 80,
    "title": "Genius lyrics",
    "description": "Finds a song on Genius and shows its page and lyrics.",
    "needs": ["GENIUS_TOKEN"],
    "writes": False,
    "params": [
        {"name": "artist", "label": "Artist", "type": "text", "default": "Eminem"},
        {"name": "song", "label": "Song", "type": "text", "default": "Lose Yourself"},
    ],
}


def run(params, log):
    import lyricsgenius  # imported late: it is slow to load and only this tool needs it

    genius = lyricsgenius.Genius(config.get("GENIUS_TOKEN"), verbose=False, remove_section_headers=True)
    song = genius.search_song(params["song"], params["artist"])
    if song is None:
        log("No match on Genius")
        return {"found": False}
    log(f"Found '{song.title}' by {song.artist}")
    return {"found": True, "title": song.title, "artist": song.artist, "url": song.url, "lyrics": song.lyrics}
