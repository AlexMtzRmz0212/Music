import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import os
from dotenv import load_dotenv

load_dotenv()

client_id = os.getenv('SPOTIPY_CLIENT_ID')
client_secret = os.getenv('SPOTIPY_CLIENT_SECRET')
redirect_uri = os.getenv('SPOTIPY_REDIRECT_URI')

# Set up the client credentials flow
client_credentials_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)
sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)

# Example: Search for an artist
artist_name = 'Twenty One Pilots'
results = sp.search(q='artist:' + artist_name, type='artist')

# Print artist information
if results['artists']['items']:
    artist = results['artists']['items'][0]
    print(f"Name: {artist['name']}")
    print(f"Genres: {', '.join(artist['genres'])}")
    print(f"Popularity: {artist['popularity']}")
    print(f"Followers: {artist['followers']['total']}")
    print(f"Spotify URL: {artist['external_urls']['spotify']}")
else:
    print(f"No results found for artist: {artist_name}")


# #Advanced Usage #IDEA

# # Create a new playlist
# user_id = sp.current_user()['id']
# playlist = sp.user_playlist_create(user=user_id, name='My New Playlist', public=True)
# print(f"Created Playlist: {playlist['name']}")

# # Add tracks to the playlist
# track_ids = ['spotify:track:4iV5W9uYEdYUVa79Axb7Rh', 'spotify:track:1301WleyT98MSxVHPZCA6M']  # Example track IDs
# sp.playlist_add_items(playlist_id=playlist['id'], items=track_ids)
# print(f"Added tracks to Playlist: {playlist['name']}")


###Example Code to Get Album Popularity #IDEA

# # Example: Get album information by album ID
# album_id = '4aawyAB9vmqN3uQ7FjRGTy'  # Example album ID for "Scorpion" by Drake
# album = sp.album(album_id)

# # Print album information
# print(f"Album: {album['name']}")
# print(f"Artist: {album['artists'][0]['name']}")
# print(f"Release Date: {album['release_date']}")
# print(f"Popularity: {album['popularity']}")  # Popularity score from 0 to 100


#Example Code to Get Track Popularity #IDEA
# import spotipy
# from spotipy.oauth2 import SpotifyClientCredentials

# # Replace with your own credentials
# client_id = 'your_client_id'
# client_secret = 'your_client_secret'

# # Set up the client credentials flow
# client_credentials_manager = SpotifyClientCredentials(client_id=client_id, client_secret=client_secret)
# sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)

# # Example: Get album information by album ID
# album_id = '4aawyAB9vmqN3uQ7FjRGTy'  # Example album ID for "Scorpion" by Drake
# album_tracks = sp.album_tracks(album_id)

# # Print track popularity
# for track in album_tracks['items']:
#     track_info = sp.track(track['id'])
#     print(f"Track: {track_info['name']}, Popularity: {track_info['popularity']}")


#IDEA
# The Spotify Web API does not provide direct access to the number of streams for an album or track. 
# The API focuses on providing metadata, user information, and playlist management capabilities, 
# but streaming statistics like play counts are not publicly available through the API 
# due to privacy and data sensitivity reasons.

# Available Information
# While you can't get the exact number of streams, you can access some related information that might be useful:

# Popularity: Each track and album has a popularity score, which is a value from 0 to 100. 
# This score is based on the number of streams but is not a direct count.
# 
# Follower Count: For artists, you can get the number of followers, which might indirectly indicate popularity.
# 
# Top Tracks and Albums: You can get the most popular tracks for an artist, 
# but again, these are ranked by popularity score rather than actual stream counts.