"""Shared helpers for tools: a log collector and Notion paging/retry."""

import time
from typing import Callable, Optional, TypeVar

from notion_client.errors import HTTPResponseError, RequestTimeoutError

Log = Callable[[str], None]
T = TypeVar("T")

RETRY_STATUSES = {429, 500, 502, 503, 504}


class RunLog:
    """Collects log lines so a web request can return them with the result."""

    def __init__(self, echo: bool = False):
        self.lines: list[str] = []
        self.echo = echo

    def __call__(self, message: str) -> None:
        self.lines.append(str(message))
        if self.echo:
            print(message)


def with_retry(call: Callable[[], T], attempts: int = 4) -> T:
    """Run a Notion call, backing off on rate limits (429), server errors and timeouts."""
    for attempt in range(attempts):
        try:
            return call()
        except (HTTPResponseError, RequestTimeoutError) as e:
            status = getattr(e, "status", None)
            retryable = isinstance(e, RequestTimeoutError) or status in RETRY_STATUSES
            if not retryable or attempt == attempts - 1:
                raise
            wait = 2**attempt
            retry_after = getattr(e, "headers", {}).get("Retry-After") if hasattr(e, "headers") else None
            if retry_after and retry_after.isdigit():
                wait = int(retry_after)
            time.sleep(min(wait, 10))
    raise AssertionError("unreachable")


def fetch_all_pages(notion, db_id: str, filter_properties: Optional[list[str]] = None) -> list[dict]:
    """Every page of a Notion database (follows pagination).

    `filter_properties` limits the payload to those property ids/names (the title is always kept).
    """
    pages: list[dict] = []
    cursor = None
    while True:
        kwargs: dict = {"database_id": db_id, "page_size": 100}
        if cursor:
            kwargs["start_cursor"] = cursor
        if filter_properties:
            kwargs["filter_properties"] = filter_properties
        response = with_retry(lambda: notion.databases.query(**kwargs))
        pages.extend(response["results"])
        if not response.get("has_more"):
            return pages
        cursor = response["next_cursor"]
