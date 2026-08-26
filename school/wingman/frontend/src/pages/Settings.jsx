import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useOutlookConnection } from "../hooks/useOutlookConnection.js";
import CanvasSetup from "../components/CanvasSetup.jsx";

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savedMsg, setSavedMsg] = useState(null);
  const { status: outlookStatus, loginStarted: outlookLoginStarted, checking: outlookChecking, login: loginOutlook, checkNow: checkOutlookConnection } = useOutlookConnection();
  const [canvasBaseUrl, setCanvasBaseUrl] = useState("");
  const [canvasToken, setCanvasToken] = useState("");
  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ label: "", url: "" });

  function refresh() {
    api.get("/settings").then(setSettings).catch(() => {});
    api.get("/settings/quick-links").then(setLinks).catch(() => {});
  }

  useEffect(refresh, []);

  useEffect(() => {
    if (settings) setCanvasBaseUrl(settings.canvas_base_url || "https://utk.instructure.com");
  }, [settings]);

  async function saveApiKey(e) {
    e.preventDefault();
    await api.put("/settings", { anthropic_api_key: apiKeyInput });
    setApiKeyInput("");
    setSavedMsg("Anthropic API key saved.");
    refresh();
  }

  async function disconnectOutlook() {
    await api.post("/outlook/disconnect", {});
    checkOutlookConnection();
  }

  async function saveCanvas(e) {
    e.preventDefault();
    await api.put("/settings", { canvas_base_url: canvasBaseUrl, canvas_token: canvasToken });
    setCanvasToken("");
    setSavedMsg("Canvas settings saved.");
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
              {outlookStatus?.connected ? "Connected" : "Not connected"}
            </span>
          </div>
          {outlookStatus?.connected ? (
            <>
              <p>Wingman is reading this account's inbox for the dashboard's mail widget.</p>
              <button className="btn secondary" onClick={disconnectOutlook}>
                Disconnect
              </button>
            </>
          ) : (
            <ol className="step-list">
              <li>Forward your UTK mail to a personal Outlook.com/Hotmail account (one-time, done in UTK's Outlook web).</li>
              <li className={outlookLoginStarted ? "step-active" : ""}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {!outlookLoginStarted ? (
                    <button className="btn" onClick={loginOutlook}>
                      Log in with Outlook
                    </button>
                  ) : (
                    <>
                      <span>{outlookChecking ? "Waiting for you to sign in…" : "Still not connected."}</span>
                      <button className="btn secondary" onClick={checkOutlookConnection}>
                        Check now
                      </button>
                    </>
                  )}
                </div>
                {outlookLoginStarted && (
                  <p>Sign in in the window that opened (including any two-factor prompt) — Wingman never sees your password.</p>
                )}
              </li>
              <li>We'll detect the connection automatically once you're signed in.</li>
            </ol>
          )}
          {!outlookStatus?.connected && (
            <p className="meta" style={{ marginTop: 8 }}>
              Tip: turn off Focused Inbox in that personal account (View → Focused Inbox) so nothing gets missed.
            </p>
          )}
        </div>

        <div className="card">
          <div className="section-title">
            <h3>Canvas</h3>
            <span className={`badge ${settings.canvas_token_set ? "ok" : "warn"}`}>
              {settings.canvas_token_set ? "Configured" : "Not set"}
            </span>
          </div>
          <p>
            Generate a token in Canvas: Account → Settings → "+ New Access Token" — no admin
            approval needed. Used to import assignments and exam dates.
          </p>
          <form onSubmit={saveCanvas} className="form-grid">
            <div>
              <label>Base URL</label>
              <input type="text" value={canvasBaseUrl} onChange={(e) => setCanvasBaseUrl(e.target.value)} />
            </div>
            <div>
              <label>Access token</label>
              <input
                type="password"
                placeholder="1234~..."
                value={canvasToken}
                onChange={(e) => setCanvasToken(e.target.value)}
              />
            </div>
            <div style={{ alignSelf: "end" }}>
              <button className="btn" type="submit">
                Save
              </button>
            </div>
          </form>
          {settings.canvas_token_set && <CanvasSetup />}
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
