import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UNAUTHORIZED_EVENT, auth, coversApi, realApi } from "./api";
import { hydrate, loadFindings, loadRejected, saveFindings, saveRejected } from "./coverState";
import { scanLibrary } from "./coverScan";
import { demoApi } from "./demo/demoApi";
import CoverReview from "./components/CoverReview";
import Login from "./components/Login";
import Showcase from "./components/Showcase";
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

// The showcase is public and always first. "Cover art" is owner-only and exists only while some album
// needs a cover or title correction; the other tabs are the tool categories.
const SHOWCASE = "Showcase";
const COVERS = "Cover art";
const TAB = "mh-tab";
function savedTab() {
  try {
    return localStorage.getItem(TAB) || SHOWCASE;
  } catch {
    return SHOWCASE;
  }
}

export default function App() {
  const [phase, setPhase] = useState(() => (hint() ? "checking" : "public")); // checking | public | owner
  const [authRequired, setAuthRequired] = useState(true); // false only in password-less local dev
  const [login, setLogin] = useState(null); // null, or { message? } while the dialog is open
  const [tools, setTools] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(savedTab);
  const [covers, setCovers] = useState(null); // owner only: { issues, albums, can_suggest }
  const [findings, setFindings] = useState(loadFindings); // what the last scan found
  const [rejected, setRejected] = useState(loadRejected); // albums whose correction I swiped away
  const [scan, setScan] = useState(null); // { done, total } while scanning
  const [scanNote, setScanNote] = useState(null);
  const scanCtl = useRef(null);

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

  useEffect(() => {
    setCovers(null);
    if (phase !== "owner") return;
    coversApi.queue().then(setCovers).catch(() => setCovers(null)); // no Notion access: no tab
  }, [phase]);
  // an applied change: forget the issue and the finding, and update our copy of the album
  const resolveCover = useCallback((id, applied) => {
    setCovers((c) =>
      c && {
        ...c,
        issues: c.issues.filter((i) => i.id !== id),
        albums: c.albums.map((a) =>
          a.id !== id ? a : { ...a, current: applied.cover || a.current, name: applied.title || a.name, has_icon: a.has_icon || Boolean(applied.icon) },
        ),
      },
    );
    setFindings((f) => {
      const kept = f.filter((x) => x.id !== id);
      saveFindings(kept);
      return kept;
    });
  }, []);
  const rejectCover = useCallback((id) => {
    setRejected((r) => {
      const next = new Set(r).add(id);
      saveRejected(next);
      return next;
    });
  }, []);
  const bringBackRejected = () => {
    setRejected(new Set());
    saveRejected(new Set());
  };

  const reviewItems = useMemo(() => {
    if (!covers) return [];
    const inQueue = new Set(covers.issues.map((i) => i.id));
    return [...covers.issues, ...hydrate(findings, covers.albums).filter((i) => !inQueue.has(i.id))];
  }, [covers, findings]);
  const pending = reviewItems.filter((i) => !rejected.has(i.id)).length;

  const storeFindings = (list) => {
    setFindings(list);
    saveFindings(list);
  };
  const startScan = async () => {
    if (scan || !covers) return;
    const ctl = new AbortController();
    scanCtl.current = ctl;
    setScanNote(null);
    setScan({ done: 0, total: 0 });
    const exclude = new Set([...covers.issues.map((i) => i.id), ...rejected]);
    try {
      const result = await scanLibrary(covers.albums, {
        exclude,
        signal: ctl.signal,
        onProgress: (done, total) => setScan({ done, total }),
      });
      const fresh = new Set(result.findings.map((f) => f.id));
      storeFindings([...findings.filter((f) => !fresh.has(f.id)), ...result.findings]);
      setScanNote({ ...result, stopped: ctl.signal.aborted });
    } finally {
      setScan(null);
    }
  };

  const categories = [...new Set((tools || []).map((t) => t.category || "Other"))];
  // the tab stays while you are on it, so finishing the last card doesn't throw you off the page
  const showCovers = Boolean(covers) && (reviewItems.length > 0 || tab === COVERS);
  const activeTab = [SHOWCASE, "All"].includes(tab) || categories.includes(tab) || (tab === COVERS && showCovers) ? tab : SHOWCASE;
  const onShowcase = activeTab === SHOWCASE;
  const onCovers = activeTab === COVERS;
  const onTools = !onShowcase && !onCovers;
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
        <span className={`badge ${phase === "owner" ? "live" : ""}`}>{phase === "owner" ? "Live" : "Public view"}</span>
        <span className="spacer" />
        {phase === "owner" ? (
          <>
            {covers?.can_suggest && (
              <button
                className="ghost"
                onClick={startScan}
                disabled={Boolean(scan)}
                title="Check every album's cover and title against Spotify"
              >
                Scan library
              </button>
            )}
            <button
              className="ghost"
              onClick={signOut}
              title={authRequired ? "End the owner session" : "Login is off locally (no OWNER_PASSWORD); this goes back to the demo"}
            >
              {authRequired ? "Log out" : "Back to demo"}
            </button>
          </>
        ) : (
          <button className="ghost" onClick={openOwner} title="Owner sign-in" aria-label="Owner sign-in">
            🔒
          </button>
        )}
      </header>

      {phase === "owner" && (scan || scanNote) && (
        <div className="scan-banner" role="status">
          {scan ? (
            <>
              <span>
                Checking albums against Spotify… {scan.done} of {scan.total}
              </span>
              <progress value={scan.done} max={scan.total || 1} />
              <button className="ghost" onClick={() => scanCtl.current?.abort()}>
                Stop
              </button>
            </>
          ) : (
            <>
              <span>
                {scanNote.stopped ? "Scan stopped. " : "Scan finished. "}
                {scanNote.findings.length > 0
                  ? `${scanNote.findings.length} album${scanNote.findings.length === 1 ? "" : "s"} to review in the Cover art tab. `
                  : "Nothing new to correct. "}
                {scanNote.failed > 0 && `${scanNote.failed} couldn't be checked (Spotify didn't answer).`}
              </span>
              <button className="ghost" onClick={() => setScanNote(null)}>
                Dismiss
              </button>
            </>
          )}
        </div>
      )}

      {phase === "public" && onTools && (
        <p className="note">
          A hub that runs my music tools: Notion album library, Spotify, streaming charts, setlists and lyrics. These tools
          run on sample data here; press Run on any of them. The lock opens the real thing (owner only).
        </p>
      )}
      {error && onTools && <p className="error">{error}</p>}
      {!tools && !error && onTools && <p className="note">Loading…</p>}

      {phase !== "checking" && (
        <nav className="tabs">
          {[SHOWCASE, ...(showCovers ? [COVERS] : []), "All", ...categories].map((name) => (
            <button key={name} className={`tab ${name === activeTab ? "active" : ""}`} onClick={() => pickTab(name)}>
              {name}
              {name === COVERS && pending > 0 ? ` (${pending})` : ""}
            </button>
          ))}
        </nav>
      )}

      {/* the showcase and every card stay mounted (just hidden) so state survives switching tabs */}
      {phase !== "checking" && <Showcase hidden={!onShowcase} />}
      {onCovers && (
        <CoverReview
          items={reviewItems}
          canSuggest={covers.can_suggest}
          rejected={rejected}
          onReject={rejectCover}
          onBringBack={bringBackRejected}
          onResolved={resolveCover}
        />
      )}
      <main className="grid">
        {tools?.map((tool) => (
          <ToolCard
            key={`${phase}-${tool.id}`}
            tool={tool}
            api={api}
            live={phase === "owner"}
            hidden={!onTools || (activeTab !== "All" && (tool.category || "Other") !== activeTab)}
          />
        ))}
      </main>

      {login && <Login message={login.message} onClose={() => setLogin(null)} onDone={() => enter(true)} />}
    </div>
  );
}
