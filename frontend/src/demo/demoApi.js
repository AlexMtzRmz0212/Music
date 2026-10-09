// In-memory stand-in for the tools API, used by the public demo. Same shapes as
// the real API; nothing leaves the browser and no account is touched.

const T = (id, category, title, description, writes, params) => ({ id, category, title, description, writes, params, missing: [] });
const dry = { name: "dry_run", label: "Dry run (don't write)", type: "bool", default: true };

const TOOLS = [
  T("album_stats", "Album library", "Album library stats", "Counts the albums in your Notion library: listened, rated, and missing cover art.", false, []),
  T("album_sorter", "Album library", "Album sorter", "Gives every listened album a unique zero-padded rank. Dry run shows the new ranking without touching Notion.", true,
    [{ name: "compact", label: "Compact ranks (1..N, no gaps)", type: "bool", default: false }, dry]),
  T("album_decorator", "Album library", "Album decorator", "Finds cover art on Spotify and sets it as the cover and icon of album pages in Notion.", true,
    [{ name: "limit", label: "Max albums this run (0 = all)", type: "number", default: 10 },
     { name: "update_existing", label: "Also replace existing covers", type: "bool", default: false }, dry]),
  T("streams_songs", "Charts", "Most streamed songs", "Scrapes the most-streamed Spotify songs and fills a Notion table.", true, [dry]),
  T("streams_albums", "Charts", "Most streamed albums", "Scrapes all-time Spotify album streams and fills a Notion table.", true, [dry]),
  T("spotify_search", "Lookup", "Spotify search", "Looks up albums, artists or tracks in the Spotify catalogue.", false,
    [{ name: "query", label: "Search", type: "text", default: "Twenty One Pilots" },
     { name: "kind", label: "Type", type: "select", options: ["album", "artist", "track"], default: "album" }]),
  T("setlistfm", "Lookup", "Setlist.fm search", "Recent concert setlists for an artist.", false,
    [{ name: "artist", label: "Artist", type: "text", default: "Radiohead" }]),
  T("genius_lyrics", "Lookup", "Genius lyrics", "Finds a song on Genius and shows its page and lyrics.", false,
    [{ name: "artist", label: "Artist", type: "text", default: "Eminem" }, { name: "song", label: "Song", type: "text", default: "Lose Yourself" }]),
];

const ALBUMS = [
  ["01", "OK Computer", "Radiohead"], ["02", "To Pimp a Butterfly", "Kendrick Lamar"], ["03", "Blurryface", "Twenty One Pilots"],
  ["04", "Walking On A Dream", "Empire of the Sun"], ["05", "Random Access Memories", "Daft Punk"],
].map(([rank, album, artist]) => ({ rank, album, artist }));

const RUNS = {
  album_stats: () => ({
    log: ["Read 234 albums from Notion (sample data)"],
    result: { stats: { total: 234, listened: 188, listened_and_rated: 188, listened_unrated: 0, missing_cover: 1, missing_icon: 0 }, rows: ALBUMS },
  }),
  album_sorter: (p) => ({
    log: ["Starting album sorting...", "Found 234 total albums", p.dry_run ? "Dry run: 188 listened albums would be written, nothing changed in Notion" : "Demo mode never writes"],
    result: { written: 0, rows: ALBUMS },
  }),
  album_decorator: () => ({
    log: ["Found 234 total albums", "Processing 1 albums (dry run)", "'Kid A' by Radiohead", "  would set cover icon", "Found art for 1/1 albums"],
    result: { matched: 1 },
  }),
  streams_songs: () => ({
    log: ["Retrieved 100 songs (sample data)"],
    result: { written: 0, rows: [
      { Rank: "1", Song: "Blinding Lights", Artist: "The Weeknd", Streams: "5.6", Date: "29 November 2019" },
      { Rank: "2", Song: "Shape of You", Artist: "Ed Sheeran", Streams: "4.1", Date: "6 January 2017" } ] },
  }),
  streams_albums: () => ({
    log: ["Retrieved 200 albums (sample data)"],
    result: { written: 0, rows: [
      { ArtistandTitle: "The Weeknd - After Hours", Streams: "12,000,000,000", Daily: "5,000,000" },
      { ArtistandTitle: "Ed Sheeran - ÷", Streams: "13,000,000,000", Daily: "4,000,000" } ] },
  }),
  spotify_search: (p) => ({
    log: [`3 ${p.kind}(s) for '${p.query}' (sample data)`],
    result: { rows: [1, 2, 3].map((n) => ({ name: `${p.query} #${n}`, artists: "Sample Artist", released: `20${10 + n}-01-01`, url: "https://open.spotify.com" })) },
  }),
  setlistfm: (p) => ({
    log: [`2 setlists for '${p.artist}' (sample data)`],
    result: { rows: [{ date: "01-06-2025", venue: "Sample Arena", city: "Toronto", songs: 22, opener: "Opening Song" },
                     { date: "28-05-2025", venue: "Demo Hall", city: "Montreal", songs: 20, opener: "Opening Song" }] },
  }),
  genius_lyrics: (p) => ({
    log: [`Found '${p.song}' by ${p.artist} (sample data)`],
    result: { found: true, title: p.song, artist: p.artist, url: "https://genius.com", lyrics: "(The demo doesn't fetch real lyrics.)" },
  }),
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const demoApi = {
  tools: async () => TOOLS,
  run: async (id, params) => {
    await wait(400);
    const { log, result } = RUNS[id](params);
    return { ok: true, error: null, log, result };
  },
};
