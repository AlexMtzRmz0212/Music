// Thin client for the FastAPI backend. Every route is under /api; in dev Vite
// proxies that to the Python server (see vite.config.js).

const BASE = "/api";
export const UNAUTHORIZED_EVENT = "mh-unauthorized";

async function fetchApi(path, options = {}) {
  const response = await fetch(BASE + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (!response.ok) {
    // An expired owner session: let the app drop back to the public demo.
    // Login itself answers 401 for a wrong password, which is not a session problem.
    if (response.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    const text = await response.text();
    let message = text;
    try {
      const detail = JSON.parse(text).detail;
      message = typeof detail === "string" ? detail : text;
    } catch {
      // not JSON; keep the raw text
    }
    const error = new Error(message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

export const auth = {
  me: () => fetchApi("/auth/me"),
  login: (password) => fetchApi("/auth/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => fetchApi("/auth/logout", { method: "POST" }),
};

/** Public, read-only views. No login, so a 401 never applies here. */
export const showcaseApi = {
  albums: () => fetchApi("/showcase/albums"),
};

/** Cover and title review (owner only): what needs attention, Spotify's proposal, and writing a confirmed change. */
export const coversApi = {
  queue: () => fetchApi("/covers/queue"),
  suggest: (name, artist, current) =>
    fetchApi("/covers/suggest", { method: "POST", body: JSON.stringify({ name, artist, current }) }),
  tracks: (albumId) => fetchApi(`/covers/tracks/${albumId}`),
  apply: (id, { cover, icon, title }) => fetchApi("/covers/apply", { method: "POST", body: JSON.stringify({ id, cover, icon, title }) }),
};

/** Album sorter (owner only): the ranked albums, and writing the playoff result. demo/demoApi.js has a stand-in. */
export const sorterApi = {
  albums: () => fetchApi("/sorter/albums"),
  apply: ({ tiebreak, compact }) => fetchApi("/sorter/apply", { method: "POST", body: JSON.stringify({ tiebreak, compact }) }),
};

/** The real tools (owner only). demo/demoApi.js has the same two methods. */
export const realApi = {
  tools: () => fetchApi("/tools"),
  run: (id, params) => fetchApi(`/tools/${id}/run`, { method: "POST", body: JSON.stringify({ params }) }),
};
