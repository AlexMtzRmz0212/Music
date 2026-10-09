"""Shared helpers for tools: a log collector and Notion paging."""

from typing import Callable

Log = Callable[[str], None]


class RunLog:
    """Collects log lines so a web request can return them with the result."""

    def __init__(self, echo: bool = False):
        self.lines: list[str] = []
        self.echo = echo

    def __call__(self, message: str) -> None:
        self.lines.append(str(message))
        if self.echo:
            print(message)


def fetch_all_pages(notion, db_id: str) -> list[dict]:
    """Every page of a Notion database (follows pagination)."""
    pages: list[dict] = []
    cursor = None
    while True:
        kwargs = {"database_id": db_id}
        if cursor:
            kwargs["start_cursor"] = cursor
        response = notion.databases.query(**kwargs)
        pages.extend(response["results"])
        if not response.get("has_more"):
            return pages
        cursor = response["next_cursor"]
