# generate access token of spotify api getting client id and secret from environment variables and then look for an album
import os
import requests
from dotenv import load_dotenv
# Load environment variables from .env file
load_dotenv()

# clean terminal
os.system('cls' if os.name == 'nt' else 'clear')
def get_access_token():
    client_id = os.getenv('SPOTIFY_CLIENT_ID')
    client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')
    if not client_id or not client_secret:
        raise ValueError("Client ID and Secret must be set in environment variables.")
    
    url = 'https://accounts.spotify.com/api/token'
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
    }
    data = {
        'grant_type': 'client_credentials',
        'client_id': client_id,
        'client_secret': client_secret,
    }
    
    response = requests.post(url, headers=headers, data=data)
    
    if response.status_code != 200:
        raise Exception(f"Failed to get access token: {response.status_code} {response.text}")
    
    return response.json()['access_token']

def search_album(album_name):
    access_token = get_access_token()
    url = 'https://api.spotify.com/v1/search'
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
    }
    params = {
        'q': album_name,
        'type': 'album',
    }
    response = requests.get(url, headers=headers, params=params)
    if response.status_code != 200:
        raise Exception(f"Failed to search album: {response.status_code} {response.text}")
    return response.json()

if __name__ == "__main__":
    album_name = input("Enter the album name to search: ")
    try:
        result = search_album(album_name)
        #print how many albums were found
        print(f"Found {result['albums']['total']} albums for '{album_name}':")
        for album in result['albums']['items']:
            print(f"- {album['name']} by {', '.join(artist['name'] for artist in album['artists'])} (ID: {album['id']})")       
    except Exception as e:
        print("Error:", e)