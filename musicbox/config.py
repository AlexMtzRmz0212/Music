"""
One place for every environment variable.

The old projects each named things differently, so every setting accepts its
legacy names too: an old `.env` keeps working. Values are read at call time,
and nothing in here ever prints or logs a value.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

# canonical name -> legacy names that still work
SETTINGS = {
    "OWNER_PASSWORD": [],
    # Notion integration that owns the "most streamed" databases (was Streams/)
    "NOTION_SECRET": [],
    # Notion integration that owns the personal album library (was Notion_Albums/, "API_KEY")
    "NOTION_ALBUMS_SECRET": ["API_KEY"],
    "ALBUMS_LIBRARY_DB_ID": ["ALBUM_DB_ID"],
    "STREAMED_ALBUMS_DB_ID": ["ALBUM_DATABASE_ID"],
    "STREAMED_SONGS_DB_ID": ["SONGS_DATABASE_ID"],
    "SPOTIFY_CLIENT_ID": ["SPOTIPY_CLIENT_ID"],
    "SPOTIFY_CLIENT_SECRET": ["SPOTIPY_CLIENT_SECRET"],
    "SETLISTFM_API_KEY": [],
    "GENIUS_TOKEN": [],
}


def get(name: str, default: str = "") -> str:
    """Value of a setting by canonical name (falls back to its legacy names)."""
    for key in [name, *SETTINGS.get(name, [])]:
        value = os.getenv(key, "").strip()
        if value:
            return value
    return default


def missing(names: list[str]) -> list[str]:
    """Canonical names from `names` that have no value."""
    return [name for name in names if not get(name)]
