"""Public, read-only endpoints. Nothing in here may write anywhere or need a login."""

from fastapi import APIRouter, HTTPException, Response

from musicbox import config
from musicbox.library.showcase import get_showcase
from musicbox.library.source import NEEDS

router = APIRouter(prefix="/api/showcase")

# Vercel's CDN keeps the answer for 15 min, so most visitors never reach Notion. No stale-serving:
# Notion-hosted covers have signed links that expire after an hour (see musicbox/library/showcase.py).
CACHE_CONTROL = "public, max-age=300, s-maxage=900"


@router.get("/albums")
def albums(response: Response):
    if config.missing(NEEDS):
        raise HTTPException(503, "The album library isn't configured on this server")
    try:
        data = get_showcase()
    except Exception:  # never leak Notion errors (or anything secret in them) to visitors
        raise HTTPException(502, "Couldn't read the album library right now")
    response.headers["Cache-Control"] = CACHE_CONTROL
    return data
