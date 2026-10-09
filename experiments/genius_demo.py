import lyricsgenius

# Replace 'your_access_token' with your actual access token from the Genius API
genius = lyricsgenius.Genius("your_access_token")

# Search for songs by a specific artist
artist = genius.search_artist("Eminem", max_songs=3)

# Print information about the artist
print(artist)

# Print the lyrics of the first song
print(artist.songs[0].lyrics)
