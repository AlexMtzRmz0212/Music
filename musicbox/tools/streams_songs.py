from datetime import datetime

import requests
from bs4 import BeautifulSoup
from notion_client import Client

from .. import config
from ..runtime import fetch_all_pages

URL = "https://en.wikipedia.org/wiki/List_of_Spotify_streaming_records"
# Wikipedia answers 403 to requests without a descriptive User-Agent
HEADERS = {"User-Agent": "MusicHub/1.0 (personal music dashboard)"}

META = {
    "id": "streams_songs",
    "order": 40,
    "title": "Most streamed songs",
    "description": "Scrapes Wikipedia's list of the most-streamed Spotify songs and fills your Notion songs table, row by row.",
    "needs": ["NOTION_SECRET", "STREAMED_SONGS_DB_ID"],
    "writes": True,
    "params": [
        {"name": "dry_run", "label": "Dry run (scrape only, don't write to Notion)", "type": "bool", "default": True},
    ],
}


def parse_date(text):
    try:
        return datetime.strptime(text, "%d %B %Y").strftime("%Y-%m-%d")
    except ValueError:
        return None


def scrape():
    soup = BeautifulSoup(requests.get(URL, headers=HEADERS, timeout=30).content, "html.parser")
    table = soup.find("table", {"class": "wikitable"})
    rows = []
    for row in table.find_all("tr")[1:]:
        cols = [c.text.strip() for c in row.find_all(["td", "th"])]
        if len(cols) >= 5:
            rows.append({"Rank": cols[0], "Song": cols[1], "Artist": cols[2], "Streams": cols[3], "Date": cols[4]})
    return rows


def run(params, log):
    log("Retrieving from " + URL)
    data = scrape()
    log(f"Retrieved {len(data)} songs")
    if params["dry_run"]:
        return {"written": 0, "rows": data[:25]}

    notion = Client(auth=config.get("NOTION_SECRET"))
    pages = fetch_all_pages(notion, config.get("STREAMED_SONGS_DB_ID"))
    written = 0
    for page, row in zip(pages, data):
        release = parse_date(row["Date"])
        if release is None:
            log(f"Could not parse date for {row['Song']}")
            continue
        try:
            notion.pages.update(
                page_id=page["id"],
                properties={
                    "Rank": {"number": int(row["Rank"])},
                    "Song": {"title": [{"text": {"content": row["Song"]}}]},
                    "Artist(s)": {"rich_text": [{"text": {"content": row["Artist"]}}]},
                    "Streams(billions)": {"number": float(row["Streams"])},
                    "Release date": {"date": {"start": release, "end": None}},
                },
            )
            written += 1
        except Exception as e:
            log(f"Error updating {row['Song']}: {e}")
    log(f"Updated {written}/{min(len(pages), len(data))} Notion rows")
    return {"written": written, "rows": data[:25]}
