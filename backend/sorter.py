"""Album sorter (owner only): the ranked albums to run playoffs on, and writing the decided order."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from musicbox import config
from musicbox.library import showcase
from musicbox.library.sink import Change, apply_changes
from musicbox.library.source import NEEDS, fetch_albums, notion_client
from musicbox.library.transform import rank_listened
from musicbox.runtime import RunLog

from .auth import require_owner

router = APIRouter(prefix="/api/sorter", dependencies=[Depends(require_owner)])


def _need() -> None:
    missing = config.missing(NEEDS)
    if missing:
        raise HTTPException(503, "Missing settings: " + ", ".join(missing))


class ApplyBody(BaseModel):
    tiebreak: list[str] = Field(default_factory=list, max_length=5000)  # page ids, the playoff result
    compact: bool = False


@router.get("/albums")
def albums():
    """Every listened album that has an "Alex Top" rank; the playoffs and the preview run on these."""
    _need()
    return {
        "albums": [
            {"id": a.page_id, "name": a.name, "artist": a.artist, "cover": a.cover if a.has_art else None,
             "rank": a.rank, "rank_text": a.rank_text}
            for a in fetch_albums()
            if a.is_listened and a.rank is not None
        ]
    }


@router.post("/apply")
def apply(body: ApplyBody):
    """Rank from fresh Notion data with the playoff order, and write the pages whose rank changes."""
    _need()
    notion = notion_client()
    ranked = rank_listened(fetch_albums(notion), compact=body.compact, tiebreak=body.tiebreak)
    changes = [Change.of(a, rank=rank) for a, rank in ranked if rank != a.rank_text]
    log = RunLog()
    written, failed = apply_changes(notion, changes, log, dry_run=False)
    if written:
        showcase.clear_cache()  # the public wall is ordered by rank
    return {"written": written, "failed": failed, "log": log.lines}
