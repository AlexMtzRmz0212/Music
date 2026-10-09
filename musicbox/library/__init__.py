"""
The album library pipeline, one stage per module:

    source.py     pull   Notion -> Album objects
    transform.py  modify pure functions over Album lists (ranking, cover art)
    covers.py     review which albums need art and what Spotify proposes
    sink.py       push   Change objects -> Notion (dry run by default)
    showcase.py          cached public view built from `source`

Owner tools (musicbox/tools/album_*.py) and the public showcase share these.
"""

from .models import Album

__all__ = ["Album"]
