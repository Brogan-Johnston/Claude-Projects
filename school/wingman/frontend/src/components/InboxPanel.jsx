import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { fmtDateTime } from "../utils/format.js";

export default function InboxPanel() {
  const [status, setStatus] = useState(null);
  const [emails, setEmails] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/outlook/status").then(setStatus).catch(() => setStatus({ configured: false, connected: false }));
  }, []);

  useEffect(() => {
    if (status?.connected) {
      api.get("/outlook/emails?count=6").then(setEmails).catch((err) => setError(err.message));
    }
  }, [status]);

  if (!status) return null;

  if (!status.configured) {
    return (
      <div className="empty-state">
        Outlook isn't set up yet. Add your Microsoft app credentials in <Link to="/settings">Settings</Link> to see
        your inbox here.
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="empty-state">
        <p>Connect your Outlook account to see unread mail without leaving Wingman.</p>
        <a className="btn" href="/api/outlook/login">
          Connect Outlook
        </a>
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
              {e.subject || "(no subject)"} · {fmtDateTime(e.receivedAt)}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
