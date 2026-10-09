import { useEffect, useRef, useState } from "react";
import { auth } from "../api";

export default function Login({ message, onClose, onDone }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(message || "");
  const [busy, setBusy] = useState(false);
  const dialog = useRef(null);
  const input = useRef(null);

  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError("Enter the owner password.");
      input.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await auth.login(password);
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
      input.current?.focus();
    }
  };

  return (
    // Esc, Cancel and a click on the backdrop all close it
    <dialog
      ref={dialog}
      className="login plaque"
      aria-labelledby="login-title"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current.close()}
    >
      <form onSubmit={submit}>
        <h2 id="login-title">Owner sign-in</h2>
        <label className="field">
          <span>Password</span>
          <input
            ref={input}
            type="password"
            name="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? "login-error" : undefined}
          />
        </label>
        {error && (
          <p className="error" id="login-error" role="alert">
            {error}
          </p>
        )}
        <div className="row">
          <button type="button" className="ghost" onClick={() => dialog.current.close()}>
            Cancel
          </button>
          <button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </div>
      </form>
    </dialog>
  );
}
