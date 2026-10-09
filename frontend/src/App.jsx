import { useCallback, useEffect, useState } from "react";
import { UNAUTHORIZED_EVENT, auth, realApi } from "./api";
import { demoApi } from "./demo/demoApi";
import Login from "./components/Login";
import ToolCard from "./components/ToolCard";

// Everyone sees the demo. The real tools are behind the owner login; this flag
// only says "this browser signed in before", so visitors never poll the server.
const HINT = "mh-owner";
function hint(on) {
  try {
    if (on === undefined) return localStorage.getItem(HINT) === "1";
    if (on) localStorage.setItem(HINT, "1");
    else localStorage.removeItem(HINT);
  } catch {
    // storage blocked: the owner just signs in again next visit
  }
  return false;
}

const TAB = "mh-tab";
function savedTab() {
  try {
    return localStorage.getItem(TAB) || "All";
  } catch {
    return "All";
  }
}

export default function App() {
  const [phase, setPhase] = useState(() => (hint() ? "checking" : "public")); // checking | public | owner
  const [authRequired, setAuthRequired] = useState(true); // false only in password-less local dev
  const [login, setLogin] = useState(null); // null, or { message? } while the dialog is open
  const [tools, setTools] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(savedTab);

  const enter = useCallback((required) => {
    setAuthRequired(required);
    hint(true);
    setLogin(null);
    setPhase("owner");
  }, []);

  useEffect(() => {
    if (phase !== "checking") return;
    auth
      .me()
      .then(({ authenticated, required }) => {
        if (authenticated) return enter(required);
        hint(false);
        setPhase("public");
      })
      .catch(() => setPhase("public"));
  }, [phase, enter]);

  useEffect(() => {
    const onExpired = () => {
      hint(false);
      setPhase("public");
      setLogin({ message: "Your session ended. Sign in again." });
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onExpired);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onExpired);
  }, []);

  const api = phase === "owner" ? realApi : demoApi;
  useEffect(() => {
    if (phase === "checking") return;
    setTools(null);
    setError("");
    api.tools().then(setTools).catch((e) => setError(e.message));
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = [...new Set((tools || []).map((t) => t.category || "Other"))];
  const activeTab = tab === "All" || categories.includes(tab) ? tab : "All";
  const pickTab = (name) => {
    setTab(name);
    try {
      localStorage.setItem(TAB, name);
    } catch {
      // storage blocked: the tab just resets next visit
    }
  };

  const openOwner = async () => {
    try {
      const me = await auth.me();
      if (me.authenticated) return enter(me.required);
      setLogin({});
    } catch {
      setLogin({ message: "Couldn't reach the API. If you're running locally, start it with DEV.bat." });
    }
  };

  const signOut = async () => {
    try {
      await auth.logout();
    } catch {
      // the cookie may already be gone
    }
    hint(false);
    setPhase("public");
  };

  return (
    <div className="app">
      <header>
        <h1>🎵 Music Hub</h1>
        <span className={`badge ${phase === "owner" ? "live" : ""}`}>{phase === "owner" ? "Live" : "Demo · sample data"}</span>
        <span className="spacer" />
        {phase === "owner" ? (
          <button
            className="ghost"
            onClick={signOut}
            title={authRequired ? "End the owner session" : "Login is off locally (no OWNER_PASSWORD); this goes back to the demo"}
          >
            {authRequired ? "Log out" : "Back to demo"}
          </button>
        ) : (
          <button className="ghost" onClick={openOwner} title="Owner sign-in" aria-label="Owner sign-in">
            🔒
          </button>
        )}
      </header>

      {phase === "public" && (
        <p className="note">
          A hub that runs my music tools: Notion album library, Spotify, streaming charts, setlists and lyrics. This is a
          demo on sample data; press Run on any tool. The lock opens the real thing (owner only).
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {!tools && !error && <p className="note">Loading…</p>}

      {tools && (
        <nav className="tabs">
          {["All", ...categories].map((name) => (
            <button key={name} className={`tab ${name === activeTab ? "active" : ""}`} onClick={() => pickTab(name)}>
              {name}
            </button>
          ))}
        </nav>
      )}

      {/* every card stays mounted (just hidden) so a tool's output survives switching tabs */}
      <main className="grid">
        {tools?.map((tool) => (
          <ToolCard
            key={`${phase}-${tool.id}`}
            tool={tool}
            api={api}
            live={phase === "owner"}
            hidden={activeTab !== "All" && (tool.category || "Other") !== activeTab}
          />
        ))}
      </main>

      {login && <Login message={login.message} onClose={() => setLogin(null)} onDone={() => enter(true)} />}
    </div>
  );
}
