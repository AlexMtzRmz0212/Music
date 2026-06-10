import requests
from dotenv import load_dotenv
import os

load_dotenv()

headers = {
    "Accept": "application/json",
    "x-api-key": os.getenv("API_KEY")
}

response = requests.get(
    "https://api.setlist.fm/rest/1.0/search/setlists",
    headers=headers,
    params={"artistName": "Radiohead", "p": 1}
)

print(response.json())
