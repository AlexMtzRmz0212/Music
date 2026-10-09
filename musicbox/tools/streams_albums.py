import requests
from bs4 import BeautifulSoup
from notion_client import Client

from .. import config
from ..runtime import fetch_all_pages

URL = "https://kworb.net/spotify/albums.html"

META = {
    "id": "streams_albums",
    "category": "Charts",
    "order": 50,
    "title": "Most streamed albums",
    "description": "Scrapes kworb.net's all-time Spotify album streams and fills your Notion albums table, row by row.",
    "needs": ["NOTION_SECRET", "STREAMED_ALBUMS_DB_ID"],
    "writes": True,
    "params": [
        {"name": "dry_run", "label": "Dry run (scrape only, don't write to Notion)", "type": "bool", "default": True},
    ],
}


def scrape():
    soup = BeautifulSoup(requests.get(URL, timeout=30).content, "html.parser")  # bytes: let bs4 read the page charset
    table = soup.find("table", {"class": "addpos sortable"})
    rows = []
    for row in table.find_all("tr")[1:]:
        cols = [c.text.strip() for c in row.find_all(["td", "th"])]
        if len(cols) >= 3:
            rows.append({"ArtistandTitle": cols[0], "Streams": cols[1], "Daily": cols[2]})
    return rows


def run(params, log):
    log("Retrieving from " + URL)
    data = scrape()
    log(f"Retrieved {len(data)} albums")
    if params["dry_run"]:
        return {"written": 0, "rows": data[:25]}

    notion = Client(auth=config.get("NOTION_SECRET"))
    pages = fetch_all_pages(notion, config.get("STREAMED_ALBUMS_DB_ID"))
    written = 0
    for page, row in zip(pages, data):
        try:
            notion.pages.update(
                page_id=page["id"],
                properties={
                    "ArtistandTitle": {"title": [{"text": {"content": row["ArtistandTitle"]}}]},
                    "Streams": {"number": float(row["Streams"].replace(",", ""))},
                    "Daily": {"number": float(row["Daily"].replace(",", ""))},
                },
            )
            written += 1
        except Exception as e:
            log(f"Error updating {row['ArtistandTitle']}: {e}")
    log(f"Updated {written}/{min(len(pages), len(data))} Notion rows")
    return {"written": written, "rows": data[:25]}
