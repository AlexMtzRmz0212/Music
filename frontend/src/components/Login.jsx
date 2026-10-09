import { useState } from "react";
import { auth } from "../api";

export default function Login({ message, onClose, onDone }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(message || "");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await auth.login(password);
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Owner sign-in</h2>
        <input type="password" autoFocus placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button disabled={busy || !password}>Sign in</button>
        </div>
      </form>
    </div>
  );
}
