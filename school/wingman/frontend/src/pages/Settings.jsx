import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savedMsg, setSavedMsg] = useState(null);
  const [outlookStatus, setOutlookStatus] = useState(null);
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ label: "", url: "" });

  function refresh() {
    api.get("/settings").then(setSettings).catch(() => {});
    api.get("/outlook/status").then(setOutlookStatus).catch(() => {});
    api.get("/settings/quick-links").then(setLinks).catch(() => {});
  }

  useEffect(() => {
    refresh();
    const params = new URLSearchParams(window.location.search);
    if (params.get("outlook") === "connected") {
      setSavedMsg("Outlook connected!");
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  async function saveApiKey(e) {
    e.preventDefault();
    await api.put("/settings", { anthropic_api_key: apiKeyInput });
    setApiKeyInput("");
    setSavedMsg("Anthropic API key saved.");
    refresh();
  }

  async function disconnectOutlook() {
    await api.post("/outlook/disconnect", {});
    refresh();
  }

  async function addLink(e) {
    e.preventDefault();
    if (!newLink.label || !newLink.url) return;
    await api.post("/settings/quick-links", newLink);
    setNewLink({ label: "", url: "" });
    refresh();
  }

  async function removeLink(id) {
    await api.del(`/settings/quick-links/${id}`);
    refresh();
  }

  if (!settings) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Connect your accounts and tune how Wingman works for you.</p>
        </div>
      </div>

      {savedMsg && (
        <div className="card" style={{ marginBottom: 16, borderColor: "var(--sage)" }}>
          {savedMsg}
        </div>
      )}

      <div className="stack">
        <div className="card">
          <div className="section-title">
            <h3>Anthropic API key</h3>
            <span className={`badge ${settings.anthropic_api_key_set ? "ok" : "warn"}`}>
              {settings.anthropic_api_key_set ? "Configured" : "Not set"}
            </span>
          </div>
          <p>Needed for syllabus import. Get a key at console.anthropic.com/settings/keys.</p>
          <form onSubmit={saveApiKey} style={{ display: "flex", gap: 8 }}>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
            />
            <button className="btn" type="submit" disabled={!apiKeyInput}>
              Save
            </button>
          </form>
        </div>

        <div className="card">
          <div className="section-title">
            <h3>Outlook</h3>
            <span className={`badge ${outlookStatus?.connected ? "ok" : "warn"}`}>
              {outlookStatus?.connected ? "Connected" : outlookStatus?.configured ? "Not connected" : "Not configured"}
            </span>
          </div>
          {!outlookStatus?.configured && (
            <p>
              Add <code>MS_CLIENT_ID</code> and <code>MS_CLIENT_SECRET</code> to <code>backend/.env</code> first — see
              the comments in <code>backend/.env.example</code> for the Azure app registration steps.
            </p>
          )}
          {outlookStatus?.configured && !outlookStatus?.connected && (
            <a className="btn" href="/api/outlook/login">
              Connect Outlook
            </a>
          )}
          {outlookStatus?.connected && (
            <button className="btn secondary" onClick={disconnectOutlook}>
              Disconnect
            </button>
          )}
        </div>

        <div className="card">
          <div className="section-title">
            <h3>Quick links</h3>
          </div>
          {links.map((l) => (
            <div className="assignment-row" key={l.id}>
              <div className="title">{l.label}</div>
              <div className="meta">{l.url}</div>
              <div className="spacer" />
              <button className="btn subtle" onClick={() => removeLink(l.id)}>
                Remove
              </button>
            </div>
          ))}
          <form onSubmit={addLink} className="form-grid" style={{ marginTop: 12 }}>
            <div>
              <label>Label</label>
              <input type="text" value={newLink.label} onChange={(e) => setNewLink({ ...newLink, label: e.target.value })} />
            </div>
            <div>
              <label>URL</label>
              <input type="text" value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} />
            </div>
            <div style={{ alignSelf: "end" }}>
              <button className="btn" type="submit">
                Add link
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
