import { ConfidentialClientApplication } from "@azure/msal-node";
import db from "../db/index.js";

const SCOPES = ["User.Read", "Mail.Read", "offline_access"];

function config() {
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const tenantId = process.env.MS_TENANT_ID || "common";
  const redirectUri = process.env.MS_REDIRECT_URI || "http://localhost:4000/api/outlook/callback";
  return { clientId, clientSecret, tenantId, redirectUri };
}

export function isConfigured() {
  const { clientId, clientSecret } = config();
  return Boolean(clientId && clientSecret);
}

function msalClient() {
  const { clientId, clientSecret, tenantId } = config();
  return new ConfidentialClientApplication({
    auth: {
      clientId,
      clientSecret,
      authority: `https://login.microsoftonline.com/${tenantId}`,
    },
  });
}

export async function getAuthUrl() {
  const { redirectUri } = config();
  const client = msalClient();
  return client.getAuthCodeUrl({ scopes: SCOPES, redirectUri });
}

export async function handleCallback(code) {
  const { redirectUri } = config();
  const client = msalClient();
  const result = await client.acquireTokenByCode({ code, scopes: SCOPES, redirectUri });
  saveTokens(result);
  return result;
}

function saveTokens(result) {
  const payload = {
    accessToken: result.accessToken,
    account: result.account,
    expiresOn: result.expiresOn,
  };
  db.prepare("INSERT INTO settings (key, value) VALUES ('outlook_account', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(
    JSON.stringify(payload)
  );
}

function loadAccount() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'outlook_account'").get();
  return row ? JSON.parse(row.value) : null;
}

export function isConnected() {
  return Boolean(loadAccount());
}

export function disconnect() {
  db.prepare("DELETE FROM settings WHERE key = 'outlook_account'").run();
}

// Fetches a fresh token silently (MSAL handles refresh via its token cache) and
// pulls the most recent inbox messages via Microsoft Graph.
export async function fetchRecentEmails(count = 8) {
  const account = loadAccount();
  if (!account) {
    const err = new Error("Outlook is not connected yet.");
    err.status = 400;
    throw err;
  }

  const client = msalClient();
  const cache = client.getTokenCache();
  const accounts = await cache.getAllAccounts();
  const msalAccount = accounts.find((a) => a.homeAccountId === account.account?.homeAccountId) || accounts[0];

  let accessToken = account.accessToken;
  if (msalAccount) {
    try {
      const refreshed = await client.acquireTokenSilent({ account: msalAccount, scopes: SCOPES });
      accessToken = refreshed.accessToken;
      saveTokens(refreshed);
    } catch {
      // fall back to the last known access token; if it's expired the Graph call below will 401
      // and the frontend will prompt the user to reconnect.
    }
  }

  const url = `https://graph.microsoft.com/v1.0/me/messages?$top=${count}&$select=subject,from,receivedDateTime,isRead,webLink&$orderby=receivedDateTime desc`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) {
    const err = new Error("Could not reach Outlook. Try reconnecting in Settings.");
    err.status = resp.status === 401 ? 401 : 502;
    throw err;
  }
  const data = await resp.json();
  return (data.value || []).map((m) => ({
    id: m.id,
    subject: m.subject,
    from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || "Unknown",
    receivedAt: m.receivedDateTime,
    isRead: m.isRead,
    link: m.webLink,
  }));
}
