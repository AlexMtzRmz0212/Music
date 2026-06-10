#Most Streamed Albums

from tqdm import tqdm
import requests
from bs4 import BeautifulSoup
from notion_client import Client
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Notion client
notion = Client(auth=os.getenv("NOTION_SECRET"))
# Notion database ID
database_id = os.getenv("ALBUM_DATABASE_ID")
    
def get_most_streamed_songs(url):
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    table = soup.find('table', {'class': 'addpos sortable'})
    rows = table.find_all('tr')
    data = []
    for row in rows[1:]:  # Skip the first row (header)
        columns = row.find_all(['td', 'th'])
        if columns and len(columns) >= 3:
            ArtistandTitle = columns[0].text.strip()
            Streams = columns[1].text.strip()
            Daily = columns[2].text.strip()
            data.append({'ArtistandTitle': ArtistandTitle, 'Streams': Streams,'Daily': Daily})
    return data

def get_notion_page_ids(database_id):
    response = notion.databases.query(database_id=database_id)
    return [page['id'] for page in response['results']]

def update_data_in_notion(database_id, scraped_data):
    page_ids = get_notion_page_ids(database_id)
    for page_id, data in tqdm(zip(page_ids, scraped_data), total=len(page_ids), desc="Updating Notion"):
        try:
            updated_data = {
                    "ArtistandTitle": {
                        "title": [{"text": {"content": data['ArtistandTitle']}}]
                    },
                    "Streams": {
                        "number": float(data['Streams'].replace(',', ''))
                    },
                    "Daily": {
                        "number": float(data['Daily'].replace(',', ''))
                    }
            }
            notion.pages.update(page_id=page_id, properties=updated_data)
        except Exception as e:
            print(f"Error updating page {page_id}: {e}")

# URL of the page
url = 'https://kworb.net/spotify/albums.html'
print("Retrieving from "+url)

# Scrape the data
scraped_data = get_most_streamed_songs(url)
#print(scraped_data)
print("Retrieved!")

# Update the data in Notion
update_data_in_notion(database_id, scraped_data)
