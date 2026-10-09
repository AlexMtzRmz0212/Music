import { useState } from "react";

function Field({ spec, value, onChange }) {
  if (spec.type === "bool") {
    return (
      <label className="check">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {spec.label}
      </label>
    );
  }
  return (
    <label className="field">
      <span>{spec.label}</span>
      {spec.type === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {spec.options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type={spec.type === "number" ? "number" : "text"}
          value={value ?? ""}
          onChange={(e) => onChange(spec.type === "number" ? Number(e.target.value) : e.target.value)}
        />
      )}
    </label>
  );
}

function Table({ rows }) {
  const cols = Object.keys(rows[0]);
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c}>{String(r[c] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Result({ data }) {
  const { rows, lyrics, ...rest } = data.result || {};
  return (
    <>
      {data.log?.length > 0 && <pre className="log">{data.log.join("\n")}</pre>}
      {Object.keys(rest).length > 0 && <pre className="json">{JSON.stringify(rest, null, 2)}</pre>}
      {rows?.length > 0 && <Table rows={rows} />}
      {lyrics && <pre className="lyrics">{lyrics}</pre>}
    </>
  );
}

export default function ToolCard({ tool, api, live }) {
  const [values, setValues] = useState(() => Object.fromEntries(tool.params.map((p) => [p.name, p.default])));
  const [running, setRunning] = useState(false);
  const [data, setData] = useState(null);

  const unconfigured = tool.missing?.length > 0;
  const realWrite = live && tool.writes && values.dry_run === false;

  const run = async () => {
    if (realWrite && !window.confirm(`"${tool.title}" will write to Notion for real. Continue?`)) return;
    setRunning(true);
    try {
      setData(await api.run(tool.id, values));
    } catch (e) {
      setData({ ok: false, error: e.message, log: [] });
    }
    setRunning(false);
  };

  return (
    <section className={`card ${unconfigured ? "off" : ""}`}>
      <h2>
        {tool.title} {tool.writes && <small className="tag">can write</small>}
      </h2>
      <p>{tool.description}</p>
      {unconfigured && <p className="error">Missing settings: {tool.missing.join(", ")}</p>}
      {tool.params.map((p) => (
        <Field key={p.name} spec={p} value={values[p.name]} onChange={(v) => setValues({ ...values, [p.name]: v })} />
      ))}
      <button onClick={run} disabled={running || unconfigured}>
        {running ? "Running…" : realWrite ? "Run (writes!)" : "Run"}
      </button>
      {data?.ok === false && <p className="error">{data.error}</p>}
      {data && <Result data={data} />}
    </section>
  );
}
