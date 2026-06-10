#Most Streamed Songs

import os

from tqdm import tqdm
import requests
from bs4 import BeautifulSoup
from notion_client import Client
from datetime import datetime

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Notion client
notion = Client(auth=os.getenv("NOTION_SECRET"))
# Notion database ID
database_id = os.getenv("SONGS_DATABASE_ID")

def parse_date(date_str):
    # This function converts a date string from 'DD Month YYYY' format to ISO 8601 'YYYY-MM-DD' format.
    try:
        # Parse the date from 'DD Month YYYY' format
        date_object = datetime.strptime(date_str, '%d %B %Y')
        # Format it to ISO 8601 'YYYY-MM-DD' format
        iso_date = date_object.strftime('%Y-%m-%d')
        return iso_date
    except ValueError as e:
        print(f"Date parsing error: {e}")
        return None
    
def get_most_streamed_songs(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    table = soup.find('table', {'class': 'wikitable'})
    rows = table.find_all('tr')
    data = []
    for row in rows[1:]:  # Skip the first row (header)
        columns = row.find_all(['td', 'th'])
        if columns and len(columns) >= 5:
            rank = columns[0].text.strip()
            song = columns[1].text.strip()
            artist = columns[2].text.strip()
            streams = columns[3].text.strip()
            date = columns[4].text.strip()
            data.append({'Rank': rank, 'Song': song, 'Artist': artist, 'Streams': streams, 'Date': date})
    return data

def get_notion_page_ids(database_id):
    response = notion.databases.query(database_id=database_id)
    return [page['id'] for page in response['results']]

def update_data_in_notion(database_id, scraped_data):
    page_ids = get_notion_page_ids(database_id)
    for page_id, data in tqdm(zip(page_ids, scraped_data), total=len(page_ids), desc="Updating Notion"):
        try:
            release_date = parse_date(data['Date'])  # Convert date from text to 'YYYY-MM-DD'

            if release_date is None:
                # Handle the case where the date could not be parsed
                print(f"Could not parse date for {data['Song']}")
                continue  # Skip this update or use a default date

            updated_data = {
                    "Rank": {
                        "number": int(data['Rank'])
                    },
                    "Song": {
                        "title": [{"text": {"content": data['Song']}}]
                    },
                    "Artist(s)": {
                        "rich_text": [{"text": {"content": data['Artist']}}]
                    },
                    "Streams(billions)": {
                        "number": float(data['Streams'])
                    },
                    "Release date": {
                    "date": {
                        "start": release_date,
                        "end": None
                        }
                    }
            }
            notion.pages.update(page_id=page_id, properties=updated_data)
        except Exception as e:
            print(f"Error updating page {page_id}: {e}")

# URL of the Wikipedia page
url = 'https://en.wikipedia.org/wiki/List_of_Spotify_streaming_records'
print("Retrieving from "+url)

# Scrape the data
scraped_data = get_most_streamed_songs(url)
print("Retrieved!")

# Update the data in Notion
update_data_in_notion(database_id, scraped_data)
