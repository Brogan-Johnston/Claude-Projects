import { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function QuickLinks() {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    api.get("/settings/quick-links").then(setLinks).catch(() => setLinks([]));
  }, []);

  if (!links.length) return null;

  return (
    <div className="quick-links">
      {links.map((l) => (
        <a key={l.id} className="quick-link-chip" href={l.url} target="_blank" rel="noreferrer">
          {l.label} ↗
        </a>
      ))}
    </div>
  );
}
