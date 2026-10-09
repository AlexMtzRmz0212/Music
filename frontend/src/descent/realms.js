// The world of the Hall, top to bottom. This is the one place to change it: rename a realm, move a boundary
// (`share` is the slice of the ranked list, top first; the ranked shares add up to 1), recolour it, or add one.
// `color` is the realm's own colour; the page fades from one realm's colour into the next. `tone` says whether
// text on it is dark ("light" realm) or light ("dark" realm). `altitude` is where the realm starts, in metres,
// for the altitude rail: Olympus is really 2,917 m high, and the shore of the Styx is sea level.

export const AETHER = { id: "aether", name: "The Aether", color: "#BFD9EA", tone: "light", altitude: 3600 };

export const REALMS = [
  {
    id: "olympus",
    name: "Mount Olympus",
    line: "Where the gods live.",
    share: 0.05,
    min: 3, // the summit always has a few gods
    color: "#EED9A0",
    tone: "light",
    altitude: 2917,
    plaques: true,
  },
  { id: "heights", name: "The Heights", line: "Above the clouds.", share: 0.15, color: "#9CC3DD", tone: "light", altitude: 2000 },
  { id: "hellas", name: "Hellas", line: "The world of mortals.", share: 0.3, color: "#8DBFB0", tone: "light", altitude: 600 },
  {
    id: "styx",
    name: "Banks of the Styx",
    line: "Not listened to yet. Waiting for Charon.",
    unranked: true, // albums without a rank wait here
    color: "#2F4A57",
    tone: "dark",
    altitude: 0,
  },
  { id: "asphodel", name: "Asphodel Meadows", line: "Where most shades wander.", share: 0.3, color: "#3B3550", tone: "dark", altitude: -300 },
  { id: "hades", name: "House of Hades", line: "The deepest hall, warm as a forge.", share: 0.2, color: "#2A1416", tone: "dark", altitude: -1200 },
];

export const DEPTHS = { id: "depths", name: "The far shore", color: "#120A0B", tone: "dark", altitude: -2500 };

// With all six pomegranate seeds found, spring comes to the underworld.
export const SPRING = { asphodel: "#33463A", hades: "#3A2318" };

/** Every stop in order, for the rail and the keys: the sky, the realms, the far shore. */
export const STOPS = [AETHER, ...REALMS, DEPTHS];
