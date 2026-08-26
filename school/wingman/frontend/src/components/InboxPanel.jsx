import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useScraperConnection } from "../hooks/useScraperConnection.js";

export default function InboxPanel() {
  const { status, loginStarted, checking, login } = useScraperConnection("/outlook");
  const [emails, setEmails] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status?.connected) {
      setError(null);
      api.get("/outlook/emails?count=6").then(setEmails).catch((err) => setError(err.message));
    }
  }, [status]);

  if (!status) return null;

  if (!status.connected) {
    return (
      <div className="empty-state">
        <p>Connect your Outlook account to see unread mail without leaving Wingman.</p>
        {!loginStarted && (
          <button className="btn" onClick={login}>
            Log in to Outlook
          </button>
        )}
        {loginStarted && (
          <p>
            {checking ? "Waiting for you to sign in…" : "Still not connected."} Finish signing in in the
            window that opened, or head to <Link to="/settings">Settings</Link> for more options.
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return <div className="empty-state">{error}</div>;
  }

  if (!emails.length) return <div className="empty-state">Inbox zero. Go you.</div>;

  return (
    <div>
      {emails.map((e) => (
        <a className="email-row" key={e.id} href={e.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
          {!e.isRead ? <span className="unread-dot" /> : <span style={{ width: 7 }} />}
          <div>
            <div className="from">{e.from}</div>
            <div className="meta" style={{ color: "var(--text-muted)" }}>
              {e.subject || "(no subject)"} · {e.receivedAt}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
